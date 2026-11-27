import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  archiveListing,
  pauseListing,
  publishListing,
  resumeListing,
  transitionListing,
} from '../lib/hosting/listing-lifecycle.js';
import { pauseListingsForSuspendedAccount } from '../lib/hosting/account-suspension.js';
import { recordParticipationEvent } from '../lib/hosting/host-participation.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Listing lifecycle tests require the demo-openstay Firestore emulator.');
}

const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
const termsVersion = 'host-participation-v1';
const termsText =
  'Hosting on Openstay is voluntary and free. Openstay does not charge you to participate. You choose whether to host and may stop participating. Only host profile fields marked public can be viewed by others. Do not include private contact details or your exact residential address in public profile text. Openstay does not provide background checks, identity verification, insurance, or safety guarantees.';
const termsDigest = createHash('sha256').update(termsText).digest('hex');
const acceptedEventId = 'a'.repeat(64);

after(async () => {
  await deleteApp(app);
});

function request(uid, data, emailVerified = true) {
  return {
    auth: { uid, token: { email_verified: emailVerified } },
    data,
  };
}

function listing(uid, listingId, overrides = {}) {
  const now = Timestamp.now();
  return {
    listingId,
    hostUid: uid,
    title: 'A welcoming stay near the centre',
    description:
      'A comfortable and thoughtfully prepared place to stay, with a bright room and a shared kitchen.',
    accommodationType: 'private_room',
    country: 'New Zealand',
    city: 'Wellington',
    guestCapacity: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: ['wifi'],
    houseRules: ['Quiet hours after ten'],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

async function seedHost(uid, consent = {}) {
  const now = Timestamp.now();
  await db.doc(`users/${uid}`).set({ accountStatus: 'active' });
  await db.doc(`hostProfiles/${uid}`).set({
    uid,
    displayName: 'Host',
    languages: ['en'],
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  });
  await db.doc(`hostPrivate/${uid}`).set({
    uid,
    termsVersion,
    termsDigest,
    consentState: 'accepted',
    eventId: acceptedEventId,
    updatedAt: now,
    ...consent,
  });
}

async function seedListing(uid, listingId, overrides = {}) {
  await db.doc(`listings/${listingId}`).set(listing(uid, listingId, overrides));
}

function actionRequest(uid, listingId, idempotencyKey) {
  return request(uid, { listingId, idempotencyKey });
}

test('executes all allowed transitions and makes matching retries idempotent', async () => {
  const uid = 'lifecycle-valid';
  const listingId = 'lifecycle-valid-listing';
  await seedHost(uid);
  await seedListing(uid, listingId);

  const published = await transitionListing(
    actionRequest(uid, listingId, 'publish-valid-request-01'),
    'publish',
    db,
  );
  assert.deepEqual(published, { listingId, status: 'published' });
  const firstPublishedAt = (await db.doc(`listings/${listingId}`).get()).data().publishedAt;
  assert.ok(firstPublishedAt instanceof Timestamp);

  assert.deepEqual(
    await transitionListing(actionRequest(uid, listingId, 'publish-valid-request-01'), 'publish', db),
    published,
  );
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'published');
  await assert.rejects(
    transitionListing(actionRequest(uid, listingId, 'pause-valid-request-001'), 'publish', db),
    { code: 'failed-precondition', details: { reason: 'invalid-transition' } },
  );

  const paused = await transitionListing(
    actionRequest(uid, listingId, 'pause-valid-request-001'),
    'pause',
    db,
  );
  assert.deepEqual(paused, { listingId, status: 'paused' });
  assert.ok((await db.doc(`listings/${listingId}`).get()).data().pausedAt instanceof Timestamp);

  const resumed = await transitionListing(
    actionRequest(uid, listingId, 'resume-valid-request-01'),
    'resume',
    db,
  );
  assert.deepEqual(resumed, { listingId, status: 'published' });
  const resumedListing = (await db.doc(`listings/${listingId}`).get()).data();
  assert.ok(resumedListing.publishedAt instanceof Timestamp);
  assert.ok(resumedListing.pausedAt instanceof Timestamp);

  const archived = await transitionListing(
    actionRequest(uid, listingId, 'archive-valid-request-01'),
    'archive',
    db,
  );
  assert.deepEqual(archived, { listingId, status: 'archived' });
  assert.ok((await db.doc(`listings/${listingId}`).get()).data().archivedAt instanceof Timestamp);

  for (const [sourceStatus, timestampFields] of [
    ['draft', {}],
    ['paused', { publishedAt: Timestamp.now(), pausedAt: Timestamp.now() }],
    ['published', { publishedAt: Timestamp.now() }],
  ]) {
    const archiveUid = `lifecycle-archive-${sourceStatus}`;
    const archiveId = `lifecycle-archive-${sourceStatus}-listing`;
    await seedHost(archiveUid);
    await seedListing(archiveUid, archiveId, { status: sourceStatus, ...timestampFields });
    assert.deepEqual(
      await transitionListing(
        actionRequest(archiveUid, archiveId, `archive-${sourceStatus}-request-001`),
        'archive',
        db,
      ),
      { listingId: archiveId, status: 'archived' },
    );
  }
});

test('rejects every invalid lifecycle transition and repeated action with a new key', async () => {
  const transitions = [
    ['draft', 'pause'],
    ['draft', 'resume'],
    ['published', 'publish'],
    ['published', 'resume'],
    ['paused', 'publish'],
    ['paused', 'pause'],
    ['archived', 'publish'],
    ['archived', 'pause'],
    ['archived', 'resume'],
    ['archived', 'archive'],
  ];

  for (const [status, action] of transitions) {
    const uid = `lifecycle-invalid-${status}-${action}`;
    const listingId = `invalid-${status}-${action}`;
    const timestampFields = status === 'published'
      ? { publishedAt: Timestamp.now() }
      : status === 'paused'
        ? { publishedAt: Timestamp.now(), pausedAt: Timestamp.now() }
        : status === 'archived'
          ? { archivedAt: Timestamp.now() }
          : {};
    await seedHost(uid);
    await seedListing(uid, listingId, { status, ...timestampFields });
    await assert.rejects(
      transitionListing(
        actionRequest(uid, listingId, `invalid-${status}-${action}-key-001`),
        action,
        db,
      ),
      { code: 'failed-precondition', details: { reason: 'invalid-transition' } },
    );
    assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, status);
  }
});

test('validates authentication, strict input, ownership, account and consent prerequisites', async () => {
  const uid = 'lifecycle-auth';
  const listingId = 'lifecycle-auth-listing';
  await seedHost(uid);
  await seedListing(uid, listingId);

  await assert.rejects(
    transitionListing({ data: { listingId, idempotencyKey: 'valid-request-key-001' } }, 'publish', db),
    { code: 'unauthenticated' },
  );
  await assert.rejects(
    transitionListing(
      request(uid, { listingId, idempotencyKey: 'valid-request-key-001' }, false),
      'publish',
      db,
    ),
    { code: 'failed-precondition' },
  );
  await assert.rejects(
    transitionListing(request(uid, {
      listingId,
      idempotencyKey: 'short',
    }), 'publish', db),
    { code: 'invalid-argument' },
  );
  await assert.rejects(
    transitionListing(request(uid, {
      listingId: `${listingId}/other`,
      idempotencyKey: 'valid-request-key-002',
    }), 'publish', db),
    { code: 'invalid-argument' },
  );
  await assert.rejects(
    transitionListing(request(uid, {
      listingId,
      idempotencyKey: 'valid-request-key-003',
      hostUid: uid,
    }), 'publish', db),
    { code: 'invalid-argument' },
  );

  await seedHost('lifecycle-other-owner');
  await assert.rejects(
    transitionListing(
      actionRequest('lifecycle-other-owner', listingId, 'valid-request-key-004'),
      'publish',
      db,
    ),
    { code: 'not-found' },
  );
  await assert.rejects(
    transitionListing(
      actionRequest(uid, 'lifecycle-missing-listing', 'valid-request-key-005'),
      'publish',
      db,
    ),
    { code: 'not-found' },
  );

  await db.doc(`users/${uid}`).update({ accountStatus: 'suspended' });
  await assert.rejects(
    transitionListing(actionRequest(uid, listingId, 'valid-request-key-006'), 'publish', db),
    { code: 'failed-precondition', details: { reason: 'account-not-active' } },
  );
  await db.doc(`users/${uid}`).update({ accountStatus: 'active' });

  const noConsentUid = 'lifecycle-no-consent';
  await seedHost(noConsentUid, { consentState: 'withdrawn' });
  await seedListing(noConsentUid, 'lifecycle-no-consent-listing');
  await assert.rejects(
    transitionListing(
      actionRequest(noConsentUid, 'lifecycle-no-consent-listing', 'valid-request-key-007'),
      'publish',
      db,
    ),
    { code: 'failed-precondition', details: { reason: 'current-consent-required' } },
  );

  const missingConsentUid = 'lifecycle-missing-consent';
  const now = Timestamp.now();
  await db.doc(`users/${missingConsentUid}`).set({ accountStatus: 'active' });
  await db.doc(`hostProfiles/${missingConsentUid}`).set({
    uid: missingConsentUid,
    displayName: 'Host',
    languages: [],
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  });
  await seedListing(missingConsentUid, 'lifecycle-missing-consent-listing');
  await assert.rejects(
    transitionListing(
      actionRequest(missingConsentUid, 'lifecycle-missing-consent-listing', 'valid-request-key-009'),
      'publish',
      db,
    ),
    { code: 'failed-precondition', details: { reason: 'current-consent-required' } },
  );

  const noProfileUid = 'lifecycle-no-profile';
  await db.doc(`users/${noProfileUid}`).set({ accountStatus: 'active' });
  await db.doc(`hostPrivate/${noProfileUid}`).set({
    uid: noProfileUid,
    termsVersion,
    termsDigest,
    consentState: 'accepted',
    eventId: acceptedEventId,
    updatedAt: Timestamp.now(),
  });
  await seedListing(noProfileUid, 'lifecycle-no-profile-listing');
  await assert.rejects(
    transitionListing(
      actionRequest(noProfileUid, 'lifecycle-no-profile-listing', 'valid-request-key-008'),
      'publish',
      db,
    ),
    { code: 'failed-precondition', details: { reason: 'host-profile-required' } },
  );
});

test('rejects malformed saved listings and lifecycle requests during withdrawal', async () => {
  const invalidUid = 'lifecycle-invalid-data';
  await seedHost(invalidUid);
  await seedListing(invalidUid, 'lifecycle-invalid-data-listing', {
    title: 'Short',
  });
  await assert.rejects(
    transitionListing(
      actionRequest(invalidUid, 'lifecycle-invalid-data-listing', 'invalid-data-request-001'),
      'publish',
      db,
    ),
    { code: 'failed-precondition', details: { reason: 'invalid-listing' } },
  );

  const extraFieldUid = 'lifecycle-extra-data';
  await seedHost(extraFieldUid);
  await seedListing(extraFieldUid, 'lifecycle-extra-data-listing', {
    exactAddress: 'not permitted',
  });
  await assert.rejects(
    transitionListing(
      actionRequest(extraFieldUid, 'lifecycle-extra-data-listing', 'extra-data-request-001'),
      'publish',
      db,
    ),
    { code: 'failed-precondition', details: { reason: 'invalid-listing' } },
  );

  const lockedUid = 'lifecycle-withdrawal-lock';
  const lockedId = 'lifecycle-withdrawal-lock-listing';
  await seedHost(lockedUid);
  await seedListing(lockedUid, lockedId);
  await db.doc(`hostPrivate/${lockedUid}/listingLifecycleState/current`).set({
    requestId: 'another-withdrawal',
    leaseExpiresAt: Timestamp.fromMillis(Date.now() + 60_000),
  });
  await assert.rejects(
    transitionListing(
      actionRequest(lockedUid, lockedId, 'locked-request-key-001'),
      'publish',
      db,
    ),
    { code: 'failed-precondition', details: { reason: 'withdrawal-in-progress' } },
  );
});

test('uses one request key for one action and safely ignores stale retries', async () => {
  const uid = 'lifecycle-idempotency';
  const listingId = 'lifecycle-idempotency-listing';
  const key = 'lifecycle-idempotency-key-001';
  await seedHost(uid);
  await seedListing(uid, listingId);
  await seedListing(uid, 'another-listing-id');

  const publishRequest = actionRequest(uid, listingId, key);
  const first = await transitionListing(publishRequest, 'publish', db);
  await transitionListing(actionRequest(uid, listingId, 'lifecycle-idempotency-pause-01'), 'pause', db);
  assert.deepEqual(await transitionListing(publishRequest, 'publish', db), first);
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'paused');
  await assert.rejects(
    transitionListing(
      actionRequest(uid, 'another-listing-id', key),
      'publish',
      db,
    ),
    { code: 'already-exists', details: { reason: 'idempotency-key-reused' } },
  );
  await assert.rejects(
    transitionListing(actionRequest(uid, listingId, key), 'pause', db),
    { code: 'already-exists', details: { reason: 'idempotency-key-reused' } },
  );
});

test('coordinates concurrent publishing with host participation withdrawal', async () => {
  const uid = 'lifecycle-withdrawal-race';
  const listingId = 'lifecycle-withdrawal-race-listing';
  await seedHost(uid);
  await seedListing(uid, listingId);

  const [publishResult, withdrawalResult] = await Promise.allSettled([
    transitionListing(
      actionRequest(uid, listingId, 'race-publish-request-001'),
      'publish',
      db,
    ),
    recordParticipationEvent(request(uid, {
      idempotencyKey: 'race-withdraw-request-01',
      expectedEventId: acceptedEventId,
    }), 'withdrawn'),
  ]);
  assert.equal(withdrawalResult.status, 'fulfilled');
  if (publishResult.status === 'rejected') {
    assert.equal(publishResult.reason.code, 'failed-precondition');
  }
  assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().consentState, 'withdrawn');
  const savedListing = (await db.doc(`listings/${listingId}`).get()).data();
  assert.equal(savedListing.status, 'paused');
  assert.ok(savedListing.pausedAt instanceof Timestamp);
});

test('pauses published listings on suspension and remains safe to retry', async () => {
  const uid = 'lifecycle-suspension';
  const otherUid = 'lifecycle-suspension-other';
  await seedHost(uid);
  await seedHost(otherUid);
  await seedListing(uid, 'suspension-published', { status: 'published', publishedAt: Timestamp.now() });
  await seedListing(uid, 'suspension-draft');
  await seedListing(otherUid, 'suspension-other-published', {
    status: 'published',
    publishedAt: Timestamp.now(),
  });

  await db.doc(`users/${uid}`).update({ accountStatus: 'suspended' });
  await pauseListingsForSuspendedAccount(db, uid);
  await pauseListingsForSuspendedAccount(db, uid);

  const paused = (await db.doc('listings/suspension-published').get()).data();
  assert.equal(paused.status, 'paused');
  assert.ok(paused.pausedAt instanceof Timestamp);
  assert.equal((await db.doc('listings/suspension-draft').get()).data().status, 'draft');
  assert.equal((await db.doc('listings/suspension-other-published').get()).data().status, 'published');
});

test('all lifecycle callable wrappers enforce App Check and the hosting Functions region', () => {
  const script = `
    delete process.env.FUNCTIONS_EMULATOR;
    const [{ default: express }, { initializeApp }, { getAuth }, { getAppCheck },
      { archiveListing, pauseListing, publishListing, resumeListing }] = await Promise.all([
        import('express'), import('firebase-admin/app'), import('firebase-admin/auth'),
        import('firebase-admin/app-check'), import('./lib/hosting/listing-lifecycle.js'),
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
    const callables = [
      ['archive', archiveListing], ['pause', pauseListing],
      ['publish', publishListing], ['resume', resumeListing],
    ];
    for (const [path, callable] of callables) app.post('/' + path, callable);
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const outcomes = [];
    for (const [path] of callables) {
      const result = [];
      for (const appCheckToken of [null, 'invalid-app-check', 'valid-app-check']) {
        const headers = { 'content-type': 'application/json', authorization: 'Bearer valid-auth' };
        if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/' + path, {
          method: 'POST', headers, body: JSON.stringify({ data: {} }),
        });
        result.push([response.status, (await response.json()).error.status]);
      }
      outcomes.push(result);
    }
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()));
    console.log(JSON.stringify([
      outcomes,
      callables.map(([, callable]) => callable.__endpoint.region),
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
    Array.from({ length: 4 }, () => [
      [401, 'UNAUTHENTICATED'],
      [401, 'UNAUTHENTICATED'],
      [400, 'INVALID_ARGUMENT'],
    ]),
    Array.from({ length: 4 }, () => ['us-central1']),
  ]);
});
