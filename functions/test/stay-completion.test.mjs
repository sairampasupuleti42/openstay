import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from '../lib/hosting/host-participation.js';
import { createRequest, getRequest, transitionRequest } from '../lib/hosting/hosting-requests.js';
import {
  confirmCompletion,
  disputeCompletion,
  expireCompletionWindows,
  initiateCompletion,
  submitReview,
} from '../lib/hosting/stay-completion.js';
import { setBlock } from '../lib/trust/blocking.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Stay completion tests require the demo-openstay Firestore emulator.');
}

const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
after(async () => deleteApp(app));

const call = (uid, data, emailVerified = true) => ({
  auth: { uid, token: { email_verified: emailVerified } },
  data,
});

async function acceptedStay(label, {
  startDate = '2000-01-01',
  endDate = '2000-01-05',
  travellerUid = `completion-traveller-${label}`,
} = {}) {
  const hostUid = `completion-host-${label}`;
  const listingId = `completion-listing-${label}`;
  await Promise.all([
    db.doc(`users/${hostUid}`).set({ accountStatus: 'active', displayName: 'Host' }),
    db.doc(`users/${travellerUid}`).set({ accountStatus: 'active', displayName: 'Traveller' }),
    db.doc(`hostPrivate/${hostUid}`).set({
      uid: hostUid,
      consentState: 'accepted',
      termsVersion: HOST_PARTICIPATION_TERMS_VERSION,
      termsDigest: HOST_PARTICIPATION_TERMS_DIGEST,
      eventId: 'a'.repeat(64),
    }),
    db.doc(`listings/${listingId}`).set({
      listingId,
      hostUid,
      status: 'published',
      guestCapacity: 2,
      title: 'A lovely stay',
      description: 'A comfortable and thoughtfully prepared place to stay with a bright room and a shared kitchen.',
      accommodationType: 'private_room',
      country: 'New Zealand',
      city: 'Wellington',
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
    }),
  ]);
  const result = await createRequest(call(travellerUid, {
    listingId,
    startDate,
    endDate,
    guestCount: 1,
    introductoryMessage: 'Hello, I would love to visit.',
  }), db);
  const requestId = result.requestId;
  await transitionRequest(call(hostUid, { requestId, action: 'accept' }), db);
  return { hostUid, travellerUid, listingId, requestId };
}

async function events(requestId) {
  return db.collection(`hostingRequests/${requestId}/events`).get();
}

function controlledDatabase() {
  let markStarted;
  let release;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let first = true;
  return {
    started,
    release,
    database: {
      doc: db.doc.bind(db),
      runTransaction: (operation) => db.runTransaction((tx) => operation(new Proxy(tx, {
        get(target, property) {
          if (property === 'get') {
            return async (...args) => {
              const isFirst = first;
              first = false;
              if (isFirst) {
                markStarted();
                await gate;
              }
              return target.get(...args);
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }))),
    },
  };
}

test('host-first and traveller-first mutual confirmation complete only after the second participant confirms', async () => {
  for (const [label, firstUid, secondUid] of [
    ['host-first', 'hostUid', 'travellerUid'],
    ['traveller-first', 'travellerUid', 'hostUid'],
  ]) {
    const stay = await acceptedStay(label);
    const initiated = await initiateCompletion(call(stay[firstUid], { requestId: stay.requestId }), db);
    assert.equal(initiated.status, 'pending');
    assert.equal(initiated.reason, 'awaiting_confirmation');
    assert.equal(initiated.viewerConfirmed, true);
    assert.equal(initiated.otherParticipantConfirmed, false);
    const savedAfterInitiation = (await db.doc(`hostingRequests/${stay.requestId}`).get()).data();
    assert.equal(
      savedAfterInitiation.completionResponseDeadline.toMillis()
        - savedAfterInitiation.completionInitiatedAt.toMillis(),
      7 * 24 * 60 * 60 * 1000,
    );

    const retry = await initiateCompletion(call(stay[firstUid], { requestId: stay.requestId }), db);
    assert.equal(retry.responseDeadline, initiated.responseDeadline);
    assert.equal((await events(stay.requestId)).size, 2);

    const completed = await confirmCompletion(call(stay[secondUid], { requestId: stay.requestId }), db);
    assert.equal(completed.status, 'completed');
    assert.equal(completed.viewerConfirmed, true);
    assert.equal(completed.otherParticipantConfirmed, true);
    assert.equal((await db.doc(`hostingRequests/${stay.requestId}`).get()).data().completionStatus, 'completed');
  }
});

test('concurrent confirmation retries are idempotent and create one completion event', async () => {
  const stay = await acceptedStay('concurrent');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  const results = await Promise.all(Array.from({ length: 5 }, () =>
    confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db)));
  assert.ok(results.every((result) => result.status === 'completed'));
  const completionEvents = (await events(stay.requestId)).docs
    .filter((event) => event.data().action === 'completion_confirmed');
  assert.equal(completionEvents.length, 1);
});

test('confirmation and dispute races resolve to one valid pending or completed state', async () => {
  const stay = await acceptedStay('confirm-dispute-race');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  const results = await Promise.allSettled([
    confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db),
    disputeCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db),
  ]);
  const saved = (await db.doc(`hostingRequests/${stay.requestId}`).get()).data();
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  if (saved.completionStatus === 'completed') {
    assert.equal(saved.completionReason, null);
    assert.ok(saved.hostConfirmedAt instanceof Timestamp);
    assert.ok(saved.travellerConfirmedAt instanceof Timestamp);
    assert.ok(saved.completedAt instanceof Timestamp);
    assert.equal((await events(stay.requestId)).docs.filter(
      (event) => ['completion_confirmed', 'completion_disputed'].includes(event.data().action),
    ).length, 1);
  } else {
    assert.equal(saved.completionStatus, 'pending');
    assert.equal(saved.completionReason, 'disputed');
    assert.ok(saved.hostConfirmedAt instanceof Timestamp);
    assert.equal(saved.travellerConfirmedAt, undefined);
    assert.equal(saved.completedAt, undefined);
    assert.equal((await events(stay.requestId)).docs.filter(
      (event) => event.data().action === 'completion_confirmed',
    ).length, 0);
  }
});

test('confirmation and cancellation races cannot leave completion on a cancelled stay', async () => {
  const stay = await acceptedStay('confirm-cancel-race');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  const results = await Promise.allSettled([
    confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db),
    transitionRequest(call(stay.travellerUid, {
      requestId: stay.requestId,
      action: 'cancel',
    }), db),
  ]);
  const saved = (await db.doc(`hostingRequests/${stay.requestId}`).get()).data();
  if (saved.status === 'cancelled') {
    assert.equal(saved.completionStatus, 'not_started');
    assert.equal(saved.completionReason, null);
    assert.equal(saved.hostConfirmedAt, undefined);
    assert.equal(saved.travellerConfirmedAt, undefined);
    assert.equal(saved.completedAt, undefined);
    assert.equal((await events(stay.requestId)).docs.filter(
      (event) => event.data().action === 'completion_confirmed',
    ).length, 0);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  } else {
    assert.equal(saved.status, 'accepted');
    assert.equal(saved.completionStatus, 'completed');
    assert.ok(saved.hostConfirmedAt instanceof Timestamp);
    assert.ok(saved.travellerConfirmedAt instanceof Timestamp);
    assert.ok(saved.completedAt instanceof Timestamp);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  }
});

test('confirmation races serialize correctly with dispute and cancellation in both orders', async () => {
  for (const [action, winner] of [
    ['dispute', 'confirm'], ['dispute', 'other'],
    ['cancel', 'confirm'], ['cancel', 'other'],
  ]) {
    const stay = await acceptedStay(`ordered-${action}-${winner}`);
    await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
    const confirmation = (database) => confirmCompletion(call(stay.travellerUid, {
      requestId: stay.requestId,
    }), database);
    const other = (database) => action === 'dispute'
      ? disputeCompletion(call(stay.hostUid, { requestId: stay.requestId }), database)
      : transitionRequest(call(stay.hostUid, { requestId: stay.requestId, action: 'cancel' }), database);
    const second = controlledDatabase();
    const secondPromise = (winner === 'confirm' ? other : confirmation)(second.database);
    await second.started;
    const firstPromise = (winner === 'confirm' ? confirmation : other)(db);
    const firstResult = await Promise.allSettled([firstPromise]);
    second.release();
    const results = [...firstResult, ...(await Promise.allSettled([secondPromise]))];
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    assert.equal(results[1].reason.code, 'failed-precondition');
    const saved = (await db.doc(`hostingRequests/${stay.requestId}`).get()).data();
    if (winner === 'confirm') {
      assert.equal(saved.status, 'accepted');
      assert.equal(saved.completionStatus, 'completed');
      assert.ok(saved.hostConfirmedAt instanceof Timestamp);
      assert.ok(saved.travellerConfirmedAt instanceof Timestamp);
    } else if (action === 'dispute') {
      assert.equal(saved.status, 'accepted');
      assert.equal(saved.completionStatus, 'pending');
      assert.equal(saved.completionReason, 'disputed');
      assert.equal(saved.completedAt, undefined);
    } else {
      assert.equal(saved.status, 'cancelled');
      assert.equal(saved.completionStatus, 'not_started');
      assert.equal(saved.completedAt, undefined);
    }
  }
});

test('confirmation requires checkout, verified authentication and a real participant', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const stay = await acceptedStay('eligibility', { startDate: yesterday, endDate: today });
  await assert.rejects(initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db), {
    code: 'failed-precondition',
  });
  await assert.rejects(initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }, false), db), {
    code: 'failed-precondition',
  });
  await assert.rejects(initiateCompletion({ data: { requestId: stay.requestId } }, db), {
    code: 'unauthenticated',
  });
  await assert.rejects(initiateCompletion(call('completion-outsider', { requestId: stay.requestId }), db), {
    code: 'not-found',
  });
  await assert.rejects(initiateCompletion(call(stay.hostUid, {
    requestId: stay.requestId,
    completionStatus: 'completed',
  }), db), { code: 'invalid-argument' });

  const oldStay = await acceptedStay('checkout-passed');
  const state = await initiateCompletion(call(oldStay.travellerUid, {
    requestId: oldStay.requestId,
  }), db);
  assert.equal(state.status, 'pending');
});

test('expired response windows remain pending and can never complete late', async () => {
  const stay = await acceptedStay('expired');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  await db.doc(`hostingRequests/${stay.requestId}`).update({
    completionResponseDeadline: Timestamp.fromMillis(Date.now() - 1000),
  });
  await assert.rejects(confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db), { code: 'failed-precondition' });
  const saved = (await db.doc(`hostingRequests/${stay.requestId}`).get()).data();
  assert.equal(saved.completionStatus, 'pending');
  assert.equal(saved.completionReason, 'response_window_expired');
  await assert.rejects(confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db), { code: 'failed-precondition' });
  assert.equal((await events(stay.requestId)).docs.filter(
    (event) => event.data().action === 'completion_window_expired',
  ).length, 1);
});

test('scheduled expiry records overdue pending stays without participant activity and is idempotent', async () => {
  const overdue = await acceptedStay('sweep-overdue');
  const future = await acceptedStay('sweep-future');
  const disputed = await acceptedStay('sweep-disputed');
  for (const stay of [overdue, future, disputed]) {
    await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  }
  const past = Timestamp.fromMillis(Date.now() - 60_000);
  await Promise.all([
    db.doc(`hostingRequests/${overdue.requestId}`).update({ completionResponseDeadline: past }),
    db.doc(`hostingRequests/${disputed.requestId}`).update({ completionResponseDeadline: past }),
  ]);
  await disputeCompletion(call(disputed.travellerUid, { requestId: disputed.requestId }), db);
  await expireCompletionWindows(db);
  await expireCompletionWindows(db);
  const saved = (await db.doc(`hostingRequests/${overdue.requestId}`).get()).data();
  assert.equal(saved.status, 'accepted');
  assert.equal(saved.completionStatus, 'pending');
  assert.equal(saved.completionReason, 'response_window_expired');
  assert.equal(saved.completedAt, undefined);
  assert.equal((await db.doc(`hostingRequests/${future.requestId}`).get()).data().completionReason, 'awaiting_confirmation');
  assert.equal((await db.doc(`hostingRequests/${disputed.requestId}`).get()).data().completionReason, 'disputed');
  assert.equal((await events(overdue.requestId)).docs.filter(
    (event) => event.data().action === 'completion_window_expired',
  ).length, 1);
});

test('a dispute is terminal for M5.1 and never permits review or moderator substitution', async () => {
  const stay = await acceptedStay('disputed');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  const disputed = await disputeCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db);
  assert.equal(disputed.status, 'pending');
  assert.equal(disputed.reason, 'disputed');
  await disputeCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  await assert.rejects(confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db), { code: 'failed-precondition' });
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
  }), db), { code: 'failed-precondition' });
  await assert.rejects(disputeCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
    narrative: 'private details',
  }), db), { code: 'invalid-argument' });
  assert.equal((await db.doc(`hostingRequests/${stay.requestId}`).get()).data().completionStatus, 'pending');
  assert.equal((await events(stay.requestId)).docs.filter(
    (event) => event.data().action === 'completion_disputed',
  ).length, 1);
});

test('account, host consent, and host lifecycle locks are rechecked transactionally', async () => {
  const stay = await acceptedStay('participant-state');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  const hostUser = db.doc(`users/${stay.hostUid}`);
  const consent = db.doc(`hostPrivate/${stay.hostUid}`);
  const lock = db.doc(`hostPrivate/${stay.hostUid}/listingLifecycleState/current`);
  await hostUser.update({ accountStatus: 'suspended' });
  await assert.rejects(confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db), { code: 'failed-precondition' });
  await hostUser.update({ accountStatus: 'active' });
  await consent.update({ consentState: 'withdrawn' });
  await assert.rejects(confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db), { code: 'failed-precondition' });
  await consent.update({ consentState: 'accepted' });
  await lock.set({ leaseExpiresAt: Timestamp.fromMillis(Date.now() + 60_000) });
  await assert.rejects(confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db), { code: 'failed-precondition' });
  await lock.delete();
  assert.equal((await confirmCompletion(call(stay.travellerUid, {
    requestId: stay.requestId,
  }), db)).status, 'completed');
});

test('cancellation clears pending completion and completed stays cannot be cancelled', async () => {
  const pending = await acceptedStay('cancel-pending');
  await initiateCompletion(call(pending.hostUid, { requestId: pending.requestId }), db);
  await transitionRequest(call(pending.travellerUid, {
    requestId: pending.requestId,
    action: 'cancel',
  }), db);
  const cancelled = (await db.doc(`hostingRequests/${pending.requestId}`).get()).data();
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.completionStatus, 'not_started');
  assert.equal(cancelled.hostConfirmedAt, undefined);
  await assert.rejects(confirmCompletion(call(pending.travellerUid, {
    requestId: pending.requestId,
  }), db), { code: 'failed-precondition' });

  const completed = await acceptedStay('cancel-completed');
  await initiateCompletion(call(completed.hostUid, { requestId: completed.requestId }), db);
  await confirmCompletion(call(completed.travellerUid, { requestId: completed.requestId }), db);
  await assert.rejects(transitionRequest(call(completed.hostUid, {
    requestId: completed.requestId,
    action: 'cancel',
  }), db), { code: 'failed-precondition' });
});

test('reviews require mutual completion and publish one anonymous projection with trusted aggregates', async () => {
  const stay = await acceptedStay('reviews');
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
  }), db), { code: 'failed-precondition' });
  await initiateCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db);
  await confirmCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);

  const hostReview = await submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
    text: 'We stayed from 2026-03-01 to 2026-03-04 and discussed private matters.',
  }), db);
  const hostReviewRetry = await submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
    text: 'We stayed from 2026-03-01 to 2026-03-04 and discussed private matters.',
  }), db);
  assert.deepEqual(hostReviewRetry, hostReview);
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 4,
  }), db), { code: 'already-exists' });

  const privateReview = (await db.doc(`stayReviews/${hostReview.reviewId}`).get()).data();
  const projection = (await db.doc(`publishedStayReviews/${hostReview.reviewId}`).get()).data();
  assert.equal(privateReview.authorUid, stay.hostUid);
  assert.equal(privateReview.subjectUid, stay.travellerUid);
  assert.equal(privateReview.text, 'We stayed from 2026-03-01 to 2026-03-04 and discussed private matters.');
  assert.equal(projection.subjectUid, stay.travellerUid);
  assert.equal(projection.text, null);
  assert.equal('authorUid' in projection, false);
  assert.equal('requestId' in projection, false);
  assert.equal('startDate' in projection, false);
  assert.equal('endDate' in projection, false);
  await db.doc('publishedStayReviews/legacy-private-text').set({
    reviewId: 'legacy-private-text',
    subjectUid: stay.travellerUid,
    rating: 1,
    text: 'Private stay dates and conversation details',
    status: 'published',
    publishedAt: Timestamp.now(),
  });
  const hostDetails = await getRequest(call(stay.hostUid, { requestId: stay.requestId }), db);
  assert.deepEqual(hostDetails.otherParticipantReviewStats, {
    reviewCount: 1,
    averageRating: 5,
  });
  assert.deepEqual(hostDetails.otherParticipantReviews, [{
    rating: 5,
    text: null,
    publishedAt: hostDetails.otherParticipantReviews[0].publishedAt,
  }]);
  assert.equal('otherParticipantUid' in hostDetails, false);
  const travellerStatsAfterFirst = (await db.doc(`profileReviewStats/${stay.travellerUid}`).get()).data();
  assert.equal(travellerStatsAfterFirst.uid, stay.travellerUid);
  assert.equal(travellerStatsAfterFirst.reviewCount, 1);
  assert.equal(travellerStatsAfterFirst.ratingTotal, 5);

  await submitReview(call(stay.travellerUid, {
    requestId: stay.requestId,
    rating: 4,
  }), db);
  const travellerStats = (await db.doc(`profileReviewStats/${stay.travellerUid}`).get()).data();
  assert.equal(travellerStats.reviewCount, 1);
  assert.equal(travellerStats.ratingTotal, 5);
  const hostStats = (await db.doc(`profileReviewStats/${stay.hostUid}`).get()).data();
  assert.equal(hostStats.reviewCount, 1);
  assert.equal(hostStats.ratingTotal, 4);
});

test('blocking preserves accepted-stay completion and history but prevents a new review', async () => {
  const stay = await acceptedStay('blocked-review');
  await setBlock(call(stay.hostUid, { targetUid: stay.travellerUid }), db);
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  await confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db);
  const request = (await db.doc(`hostingRequests/${stay.requestId}`).get()).data();
  assert.equal(request.status, 'accepted');
  assert.equal(request.completionStatus, 'completed');
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
  }), db), { code: 'failed-precondition' });
  assert.equal((await db.doc(`stayReviews/${createHash('sha256')
    .update(JSON.stringify([stay.requestId, stay.hostUid])).digest('hex')}`).get()).exists, false);
});

test('concurrent duplicate review submissions create one review and increment the aggregate once', async () => {
  const stay = await acceptedStay('duplicate-review-race');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  await confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db);
  const results = await Promise.all(Array.from({ length: 4 }, () =>
    submitReview(call(stay.hostUid, { requestId: stay.requestId, rating: 4 }), db)));
  assert.ok(results.every((result) => result.reviewId === results[0].reviewId));
  const stats = (await db.doc(`profileReviewStats/${stay.travellerUid}`).get()).data();
  assert.equal(stats.reviewCount, 1);
  assert.equal(stats.ratingTotal, 4);
  assert.equal((await events(stay.requestId)).docs.filter(
    (event) => event.data().action === 'review_submitted',
  ).length, 1);
});

test('reviews reject malformed ratings, self-review data, nonparticipants, and inactive authors', async () => {
  const stay = await acceptedStay('review-invalid');
  await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
  await confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db);
  for (const rating of [0, 6, 2.5, '5']) {
    await assert.rejects(submitReview(call(stay.hostUid, {
      requestId: stay.requestId,
      rating,
    }), db), { code: 'invalid-argument' });
  }
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
    subjectUid: stay.hostUid,
  }), db), { code: 'invalid-argument' });
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
    text: 'Contact me at person@example.com',
  }), db), { code: 'invalid-argument' });
  const selfReviewRequestId = 'b'.repeat(64);
  await db.doc(`hostingRequests/${selfReviewRequestId}`).set({
    requestId: selfReviewRequestId,
    hostUid: stay.hostUid,
    travellerUid: stay.hostUid,
    status: 'accepted',
    completionStatus: 'completed',
    hostConfirmedAt: Timestamp.now(),
    travellerConfirmedAt: Timestamp.now(),
    completedAt: Timestamp.now(),
  });
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: selfReviewRequestId,
    rating: 5,
  }), db), { code: 'failed-precondition' });
  await db.doc('users/review-outsider').set({ accountStatus: 'active' });
  await assert.rejects(submitReview(call('review-outsider', {
    requestId: stay.requestId,
    rating: 5,
  }), db), { code: 'not-found' });
  await db.doc(`users/${stay.hostUid}`).update({ accountStatus: 'suspended' });
  await assert.rejects(submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: 5,
  }), db), { code: 'failed-precondition' });
});

test('review aggregates accept additional reviews for the same profile', async () => {
  const subjectUid = 'completion-shared-review-subject';
  const firstStay = await acceptedStay('aggregate-first', { travellerUid: subjectUid });
  await initiateCompletion(call(firstStay.hostUid, { requestId: firstStay.requestId }), db);
  await confirmCompletion(call(firstStay.travellerUid, { requestId: firstStay.requestId }), db);
  await submitReview(call(firstStay.hostUid, {
    requestId: firstStay.requestId,
    rating: 5,
  }), db);

  const secondStay = await acceptedStay('aggregate-second', { travellerUid: subjectUid });
  const thirdStay = await acceptedStay('aggregate-third', { travellerUid: subjectUid });
  for (const stay of [secondStay, thirdStay]) {
    await initiateCompletion(call(stay.hostUid, { requestId: stay.requestId }), db);
    await confirmCompletion(call(stay.travellerUid, { requestId: stay.requestId }), db);
  }
  await Promise.all([secondStay, thirdStay].map((stay, index) => submitReview(call(stay.hostUid, {
    requestId: stay.requestId,
    rating: index + 3,
  }), db)));

  const stats = (await db.doc(`profileReviewStats/${subjectUid}`).get()).data();
  assert.equal(stats.uid, subjectUid);
  assert.equal(stats.reviewCount, 3);
  assert.equal(stats.ratingTotal, 12);
});
