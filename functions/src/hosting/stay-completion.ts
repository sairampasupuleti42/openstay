import { createHash } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { error as logError } from 'firebase-functions/logger';
import {
  HOST_PARTICIPATION_TERMS_DIGEST,
  HOST_PARTICIPATION_TERMS_VERSION,
} from './host-participation.js';
import { isSafePublicText } from './public-listings.js';
import { readBlockRelationship } from '../trust/blocking.js';

const options = {
  region: 'us-central1',
  enforceAppCheck: process.env['FUNCTIONS_EMULATOR'] !== 'true',
};
const requestIdPattern = /^[a-f0-9]{64}$/;
const uidPattern = /^[^/]{1,128}$/;
const completionWindowMs = 7 * 24 * 60 * 60 * 1000;
const maxReviewTextLength = 1000;

export const initiateStayCompletion = onCall(options, (request) =>
  initiateCompletion(request, getFirestore()));
export const confirmStayCompletion = onCall(options, (request) =>
  confirmCompletion(request, getFirestore()));
export const disputeStayCompletion = onCall(options, (request) =>
  disputeCompletion(request, getFirestore()));
export const submitStayReview = onCall(options, (request) =>
  submitReview(request, getFirestore()));
export const expireStayCompletionWindows = onSchedule(
  { region: 'us-central1', schedule: 'every 5 minutes', timeoutSeconds: 540 },
  async () => expireCompletionWindows(getFirestore()),
);

function caller(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to confirm your stay.');
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before confirming your stay.');
  }
  return uid;
}

function inputObject(data: unknown, fields: string[]): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some((key) => !fields.includes(key))) {
    throw new HttpsError('invalid-argument', 'The stay completion request is invalid.');
  }
  return data as Record<string, unknown>;
}

function requestIdFrom(data: Record<string, unknown>): string {
  const requestId = data['requestId'];
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) {
    throw new HttpsError('invalid-argument', 'The hosting request ID is invalid.');
  }
  return requestId;
}

function dateIsValid(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function checkoutHasPassed(startDate: unknown, endDate: unknown, now: Timestamp): boolean {
  if (!dateIsValid(startDate) || !dateIsValid(endDate) || endDate <= startDate) {
    throw new HttpsError('failed-precondition', 'This stay has invalid checkout dates.');
  }
  return now.toDate().toISOString().slice(0, 10) > endDate;
}

function participants(data: FirebaseFirestore.DocumentData | undefined, requestId: string) {
  if (!data || data['requestId'] !== requestId
      || typeof data['hostUid'] !== 'string' || !uidPattern.test(data['hostUid'])
      || typeof data['travellerUid'] !== 'string' || !uidPattern.test(data['travellerUid'])
      || data['hostUid'] === data['travellerUid']) {
    throw new HttpsError('failed-precondition', 'This stay has invalid participant information.');
  }
  return { hostUid: data['hostUid'] as string, travellerUid: data['travellerUid'] as string };
}

function recordedConfirmation(
  data: FirebaseFirestore.DocumentData,
  uid: string,
  hostUid: string,
  travellerUid: string,
): Timestamp | undefined {
  const value = uid === hostUid ? data['hostConfirmedAt'] : data['travellerConfirmedAt'];
  return value instanceof Timestamp ? value : undefined;
}

export function projectCompletion(
  data: FirebaseFirestore.DocumentData,
  uid: string,
  hostUid: string,
  travellerUid: string,
) {
  const status = data['completionStatus'] === 'pending' || data['completionStatus'] === 'completed'
    ? data['completionStatus']
    : 'not_started';
  const rawReason = data['completionReason'];
  const reason = status === 'pending' && typeof rawReason === 'string'
      && ['awaiting_confirmation', 'disputed', 'response_window_expired'].includes(rawReason)
    ? rawReason as 'awaiting_confirmation' | 'disputed' | 'response_window_expired'
    : null;
  const deadline = data['completionResponseDeadline'] instanceof Timestamp
    ? data['completionResponseDeadline'] as Timestamp
    : null;
  return {
    status,
    reason,
    viewerConfirmed: recordedConfirmation(data, uid, hostUid, travellerUid) !== undefined,
    otherParticipantConfirmed: recordedConfirmation(
      data,
      uid === hostUid ? travellerUid : hostUid,
      hostUid,
      travellerUid,
    ) !== undefined,
    responseDeadline: deadline?.toDate().toISOString() ?? null,
    completedAt: data['completedAt'] instanceof Timestamp
      ? (data['completedAt'] as Timestamp).toDate().toISOString()
      : null,
  };
}

async function assertEligibleParticipants(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  hostUid: string,
  travellerUid: string,
): Promise<void> {
  const [host, traveller, consent, lock] = await Promise.all([
    tx.get(db.doc(`users/${hostUid}`)),
    tx.get(db.doc(`users/${travellerUid}`)),
    tx.get(db.doc(`hostPrivate/${hostUid}`)),
    tx.get(db.doc(`hostPrivate/${hostUid}/listingLifecycleState/current`)),
  ]);
  const consentData = consent.data();
  const lockData = lock.data();
  if (host.data()?.['accountStatus'] !== 'active'
      || traveller.data()?.['accountStatus'] !== 'active'
      || consentData?.['uid'] !== hostUid
      || consentData['consentState'] !== 'accepted'
      || consentData['termsVersion'] !== HOST_PARTICIPATION_TERMS_VERSION
      || consentData['termsDigest'] !== HOST_PARTICIPATION_TERMS_DIGEST
      || typeof consentData['eventId'] !== 'string'
      || !requestIdPattern.test(consentData['eventId'])
      || (lock.exists && (!(lockData?.['leaseExpiresAt'] instanceof Timestamp)
        || (lockData['leaseExpiresAt'] as Timestamp).toMillis() > Date.now()))) {
    throw new HttpsError('failed-precondition', 'The stay participants are not currently eligible.');
  }
}

function assertAcceptedStay(data: FirebaseFirestore.DocumentData): void {
  if (data['status'] !== 'accepted') {
    throw new HttpsError('failed-precondition', 'Only an accepted, uncancelled stay can be completed.');
  }
}

function assertUnstartedCompletion(data: FirebaseFirestore.DocumentData): void {
  if (data['hostConfirmedAt'] !== undefined || data['travellerConfirmedAt'] !== undefined
      || data['completionResponseDeadline'] !== undefined) {
    throw new HttpsError('failed-precondition', 'The stay completion state requires attention.');
  }
}

function assertSingleConfirmation(data: FirebaseFirestore.DocumentData): void {
  const hostConfirmed = data['hostConfirmedAt'] instanceof Timestamp;
  const travellerConfirmed = data['travellerConfirmedAt'] instanceof Timestamp;
  if (hostConfirmed === travellerConfirmed) {
    throw new HttpsError('failed-precondition', 'The stay completion state requires attention.');
  }
}

function eventRef(requestRef: FirebaseFirestore.DocumentReference) {
  return requestRef.collection('events').doc();
}

export async function expireCompletionWindow(
  db: FirebaseFirestore.Firestore,
  requestRef: FirebaseFirestore.DocumentReference,
): Promise<FirebaseFirestore.DocumentSnapshot> {
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(requestRef);
    const data = snapshot.data();
    const deadline = data?.['completionResponseDeadline'];
    if (data?.['status'] !== 'accepted'
        || data['completionStatus'] !== 'pending'
        || data['completionReason'] !== 'awaiting_confirmation'
        || !(deadline instanceof Timestamp)
        || deadline.toMillis() > Date.now()) {
      return;
    }
    assertSingleConfirmation(data);
    const now = Timestamp.now();
    const firstParticipantUid = data['hostConfirmedAt'] instanceof Timestamp
      ? data['hostUid']
      : data['travellerUid'];
    tx.update(requestRef, {
      completionReason: 'response_window_expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(eventRef(requestRef), {
      action: 'completion_window_expired',
      actorUid: firstParticipantUid,
      fromCompletionStatus: 'pending',
      toCompletionStatus: 'pending',
      completionReason: 'response_window_expired',
      at: now,
    });
  });
  return requestRef.get();
}

export async function expireCompletionWindows(db: FirebaseFirestore.Firestore): Promise<void> {
  const cutoff = Timestamp.now();
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let failures = 0;
  for (let page = 0; page < 10; page++) {
    let query = db.collection('hostingRequests')
      .where('status', '==', 'accepted')
      .where('completionStatus', '==', 'pending')
      .where('completionReason', '==', 'awaiting_confirmation')
      .where('completionResponseDeadline', '<=', cutoff)
      .orderBy('completionResponseDeadline')
      .limit(100);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      try {
        await expireCompletionWindow(db, doc.ref);
      } catch (error) {
        failures++;
        logError('Unable to expire a stay completion window.', { requestId: doc.id, error });
      }
    }
    if (snapshot.size < 100) break;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
  if (failures > 0) throw new Error(`Failed to expire ${failures} stay completion window(s).`);
}

export async function initiateCompletion(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const requestId = requestIdFrom(inputObject(request.data, ['requestId']));
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(requestRef);
    const data = snapshot.data();
    const { hostUid, travellerUid } = participants(data, requestId);
    if (uid !== hostUid && uid !== travellerUid) {
      throw new HttpsError('not-found', 'This stay could not be found.');
    }
    const actor = await tx.get(db.doc(`users/${uid}`));
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot confirm this stay.');
    }
    assertAcceptedStay(data!);
    const now = Timestamp.now();
    if (!checkoutHasPassed(data!['startDate'], data!['endDate'], now)) {
      throw new HttpsError('failed-precondition', 'Completion confirmation opens after checkout.');
    }
    const status = data!['completionStatus'] ?? 'not_started';
    const ownConfirmation = recordedConfirmation(data!, uid, hostUid, travellerUid);
    if (status === 'completed' && ownConfirmation) {
      return projectCompletion(data!, uid, hostUid, travellerUid);
    }
    if (status === 'pending' && ownConfirmation
        && data!['completionReason'] === 'awaiting_confirmation') {
      const deadline = data!['completionResponseDeadline'];
      if (!(deadline instanceof Timestamp)) {
        throw new HttpsError('failed-precondition', 'The confirmation window requires attention.');
      }
      if (deadline.toMillis() <= now.toMillis()) {
        tx.update(requestRef, {
          completionReason: 'response_window_expired',
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.create(eventRef(requestRef), {
          action: 'completion_window_expired',
          actorUid: uid,
          fromCompletionStatus: 'pending',
          toCompletionStatus: 'pending',
          completionReason: 'response_window_expired',
          at: now,
        });
        return {
          ...projectCompletion(data!, uid, hostUid, travellerUid),
          reason: 'response_window_expired' as const,
        };
      }
      return projectCompletion(data!, uid, hostUid, travellerUid);
    }
    if (status !== 'not_started') {
      throw new HttpsError('failed-precondition', 'This stay is already in a completion process.');
    }
    assertUnstartedCompletion(data!);
    await assertEligibleParticipants(tx, db, hostUid, travellerUid);
    const deadline = Timestamp.fromMillis(now.toMillis() + completionWindowMs);
    const confirmationField = uid === hostUid ? 'hostConfirmedAt' : 'travellerConfirmedAt';
    tx.update(requestRef, {
      completionStatus: 'pending',
      completionReason: 'awaiting_confirmation',
      completionInitiatedAt: now,
      completionResponseDeadline: deadline,
      [confirmationField]: now,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(eventRef(requestRef), {
      action: 'completion_initiated',
      actorUid: uid,
      fromCompletionStatus: 'not_started',
      toCompletionStatus: 'pending',
      at: now,
    });
    return {
      status: 'pending' as const,
      reason: 'awaiting_confirmation' as const,
      viewerConfirmed: true,
      otherParticipantConfirmed: false,
      responseDeadline: deadline.toDate().toISOString(),
      completedAt: null,
    };
  });
}

export async function confirmCompletion(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const requestId = requestIdFrom(inputObject(request.data, ['requestId']));
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(requestRef);
    const data = snapshot.data();
    const { hostUid, travellerUid } = participants(data, requestId);
    if (uid !== hostUid && uid !== travellerUid) {
      throw new HttpsError('not-found', 'This stay could not be found.');
    }
    const actor = await tx.get(db.doc(`users/${uid}`));
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot confirm this stay.');
    }
    assertAcceptedStay(data!);
    const now = Timestamp.now();
    if (!checkoutHasPassed(data!['startDate'], data!['endDate'], now)) {
      throw new HttpsError('failed-precondition', 'Completion confirmation opens after checkout.');
    }
    const state = data!['completionStatus'] ?? 'not_started';
    const ownConfirmation = recordedConfirmation(data!, uid, hostUid, travellerUid);
    if (ownConfirmation && state === 'completed'
        && data!['completionReason'] === null
        && data!['completedAt'] instanceof Timestamp) {
      return { completion: projectCompletion(data!, uid, hostUid, travellerUid), expired: false };
    }
    if (ownConfirmation && state === 'pending'
        && data!['completionReason'] === 'awaiting_confirmation') {
      const deadline = data!['completionResponseDeadline'];
      if (!(deadline instanceof Timestamp)) {
        throw new HttpsError('failed-precondition', 'The confirmation window requires attention.');
      }
      if (deadline.toMillis() <= now.toMillis()) {
        tx.update(requestRef, {
          completionReason: 'response_window_expired',
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.create(eventRef(requestRef), {
          action: 'completion_window_expired',
          actorUid: uid,
          fromCompletionStatus: 'pending',
          toCompletionStatus: 'pending',
          completionReason: 'response_window_expired',
          at: now,
        });
        return {
          completion: {
            ...projectCompletion(data!, uid, hostUid, travellerUid),
            reason: 'response_window_expired' as const,
          },
          expired: true,
        };
      }
      return { completion: projectCompletion(data!, uid, hostUid, travellerUid), expired: false };
    }
    if (ownConfirmation && state === 'pending'
        && ['disputed', 'response_window_expired'].includes(String(data!['completionReason']))) {
      return { completion: projectCompletion(data!, uid, hostUid, travellerUid), expired: false };
    }
    if (state !== 'pending' || data!['completionReason'] !== 'awaiting_confirmation') {
      throw new HttpsError('failed-precondition', 'There is no active confirmation to confirm.');
    }
    assertSingleConfirmation(data!);
    await assertEligibleParticipants(tx, db, hostUid, travellerUid);
    const deadline = data!['completionResponseDeadline'];
    if (!(deadline instanceof Timestamp)) {
      throw new HttpsError('failed-precondition', 'The confirmation window requires attention.');
    }
    if (deadline.toMillis() <= now.toMillis()) {
      tx.update(requestRef, {
        completionReason: 'response_window_expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.create(eventRef(requestRef), {
        action: 'completion_window_expired',
        actorUid: uid === hostUid ? travellerUid : hostUid,
        fromCompletionStatus: 'pending',
        toCompletionStatus: 'pending',
        completionReason: 'response_window_expired',
        at: now,
      });
      return {
        completion: {
          ...projectCompletion(data!, uid, hostUid, travellerUid),
          reason: 'response_window_expired' as const,
        },
        expired: true,
      };
    }

    const firstConfirmedByHost = data!['hostConfirmedAt'] instanceof Timestamp;
    if ((firstConfirmedByHost && uid === hostUid)
        || (!firstConfirmedByHost && uid === travellerUid)) {
      throw new HttpsError('failed-precondition', 'The other participant must confirm this stay.');
    }
    const confirmationField = uid === hostUid ? 'hostConfirmedAt' : 'travellerConfirmedAt';
    tx.update(requestRef, {
      [confirmationField]: now,
      completionStatus: 'completed',
      completionReason: null,
      completedAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(eventRef(requestRef), {
      action: 'completion_confirmed',
      actorUid: uid,
      fromCompletionStatus: 'pending',
      toCompletionStatus: 'completed',
      at: now,
    });
    return {
      completion: {
        status: 'completed' as const,
        reason: null,
        viewerConfirmed: true,
        otherParticipantConfirmed: true,
        responseDeadline: deadline.toDate().toISOString(),
        completedAt: now.toDate().toISOString(),
      },
      expired: false,
    };
  });
  if (result.expired) {
    throw new HttpsError('failed-precondition', 'The confirmation window expired; the stay remains incomplete.');
  }
  return result.completion;
}

export async function disputeCompletion(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const requestId = requestIdFrom(inputObject(request.data, ['requestId']));
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(requestRef);
    const data = snapshot.data();
    const { hostUid, travellerUid } = participants(data, requestId);
    if (uid !== hostUid && uid !== travellerUid) {
      throw new HttpsError('not-found', 'This stay could not be found.');
    }
    const actor = await tx.get(db.doc(`users/${uid}`));
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot dispute this stay.');
    }
    assertAcceptedStay(data!);
    const now = Timestamp.now();
    if (!checkoutHasPassed(data!['startDate'], data!['endDate'], now)) {
      throw new HttpsError('failed-precondition', 'Completion confirmation opens after checkout.');
    }
    if (data!['completionStatus'] === 'pending' && data!['completionReason'] === 'disputed') {
      return projectCompletion(data!, uid, hostUid, travellerUid);
    }
    const reason = data!['completionReason'];
    if (data!['completionStatus'] !== 'pending'
        || typeof reason !== 'string'
        || !['awaiting_confirmation', 'response_window_expired'].includes(reason)) {
      throw new HttpsError('failed-precondition', 'This stay cannot be disputed in its current state.');
    }
    assertSingleConfirmation(data!);
    await assertEligibleParticipants(tx, db, hostUid, travellerUid);
    tx.update(requestRef, {
      completionReason: 'disputed',
      completionDisputedAt: now,
      completionDisputedByUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(eventRef(requestRef), {
      action: 'completion_disputed',
      actorUid: uid,
      fromCompletionStatus: 'pending',
      toCompletionStatus: 'pending',
      completionReason: 'disputed',
      at: now,
    });
    return {
      ...projectCompletion(data!, uid, hostUid, travellerUid),
      reason: 'disputed' as const,
    };
  });
}

function normalizeReviewText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'Review text must be a string.');
  }
  const text = value.normalize('NFKC').replace(/\r\n?/g, '\n').trim();
  if (text.length > maxReviewTextLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)
      || (text.length > 0 && !isSafePublicText(text))) {
    throw new HttpsError('invalid-argument', 'Review text must be up to 1,000 characters and exclude contact details or exact addresses.');
  }
  return text || undefined;
}

function reviewId(requestId: string, authorUid: string): string {
  return createHash('sha256').update(JSON.stringify([requestId, authorUid])).digest('hex');
}

export async function submitReview(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['requestId', 'rating', 'text']);
  const requestId = requestIdFrom(input);
  const rating = input['rating'];
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpsError('invalid-argument', 'Choose a rating from 1 to 5.');
  }
  const text = normalizeReviewText(input['text']);
  const id = reviewId(requestId, uid);
  const requestRef = db.doc(`hostingRequests/${requestId}`);
  const reviewRef = db.doc(`stayReviews/${id}`);
  const projectionRef = db.doc(`publishedStayReviews/${id}`);
  return db.runTransaction(async (tx) => {
    const [stay, actor, review, projection] = await Promise.all([
      tx.get(requestRef),
      tx.get(db.doc(`users/${uid}`)),
      tx.get(reviewRef),
      tx.get(projectionRef),
    ]);
    const data = stay.data();
    const { hostUid, travellerUid } = participants(data, requestId);
    if (uid !== hostUid && uid !== travellerUid) {
      throw new HttpsError('not-found', 'This stay could not be found.');
    }
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot submit a review.');
    }
    if (data?.['status'] !== 'accepted'
        || data['completionStatus'] !== 'completed'
        || !(data['hostConfirmedAt'] instanceof Timestamp)
        || !(data['travellerConfirmedAt'] instanceof Timestamp)
        || !(data['completedAt'] instanceof Timestamp)) {
      throw new HttpsError('failed-precondition', 'Reviews are available only after mutual stay completion.');
    }
    const subjectUid = uid === hostUid ? travellerUid : hostUid;
    if (subjectUid === uid) {
      throw new HttpsError('failed-precondition', 'You cannot review yourself.');
    }
    if ((await readBlockRelationship(tx, db, uid, subjectUid)).blocked) {
      throw new HttpsError('failed-precondition', 'This interaction is unavailable.');
    }
    const statsRef = db.doc(`profileReviewStats/${subjectUid}`);
    const stats = await tx.get(statsRef);
    if (review.exists || projection.exists) {
      const existing = review.data();
      if (existing?.['authorUid'] === uid && existing['requestId'] === requestId
          && existing['subjectUid'] === subjectUid && existing['rating'] === rating
          && existing['text'] === (text ?? null)) {
        return { reviewId: id, submitted: true };
      }
      throw new HttpsError('already-exists', 'You have already reviewed this stay.');
    }
    const actorData = actor.data();
    const currentCount = stats.data()?.['reviewCount'] ?? 0;
    const currentTotal = stats.data()?.['ratingTotal'] ?? 0;
    if (!actorData || !Number.isInteger(currentCount) || !Number.isInteger(currentTotal)
        || currentCount < 0 || currentTotal < 0
        || (stats.exists && (stats.data()?.['uid'] !== subjectUid || currentCount < 1
          || currentTotal < currentCount || currentTotal > currentCount * 5))) {
      throw new HttpsError('failed-precondition', 'The review aggregate requires attention.');
    }
    const now = Timestamp.now();
    const previousCount = currentCount;
    const previousTotal = currentTotal;
    const reviewFields = {
      reviewId: id,
      requestId,
      authorUid: uid,
      subjectUid,
      rating,
      text: text ?? null,
      status: 'published',
      createdAt: now,
      publishedAt: now,
    };
    tx.create(reviewRef, reviewFields);
    tx.create(projectionRef, {
      reviewId: id,
      subjectUid,
      rating,
      text: null,
      status: 'published',
      publishedAt: now,
    });
    tx.set(statsRef, {
      uid: subjectUid,
      reviewCount: previousCount + 1,
      ratingTotal: previousTotal + rating,
      updatedAt: now,
    });
    tx.create(eventRef(requestRef), {
      action: 'review_submitted',
      actorUid: uid,
      subjectUid,
      reviewId: id,
      fromStatus: 'completed',
      toStatus: 'completed',
      at: now,
    });
    return { reviewId: id, submitted: true };
  });
}
