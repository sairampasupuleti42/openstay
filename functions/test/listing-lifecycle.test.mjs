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
import {
  pauseListingsForSuspendedAccount,
  reactivateAccount,
  suspendAccount,
} from '../lib/hosting/account-suspension.js';
import { pausePublishedListings } from '../lib/hosting/listing-state.js';
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
  return request(uid, { listingId, idempotencyKey, publicContentReviewed: true });
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

test('rejects publishing a listing with a residential address in area description', async () => {
  const uid = 'lifecycle-address-area';
  const listingId = 'lifecycle-address-area-listing';
  await seedHost(uid);
  await seedListing(uid, listingId, { areaDescription: '10 rue de Rivoli, Paris' });

  await assert.rejects(
    transitionListing(actionRequest(uid, listingId, 'publish-address-area-01'), 'publish', db),
    { code: 'failed-precondition', details: { reason: 'private-content-not-allowed' } },
  );
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'draft');
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

test('rejects publication and resumption when listing text contains private details', async () => {
  for (const [label, field, value] of [
    ['email', 'description', 'Contact me at host@example.com to arrange your stay in this welcoming place.'],
    ['phone', 'description', 'Call +1 (415) 555-0134 for this welcoming place and a comfortable local visit.'],
    ['street address', 'houseRules', ['10 Main Street is the residential entrance for this lovely place.']],
    ['coordinates', 'description', 'Find this private home at -36.848500,174.763300 near the city centre.'],
  ]) {
    const slug = label.replaceAll(' ', '-');
    const uid = `lifecycle-private-copy-${slug}`;
    const listingId = `private-copy-${slug}`;
    await seedHost(uid);
    await seedListing(uid, listingId, { [field]: value });
    await assert.rejects(
      transitionListing(
        actionRequest(uid, listingId, `private-copy-${slug}-request-001`),
        'publish',
        db,
      ),
      { code: 'failed-precondition', details: { reason: 'private-content-not-allowed' } },
    );
    assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'draft');
  }

  const uid = 'lifecycle-private-copy-resume';
  const listingId = 'private-copy-resume';
  await seedHost(uid);
  await seedListing(uid, listingId, {
    status: 'paused',
    description: 'Contact host@example.com to enjoy this comfortable and welcoming place.',
  });
  await assert.rejects(
    transitionListing(actionRequest(uid, listingId, 'private-copy-resume-request-001'), 'resume', db),
    { code: 'failed-precondition', details: { reason: 'private-content-not-allowed' } },
  );
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'paused');
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
  for (const [action, idempotencyKey] of [
    ['publish', 'publish-without-review-001'],
    ['resume', 'resume-without-review-0001'],
  ]) {
    await assert.rejects(
      transitionListing(request(uid, {
        listingId,
        idempotencyKey,
      }), action, db),
      {
        code: 'failed-precondition',
        details: { reason: 'publication-review-required' },
      },
    );
  }
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

test('fences expired withdrawal workers before allowing publication', async () => {
  const uid = 'lifecycle-expired-withdrawal';
  const listingId = 'lifecycle-expired-withdrawal-listing';
  const lockRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/current`);
  await seedHost(uid);
  await seedListing(uid, listingId);
  await lockRef.set({
    requestId: 'old-request',
    workerId: 'old-worker',
    leaseExpiresAt: Timestamp.fromMillis(Date.now() - 1_000),
  });
  await transitionListing(actionRequest(uid, listingId, 'expired-publish-request-1'), 'publish', db);
  assert.equal((await lockRef.get()).exists, false);
  await assert.rejects(
    pausePublishedListings(db, uid, { ref: lockRef, requestId: 'old-request', workerId: 'old-worker' }),
    { code: 'failed-precondition', details: { reason: 'stale-withdrawal-lock' } },
  );
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'published');
});

test('uses one request key for one action and rejects stale retries', async () => {
  const uid = 'lifecycle-idempotency';
  const listingId = 'lifecycle-idempotency-listing';
  const key = 'lifecycle-idempotency-key-001';
  await seedHost(uid);
  await seedListing(uid, listingId);
  await seedListing(uid, 'another-listing-id');

  const publishRequest = actionRequest(uid, listingId, key);
  await transitionListing(publishRequest, 'publish', db);
  await transitionListing(actionRequest(uid, listingId, 'lifecycle-idempotency-pause-01'), 'pause', db);
  await assert.rejects(transitionListing(publishRequest, 'publish', db), {
    code: 'failed-precondition', details: { reason: 'stale-listing-request' },
  });
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

test('a lost lifecycle response is idempotent until a later state cycle', async () => {
  const uid = 'lifecycle-lost-response';
  const listingId = 'lifecycle-lost-response-listing';
  const ref = db.doc(`listings/${listingId}`);
  const publish = actionRequest(uid, listingId, 'lost-response-publish-01');
  await seedHost(uid);
  await seedListing(uid, listingId);

  await assert.rejects((async () => {
    await transitionListing(publish, 'publish', db);
    throw new Error('Response lost after commit');
  })(), /Response lost after commit/);
  const committed = (await ref.get()).data();
  assert.deepEqual(await transitionListing(publish, 'publish', db), { listingId, status: 'published' });
  assert.deepEqual((await ref.get()).data(), committed);

  await transitionListing(actionRequest(uid, listingId, 'lost-response-pause-001'), 'pause', db);
  const paused = (await ref.get()).data();
  await assert.rejects(transitionListing(publish, 'publish', db), {
    code: 'failed-precondition', details: { reason: 'stale-listing-request' },
  });
  assert.deepEqual((await ref.get()).data(), paused);
  await transitionListing(actionRequest(uid, listingId, 'lost-response-resume-01'), 'resume', db);
  const resumed = (await ref.get()).data();
  await assert.rejects(transitionListing(publish, 'publish', db), {
    code: 'failed-precondition', details: { reason: 'stale-listing-request' },
  });
  assert.deepEqual((await ref.get()).data(), resumed);
});

test('rejects legacy request retries without a lifecycle version pointer', async () => {
  const uid = 'lifecycle-legacy-request';
  const listingId = 'lifecycle-legacy-request-listing';
  const key = 'legacy-publish-request-01';
  const requestId = createHash('sha256').update(`${uid}\0${key}`).digest('hex');
  const listingRef = db.doc(`listings/${listingId}`);
  const requestRef = db.doc(`hostPrivate/${uid}/listingLifecycleRequests/${requestId}`);
  const versionRef = db.doc(`hostPrivate/${uid}/listingLifecycleVersions/${listingId}`);
  await seedHost(uid);
  await seedListing(uid, listingId, { status: 'published', publishedAt: Timestamp.now() });
  await requestRef.set({
    keyHash: requestId,
    listingId,
    action: 'publish',
    status: 'published',
    completedAt: Timestamp.now(),
  });
  const savedListing = (await listingRef.get()).data();
  const savedRequest = (await requestRef.get()).data();
  assert.equal((await versionRef.get()).exists, false);

  await assert.rejects(transitionListing(actionRequest(uid, listingId, key), 'publish', db), {
    code: 'failed-precondition', details: { reason: 'stale-listing-request' },
  });
  assert.deepEqual((await listingRef.get()).data(), savedListing);
  assert.deepEqual((await requestRef.get()).data(), savedRequest);
  assert.equal((await versionRef.get()).exists, false);

  await transitionListing(actionRequest(uid, listingId, 'legacy-pause-request-001'), 'pause', db);
  const pausedListing = (await listingRef.get()).data();
  assert.equal(pausedListing.status, 'paused');
  await assert.rejects(transitionListing(actionRequest(uid, listingId, key), 'publish', db), {
    code: 'failed-precondition', details: { reason: 'stale-listing-request' },
  });
  assert.deepEqual((await listingRef.get()).data(), pausedListing);
});

test('serializes concurrent repeated and conflicting lifecycle requests', async () => {
  const uid = 'lifecycle-concurrent';
  const listingId = 'lifecycle-concurrent-listing';
  await seedHost(uid);
  await seedListing(uid, listingId);
  const publish = actionRequest(uid, listingId, 'concurrent-publish-key-01');
  const results = await Promise.all([
    transitionListing(publish, 'publish', db),
    transitionListing(publish, 'publish', db),
  ]);
  assert.deepEqual(results[0], results[1]);
  const changes = await Promise.allSettled([
    transitionListing(actionRequest(uid, listingId, 'concurrent-pause-key-001'), 'pause', db),
    transitionListing(actionRequest(uid, listingId, 'concurrent-archive-key-1'), 'archive', db),
  ]);
  assert.equal(changes.filter((result) => result.status === 'fulfilled').length >= 1, true);
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'archived');
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
  assert.equal(savedListing.status, publishResult.status === 'fulfilled' ? 'paused' : 'draft');
  if (publishResult.status === 'fulfilled') assert.ok(savedListing.pausedAt instanceof Timestamp);
});

test('an expired withdrawal worker cannot overwrite a completed takeover and later resume', async () => {
  const uid = 'withdrawal-lease-takeover';
  const lockRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/current`);
  await seedHost(uid);
  const batch = db.batch();
  for (let index = 0; index < 201; index++) {
    const id = `takeover-listing-${String(index).padStart(3, '0')}`;
    batch.set(db.doc(`listings/${id}`), listing(uid, id, {
      status: 'published', publishedAt: Timestamp.now(),
    }));
  }
  await batch.commit();

  const withdrawal = request(uid, {
    idempotencyKey: 'takeover-withdraw-request-01',
    expectedEventId: acceptedEventId,
  });
  let releaseWorker;
  let signalBlocked;
  const blocked = new Promise((resolve) => { signalBlocked = resolve; });
  const gate = new Promise((resolve) => { releaseWorker = resolve; });
  const original = db.runTransaction;
  let calls = 0;
  db.runTransaction = function (...args) {
    calls++;
    if (calls === 3) {
      signalBlocked();
      return gate.then(() => original.apply(this, args));
    }
    return original.apply(this, args);
  };
  const workerA = recordParticipationEvent(withdrawal, 'withdrawn');
  try {
    await blocked;
    const firstLock = (await lockRef.get()).data();
    assert.ok(firstLock.workerId);
    assert.equal((await db.doc('listings/takeover-listing-000').get()).data().status, 'paused');
    assert.equal((await db.doc('listings/takeover-listing-200').get()).data().status, 'published');
    const expiresAt = Date.now() + 200;
    await lockRef.update({ leaseExpiresAt: Timestamp.fromMillis(expiresAt) });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.ok(Date.now() > (await lockRef.get()).data().leaseExpiresAt.toMillis());

    const completed = await recordParticipationEvent(withdrawal, 'withdrawn');
    assert.equal((await db.doc('listings/takeover-listing-200').get()).data().status, 'paused');
    assert.equal((await lockRef.get()).exists, false);
    await recordParticipationEvent(request(uid, {
      idempotencyKey: 'takeover-accept-request-001',
      expectedEventId: completed.eventId,
      termsVersion,
      termsText,
    }), 'accepted');
    const listingId = 'takeover-listing-000';
    await transitionListing(actionRequest(uid, listingId, 'takeover-resume-request-01'), 'resume', db);
    const resumed = (await db.doc(`listings/${listingId}`).get()).data();

    releaseWorker();
    await assert.rejects(workerA, {
      code: 'failed-precondition', details: { reason: 'stale-withdrawal-lock' },
    });
    assert.deepEqual((await db.doc(`listings/${listingId}`).get()).data(), resumed);
    assert.equal((await db.doc(`hostPrivate/${uid}`).get()).data().consentState, 'accepted');
    assert.equal((await lockRef.get()).exists, false);
  } finally {
    releaseWorker();
    db.runTransaction = original;
    await workerA.catch(() => {});
  }
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

  await suspendAccount(db, uid, null);
  const suspensionId = (await db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`).get()).data().suspensionId;
  await assert.rejects(reactivateAccount(db, uid, suspensionId), { code: 'failed-precondition' });
  await pauseListingsForSuspendedAccount(db, uid);
  await pauseListingsForSuspendedAccount(db, uid);

  const paused = (await db.doc('listings/suspension-published').get()).data();
  assert.equal(paused.status, 'paused');
  assert.ok(paused.pausedAt instanceof Timestamp);
  assert.equal((await db.doc('listings/suspension-draft').get()).data().status, 'draft');
  assert.equal((await db.doc('listings/suspension-other-published').get()).data().status, 'published');
});

test('prevents stale suspension workers from pausing listings after reactivation', async () => {
  const uid = 'lifecycle-reactivation';
  const listingId = 'lifecycle-reactivation-listing';
  const userRef = db.doc(`users/${uid}`);
  const stateRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`);
  await seedHost(uid);
  await seedListing(uid, listingId, { status: 'published', publishedAt: Timestamp.now() });
  await suspendAccount(db, uid, null);
  const oldSuspensionId = (await stateRef.get()).data().suspensionId;
  await pauseListingsForSuspendedAccount(db, uid);
  await reactivateAccount(db, uid, oldSuspensionId);
  await transitionListing(actionRequest(uid, listingId, 'reactivation-resume-key-1'), 'resume', db);
  await pauseListingsForSuspendedAccount(db, uid);
  await pausePublishedListings(db, uid, undefined, { userRef, stateRef, suspensionId: oldSuspensionId });
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'published');
  await suspendAccount(db, uid, oldSuspensionId);
  await pausePublishedListings(db, uid, undefined, { userRef, stateRef, suspensionId: oldSuspensionId });
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'published');
  await pauseListingsForSuspendedAccount(db, uid);
  assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, 'paused');
});

test('suspension serializes with simultaneous publication and resumption', async () => {
  for (const action of ['publish', 'resume']) {
    const uid = `suspension-race-${action}`;
    const listingId = `suspension-race-${action}-listing`;
    await seedHost(uid);
    await seedListing(uid, listingId, action === 'resume'
      ? { status: 'paused', publishedAt: Timestamp.now(), pausedAt: Timestamp.now() }
      : {});
    const [suspension, transition] = await Promise.allSettled([
      suspendAccount(db, uid, null),
      transitionListing(actionRequest(uid, listingId, `suspension-race-${action}-key`), action, db),
    ]);
    assert.equal(suspension.status, 'fulfilled');
    if (transition.status === 'rejected') {
      assert.equal(transition.reason.code, 'failed-precondition');
      assert.equal(transition.reason.details.reason, 'account-not-active');
    }
    await pauseListingsForSuspendedAccount(db, uid);
    const current = (await db.doc(`listings/${listingId}`).get()).data();
    assert.equal(current.status, transition.status === 'fulfilled'
      ? 'paused' : action === 'publish' ? 'draft' : 'paused');
    assert.equal((await db.doc(`users/${uid}`).get()).data().accountStatus, 'suspended');
  }
});

test('concurrent account transitions are idempotent and reject older generations', async () => {
  const uid = 'suspension-concurrent';
  const stateRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`);
  const userRef = db.doc(`users/${uid}`);
  await seedHost(uid);
  await Promise.all([suspendAccount(db, uid, null), suspendAccount(db, uid, null)]);
  const firstId = (await stateRef.get()).data().suspensionId;
  await pauseListingsForSuspendedAccount(db, uid);
  await Promise.all([
    reactivateAccount(db, uid, firstId),
    reactivateAccount(db, uid, firstId),
  ]);
  assert.equal((await userRef.get()).data().accountStatus, 'active');
  await assert.rejects(suspendAccount(db, uid, null), { code: 'failed-precondition' });
  await suspendAccount(db, uid, firstId);
  const secondId = (await stateRef.get()).data().suspensionId;
  assert.notEqual(secondId, firstId);
  await pauseListingsForSuspendedAccount(db, uid);
  await assert.rejects(reactivateAccount(db, uid, firstId), { code: 'failed-precondition' });
  await assert.rejects(suspendAccount(db, uid, null), { code: 'failed-precondition' });
  assert.equal((await userRef.get()).data().accountStatus, 'suspended');
  assert.equal((await stateRef.get()).data().suspensionId, secondId);
  await reactivateAccount(db, uid, secondId);
  assert.equal((await userRef.get()).data().accountStatus, 'active');
});

test('a suspension retry racing reactivation cannot restore an older suspension', async () => {
  const uid = 'suspension-reactivation-race';
  const stateRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`);
  const userRef = db.doc(`users/${uid}`);
  await seedHost(uid);
  await suspendAccount(db, uid, null);
  const suspensionId = (await stateRef.get()).data().suspensionId;
  await pauseListingsForSuspendedAccount(db, uid);

  const [suspension, reactivation] = await Promise.allSettled([
    suspendAccount(db, uid, null),
    reactivateAccount(db, uid, suspensionId),
  ]);
  assert.equal(reactivation.status, 'fulfilled');
  if (suspension.status === 'rejected') {
    assert.equal(suspension.reason.code, 'failed-precondition');
  }
  assert.equal((await userRef.get()).data().accountStatus, 'active');
  assert.equal((await stateRef.get()).data().status, 'reactivated');
  await assert.rejects(suspendAccount(db, uid, null), { code: 'failed-precondition' });
  assert.equal((await userRef.get()).data().accountStatus, 'active');
});

test('a new suspension racing reactivation cannot overwrite its generation', async () => {
  const uid = 'suspension-new-generation-race';
  const stateRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`);
  const userRef = db.doc(`users/${uid}`);
  await seedHost(uid);
  await suspendAccount(db, uid, null);
  const firstId = (await stateRef.get()).data().suspensionId;
  await pauseListingsForSuspendedAccount(db, uid);

  const [reactivation, suspension] = await Promise.allSettled([
    reactivateAccount(db, uid, firstId),
    suspendAccount(db, uid, firstId),
  ]);
  assert.equal(reactivation.status, 'fulfilled');
  if (suspension.status === 'rejected') {
    assert.equal(suspension.reason.code, 'failed-precondition');
    assert.equal((await userRef.get()).data().accountStatus, 'active');
    assert.equal((await stateRef.get()).data().status, 'reactivated');
    await suspendAccount(db, uid, firstId);
  }
  const secondId = (await stateRef.get()).data().suspensionId;
  assert.notEqual(secondId, firstId);
  await pauseListingsForSuspendedAccount(db, uid);
  await assert.rejects(reactivateAccount(db, uid, firstId), { code: 'failed-precondition' });
  assert.equal((await userRef.get()).data().accountStatus, 'suspended');
  assert.equal((await stateRef.get()).data().suspensionId, secondId);
});

test('suspension processing retries after a partial listing batch failure', async () => {
  const uid = 'suspension-partial-failure';
  const stateRef = db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`);
  await seedHost(uid);
  const batch = db.batch();
  for (let index = 0; index < 201; index++) {
    const id = `suspension-failure-${String(index).padStart(3, '0')}`;
    batch.set(db.doc(`listings/${id}`), listing(uid, id, {
      status: 'published', publishedAt: Timestamp.now(),
    }));
  }
  await batch.commit();
  await suspendAccount(db, uid, null);
  const suspensionId = (await stateRef.get()).data().suspensionId;
  const original = db.runTransaction;
  let calls = 0;
  db.runTransaction = function (...args) {
    if (++calls === 2) return Promise.reject(new Error('Injected suspension page failure'));
    return original.apply(this, args);
  };
  try {
    await assert.rejects(pauseListingsForSuspendedAccount(db, uid), /Injected suspension page failure/);
  } finally {
    db.runTransaction = original;
  }
  assert.equal((await stateRef.get()).data().status, 'pending');
  assert.equal((await db.doc('listings/suspension-failure-000').get()).data().status, 'paused');
  assert.equal((await db.doc('listings/suspension-failure-200').get()).data().status, 'published');
  await assert.rejects(reactivateAccount(db, uid, suspensionId), { code: 'failed-precondition' });
  await pauseListingsForSuspendedAccount(db, uid);
  assert.equal((await db.doc('listings/suspension-failure-200').get()).data().status, 'paused');
  assert.equal((await stateRef.get()).data().status, 'complete');
  await reactivateAccount(db, uid, suspensionId);
  assert.equal((await db.doc(`users/${uid}`).get()).data().accountStatus, 'active');
});

test('account administration helpers are not exported as public Functions', () => {
  const script = `
    import { createRequire } from 'node:module';
    const functions = createRequire(import.meta.url)('./lib/index.js');
    console.log(JSON.stringify(Object.keys(functions).sort()));
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: new URL('../', import.meta.url),
    encoding: 'utf8',
  });
  const exported = JSON.parse(output.trim());
  assert.deepEqual(exported, [
    'acceptHostParticipation',
    'archiveListing',
    'createHostingRequest',
    'getHostingRequest',
    'getPublicListingDetails',
    'listHostHostingRequests',
    'listTravellerHostingRequests',
    'pauseListing',
    'pauseListingsOnAccountSuspension',
    'publishListing',
    'resumeListing',
    'searchPublishedListings',
    'withdrawHostParticipation',
  ]);
});

test('all lifecycle callable wrappers enforce App Check and the hosting Functions region', () => {
  const script = `
    delete process.env.FUNCTIONS_EMULATOR;
    const [{ default: express }, { initializeApp }, { getAuth }, { getAppCheck },
      { archiveListing, pauseListing, publishListing, resumeListing },
      { createHostingRequest }] = await Promise.all([
        import('express'), import('firebase-admin/app'), import('firebase-admin/auth'),
        import('firebase-admin/app-check'), import('./lib/hosting/listing-lifecycle.js'),
        import('./lib/hosting/hosting-requests.js'),
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
      ['create-request', createHostingRequest],
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
    Array.from({ length: 5 }, () => [
      [401, 'UNAUTHENTICATED'],
      [401, 'UNAUTHENTICATED'],
      [400, 'INVALID_ARGUMENT'],
    ]),
    Array.from({ length: 5 }, () => ['us-central1']),
  ]);
});
