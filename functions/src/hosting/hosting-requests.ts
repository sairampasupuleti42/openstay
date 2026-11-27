import { createHash } from 'node:crypto';
import { FieldPath, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from './host-participation.js';
import { isSafePublicText, isValidPublicListing } from './public-listings.js';

const options = { region: 'us-central1', enforceAppCheck: process.env['FUNCTIONS_EMULATOR'] !== 'true' };
const idPattern = /^[^/]{1,150}$/;
const requestIdPattern = /^[a-f0-9]{64}$/;
const pageSize = 20;

export const createHostingRequest = onCall(options, (request) => createRequest(request, getFirestore()));
export const listTravellerHostingRequests = onCall(options, (request) => listRequests(request, 'travellerUid', getFirestore()));
export const listHostHostingRequests = onCall(options, (request) => listRequests(request, 'hostUid', getFirestore()));
export const getHostingRequest = onCall(options, (request) => getRequest(request, getFirestore()));

function caller(request: CallableRequest<unknown>): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage hosting requests.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before managing hosting requests.');
  }
  return request.auth.uid;
}

function object(data: unknown, fields: string[]): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some((key) => !fields.includes(key))) {
    throw new HttpsError('invalid-argument', 'The request is invalid.');
  }
  return data as Record<string, unknown>;
}

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function createRequest(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore) {
  const uid = caller(request);
  const input = object(request.data, ['listingId', 'startDate', 'endDate', 'guestCount', 'introductoryMessage']);
  const { listingId, startDate, endDate, guestCount, introductoryMessage } = input;
  if (typeof listingId !== 'string' || !idPattern.test(listingId)
      || !calendarDate(startDate) || !calendarDate(endDate) || endDate <= startDate
      || typeof guestCount !== 'number' || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10
      || typeof introductoryMessage !== 'string' || introductoryMessage.trim().length < 1
      || introductoryMessage.length > 2000) {
    throw new HttpsError('invalid-argument', 'Enter valid dates, guests and a message of up to 2,000 characters.');
  }
  if (!isSafePublicText(introductoryMessage)) {
    throw new HttpsError('invalid-argument', 'Remove contact details, exact addresses and coordinates from your introduction.');
  }
  const requestId = createHash('sha256').update(JSON.stringify([uid, listingId, startDate, endDate])).digest('hex');
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  const listingRef = db.doc(`listings/${listingId}`);
  const travellerRef = db.doc(`users/${uid}`);
  const rateRef = db.doc(`hostingRequestRateLimits/${uid}`);

  await db.runTransaction(async (tx) => {
    const [listingSnap, travellerSnap, existing, rate] = await Promise.all([
      tx.get(listingRef), tx.get(travellerRef), tx.get(requestRef), tx.get(rateRef),
    ]);
    if (travellerSnap.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot create hosting requests.');
    }
    const listing = listingSnap.data();
    if (!listing || !isValidPublicListing(listing, listingId)) {
      throw new HttpsError('failed-precondition', 'This listing is no longer available.');
    }
    const hostUid = listing.hostUid;
    if (hostUid === uid) throw new HttpsError('failed-precondition', 'You cannot request your own listing.');
    if (typeof listing['guestCapacity'] !== 'number' || !Number.isInteger(listing['guestCapacity'])
        || listing['guestCapacity'] < guestCount || listing['guestCapacity'] > 10) {
      throw new HttpsError('invalid-argument', 'The guest count exceeds the listing capacity.');
    }
    const [host, consent, lock] = await Promise.all([
      tx.get(db.doc(`users/${hostUid}`)),
      tx.get(db.doc(`hostPrivate/${hostUid}`)),
      tx.get(db.doc(`hostPrivate/${hostUid}/listingLifecycleState/current`)),
    ]);
    const consentData = consent.data();
    const lockData = lock.data();
    if (host.data()?.['accountStatus'] !== 'active'
        || consentData?.['uid'] !== hostUid || consentData['consentState'] !== 'accepted'
        || consentData['termsVersion'] !== HOST_PARTICIPATION_TERMS_VERSION
        || consentData['termsDigest'] !== HOST_PARTICIPATION_TERMS_DIGEST
        || typeof consentData['eventId'] !== 'string' || !requestIdPattern.test(consentData['eventId'])
        || (lockData && (!(lockData['leaseExpiresAt'] instanceof Timestamp)
          || lockData['leaseExpiresAt'].toMillis() > Date.now()))) {
      throw new HttpsError('failed-precondition', 'This listing is no longer available.');
    }
    if (existing.exists) {
      throw new HttpsError('already-exists', 'You already requested this listing for these dates.');
    }
    const now = Timestamp.now();
    const previous = rate.data();
    const windowStart = previous?.['windowStart'];
    const inWindow = windowStart instanceof Timestamp && now.toMillis() - windowStart.toMillis() < 60 * 60 * 1000;
    const count = inWindow && typeof previous?.['count'] === 'number' ? previous['count'] : 0;
    if (count >= 10) throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    tx.set(rateRef, { windowStart: inWindow ? windowStart : now, count: count + 1 });
    tx.create(requestRef, {
      requestId, listingId, hostUid, travellerUid: uid, startDate, endDate, guestCount,
      introductoryMessage: introductoryMessage.trim(), status: 'pending',
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { requestId };
}

async function activeCaller(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore): Promise<string> {
  const uid = caller(request);
  if ((await db.doc(`users/${uid}`).get()).data()?.['accountStatus'] !== 'active') {
    throw new HttpsError('failed-precondition', 'Your account cannot access hosting requests.');
  }
  return uid;
}

function project(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) throw new HttpsError('not-found', 'This request could not be found.');
  return {
    requestId: doc.id, listingId: data['listingId'], startDate: data['startDate'], endDate: data['endDate'],
    guestCount: data['guestCount'], introductoryMessage: data['introductoryMessage'], status: data['status'],
    createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toDate().toISOString() : null,
    updatedAt: data['updatedAt'] instanceof Timestamp ? data['updatedAt'].toDate().toISOString() : null,
  };
}

export async function listRequests(
  request: CallableRequest<unknown>, participant: 'hostUid' | 'travellerUid', db: FirebaseFirestore.Firestore,
) {
  const uid = await activeCaller(request, db);
  const input = object(request.data, ['cursor']);
  const cursor = input['cursor'];
  if (cursor !== null && cursor !== undefined && (typeof cursor !== 'string' || !requestIdPattern.test(cursor))) {
    throw new HttpsError('invalid-argument', 'The request cursor is invalid.');
  }
  let query = db.collection('hostingRequests').where(participant, '==', uid).orderBy(FieldPath.documentId()).limit(pageSize + 1);
  if (typeof cursor === 'string') query = query.startAfter(cursor);
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, pageSize);
  return { items: docs.map(project), nextCursor: snapshot.size > pageSize ? docs[docs.length - 1].id : null };
}

export async function getRequest(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore) {
  const uid = await activeCaller(request, db);
  const input = object(request.data, ['requestId']);
  const requestId = input['requestId'];
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) {
    throw new HttpsError('invalid-argument', 'The request ID is invalid.');
  }
  const snapshot = await db.doc(`hostingRequests/${requestId}`).get();
  const data = snapshot.data();
  if (!data || (data['hostUid'] !== uid && data['travellerUid'] !== uid)) {
    throw new HttpsError('not-found', 'This request could not be found.');
  }
  const [listing, traveller] = await Promise.all([
    db.doc(`listings/${data['listingId']}`).get(),
    db.doc(`users/${data['travellerUid']}`).get(),
  ]);
  const title = listing.data()?.['title'];
  const name = traveller.data()?.['displayName'];
  return {
    ...project(snapshot),
    viewerIsHost: data['hostUid'] === uid,
    listingTitle: typeof title === 'string' && isSafePublicText(title) ? title : null,
    traveller: typeof name === 'string' && name.trim().length > 0 && name.length <= 100 && isSafePublicText(name)
      ? { displayName: name } : null,
  };
}
