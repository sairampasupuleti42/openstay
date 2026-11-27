import { createHash } from 'node:crypto';
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';
import { pausePublishedListings } from './listing-state.js';

export const HOST_PARTICIPATION_TERMS_VERSION = 'host-participation-v1';
const TERMS_TEXT =
  'Hosting on Openstay is voluntary and free. Openstay does not charge you to participate. You choose whether to host and may stop participating. Only host profile fields marked public can be viewed by others. Do not include private contact details or your exact residential address in public profile text. Openstay does not provide background checks, identity verification, insurance, or safety guarantees.';
export const HOST_PARTICIPATION_TERMS_DIGEST = createHash('sha256').update(TERMS_TEXT).digest('hex');
const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,128}$/;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 10;
const WITHDRAWAL_LEASE_MS = 60_000;
const enforceAppCheck = process.env['FUNCTIONS_EMULATOR'] !== 'true';
const FUNCTIONS_REGION = 'us-central1';

export const acceptHostParticipation = onCall({ enforceAppCheck, region: FUNCTIONS_REGION }, (request) =>
  recordParticipationEvent(request, 'accepted'),
);

export const withdrawHostParticipation = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION, timeoutSeconds: 300 },
  (request) => recordParticipationEvent(request, 'withdrawn'),
);

export async function recordParticipationEvent(
  request: CallableRequest<unknown>,
  eventType: 'accepted' | 'withdrawn',
): Promise<{ eventId: string }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage hosting consent.');
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before managing hosting consent.');
  }

  const data = request.data as Record<string, unknown> | null;
  if (
    !data
    || Array.isArray(data)
    || Object.keys(data).length !== (eventType === 'accepted' ? 4 : 2)
    || typeof data['idempotencyKey'] !== 'string'
    || !IDEMPOTENCY_KEY.test(data['idempotencyKey'])
    || !(data['expectedEventId'] === null
      || (typeof data['expectedEventId'] === 'string'
        && /^[a-f0-9]{64}$/.test(data['expectedEventId'])))
    || (eventType === 'accepted' && (
      typeof data['termsVersion'] !== 'string'
      || typeof data['termsText'] !== 'string'
    ))
  ) {
    throw new HttpsError('invalid-argument', 'The consent request is invalid.');
  }
  if (eventType === 'accepted'
    && (
      data['termsVersion'] !== HOST_PARTICIPATION_TERMS_VERSION
      || data['termsText'] !== TERMS_TEXT
    )) {
    throw new HttpsError('failed-precondition', 'The hosting terms have changed. Reload and review them before agreeing.');
  }
  const idempotencyKey = data['idempotencyKey'];

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const eventId = createHash('sha256')
    .update(`${uid}\0${idempotencyKey}`)
    .digest('hex');
  const privateRef = db.doc(`hostPrivate/${uid}`);
  const lockRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/current`);
  const eventRef = privateRef.collection('consentEvents').doc(eventId);
  const legacyEventRefs = (['accepted', 'withdrawn'] as const).map((type) =>
    privateRef.collection('consentEvents').doc(
      createHash('sha256').update(`${uid}\0${type}\0${idempotencyKey}`).digest('hex'),
    ),
  );
  if (eventType === 'withdrawn') {
    const existingEventId = await beginWithdrawal(
      db,
      uid,
      idempotencyKey,
      data['expectedEventId'],
      eventId,
      eventRef,
      legacyEventRefs,
      privateRef,
      userRef,
      lockRef,
    );
    if (existingEventId) return { eventId: existingEventId };
    await pausePublishedListings(db, uid, { ref: lockRef, requestId: eventId });
  }

  try {
    return await db.runTransaction(async (transaction) => {
    const [userSnapshot, eventSnapshot, privateSnapshot, ...legacySnapshots] = await Promise.all([
      transaction.get(userRef),
      transaction.get(eventRef),
      transaction.get(privateRef),
      ...legacyEventRefs.map((ref) => transaction.get(ref)),
    ]);
    const lockSnapshot = await transaction.get(lockRef);

    const accountStatus = userSnapshot.data()?.['accountStatus'];
    if (!userSnapshot.exists || (accountStatus !== 'active'
      && !(accountStatus === 'suspended' && eventType === 'withdrawn'))) {
      throw new HttpsError('failed-precondition', 'This account cannot manage hosting consent.');
    }
    if (eventType === 'accepted' && hasActiveWithdrawalLock(lockSnapshot.data())) {
      throw new HttpsError(
        'failed-precondition',
        'Host participation cannot be resumed while a withdrawal is being completed.',
        { reason: 'withdrawal-in-progress' },
      );
    }

    const existingEvents = [eventSnapshot, ...legacySnapshots].filter((snapshot) => snapshot.exists);
    if (existingEvents.length > 1) {
      throw new HttpsError('already-exists', 'The consent request key has already been used.');
    }
    if (existingEvents.length === 1) {
      const existingEvent = existingEvents[0];
      const event = existingEvent.data();
      if (
        event?.['uid'] !== uid
        || event['eventType'] !== eventType
        || event['idempotencyKey'] !== idempotencyKey
        || event['expectedEventId'] !== data['expectedEventId']
      ) {
        throw new HttpsError('already-exists', 'The consent request key has already been used.');
      }
      if (privateSnapshot.data()?.['eventId'] !== existingEvent.id
        || privateSnapshot.data()?.['consentState'] !== eventType) {
        throw new HttpsError(
          'failed-precondition',
          'This consent request is no longer current. Start a new request.',
          { reason: 'stale-consent-request' },
        );
      }
      return { eventId: existingEvent.id };
    }

    const privateData = privateSnapshot.data();
    if ((privateSnapshot.exists ? privateData?.['eventId'] : null) !== data['expectedEventId']) {
      throw new HttpsError(
        'failed-precondition',
        'This consent request is no longer current. Start a new request.',
        { reason: 'stale-consent-request' },
      );
    }
    if (
      eventType === 'withdrawn'
      && (
        !privateSnapshot.exists
        || privateData?.['consentState'] !== 'accepted'
        || typeof privateData['termsVersion'] !== 'string'
        || typeof privateData['termsDigest'] !== 'string'
      )
    ) {
      throw new HttpsError('failed-precondition', 'There is no current hosting consent to withdraw.');
    }
    if (eventType === 'withdrawn' && !ownsActiveWithdrawalLock(lockSnapshot.data(), eventId)) {
      throw new HttpsError(
        'failed-precondition',
        'The host participation change is no longer current. Retry the request.',
        { reason: 'stale-withdrawal-lock' },
      );
    }

    const recentEvents = await transaction.get(
      privateRef.collection('consentEvents')
        .where('recordedAt', '>=', Timestamp.fromMillis(Timestamp.now().toMillis() - RATE_WINDOW_MS))
        .limit(MAX_EVENTS_PER_WINDOW),
    );
    if (recentEvents.size >= MAX_EVENTS_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'Too many consent changes. Please try again later.');
    }

    const termsVersion = eventType === 'accepted'
      ? HOST_PARTICIPATION_TERMS_VERSION
      : privateData?.['termsVersion'];
    const termsDigest = eventType === 'accepted'
      ? HOST_PARTICIPATION_TERMS_DIGEST
      : privateData?.['termsDigest'];
    transaction.create(eventRef, {
      eventId,
      uid,
      eventType,
      termsVersion,
      termsDigest,
      recordedAt: FieldValue.serverTimestamp(),
      idempotencyKey,
      expectedEventId: data['expectedEventId'],
    });
    transaction.set(privateRef, {
      uid,
      termsVersion,
      termsDigest,
      consentState: eventType,
      eventId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (eventType === 'withdrawn') transaction.delete(lockRef);
    return { eventId };
    });
  } catch (error) {
    if (eventType === 'withdrawn') {
      await releaseWithdrawalLock(db, lockRef, eventId);
    }
    throw error;
  }
}

async function beginWithdrawal(
  db: FirebaseFirestore.Firestore,
  uid: string,
  idempotencyKey: string,
  expectedEventId: string | null,
  eventId: string,
  eventRef: FirebaseFirestore.DocumentReference,
  legacyEventRefs: FirebaseFirestore.DocumentReference[],
  privateRef: FirebaseFirestore.DocumentReference,
  userRef: FirebaseFirestore.DocumentReference,
  lockRef: FirebaseFirestore.DocumentReference,
): Promise<string | null> {
  return db.runTransaction(async (transaction) => {
    const [userSnapshot, eventSnapshot, privateSnapshot, lockSnapshot, ...legacySnapshots] = await Promise.all([
      transaction.get(userRef),
      transaction.get(eventRef),
      transaction.get(privateRef),
      transaction.get(lockRef),
      ...legacyEventRefs.map((ref) => transaction.get(ref)),
    ]);

    const accountStatus = userSnapshot.data()?.['accountStatus'];
    if (!userSnapshot.exists || (accountStatus !== 'active' && accountStatus !== 'suspended')) {
      throw new HttpsError('failed-precondition', 'This account cannot manage hosting consent.');
    }

    const existingEvents = [eventSnapshot, ...legacySnapshots].filter((snapshot) => snapshot.exists);
    if (existingEvents.length > 1) {
      throw new HttpsError('already-exists', 'The consent request key has already been used.');
    }
    if (existingEvents.length === 1) {
      const existingEvent = existingEvents[0];
      const event = existingEvent.data();
      if (
        event?.['uid'] !== uid
        || event['eventType'] !== 'withdrawn'
        || event['idempotencyKey'] !== idempotencyKey
        || event['expectedEventId'] !== expectedEventId
      ) {
        throw new HttpsError('already-exists', 'The consent request key has already been used.');
      }
      if (
        privateSnapshot.data()?.['eventId'] !== existingEvent.id
        || privateSnapshot.data()?.['consentState'] !== 'withdrawn'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This consent request is no longer current. Start a new request.',
          { reason: 'stale-consent-request' },
        );
      }
      return existingEvent.id;
    }

    const privateData = privateSnapshot.data();
    if ((privateSnapshot.exists ? privateData?.['eventId'] : null) !== expectedEventId) {
      throw new HttpsError(
        'failed-precondition',
        'This consent request is no longer current. Start a new request.',
        { reason: 'stale-consent-request' },
      );
    }
    if (
      !privateSnapshot.exists
      || privateData?.['consentState'] !== 'accepted'
      || typeof privateData['termsVersion'] !== 'string'
      || typeof privateData['termsDigest'] !== 'string'
    ) {
      throw new HttpsError('failed-precondition', 'There is no current hosting consent to withdraw.');
    }

    const recentEvents = await transaction.get(
      privateRef.collection('consentEvents')
        .where('recordedAt', '>=', Timestamp.fromMillis(Timestamp.now().toMillis() - RATE_WINDOW_MS))
        .limit(MAX_EVENTS_PER_WINDOW),
    );
    if (recentEvents.size >= MAX_EVENTS_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'Too many consent changes. Please try again later.');
    }

    if (
      hasActiveWithdrawalLock(lockSnapshot.data())
      && !ownsActiveWithdrawalLock(lockSnapshot.data(), eventId)
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Another host participation change is being completed. Retry shortly.',
        { reason: 'withdrawal-in-progress' },
      );
    }
    transaction.set(lockRef, {
      requestId: eventId,
      leaseExpiresAt: Timestamp.fromMillis(Timestamp.now().toMillis() + WITHDRAWAL_LEASE_MS),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return null;
  });
}

async function releaseWithdrawalLock(
  db: FirebaseFirestore.Firestore,
  lockRef: FirebaseFirestore.DocumentReference,
  requestId: string,
): Promise<void> {
  await db.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(lockRef);
    if (ownsActiveWithdrawalLock(lockSnapshot.data(), requestId)) {
      transaction.delete(lockRef);
    }
  });
}

function hasActiveWithdrawalLock(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  if (!(data['leaseExpiresAt'] instanceof Timestamp)) return true;
  return data['leaseExpiresAt'].toMillis() > Timestamp.now().toMillis();
}

function ownsActiveWithdrawalLock(
  data: Record<string, unknown> | undefined,
  requestId: string,
): boolean {
  return data?.['requestId'] === requestId && hasActiveWithdrawalLock(data);
}
