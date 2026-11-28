import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from '../lib/hosting/host-participation.js';
import { recordParticipationEvent } from '../lib/hosting/host-participation.js';
import { createRequest, getRequest, listRequests, transitionRequest } from '../lib/hosting/hosting-requests.js';
import { removeBlock, setBlock } from '../lib/trust/blocking.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Hosting request tests require the demo-openstay Firestore emulator.');
}
const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
after(async () => deleteApp(app));
const call = (uid, data, emailVerified = true) => ({
  auth: { uid, token: { email_verified: emailVerified } }, data,
});
const input = (listingId, overrides = {}) => ({
  listingId, startDate: '2030-01-10', endDate: '2030-01-15', guestCount: 2,
  introductoryMessage: 'Hello, I would love to visit.', ...overrides,
});
async function seed(suffix) {
  const host = `request-host-${suffix}`;
  const traveller = `request-traveller-${suffix}`;
  const listingId = `request-listing-${suffix}`;
  await Promise.all([
    db.doc(`users/${host}`).set({ accountStatus: 'active' }),
    db.doc(`users/${traveller}`).set({ accountStatus: 'active', displayName: 'Traveller', phoneNumber: 'private' }),
    db.doc(`hostPrivate/${host}`).set({
      uid: host, consentState: 'accepted', termsVersion: HOST_PARTICIPATION_TERMS_VERSION,
      termsDigest: HOST_PARTICIPATION_TERMS_DIGEST, eventId: 'a'.repeat(64),
    }),
    db.doc(`listings/${listingId}`).set({
      listingId, hostUid: host, status: 'published', guestCapacity: 2, title: 'A lovely stay',
      description: 'A comfortable and thoughtfully prepared place to stay with a bright room and a shared kitchen.',
      accommodationType: 'private_room', country: 'New Zealand', city: 'Wellington',
      bedrooms: 1, beds: 1, bathrooms: 1, amenities: [], houseRules: [],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(), publishedAt: Timestamp.now(),
    }),
  ]);
  return { host, traveller, listingId };
}

test('concurrent duplicates serialize, participant queries and details are projected', async () => {
  const { host, traveller, listingId } = await seed('concurrent');
  const results = await Promise.allSettled(Array.from({ length: 5 }, () =>
    createRequest(call(traveller, input(listingId)), db)));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.code === 'already-exists').length, 4);
  const { requestId } = results.find((result) => result.status === 'fulfilled').value;
  const saved = (await db.doc(`hostingRequests/${requestId}`).get()).data();
  const reservationId = createHash('sha256')
    .update(JSON.stringify([traveller, listingId, '2030-01-10', '2030-01-15']))
    .digest('hex');
  const reservation = (await db.doc(`hostingRequestReservations/${reservationId}`).get()).data();
  assert.equal(saved.hostUid, host);
  assert.equal(reservation?.activeRequestId, requestId);
  assert.ok(saved.createdAt instanceof Timestamp);
  for (const [uid, field] of [[host, 'hostUid'], [traveller, 'travellerUid']]) {
    const page = await listRequests(call(uid, {}), field, db);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].requestId, requestId);
    assert.equal('hostUid' in page.items[0], false);
  }
  const details = await getRequest(call(host, { requestId }), db);
  assert.equal(details.viewerIsHost, true);
  assert.equal((await getRequest(call(traveller, { requestId }), db)).viewerIsHost, false);
  assert.deepEqual(details.traveller, { displayName: 'Traveller' });
  assert.equal(details.listingTitle, 'A lovely stay');
  assert.equal(JSON.stringify(details).includes('private'), false);
  await db.doc('users/request-outsider').set({ accountStatus: 'active' });
  await assert.rejects(getRequest(call('request-outsider', { requestId }), db), { code: 'not-found' });
});

test('a cancelled or declined tuple can be requested again without allowing two active requests', async () => {
  const { host, traveller, listingId } = await seed('resubmit');
  const first = await createRequest(call(traveller, input(listingId)), db);
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'already-exists' });
  await transitionRequest(call(traveller, { ...first, action: 'cancel' }), db);
  const second = await createRequest(call(traveller, input(listingId)), db);
  assert.notEqual(second.requestId, first.requestId);
  assert.equal((await db.doc(`hostingRequests/${first.requestId}`).get()).data().status, 'cancelled');
  await transitionRequest(call(host, { ...second, action: 'decline' }), db);
  const third = await createRequest(call(traveller, input(listingId)), db);
  assert.notEqual(third.requestId, second.requestId);
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'already-exists' });
  await transitionRequest(call(host, { ...third, action: 'accept' }), db);
  await transitionRequest(call(host, { ...third, action: 'cancel' }), db);
  const fourth = await createRequest(call(traveller, input(listingId)), db);
  assert.notEqual(fourth.requestId, third.requestId);
});

test('active legacy deterministic requests still block duplicates and terminal legacy requests can be retried', async () => {
  const { host, traveller, listingId } = await seed('legacy-resubmit');
  const requestInput = input(listingId);
  const legacyId = createHash('sha256')
    .update(JSON.stringify([traveller, listingId, requestInput.startDate, requestInput.endDate]))
    .digest('hex');
  await db.doc(`hostingRequests/${legacyId}`).set({
    requestId: legacyId, listingId, hostUid: host, travellerUid: traveller,
    startDate: requestInput.startDate, endDate: requestInput.endDate, guestCount: 2,
    introductoryMessage: 'Legacy request', status: 'pending',
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  await assert.rejects(createRequest(call(traveller, requestInput), db), { code: 'already-exists' });
  await transitionRequest(call(traveller, { requestId: legacyId, action: 'cancel' }), db);
  const retry = await createRequest(call(traveller, requestInput), db);
  assert.notEqual(retry.requestId, legacyId);
});

test('validates input, caller and current listing and host eligibility', async () => {
  const { host, traveller, listingId } = await seed('invalid');
  for (const changes of [
    { startDate: '2030-02-30' }, { endDate: '2030-01-10' }, { guestCount: 3 },
    { guestCount: 1.5 }, { introductoryMessage: ' ' }, { introductoryMessage: 'x'.repeat(2001) },
    { hostUid: host }, { status: 'accepted' }, { introductoryMessage: 'Contact me at person@example.com' },
  ]) {
    await assert.rejects(createRequest(call(traveller, input(listingId, changes)), db), { code: 'invalid-argument' });
  }
  await assert.rejects(createRequest({ data: input(listingId) }, db), { code: 'unauthenticated' });
  await assert.rejects(createRequest(call(traveller, input(listingId), false), db), {
    code: 'failed-precondition',
  });
  await assert.rejects(createRequest(call(host, input(listingId)), db), { code: 'failed-precondition' });
  await db.doc(`listings/${listingId}`).update({ status: 'paused' });
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'failed-precondition' });
  await db.doc(`listings/${listingId}`).update({ status: 'published' });
  await db.doc(`hostPrivate/${host}`).update({ consentState: 'withdrawn' });
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'failed-precondition' });
  await db.doc(`hostPrivate/${host}`).update({ consentState: 'accepted' });
  await db.doc(`hostPrivate/${host}/listingLifecycleState/current`).set({ leaseExpiresAt: Timestamp.fromMillis(Date.now() + 60000) });
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'failed-precondition' });
});

test('limits creation transactionally and rejects inactive users and hosts', async () => {
  const { host, traveller, listingId } = await seed('rate');
  await db.doc(`users/${traveller}`).update({ accountStatus: 'suspended' });
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'failed-precondition' });
  await db.doc(`users/${traveller}`).update({ accountStatus: 'active' });
  await db.doc(`users/${host}`).update({ accountStatus: 'suspended' });
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), { code: 'failed-precondition' });
  await db.doc(`users/${host}`).update({ accountStatus: 'active' });
  await db.doc(`hostingRequestRateLimits/${traveller}`).set({ windowStart: Timestamp.now(), count: 9 });
  const results = await Promise.allSettled([
    createRequest(call(traveller, input(listingId)), db),
    createRequest(call(traveller, input(listingId, { startDate: '2030-01-11' })), db),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.code === 'resource-exhausted').length, 1);
});

test('paginates only the caller’s requests and screens public profile data', async () => {
  const { host, traveller, listingId } = await seed('pages');
  const batch = db.batch();
  for (let i = 0; i < 21; i++) {
    const requestId = i.toString(16).padStart(64, '0');
    batch.create(db.doc(`hostingRequests/${requestId}`), {
      requestId, listingId, hostUid: host, travellerUid: traveller, startDate: '2030-01-10',
      endDate: '2030-01-15', guestCount: 1, introductoryMessage: 'Hello', status: 'pending',
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(), privateField: 'should-not-be-projected',
    });
  }
  await batch.commit();
  const first = await listRequests(call(host, {}), 'hostUid', db);
  assert.equal(first.items.length, 20);
  assert.ok(first.nextCursor);
  assert.equal('privateField' in first.items[0], false);
  const second = await listRequests(call(host, { cursor: first.nextCursor }), 'hostUid', db);
  assert.equal(second.items.length, 1);
  assert.equal(second.nextCursor, null);
  await db.doc(`users/${traveller}`).update({ displayName: 'person@example.com' });
  const detail = await getRequest(call(host, { requestId: first.items[0].requestId }), db);
  assert.equal(detail.traveller, null);
  assert.equal('privateField' in detail, false);
});

test('orders participant request pages by stay start date and rejects foreign cursors', async () => {
  const { host, traveller, listingId } = await seed('ordered-pages');
  for (const startDate of ['2030-03-10', '2030-01-10', '2030-02-10']) {
    await createRequest(call(traveller, input(listingId, {
      startDate,
      endDate: startDate.replace(/10$/, '15'),
    })), db);
  }
  const first = await listRequests(call(traveller, { cursor: null }), 'travellerUid', db);
  assert.deepEqual(first.items.map((item) => item.startDate), ['2030-01-10', '2030-02-10', '2030-03-10']);
  assert.equal(first.nextCursor, null);
  await assert.rejects(listRequests(call(host, {
    cursor: 'f'.repeat(64),
  }), 'hostUid', db), { code: 'invalid-argument' });
});

test('overlapping acceptances serialize, adjacent stays do not conflict, and cancellation frees the interval', async () => {
  const { host, traveller, listingId } = await seed('schedule');
  const first = await createRequest(call(traveller, input(listingId)), db);
  const second = await createRequest(call(traveller, input(listingId, {
    startDate: '2030-01-14', endDate: '2030-01-17',
  })), db);
  let queryReads = 0;
  let releaseQueryReads;
  const bothQueriesRead = new Promise((resolve) => { releaseQueryReads = resolve; });
  const synchronizedDb = {
    doc: db.doc.bind(db),
    runTransaction: (callback) => db.runTransaction((transaction) => callback(new Proxy(transaction, {
      get(target, property) {
        if (property === 'get') {
          return async (reference) => {
            const result = await target.get(reference);
            if (reference.path === `listingSchedules/${listingId}/confirmed` && queryReads < 2) {
              queryReads++;
              if (queryReads === 2) releaseQueryReads();
              await bothQueriesRead;
            }
            return result;
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }))),
  };
  const outcomes = await Promise.allSettled([first, second].map(({ requestId }) =>
    transitionRequest(call(host, { requestId, action: 'accept' }), synchronizedDb)));
  assert.equal(queryReads, 2);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((result) => result.status === 'rejected' && result.reason.code === 'failed-precondition').length, 1);
  const winner = outcomes[0].status === 'fulfilled' ? first : second;
  const loser = winner === first ? second : first;
  const saved = (await db.doc(`hostingRequests/${winner.requestId}`).get()).data();
  const adjacent = await createRequest(call(traveller, input(listingId, {
    startDate: saved.endDate, endDate: '2030-01-20',
  })), db);
  await transitionRequest(call(host, { ...adjacent, action: 'accept' }), db);
  await transitionRequest(call(traveller, { ...winner, action: 'cancel' }), db);
  // The other request may overlap the adjacent stay, so cancel it before retrying.
  await transitionRequest(call(host, { ...adjacent, action: 'cancel' }), db);
  await transitionRequest(call(host, { ...loser, action: 'accept' }), db);
  assert.equal((await db.doc(`hostingRequests/${loser.requestId}`).get()).data().status, 'accepted');
});

test('decisions enforce authentication, participant roles, transitions and idempotent retries', async () => {
  const { host, traveller, listingId } = await seed('decisions');
  const { requestId } = await createRequest(call(traveller, input(listingId)), db);
  const decision = (uid, action) => transitionRequest(call(uid, { requestId, action }), db);
  await assert.rejects(transitionRequest({ data: { requestId, action: 'accept' } }, db), { code: 'unauthenticated' });
  await db.doc('users/decision-outsider').set({ accountStatus: 'active' });
  await assert.rejects(decision('decision-outsider', 'accept'), { code: 'not-found' });
  await assert.rejects(decision(traveller, 'accept'), { code: 'permission-denied' });
  await assert.rejects(decision(host, 'cancel'), { code: 'permission-denied' });
  await assert.rejects(transitionRequest(call(host, { requestId, action: 'accept', status: 'accepted' }), db), { code: 'invalid-argument' });
  await decision(host, 'decline');
  await decision(host, 'decline');
  await assert.rejects(decision(host, 'accept'), { code: 'failed-precondition' });
  await assert.rejects(decision(traveller, 'cancel'), { code: 'failed-precondition' });
  const events = await db.collection(`hostingRequests/${requestId}/events`).get();
  assert.equal(events.size, 1);
  assert.equal(events.docs[0].data().actorUid, host);
});

test('acceptance rechecks listing, capacity, consent, account status and dates', async () => {
  const { host, traveller, listingId } = await seed('recheck');
  const { requestId } = await createRequest(call(traveller, input(listingId)), db);
  const decide = () => transitionRequest(call(host, { requestId, action: 'accept' }), db);
  const listing = db.doc(`listings/${listingId}`);
  for (const status of ['paused', 'archived']) {
    await listing.update({ status });
    await assert.rejects(decide(), { code: 'failed-precondition' });
  }
  await listing.update({ status: 'published', guestCapacity: 1 });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  await listing.update({ guestCapacity: 2 });
  await db.doc(`hostPrivate/${host}`).update({ consentState: 'withdrawn' });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  await db.doc(`hostPrivate/${host}`).update({ consentState: 'accepted' });
  await db.doc(`hostPrivate/${host}/listingLifecycleState/current`).set({
    leaseExpiresAt: Timestamp.fromMillis(Date.now() + 60000),
  });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  await db.doc(`hostPrivate/${host}/listingLifecycleState/current`).delete();
  await db.doc(`users/${host}`).update({ accountStatus: 'suspended' });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  await db.doc(`users/${host}`).update({ accountStatus: 'active' });
  await db.doc(`users/${traveller}`).update({ accountStatus: 'suspended' });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  await db.doc(`users/${traveller}`).update({ accountStatus: 'active' });
  await listing.update({ hostUid: 'different-host' });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  await listing.update({ hostUid: host });
  await db.doc(`hostingRequests/${requestId}`).update({ endDate: '2030-02-30' });
  await assert.rejects(decide(), { code: 'failed-precondition' });
  assert.equal((await db.doc(`hostingRequests/${requestId}`).get()).data().status, 'pending');
});

test('blocks in either direction prevent new requests and pending acceptance without cancelling stays', async () => {
  const { host, traveller, listingId } = await seed('blocking');
  await setBlock(call(traveller, { targetUid: host }), db);
  await assert.rejects(createRequest(call(traveller, input(listingId)), db), {
    code: 'failed-precondition',
  });
  await removeBlock(call(traveller, { targetUid: host }), db);

  const pending = await createRequest(call(traveller, input(listingId)), db);
  await setBlock(call(host, { targetUid: traveller }), db);
  await assert.rejects(transitionRequest(call(host, {
    requestId: pending.requestId, action: 'accept',
  }), db), { code: 'failed-precondition' });
  assert.equal((await db.doc(`hostingRequests/${pending.requestId}`).get()).data().status, 'pending');

  await removeBlock(call(host, { targetUid: traveller }), db);
  await transitionRequest(call(host, { requestId: pending.requestId, action: 'accept' }), db);
  await setBlock(call(traveller, { targetUid: host }), db);
  assert.equal((await db.doc(`hostingRequests/${pending.requestId}`).get()).data().status, 'accepted');
  await transitionRequest(call(traveller, { requestId: pending.requestId, action: 'cancel' }), db);
  assert.equal((await db.doc(`hostingRequests/${pending.requestId}`).get()).data().status, 'cancelled');
});

test('a concurrent block conflicts with hosting-request creation and wins on retry', async () => {
  const { host, traveller, listingId } = await seed('block-create-race');
  let releaseReads;
  let announceReads;
  const pairRead = new Promise((resolve) => { announceReads = resolve; });
  const gate = new Promise((resolve) => { releaseReads = resolve; });
  let blockReads = 0;
  const racingDb = {
    doc: db.doc.bind(db),
    collection: db.collection.bind(db),
    runTransaction: (callback) => db.runTransaction((transaction) => callback(new Proxy(transaction, {
      get(target, property) {
        if (property === 'get') {
          return async (reference) => {
            if (reference.path.includes('/blocked/')) {
              blockReads += 1;
              if (blockReads === 2) announceReads();
              if (blockReads <= 2) await gate;
            }
            return target.get(reference);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }))),
  };
  const creation = createRequest(call(traveller, input(listingId)), racingDb);
  await pairRead;
  await setBlock(call(host, { targetUid: traveller }), db);
  releaseReads();
  await assert.rejects(creation, { code: 'failed-precondition' });
  assert.equal((await db.collection('hostingRequests').where('listingId', '==', listingId).get()).size, 0);
});

test('concurrent cancellation and acceptance result in one consistent transition', async () => {
  const { host, traveller, listingId } = await seed('cancel-race');
  const { requestId } = await createRequest(call(traveller, input(listingId)), db);
  const results = await Promise.allSettled([
    transitionRequest(call(host, { requestId, action: 'accept' }), db),
    transitionRequest(call(traveller, { requestId, action: 'cancel' }), db),
  ]);
  assert.equal(results[1].status, 'fulfilled');
  const data = (await db.doc(`hostingRequests/${requestId}`).get()).data();
  assert.equal(data.status, 'cancelled');
  assert.equal((await db.collection(`listingSchedules/${listingId}/confirmed`).get()).size, 0);
  await transitionRequest(call(traveller, { requestId, action: 'cancel' }), db);
  await assert.rejects(transitionRequest(call(host, { requestId, action: 'accept' }), db), { code: 'failed-precondition' });
});

test('half-open overlap boundaries reject containment and allow adjacency on both sides', async () => {
  const { host, traveller, listingId } = await seed('boundaries');
  const middle = await createRequest(call(traveller, input(listingId)), db);
  await transitionRequest(call(host, { ...middle, action: 'accept' }), db);
  for (const [startDate, endDate] of [
    ['2030-01-09', '2030-01-11'], ['2030-01-14', '2030-01-16'],
    ['2030-01-09', '2030-01-16'], ['2030-01-11', '2030-01-14'],
  ]) {
    const request = await createRequest(call(traveller, input(listingId, { startDate, endDate })), db);
    await assert.rejects(transitionRequest(call(host, { ...request, action: 'accept' }), db), { code: 'failed-precondition' });
  }
  for (const [startDate, endDate] of [['2030-01-08', '2030-01-10'], ['2030-01-15', '2030-01-18']]) {
    const request = await createRequest(call(traveller, input(listingId, { startDate, endDate })), db);
    await transitionRequest(call(host, { ...request, action: 'accept' }), db);
  }
});

test('concurrent duplicate acceptance is idempotent and produces one audit event', async () => {
  const { host, traveller, listingId } = await seed('accept-retry');
  const { requestId } = await createRequest(call(traveller, input(listingId)), db);
  const results = await Promise.all(Array.from({ length: 4 }, () =>
    transitionRequest(call(host, { requestId, action: 'accept' }), db)));
  assert.ok(results.every((result) => result.status === 'accepted'));
  assert.equal((await db.collection(`hostingRequests/${requestId}/events`).get()).size, 1);
  assert.equal((await db.collection(`listingSchedules/${listingId}/confirmed`).get()).size, 1);
});

test('schedule inconsistencies fail closed without modifying request state', async () => {
  const { host, traveller, listingId } = await seed('schedule-corruption');
  const { requestId } = await createRequest(call(traveller, input(listingId)), db);
  const entry = db.doc(`listingSchedules/${listingId}/confirmed/bad`);
  await entry.set({ startDate: 'invalid', endDate: '2030-01-11' });
  await assert.rejects(transitionRequest(call(host, { requestId, action: 'accept' }), db), { code: 'failed-precondition' });
  await entry.delete();
  await db.doc(`listingSchedules/${listingId}/confirmed/stale-valid`).set({
    startDate: '2030-01-11', endDate: '2030-01-12',
  });
  await assert.rejects(transitionRequest(call(host, { requestId, action: 'accept' }), db), { code: 'failed-precondition' });
  await db.doc(`listingSchedules/${listingId}/confirmed/stale-valid`).delete();
  await transitionRequest(call(host, { requestId, action: 'accept' }), db);
  await db.doc(`listingSchedules/${listingId}/confirmed/${requestId}`).delete();
  await assert.rejects(transitionRequest(call(host, { requestId, action: 'accept' }), db), { code: 'failed-precondition' });
  await assert.rejects(transitionRequest(call(traveller, { requestId, action: 'cancel' }), db), { code: 'failed-precondition' });
  assert.equal((await db.doc(`hostingRequests/${requestId}`).get()).data().status, 'accepted');
});

test('acceptance races with eligibility changes cannot commit after an ineligible change', async () => {
  for (const change of ['paused', 'archived', 'withdrawn', 'host-suspended', 'traveller-suspended', 'capacity']) {
    const { host, traveller, listingId } = await seed(`eligibility-race-${change}`);
    const { requestId } = await createRequest(call(traveller, input(listingId)), db);
    const listing = db.doc(`listings/${listingId}`);
    const changes = {
      paused: () => listing.update({ status: 'paused' }),
      archived: () => listing.update({ status: 'archived' }),
      withdrawn: () => db.doc(`hostPrivate/${host}`).update({ consentState: 'withdrawn' }),
      'host-suspended': () => db.doc(`users/${host}`).update({ accountStatus: 'suspended' }),
      'traveller-suspended': () => db.doc(`users/${traveller}`).update({ accountStatus: 'suspended' }),
      capacity: () => listing.update({ guestCapacity: 1 }),
    };
    const [decision, mutation] = await Promise.allSettled([
      transitionRequest(call(host, { requestId, action: 'accept' }), db),
      changes[change](),
    ]);
    assert.equal(mutation.status, 'fulfilled');
    const saved = await db.doc(`hostingRequests/${requestId}`).get();
    if (decision.status === 'fulfilled') {
      assert.equal(saved.data().status, 'accepted');
      assert.ok(saved.updateTime.toMillis() <= mutation.value.writeTime.toMillis());
    } else {
      assert.equal(decision.reason.code, 'failed-precondition');
      assert.equal(saved.data().status, 'pending');
    }
  }
});

test('acceptance racing with the actual consent withdrawal workflow remains serialized', async () => {
  const { host, traveller, listingId } = await seed('withdrawal-race');
  const { requestId } = await createRequest(call(traveller, input(listingId)), db);
  const withdrawal = recordParticipationEvent({
    auth: { uid: host, token: { email_verified: true } },
    data: { idempotencyKey: 'request-withdrawal-race-01', expectedEventId: 'a'.repeat(64) },
  }, 'withdrawn');
  const results = await Promise.allSettled([
    transitionRequest(call(host, { requestId, action: 'accept' }), db),
    withdrawal,
  ]);
  assert.equal(results[1].status, 'fulfilled');
  assert.equal((await db.doc(`hostPrivate/${host}`).get()).data().consentState, 'withdrawn');
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'paused');
  const saved = (await db.doc(`hostingRequests/${requestId}`).get()).data();
  if (results[0].status === 'fulfilled') {
    assert.equal(saved.status, 'accepted');
    assert.equal((await db.doc(`listingSchedules/${listingId}/confirmed/${requestId}`).get()).exists, true);
  } else {
    assert.equal(results[0].reason.code, 'failed-precondition');
    assert.equal(saved.status, 'pending');
  }
});

test('calendar dates remain date-only across leap and daylight-saving boundaries', async () => {
  const { host, traveller, listingId } = await seed('date-boundaries');
  const leapStay = await createRequest(call(traveller, input(listingId, {
    startDate: '2032-02-28', endDate: '2032-03-01',
  })), db);
  await transitionRequest(call(host, { ...leapStay, action: 'accept' }), db);
  const adjacent = await createRequest(call(traveller, input(listingId, {
    startDate: '2032-03-01', endDate: '2032-03-02',
  })), db);
  await transitionRequest(call(host, { ...adjacent, action: 'accept' }), db);

  const daylightSavingStay = await createRequest(call(traveller, input(listingId, {
    startDate: '2030-11-02', endDate: '2030-11-03',
  })), db);
  await transitionRequest(call(host, { ...daylightSavingStay, action: 'accept' }), db);
  const daylightSavingAdjacent = await createRequest(call(traveller, input(listingId, {
    startDate: '2030-11-03', endDate: '2030-11-04',
  })), db);
  await transitionRequest(call(host, { ...daylightSavingAdjacent, action: 'accept' }), db);

  await assert.rejects(createRequest(call(traveller, input(listingId, {
    startDate: '2031-02-29', endDate: '2031-03-01',
  })), db), { code: 'invalid-argument' });
  await assert.rejects(createRequest(call(traveller, input(listingId, {
    startDate: '2030-01-15', endDate: '2030-01-14',
  })), db), { code: 'invalid-argument' });
});
