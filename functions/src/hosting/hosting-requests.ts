import { createHash, randomUUID } from 'node:crypto';
import { FieldPath, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from './host-participation.js';
import { isSafePublicText, isValidPublicListing } from './public-listings.js';
import { expireCompletionWindow, projectCompletion } from './stay-completion.js';
import { readBlockRelationship } from '../trust/blocking.js';

const options = { region: 'us-central1', enforceAppCheck: process.env['FUNCTIONS_EMULATOR'] !== 'true' };
const idPattern = /^[^/]{1,150}$/;
const requestIdPattern = /^[a-f0-9]{64}$/;
const pageSize = 20;

export const createHostingRequest = onCall(options, (request) => createRequest(request, getFirestore()));
export const listTravellerHostingRequests = onCall(options, (request) => listRequests(request, 'travellerUid', getFirestore()));
export const listHostHostingRequests = onCall(options, (request) => listRequests(request, 'hostUid', getFirestore()));
export const getHostingRequest = onCall(options, (request) => getRequest(request, getFirestore()));
export const decideHostingRequest = onCall(options, (request) => transitionRequest(request, getFirestore()));

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

function tupleId(travellerUid: string, listingId: string, startDate: string, endDate: string): string {
  return createHash('sha256')
    .update(JSON.stringify([travellerUid, listingId, startDate, endDate]))
    .digest('hex');
}

function assertActiveReservation(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  travellerUid: string,
  listingId: string,
  startDate: string,
  endDate: string,
  requestId: string,
  isLegacyRequest: boolean,
): void {
  if (isLegacyRequest) return;
  const data = snapshot.data();
  if (!snapshot.exists
      || data?.['travellerUid'] !== travellerUid
      || data['listingId'] !== listingId
      || data['startDate'] !== startDate
      || data['endDate'] !== endDate
      || data['activeRequestId'] !== requestId) {
    throw new HttpsError('failed-precondition', 'The request reservation requires attention.');
  }
}

function assertConfirmedSchedule(
  confirmed: FirebaseFirestore.QuerySnapshot,
  startDate: string,
  endDate: string,
  currentRequestId?: string,
): void {
  let currentEntryFound = false;
  for (const entry of confirmed.docs) {
    const existing = entry.data();
    if (!calendarDate(existing['startDate']) || !calendarDate(existing['endDate'])
        || existing['endDate'] <= existing['startDate']) {
      throw new HttpsError('failed-precondition', 'The listing schedule requires attention.');
    }
    if (entry.id === currentRequestId) {
      if (existing['startDate'] !== startDate || existing['endDate'] !== endDate) {
        throw new HttpsError('failed-precondition', 'The listing schedule requires attention.');
      }
      currentEntryFound = true;
      continue;
    }
    if (startDate < existing['endDate'] && existing['startDate'] < endDate) {
      throw new HttpsError('failed-precondition', 'These dates overlap a confirmed stay.');
    }
  }
  if (currentRequestId && !currentEntryFound) {
    throw new HttpsError('failed-precondition', 'The listing schedule requires attention.');
  }
}

function bumpSchedule(
  tx: FirebaseFirestore.Transaction,
  scheduleRef: FirebaseFirestore.DocumentReference,
  schedule: FirebaseFirestore.DocumentSnapshot,
): void {
  if (schedule.exists) {
    tx.update(scheduleRef, { version: FieldValue.increment(1) });
  } else {
    tx.create(scheduleRef, { version: 1 });
  }
}

function eligibleHost(
  hostUid: string,
  host: FirebaseFirestore.DocumentSnapshot,
  consent: FirebaseFirestore.DocumentSnapshot,
  lock: FirebaseFirestore.DocumentSnapshot,
): boolean {
  const consentData = consent.data();
  const lockData = lock.data();
  return host.data()?.['accountStatus'] === 'active'
    && consentData?.['uid'] === hostUid && consentData['consentState'] === 'accepted'
    && consentData['termsVersion'] === HOST_PARTICIPATION_TERMS_VERSION
    && consentData['termsDigest'] === HOST_PARTICIPATION_TERMS_DIGEST
    && typeof consentData['eventId'] === 'string' && requestIdPattern.test(consentData['eventId'])
    && (!lockData || (lockData['leaseExpiresAt'] instanceof Timestamp
      && lockData['leaseExpiresAt'].toMillis() <= Date.now()));
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
  const tuple = tupleId(uid, listingId, startDate, endDate);
  const requestId = createHash('sha256').update(`${tuple}\0${randomUUID()}`).digest('hex');
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  const legacyRequestRef = db.doc(`hostingRequests/${tuple}`);
  const reservationRef = db.doc(`hostingRequestReservations/${tuple}`);
  const listingRef = db.doc(`listings/${listingId}`);
  const travellerRef = db.doc(`users/${uid}`);
  const rateRef = db.doc(`hostingRequestRateLimits/${uid}`);

  await db.runTransaction(async (tx) => {
    const [listingSnap, travellerSnap, reservation, legacyRequest, rate] = await Promise.all([
      tx.get(listingRef), tx.get(travellerRef), tx.get(reservationRef), tx.get(legacyRequestRef), tx.get(rateRef),
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
    if ((await readBlockRelationship(tx, db, uid, hostUid)).blocked) {
      throw new HttpsError('failed-precondition', 'This interaction is unavailable.');
    }
    if (typeof listing['guestCapacity'] !== 'number' || !Number.isInteger(listing['guestCapacity'])
        || listing['guestCapacity'] < guestCount || listing['guestCapacity'] > 10) {
      throw new HttpsError('invalid-argument', 'The guest count exceeds the listing capacity.');
    }
    const [host, consent, lock] = await Promise.all([
      tx.get(db.doc(`users/${hostUid}`)),
      tx.get(db.doc(`hostPrivate/${hostUid}`)),
      tx.get(db.doc(`hostPrivate/${hostUid}/listingLifecycleState/current`)),
    ]);
    if (!eligibleHost(hostUid, host, consent, lock)) {
      throw new HttpsError('failed-precondition', 'This listing is no longer available.');
    }
    const reservationData = reservation.data();
    if (reservation.exists
        && (reservationData?.['travellerUid'] !== uid
          || reservationData['listingId'] !== listingId
          || reservationData['startDate'] !== startDate
          || reservationData['endDate'] !== endDate
          || !(reservationData['activeRequestId'] === null
            || (typeof reservationData['activeRequestId'] === 'string'
              && requestIdPattern.test(reservationData['activeRequestId']))))) {
      throw new HttpsError('failed-precondition', 'The request reservation requires attention.');
    }
    if (reservationData?.['activeRequestId']) {
      throw new HttpsError('already-exists', 'You already requested this listing for these dates.');
    }
    if (legacyRequest.exists) {
      const legacy = legacyRequest.data();
      if (legacy?.['travellerUid'] !== uid
          || legacy['listingId'] !== listingId
          || legacy['startDate'] !== startDate
          || legacy['endDate'] !== endDate) {
        throw new HttpsError('failed-precondition', 'The existing request requires attention.');
      }
      if (legacy['status'] === 'pending' || legacy['status'] === 'accepted') {
        throw new HttpsError('already-exists', 'You already requested this listing for these dates.');
      }
      if (legacy['status'] !== 'declined' && legacy['status'] !== 'cancelled') {
        throw new HttpsError('failed-precondition', 'The existing request requires attention.');
      }
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
    const reservationValues = {
      travellerUid: uid, listingId, startDate, endDate, activeRequestId: requestId,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (reservation.exists) tx.update(reservationRef, reservationValues);
    else tx.create(reservationRef, reservationValues);
  });
  return { requestId };
}

export async function transitionRequest(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore) {
  const uid = caller(request);
  const input = object(request.data, ['requestId', 'action']);
  const { requestId, action } = input;
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)
      || (action !== 'accept' && action !== 'decline' && action !== 'cancel')) {
    throw new HttpsError('invalid-argument', 'The request action is invalid.');
  }
  const ref = db.doc(`hostingRequests/${requestId}`);
  return db.runTransaction(async (tx) => {
    const [snapshot, actor] = await Promise.all([tx.get(ref), tx.get(db.doc(`users/${uid}`))]);
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot manage hosting requests.');
    }
    const data = snapshot.data();
    if (!data || (data['hostUid'] !== uid && data['travellerUid'] !== uid)) {
      throw new HttpsError('not-found', 'This request could not be found.');
    }
    const hostUid = data['hostUid'];
    const travellerUid = data['travellerUid'];
    const listingId = data['listingId'];
    if (typeof hostUid !== 'string' || !idPattern.test(hostUid)
        || typeof travellerUid !== 'string' || !idPattern.test(travellerUid)
        || typeof listingId !== 'string' || !idPattern.test(listingId) || hostUid === travellerUid) {
      throw new HttpsError('failed-precondition', 'This request has invalid participant information.');
    }
    const startDate = data['startDate'];
    const endDate = data['endDate'];
    if (typeof startDate !== 'string' || typeof endDate !== 'string') {
      throw new HttpsError('failed-precondition', 'This request has invalid date information.');
    }
    const tuple = tupleId(travellerUid, listingId, startDate, endDate);
    const isLegacyRequest = requestId === tuple;
    const reservationRef = db.doc(`hostingRequestReservations/${tuple}`);
    if ((action === 'accept' || action === 'decline') && uid !== hostUid) {
      throw new HttpsError('permission-denied', 'Only the host can decide this request.');
    }
    if (action === 'cancel' && data['status'] === 'pending' && uid !== travellerUid) {
      throw new HttpsError('permission-denied', 'Only the traveller can cancel a pending request.');
    }
    if (action === 'cancel' && data['status'] === 'accepted'
        && data['completionStatus'] === 'completed') {
      throw new HttpsError('failed-precondition', 'A completed stay cannot be cancelled.');
    }
    const target = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
    if (data['status'] === target && data['lastAction'] === action && data['lastActorUid'] === uid) {
      if (action === 'accept') {
        const scheduleRef = db.doc(`listingSchedules/${listingId}`);
        const entryRef = scheduleRef.collection('confirmed').doc(requestId);
        const [schedule, entry, confirmed, reservation] = await Promise.all([
          tx.get(scheduleRef), tx.get(entryRef), tx.get(scheduleRef.collection('confirmed')), tx.get(reservationRef),
        ]);
        if (!schedule.exists || !entry.exists || !calendarDate(startDate) || !calendarDate(endDate)
            || endDate <= startDate) {
          throw new HttpsError('failed-precondition', 'The listing schedule requires attention.');
        }
        assertActiveReservation(reservation, travellerUid, listingId, startDate, endDate, requestId, isLegacyRequest);
        assertConfirmedSchedule(confirmed, startDate, endDate, requestId);
      }
      return { status: target };
    }
    if (data['status'] !== 'pending' && !(action === 'cancel' && data['status'] === 'accepted')) {
      throw new HttpsError('failed-precondition', 'This request can no longer be changed.');
    }
    const scheduleRef = db.doc(`listingSchedules/${listingId}`);
    const entryRef = scheduleRef.collection('confirmed').doc(requestId);
    if (action === 'accept') {
      const conversationRef = db.doc(`conversations/${requestId}`);
      const [listing, traveller, host, consent, lock, schedule, confirmed, reservation, conversation] = await Promise.all([
        tx.get(db.doc(`listings/${listingId}`)), tx.get(db.doc(`users/${travellerUid}`)),
        tx.get(db.doc(`users/${hostUid}`)), tx.get(db.doc(`hostPrivate/${hostUid}`)),
        tx.get(db.doc(`hostPrivate/${hostUid}/listingLifecycleState/current`)),
        tx.get(scheduleRef), tx.get(scheduleRef.collection('confirmed')), tx.get(reservationRef),
        tx.get(conversationRef),
      ]);
      const listingData = listing.data();
      const { guestCount } = data;
      if (!listingData || !isValidPublicListing(listingData, listingId) || listingData.hostUid !== hostUid
          || traveller.data()?.['accountStatus'] !== 'active' || !eligibleHost(hostUid, host, consent, lock)) {
        throw new HttpsError('failed-precondition', 'This listing or its participants are no longer eligible.');
      }
      if ((await readBlockRelationship(tx, db, hostUid, travellerUid)).blocked) {
        throw new HttpsError('failed-precondition', 'This interaction is unavailable.');
      }
      assertActiveReservation(reservation, travellerUid, listingId, startDate, endDate, requestId, isLegacyRequest);
      if (!calendarDate(startDate) || !calendarDate(endDate) || endDate <= startDate
          || typeof guestCount !== 'number' || !Number.isInteger(guestCount) || guestCount < 1
          || typeof listingData['guestCapacity'] !== 'number' || !Number.isInteger(listingData['guestCapacity'])
          || guestCount > listingData['guestCapacity'] || listingData['guestCapacity'] > 10) {
        throw new HttpsError('failed-precondition', 'The request dates or guest count are no longer valid.');
      }
      assertConfirmedSchedule(confirmed, startDate, endDate);
      // The shared document makes concurrent decisions retry, including when the query was empty.
      bumpSchedule(tx, scheduleRef, schedule);
      tx.create(entryRef, { startDate, endDate });
      if (conversation.exists) {
        const existing = conversation.data();
        if (existing?.['requestId'] !== requestId
            || existing['listingId'] !== listingId
            || existing['hostUid'] !== hostUid
            || existing['travellerUid'] !== travellerUid
            || !Array.isArray(existing['participantUids'])
            || existing['participantUids'][0] !== hostUid
            || existing['participantUids'][1] !== travellerUid) {
          throw new HttpsError('failed-precondition', 'The conversation requires attention.');
        }
      } else {
        tx.create(conversationRef, {
          conversationId: requestId,
          requestId,
          listingId,
          hostUid,
          travellerUid,
          participantUids: [hostUid, travellerUid],
          unreadByUid: { [hostUid]: 0, [travellerUid]: 0 },
          lastMessageAt: null,
          lastMessageSenderUid: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else if (action === 'cancel' && data['status'] === 'accepted') {
      const [schedule, entry, reservation] = await Promise.all([
        tx.get(scheduleRef), tx.get(entryRef), tx.get(reservationRef),
      ]);
      const entryData = entry.data();
      if (!schedule.exists || !entry.exists
          || !calendarDate(entryData?.['startDate']) || !calendarDate(entryData?.['endDate'])
          || entryData['startDate'] !== startDate || entryData['endDate'] !== endDate) {
        throw new HttpsError('failed-precondition', 'The listing schedule requires attention.');
      }
      assertActiveReservation(reservation, travellerUid, listingId, startDate, endDate, requestId, isLegacyRequest);
      bumpSchedule(tx, scheduleRef, schedule);
      tx.delete(entryRef);
      if (!isLegacyRequest) {
        tx.update(reservationRef, { activeRequestId: null, updatedAt: FieldValue.serverTimestamp() });
      }
    } else {
      const reservation = await tx.get(reservationRef);
      assertActiveReservation(reservation, travellerUid, listingId, startDate, endDate, requestId, isLegacyRequest);
      if (!isLegacyRequest) {
        tx.update(reservationRef, { activeRequestId: null, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    tx.update(ref, {
      status: target, lastAction: action, lastActorUid: uid, updatedAt: FieldValue.serverTimestamp(),
      ...(action === 'cancel' && data['status'] === 'accepted' ? {
        completionStatus: 'not_started',
        completionReason: null,
        completionInitiatedAt: FieldValue.delete(),
        completionResponseDeadline: FieldValue.delete(),
        hostConfirmedAt: FieldValue.delete(),
        travellerConfirmedAt: FieldValue.delete(),
        completionDisputedAt: FieldValue.delete(),
        completionDisputedByUid: FieldValue.delete(),
        completedAt: FieldValue.delete(),
      } : {}),
    });
    tx.create(ref.collection('events').doc(), {
      action, actorUid: uid, fromStatus: data['status'], toStatus: target, at: FieldValue.serverTimestamp(),
    });
    return { status: target };
  });
}

async function activeCaller(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore): Promise<string> {
  const uid = caller(request);
  if ((await db.doc(`users/${uid}`).get()).data()?.['accountStatus'] !== 'active') {
    throw new HttpsError('failed-precondition', 'Your account cannot access hosting requests.');
  }
  return uid;
}

function project(doc: FirebaseFirestore.DocumentSnapshot, viewerUid: string) {
  const data = doc.data();
  if (!data) throw new HttpsError('not-found', 'This request could not be found.');
  const { hostUid, travellerUid } = participantsForProjection(data);
  return {
    requestId: doc.id, listingId: data['listingId'], startDate: data['startDate'], endDate: data['endDate'],
    guestCount: data['guestCount'], introductoryMessage: data['introductoryMessage'], status: data['status'],
    completion: projectCompletion(data, viewerUid, hostUid, travellerUid),
    createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toDate().toISOString() : null,
    updatedAt: data['updatedAt'] instanceof Timestamp ? data['updatedAt'].toDate().toISOString() : null,
  };
}

function participantsForProjection(data: FirebaseFirestore.DocumentData) {
  if (typeof data['hostUid'] !== 'string' || typeof data['travellerUid'] !== 'string'
      || data['hostUid'] === data['travellerUid']) {
    throw new HttpsError('failed-precondition', 'This request has invalid participant information.');
  }
  return { hostUid: data['hostUid'] as string, travellerUid: data['travellerUid'] as string };
}

function publicReviewStats(
  data: FirebaseFirestore.DocumentData | undefined,
  uid: string,
): { reviewCount: number; averageRating: number } | null {
  if (!data) return null;
  const reviewCount = data['reviewCount'];
  const ratingTotal = data['ratingTotal'];
  if (data['uid'] !== uid || !Number.isInteger(reviewCount) || reviewCount < 1
      || !Number.isInteger(ratingTotal) || ratingTotal < reviewCount || ratingTotal > reviewCount * 5) {
    throw new HttpsError('failed-precondition', 'The participant review summary requires attention.');
  }
  return { reviewCount, averageRating: Math.round((ratingTotal / reviewCount) * 10) / 10 };
}

function publicReviewProjection(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  expectedSubjectUid: string,
) {
  const data = doc.data();
  if (data['reviewId'] !== doc.id || data['subjectUid'] !== expectedSubjectUid
      || data['status'] !== 'published' || !Number.isInteger(data['rating'])
      || data['rating'] < 1 || data['rating'] > 5
      || data['text'] !== null
      || !(data['publishedAt'] instanceof Timestamp)) {
    throw new HttpsError('failed-precondition', 'A participant review projection requires attention.');
  }
  return {
    rating: data['rating'],
    text: null,
    publishedAt: (data['publishedAt'] as Timestamp).toDate().toISOString(),
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
  let query = db.collection('hostingRequests')
    .where(participant, '==', uid)
    .orderBy('startDate')
    .orderBy(FieldPath.documentId())
    .limit(pageSize + 1);
  if (typeof cursor === 'string') {
    const cursorDocument = await db.doc(`hostingRequests/${cursor}`).get();
    if (!cursorDocument.exists || cursorDocument.data()?.[participant] !== uid) {
      throw new HttpsError('invalid-argument', 'The request cursor is invalid.');
    }
    query = query.startAfter(cursorDocument);
  }
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, pageSize);
  const refreshed = await Promise.all(docs.map((doc) => expireCompletionWindow(db, doc.ref)));
  return {
    items: refreshed.map((doc) => project(doc, uid)),
    nextCursor: snapshot.size > pageSize ? docs[docs.length - 1].id : null,
  };
}

export async function getRequest(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore) {
  const uid = await activeCaller(request, db);
  const input = object(request.data, ['requestId']);
  const requestId = input['requestId'];
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) {
    throw new HttpsError('invalid-argument', 'The request ID is invalid.');
  }
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  let snapshot = await requestRef.get();
  const data = snapshot.data();
  if (!data || (data['hostUid'] !== uid && data['travellerUid'] !== uid)) {
    throw new HttpsError('not-found', 'This request could not be found.');
  }
  snapshot = await expireCompletionWindow(db, requestRef);
  const currentData = snapshot.data();
  if (!currentData) throw new HttpsError('not-found', 'This request could not be found.');
  const otherParticipantUid = currentData[currentData['hostUid'] === uid ? 'travellerUid' : 'hostUid'];
  const [listing, traveller, otherParticipant, review, reviewStats, publishedReviews, ownBlock] = await Promise.all([
    db.doc(`listings/${currentData['listingId']}`).get(),
    db.doc(`users/${currentData['travellerUid']}`).get(),
    db.doc(`users/${otherParticipantUid}`).get(),
    db.doc(`stayReviews/${createHash('sha256').update(JSON.stringify([requestId, uid])).digest('hex')}`).get(),
    db.doc(`profileReviewStats/${otherParticipantUid}`).get(),
    db.collection('publishedStayReviews')
      .where('status', '==', 'published')
      .where('subjectUid', '==', otherParticipantUid)
      .where('text', '==', null)
      .orderBy('publishedAt', 'desc')
      .limit(5)
      .get(),
    db.doc(`userBlocks/${uid}/blocked/${otherParticipantUid}`).get(),
  ]);
  const listingData = listing.data();
  const title = listingData?.['title'];
  const name = traveller.data()?.['displayName'];
  const otherName = otherParticipant.data()?.['displayName'];
  const city = listingData?.['city'];
  const country = listingData?.['country'];
  return {
    ...project(snapshot, uid),
    viewerIsHost: currentData['hostUid'] === uid,
    viewerHasBlockedOther: ownBlock.exists,
    viewerReviewSubmitted: review.exists,
    otherParticipantReviewStats: publicReviewStats(reviewStats.data(), otherParticipantUid),
    otherParticipantReviews: publishedReviews.docs.map((doc) =>
      publicReviewProjection(doc, otherParticipantUid)),
    listingTitle: typeof title === 'string' && isSafePublicText(title) ? title : null,
    listingLocation: typeof city === 'string' && isSafePublicText(city)
      && typeof country === 'string' && isSafePublicText(country) ? `${city}, ${country}` : null,
    otherParticipantName: typeof otherName === 'string' && otherName.trim().length > 0
      && otherName.length <= 100 && isSafePublicText(otherName) ? otherName : null,
    traveller: typeof name === 'string' && name.trim().length > 0 && name.length <= 100 && isSafePublicText(name)
      ? { displayName: name } : null,
  };
}
