import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from '../lib/hosting/host-participation.js';
import { createRequest, getRequest, listRequests } from '../lib/hosting/hosting-requests.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Hosting request tests require the demo-openstay Firestore emulator.');
}
const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
after(async () => deleteApp(app));
const call = (uid, data) => ({ auth: { uid, token: { email_verified: true } }, data });
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
  assert.equal(saved.hostUid, host);
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
