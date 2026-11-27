import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getFirestore as getClientFirestore,
} from 'firebase/firestore';
import {
  acceptHostParticipation,
  recordParticipationEvent,
  withdrawHostParticipation,
} from '../lib/hosting/host-participation.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Host participation tests require the demo-openstay Firestore emulator.');
}

const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
const clientApp = initializeClientApp({ projectId: 'demo-openstay', apiKey: 'demo-openstay' });
const clientDb = getClientFirestore(clientApp);
const [emulatorHost, emulatorPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
connectFirestoreEmulator(clientDb, emulatorHost, Number(emulatorPort));
const termsVersion = 'host-participation-v1';
const termsText =
  'Hosting on Openstay is voluntary and free. Openstay does not charge you to participate. You choose whether to host and may stop participating. Only host profile fields marked public can be viewed by others. Do not include private contact details or your exact residential address in public profile text. Openstay does not provide background checks, identity verification, insurance, or safety guarantees.';
const termsDigest = createHash('sha256').update(termsText).digest('hex');

after(async () => {
  await deleteClientApp(clientApp);
  await deleteApp(app);
});

function request(uid, key, eventType = 'accepted', expectedEventId = null) {
  return {
    auth: { uid, token: { email_verified: true } },
    data: {
      idempotencyKey: key,
      expectedEventId,
      ...(eventType === 'accepted' ? { termsVersion, termsText } : {}),
    },
  };
}

async function seedActiveUser(uid) {
  await db.doc(`users/${uid}`).set({ accountStatus: 'active' });
}

test('requires authentication, active account and the exact displayed terms', async () => {
  const uid = 'callable-validation';
  await seedActiveUser(uid);
  const valid = request(uid, 'validation-request-0001');
  await assert.rejects(recordParticipationEvent({ data: valid.data }, 'accepted'),
    { code: 'unauthenticated' });
  await assert.rejects(recordParticipationEvent({
    ...valid, auth: { uid, token: { email_verified: false } },
  }, 'accepted'), { code: 'failed-precondition' });
  await assert.rejects(recordParticipationEvent({
    ...valid, data: { ...valid.data, termsVersion: 'old-version' },
  }, 'accepted'), { code: 'failed-precondition' });
  await assert.rejects(recordParticipationEvent({
    ...valid, data: { ...valid.data, termsText: 'old text' },
  }, 'accepted'), { code: 'failed-precondition' });
  await assert.rejects(recordParticipationEvent({
    ...valid, data: { ...valid.data, uid: 'another-user' },
  }, 'accepted'), { code: 'invalid-argument' });
  await assert.rejects(recordParticipationEvent({
    ...valid, data: { ...valid.data, expectedEventId: 'invalid' },
  }, 'accepted'), { code: 'invalid-argument' });
  await db.doc(`users/${uid}`).update({ accountStatus: 'suspended' });
  await assert.rejects(recordParticipationEvent(valid, 'accepted'),
    { code: 'failed-precondition' });
});

test('both callable wrappers enforce App Check and declare the same region', async () => {
  const script = `
    delete process.env.FUNCTIONS_EMULATOR;
    const [{ default: express }, { initializeApp }, { getAuth }, { getAppCheck },
      { acceptHostParticipation, withdrawHostParticipation }] = await Promise.all([
        import('express'), import('firebase-admin/app'), import('firebase-admin/auth'),
        import('firebase-admin/app-check'), import('./lib/hosting/host-participation.js'),
      ]);
    const firebaseApp = initializeApp({ projectId: 'demo-openstay' });
    getAuth(firebaseApp).verifyIdToken = async (token) => {
      if (token !== 'valid-auth') throw new Error('Invalid auth token');
      return { uid: 'app-check-test-user', email_verified: true };
    };
    getAppCheck(firebaseApp).verifyToken = async (token) => {
      if (token !== 'valid-app-check') throw new Error('Invalid App Check token');
      return { appId: 'demo-app' };
    };
    const app = express();
    app.use(express.json());
    app.post('/accept', acceptHostParticipation);
    app.post('/withdraw', withdrawHostParticipation);
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const results = [];
    for (const path of ['/accept', '/withdraw']) {
      const outcomes = [];
      for (const appCheckToken of [null, 'invalid-app-check', 'valid-app-check']) {
        const headers = { 'content-type': 'application/json', authorization: 'Bearer valid-auth' };
        if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;
        const response = await fetch('http://127.0.0.1:' + server.address().port + path, {
          method: 'POST',
          headers,
          body: JSON.stringify({ data: {} }),
        });
        outcomes.push([response.status, (await response.json()).error.status]);
      }
      results.push(outcomes);
    }
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()));
    console.log(JSON.stringify([
      results,
      acceptHostParticipation.__endpoint.region,
      withdrawHostParticipation.__endpoint.region,
      withdrawHostParticipation.__endpoint.timeoutSeconds,
    ]));
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: new URL('../', import.meta.url),
    encoding: 'utf8',
  }).trim();
  const result = output.split('\n').flatMap((line) => {
    try {
      const parsed = JSON.parse(line);
      return Array.isArray(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  }).at(-1);
  assert.deepEqual(result, [
    [
      [[401, 'UNAUTHENTICATED'], [401, 'UNAUTHENTICATED'], [400, 'INVALID_ARGUMENT']],
      [[401, 'UNAUTHENTICATED'], [401, 'UNAUTHENTICATED'], [400, 'INVALID_ARGUMENT']],
    ],
    ['us-central1'],
    ['us-central1'],
    300,
  ]);
});

test('idempotency keys cannot be reused across event types for the same account', async () => {
  const uid = 'callable-cross-type-key';
  const otherUid = 'callable-cross-type-other';
  const key = 'cross-type-request-0001';
  await seedActiveUser(uid);
  await seedActiveUser(otherUid);
  const accept = request(uid, key);
  const accepted = await recordParticipationEvent(accept, 'accepted');
  await assert.rejects(recordParticipationEvent(
    request(uid, key, 'withdrawn', accepted.eventId), 'withdrawn',
  ), { code: 'already-exists' });
  assert.deepEqual(await recordParticipationEvent(accept, 'accepted'), accepted);
  assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().eventId, accepted.eventId);
  assert.equal((await db.collection(`hostPrivate/${uid}/consentEvents`).get()).size, 1);
  const withdrawKey = 'cross-type-withdraw-001';
  const withdrawal = await recordParticipationEvent(
    request(uid, withdrawKey, 'withdrawn', accepted.eventId), 'withdrawn',
  );
  await assert.rejects(recordParticipationEvent(
    request(uid, withdrawKey, 'accepted', withdrawal.eventId), 'accepted',
  ), { code: 'already-exists' });
  assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().consentState, 'withdrawn');
  await recordParticipationEvent(request(otherUid, key), 'accepted');
});

test('legacy type-scoped keys remain single-use and current retries remain idempotent', async () => {
  for (const eventType of ['accepted', 'withdrawn']) {
    const uid = `callable-legacy-${eventType}`;
    const key = 'legacy-consent-key-0001';
    const expectedEventId = eventType === 'accepted' ? null : 'a'.repeat(64);
    const legacyId = createHash('sha256').update(`${uid}\0${eventType}\0${key}`).digest('hex');
    await seedActiveUser(uid);
    await db.doc(`hostPrivate/${uid}`).set({
      uid, eventId: legacyId, consentState: eventType,
      termsVersion, termsDigest, updatedAt: Timestamp.now(),
    });
    await db.doc(`hostPrivate/${uid}/consentEvents/${legacyId}`).set({
      uid, eventId: legacyId, eventType,
      idempotencyKey: key, expectedEventId,
      termsVersion, termsDigest, recordedAt: Timestamp.now(),
    });
    assert.deepEqual(await recordParticipationEvent(
      request(uid, key, eventType, expectedEventId), eventType,
    ), { eventId: legacyId });
    const otherType = eventType === 'accepted' ? 'withdrawn' : 'accepted';
    await assert.rejects(recordParticipationEvent(
      request(uid, key, otherType, legacyId), otherType,
    ), { code: 'already-exists' });
    assert.equal((await db.collection(`hostPrivate/${uid}/consentEvents`).get()).size, 1);
  }
});

test('client, server and rules agree on the exact terms digest', async () => {
  const client = await readFile(new URL('../../src/app/core/models/host-profile.model.ts', import.meta.url), 'utf8');
  const rules = await readFile(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8');
  assert.ok(client.includes(`'${termsText}'`));
  assert.ok(client.includes(`'${termsVersion}'`));
  assert.ok(client.includes(`'${termsDigest}'`));
  assert.ok(rules.includes(`termsVersion == '${termsVersion}'`));
  assert.ok(rules.includes(`termsDigest == '${termsDigest}'`));
});

test('current retries succeed; recorded and unrecorded stale actions cannot change state', async () => {
  const uid = 'callable-replay';
  await seedActiveUser(uid);
  const accept = request(uid, 'accept-request-00001');
  const first = await recordParticipationEvent(accept, 'accepted');
  assert.deepEqual(await recordParticipationEvent(accept, 'accepted'), first);
  const withdraw = request(uid, 'withdraw-request-001', 'withdrawn', first.eventId);
  const second = await recordParticipationEvent(withdraw, 'withdrawn');
  const third = await recordParticipationEvent(
    request(uid, 'accept-request-00002', 'accepted', second.eventId), 'accepted',
  );
  const listingRef = db.doc(`listings/${uid}-stale-withdrawal`);
  await listingRef.set({
    listingId: `${uid}-stale-withdrawal`,
    hostUid: uid,
    status: 'published',
  });
  const stale = { code: 'failed-precondition', details: { reason: 'stale-consent-request' } };
  await assert.rejects(recordParticipationEvent(withdraw, 'withdrawn'), stale);
  await assert.rejects(recordParticipationEvent(
    request(uid, 'delayed-withdraw-001', 'withdrawn', first.eventId), 'withdrawn',
  ), stale);
  await assert.rejects(recordParticipationEvent(
    request(uid, 'delayed-accept-00001', 'accepted', second.eventId), 'accepted',
  ), stale);
  assert.equal((await listingRef.get()).data().status, 'published');
  const final = await recordParticipationEvent(
    request(uid, 'withdraw-request-002', 'withdrawn', third.eventId), 'withdrawn',
  );
  const state = (await db.doc(`hostPrivate/${uid}`).get()).data();
  assert.equal(state.consentState, 'withdrawn');
  assert.equal(state.eventId, final.eventId);
  assert.equal((await db.collection(`hostPrivate/${uid}/consentEvents`).get()).size, 4);
});

test('withdrawal pauses all owned published listings in bounded batches before completion', async () => {
  const uid = 'callable-pause-listings';
  const otherUid = 'callable-pause-other';
  await seedActiveUser(uid);
  await seedActiveUser(otherUid);
  const accepted = await recordParticipationEvent(
    request(uid, 'pause-listings-accept-001'), 'accepted',
  );

  const batch = db.batch();
  const publishedIds = Array.from({ length: 205 }, (_, index) =>
    `pause-listing-${String(index).padStart(3, '0')}`,
  );
  for (const id of publishedIds) {
    batch.set(db.doc(`listings/${id}`), {
      listingId: id,
      hostUid: uid,
      status: 'published',
      updatedAt: Timestamp.now(),
    });
  }
  batch.set(db.doc('listings/pause-listing-draft'), {
    listingId: 'pause-listing-draft',
    hostUid: uid,
    status: 'draft',
  });
  batch.set(db.doc('listings/pause-listing-other-owner'), {
    listingId: 'pause-listing-other-owner',
    hostUid: otherUid,
    status: 'published',
  });
  await batch.commit();

  const withdrawal = await recordParticipationEvent(
    request(uid, 'pause-listings-withdraw-01', 'withdrawn', accepted.eventId),
    'withdrawn',
  );
  const ownedListings = await db.collection('listings').where('hostUid', '==', uid).get();
  const paused = ownedListings.docs.filter((listing) => listing.data().status === 'paused');
  assert.equal(paused.length, publishedIds.length);
  assert.ok(paused.every((listing) =>
    listing.data().pausedAt instanceof Timestamp
    && listing.data().updatedAt instanceof Timestamp,
  ));
  assert.equal((await db.doc('listings/pause-listing-draft').get()).data().status, 'draft');
  assert.equal((await db.doc('listings/pause-listing-other-owner').get()).data().status, 'published');
  assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().consentState, 'withdrawn');
  assert.equal(
    (await db.doc(`hostPrivate/${uid}/consentEvents/${withdrawal.eventId}`).get()).exists,
    true,
  );
});

test('old terms can be withdrawn and reaccepted; suspended accounts can only withdraw', async () => {
  const uid = 'callable-old-terms';
  await seedActiveUser(uid);
  const oldEventId = 'a'.repeat(64);
  await db.doc(`hostPrivate/${uid}`).set({
    uid, eventId: oldEventId, consentState: 'accepted',
    termsVersion: 'old-version', termsDigest: 'old-digest', updatedAt: Timestamp.now(),
  });
  await db.doc(`users/${uid}`).update({ accountStatus: 'suspended' });
  await assert.rejects(recordParticipationEvent(
    request(uid, 'suspended-accept-001', 'accepted', oldEventId), 'accepted',
  ), { code: 'failed-precondition' });
  const result = await recordParticipationEvent(
    request(uid, 'suspended-withdraw-01', 'withdrawn', oldEventId), 'withdrawn',
  );
  const event = (await db.doc(`hostPrivate/${uid}/consentEvents/${result.eventId}`).get()).data();
  assert.equal(event.termsVersion, 'old-version');
  assert.equal(event.termsDigest, 'old-digest');
  await db.doc(`users/${uid}`).update({ accountStatus: 'active' });
  await recordParticipationEvent(
    request(uid, 'renewed-accept-00001', 'accepted', result.eventId), 'accepted',
  );
  assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().termsDigest, termsDigest);
});

test('rules accept callable-issued consent and deny fresh reads after withdrawal', async () => {
  const uid = 'callable-public-visibility';
  await seedActiveUser(uid);
  const now = new Date();
  await db.doc(`hostProfiles/${uid}`).set({
    uid, displayName: 'Host', languages: ['en'], visibility: 'public',
    createdAt: now, updatedAt: now,
  });
  const profileRef = doc(clientDb, `hostProfiles/${uid}`);
  const accepted = await recordParticipationEvent(request(uid, 'visibility-accept-01'), 'accepted');
  assert.equal((await getDocFromServer(profileRef)).exists(), true);
  await recordParticipationEvent(
    request(uid, 'visibility-withdraw-01', 'withdrawn', accepted.eventId), 'withdrawn',
  );
  await assert.rejects(getDocFromServer(profileRef), { code: 'permission-denied' });
});

test('concurrent retries create one event and conflicting actions do not overwrite each other', async () => {
  const uid = 'callable-concurrency';
  await seedActiveUser(uid);
  const accept = request(uid, 'concurrent-accept-01');
  const results = await Promise.all([
    recordParticipationEvent(accept, 'accepted'),
    recordParticipationEvent(accept, 'accepted'),
  ]);
  assert.deepEqual(results[0], results[1]);
  const changes = await Promise.allSettled([
    recordParticipationEvent(request(uid, 'concurrent-accept-02', 'accepted', results[0].eventId), 'accepted'),
    recordParticipationEvent(request(uid, 'concurrent-withdraw-1', 'withdrawn', results[0].eventId), 'withdrawn'),
  ]);
  assert.equal(changes.filter((change) => change.status === 'fulfilled').length, 1);
  assert.equal(changes.find((change) => change.status === 'rejected').reason.code, 'failed-precondition');
  assert.equal((await db.collection(`hostPrivate/${uid}/consentEvents`).get()).size, 2);
});

test('concurrent consent actions cannot cross the ten-event limit', async () => {
  const uid = 'callable-rate-concurrency';
  await seedActiveUser(uid);
  let eventId = null;
  for (let i = 0; i < 9; i++) {
    eventId = (await recordParticipationEvent(
      request(uid, `concurrent-rate-${String(i).padStart(2, '0')}`, 'accepted', eventId),
      'accepted',
    )).eventId;
  }
  const results = await Promise.allSettled([
    recordParticipationEvent(request(uid, 'concurrent-rate-accept-01', 'accepted', eventId), 'accepted'),
    recordParticipationEvent(request(uid, 'concurrent-rate-accept-02', 'accepted', eventId), 'accepted'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'failed-precondition');
  assert.equal((await db.collection(`hostPrivate/${uid}/consentEvents`).get()).size, 10);
  const currentEventId = (await db.doc(`hostPrivate/${uid}`).get()).data().eventId;
  await assert.rejects(recordParticipationEvent(
    request(uid, 'concurrent-rate-overflow', 'accepted', currentEventId), 'accepted',
  ), { code: 'resource-exhausted' });
});

test('enforces ten events in a rolling hour including withdrawal, without charging retries', async () => {
  const uid = 'callable-rate-limit';
  await seedActiveUser(uid);
  let eventId = null;
  let last;
  for (let i = 0; i < 9; i++) {
    last = request(uid, `rate-accept-request-${String(i).padStart(2, '0')}`, 'accepted', eventId);
    eventId = (await recordParticipationEvent(last, 'accepted')).eventId;
  }
  for (let i = 0; i < 3; i++) {
    await recordParticipationEvent(last, 'accepted');
  }
  eventId = (await recordParticipationEvent(
    request(uid, 'rate-accept-request-09', 'accepted', eventId), 'accepted',
  )).eventId;
  await assert.rejects(recordParticipationEvent(
    request(uid, 'rate-accept-request-10', 'accepted', eventId), 'accepted',
  ), { code: 'resource-exhausted' });
  await assert.rejects(recordParticipationEvent(
    request(uid, 'rate-withdraw-request-01', 'withdrawn', eventId), 'withdrawn',
  ), { code: 'resource-exhausted' });
  const events = await db.collection(`hostPrivate/${uid}/consentEvents`).orderBy('recordedAt').get();
  await events.docs[0].ref.update({ recordedAt: Timestamp.fromMillis(Date.now() - 3_600_001) });
  const withdrawal = await recordParticipationEvent(
    request(uid, 'rate-withdraw-request-01', 'withdrawn', eventId), 'withdrawn',
  );
  await assert.rejects(recordParticipationEvent(
    request(uid, 'rate-accept-request-11', 'accepted', withdrawal.eventId), 'accepted',
  ), { code: 'resource-exhausted' });
  assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().consentState, 'withdrawn');
});
