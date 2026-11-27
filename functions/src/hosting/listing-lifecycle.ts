import { createHash } from 'node:crypto';
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';
import {
  HOST_PARTICIPATION_TERMS_DIGEST,
  HOST_PARTICIPATION_TERMS_VERSION,
} from './host-participation.js';

const FUNCTIONS_REGION = 'us-central1';
const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,128}$/;
const LISTING_ID = /^[^/]{1,150}$/;
const enforceAppCheck = process.env['FUNCTIONS_EMULATOR'] !== 'true';
const LISTING_FIELDS = [
  'listingId',
  'hostUid',
  'title',
  'description',
  'accommodationType',
  'country',
  'city',
  'region',
  'areaDescription',
  'guestCapacity',
  'bedrooms',
  'beds',
  'bathrooms',
  'amenities',
  'houseRules',
  'status',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'pausedAt',
  'archivedAt',
] as const;
const ACCOMMODATION_TYPES = [
  'private_room',
  'shared_room',
  'entire_home',
  'guest_house',
  'farm_stay',
  'other',
] as const;
const APPROVED_AMENITIES = [
  'wifi',
  'kitchen',
  'ac',
  'heating',
  'tv',
  'laundry',
  'parking',
  'pool',
  'gym',
  'pet_friendly',
  'hot_water',
  'elevator',
  'bathtub',
  'shower',
  'dishwasher',
  'microwave',
  'oven',
  'refrigerator',
  'freezer',
  'balcony',
  'garden',
  'workspace',
  'iron',
  'games',
  'bbq',
  'outdoor_furniture',
  'fireplace',
  'safe',
  'crib',
  'high_chair',
] as const;

export type ListingLifecycleAction = 'publish' | 'pause' | 'resume' | 'archive';
export type ListingLifecycleStatus = 'draft' | 'published' | 'paused' | 'archived';

export const publishListing = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION },
  (request) => transitionListing(request, 'publish'),
);
export const pauseListing = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION },
  (request) => transitionListing(request, 'pause'),
);
export const resumeListing = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION },
  (request) => transitionListing(request, 'resume'),
);
export const archiveListing = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION },
  (request) => transitionListing(request, 'archive'),
);

export async function transitionListing(
  request: CallableRequest<unknown>,
  action: ListingLifecycleAction,
  db: FirebaseFirestore.Firestore = getFirestore(),
): Promise<{ listingId: string; status: ListingLifecycleStatus }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage this listing.');
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before managing listings.');
  }

  const input = validateRequestData(request.data);
  const userRef = db.doc(`users/${uid}`);
  const hostProfileRef = db.doc(`hostProfiles/${uid}`);
  const consentRef = db.doc(`hostPrivate/${uid}`);
  const lockRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/current`);
  const listingRef = db.doc(`listings/${input.listingId}`);
  const versionRef = db.doc(`hostPrivate/${uid}/listingLifecycleVersions/${input.listingId}`);
  const requestId = createHash('sha256')
    .update(`${uid}\0${input.idempotencyKey}`)
    .digest('hex');
  const requestRef = db.doc(`hostPrivate/${uid}/listingLifecycleRequests/${requestId}`);

  return db.runTransaction(async (transaction) => {
    const [
      userSnapshot,
      hostProfileSnapshot,
      consentSnapshot,
      lockSnapshot,
      listingSnapshot,
      requestSnapshot,
      versionSnapshot,
    ] = await Promise.all([
      transaction.get(userRef),
      transaction.get(hostProfileRef),
      transaction.get(consentRef),
      transaction.get(lockRef),
      transaction.get(listingRef),
      transaction.get(requestRef),
      transaction.get(versionRef),
    ]);

    if (!userSnapshot.exists || userSnapshot.data()?.['accountStatus'] !== 'active') {
      throw failedPrecondition('account-not-active', 'This account cannot manage listings.');
    }
    if (!isValidHostProfile(hostProfileSnapshot.data(), uid)) {
      throw failedPrecondition('host-profile-required', 'Complete your host profile before managing listings.');
    }
    if (!hasCurrentConsent(consentSnapshot.data(), uid)) {
      throw failedPrecondition('current-consent-required', 'Accept the current host participation terms before managing listings.');
    }
    if (hasActiveWithdrawalLock(lockSnapshot.data())) {
      throw failedPrecondition(
        'withdrawal-in-progress',
        'Listing changes are temporarily unavailable while host participation is being withdrawn.',
      );
    }
    if (!listingSnapshot.exists || listingSnapshot.data()?.['hostUid'] !== uid) {
      throw new HttpsError('not-found', 'The listing could not be found.');
    }

    const listing = listingSnapshot.data();
    if (!isValidListing(listing, input.listingId)) {
      throw failedPrecondition('invalid-listing', 'The saved listing is incomplete or invalid.');
    }

    if (requestSnapshot.exists) {
      const previousRequest = requestSnapshot.data();
      if (
        previousRequest?.['listingId'] !== input.listingId
        || previousRequest?.['action'] !== action
        || previousRequest?.['keyHash'] !== requestId
        || !isListingStatus(previousRequest?.['status'])
      ) {
        throw new HttpsError(
          'already-exists',
          'This request key has already been used for a different listing action.',
          { reason: 'idempotency-key-reused' },
        );
      }
      if (
        listing.status !== previousRequest['status']
        || versionSnapshot.data()?.['requestId'] !== requestId
      ) {
        throw failedPrecondition(
          'stale-listing-request',
          'This listing has changed since the request completed. Refresh and try again.',
        );
      }
      return { listingId: input.listingId, status: previousRequest['status'] };
    }

    const nextStatus = getNextStatus(listing.status, action);
    if (!nextStatus) {
      const verb = action === 'publish'
        ? 'published'
        : action === 'pause'
          ? 'paused'
          : action === 'resume'
            ? 'resumed'
            : 'archived';
      throw failedPrecondition(
        'invalid-transition',
        `A listing cannot be ${verb} from its current status.`,
      );
    }

    const lifecycleFields: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (action === 'publish' || action === 'resume') {
      lifecycleFields['publishedAt'] = FieldValue.serverTimestamp();
    } else if (action === 'pause') {
      lifecycleFields['pausedAt'] = FieldValue.serverTimestamp();
    } else {
      lifecycleFields['archivedAt'] = FieldValue.serverTimestamp();
    }

    if (lockSnapshot.exists) transaction.delete(lockRef);
    transaction.update(listingRef, lifecycleFields);
    transaction.set(versionRef, { requestId });
    transaction.create(requestRef, {
      keyHash: requestId,
      listingId: input.listingId,
      action,
      status: nextStatus,
      completedAt: FieldValue.serverTimestamp(),
    });
    return { listingId: input.listingId, status: nextStatus };
  });
}

function validateRequestData(data: unknown): { listingId: string; idempotencyKey: string } {
  if (
    typeof data !== 'object'
    || data === null
    || Array.isArray(data)
    || Object.keys(data).length !== 2
    || Object.keys(data).some((key) => key !== 'listingId' && key !== 'idempotencyKey')
  ) {
    throw new HttpsError('invalid-argument', 'The listing action request is invalid.');
  }

  const input = data as Record<string, unknown>;
  if (typeof input['listingId'] !== 'string' || !LISTING_ID.test(input['listingId'])) {
    throw new HttpsError('invalid-argument', 'The listing ID is invalid.');
  }
  if (
    typeof input['idempotencyKey'] !== 'string'
    || !IDEMPOTENCY_KEY.test(input['idempotencyKey'])
  ) {
    throw new HttpsError('invalid-argument', 'The listing action request key is invalid.');
  }
  return {
    listingId: input['listingId'],
    idempotencyKey: input['idempotencyKey'],
  };
}

function getNextStatus(
  status: ListingLifecycleStatus,
  action: ListingLifecycleAction,
): ListingLifecycleStatus | null {
  if (
    (action === 'publish' && status === 'draft')
    || (action === 'resume' && status === 'paused')
  ) {
    return 'published';
  }
  if (action === 'pause' && status === 'published') return 'paused';
  if (action === 'archive' && status !== 'archived') return 'archived';
  return null;
}

function hasCurrentConsent(
  consent: Record<string, unknown> | undefined,
  uid: string,
): boolean {
  return consent?.['uid'] === uid
    && consent['consentState'] === 'accepted'
    && consent['termsVersion'] === HOST_PARTICIPATION_TERMS_VERSION
    && consent['termsDigest'] === HOST_PARTICIPATION_TERMS_DIGEST
    && typeof consent['eventId'] === 'string'
    && /^[a-f0-9]{64}$/.test(consent['eventId']);
}

function hasActiveWithdrawalLock(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  return !(data['leaseExpiresAt'] instanceof Timestamp)
    || data['leaseExpiresAt'].toMillis() > Timestamp.now().toMillis();
}

function isValidHostProfile(
  profile: Record<string, unknown> | undefined,
  uid: string,
): boolean {
  if (
    !profile
    || Object.keys(profile).some((key) => ![
      'uid',
      'displayName',
      'introduction',
      'languages',
      'visibility',
      'createdAt',
      'updatedAt',
    ].includes(key))
    || profile['uid'] !== uid
    || typeof profile['displayName'] !== 'string'
    || profile['displayName'].trim().length < 1
    || profile['displayName'].length > 100
    || (profile['introduction'] !== undefined
      && (typeof profile['introduction'] !== 'string' || profile['introduction'].length > 500))
    || !Array.isArray(profile['languages'])
    || profile['languages'].length > 10
    || !profile['languages'].every((language) =>
      typeof language === 'string' && /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language),
    )
    || new Set(profile['languages']).size !== profile['languages'].length
    || (profile['visibility'] !== 'private' && profile['visibility'] !== 'public')
    || !(profile['createdAt'] instanceof Timestamp)
    || !(profile['updatedAt'] instanceof Timestamp)
  ) {
    return false;
  }
  return true;
}

function isValidListing(
  listing: Record<string, unknown> | undefined,
  listingId: string,
): listing is Record<string, unknown> & { status: ListingLifecycleStatus } {
  if (
    !listing
    || Object.keys(listing).some((key) => !LISTING_FIELDS.includes(key as typeof LISTING_FIELDS[number]))
    || listing['listingId'] !== listingId
    || typeof listing['hostUid'] !== 'string'
    || typeof listing['title'] !== 'string'
    || listing['title'].trim().length < 10
    || listing['title'].trim().length > 100
    || typeof listing['description'] !== 'string'
    || listing['description'].trim().length < 50
    || listing['description'].trim().length > 2000
    || !ACCOMMODATION_TYPES.includes(listing['accommodationType'] as typeof ACCOMMODATION_TYPES[number])
    || !isBoundedString(listing['country'], 2, 100)
    || !isBoundedString(listing['city'], 2, 100)
    || (listing['region'] !== undefined && !isBoundedString(listing['region'], 1, 100))
    || (listing['areaDescription'] !== undefined
      && !isBoundedString(listing['areaDescription'], 1, 200))
    || !isBoundedInteger(listing['guestCapacity'], 1, 10)
    || !isBoundedInteger(listing['bedrooms'], 0, 10)
    || !isBoundedInteger(listing['beds'], 1, 15)
    || typeof listing['bathrooms'] !== 'number'
    || !Number.isFinite(listing['bathrooms'])
    || listing['bathrooms'] < 1
    || listing['bathrooms'] > 10
    || !Array.isArray(listing['amenities'])
    || listing['amenities'].length > 30
    || !listing['amenities'].every((amenity) =>
      typeof amenity === 'string'
        && APPROVED_AMENITIES.includes(amenity as typeof APPROVED_AMENITIES[number]),
    )
    || !Array.isArray(listing['houseRules'])
    || listing['houseRules'].length > 15
    || !listing['houseRules'].every((rule) =>
      typeof rule === 'string' && rule.length >= 5 && rule.length <= 200,
    )
    || !isListingStatus(listing['status'])
    || !(listing['createdAt'] instanceof Timestamp)
    || !(listing['updatedAt'] instanceof Timestamp)
    || !isOptionalTimestamp(listing['publishedAt'])
    || !isOptionalTimestamp(listing['pausedAt'])
    || !isOptionalTimestamp(listing['archivedAt'])
  ) {
    return false;
  }
  return true;
}

function isBoundedString(value: unknown, min: number, max: number): value is string {
  if (typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= min
    && value <= max;
}

function isOptionalTimestamp(value: unknown): boolean {
  return value === undefined || value === null || value instanceof Timestamp;
}

function isListingStatus(value: unknown): value is ListingLifecycleStatus {
  return value === 'draft'
    || value === 'published'
    || value === 'paused'
    || value === 'archived';
}

function failedPrecondition(reason: string, message: string): HttpsError {
  return new HttpsError('failed-precondition', message, { reason });
}
