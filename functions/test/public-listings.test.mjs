import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  getPublicListingDetails,
  isSafePublicText,
  loadPublicListingDetails,
  searchPublicListings,
  searchPublishedListings,
} from '../lib/hosting/public-listings.js';
import { transitionListing } from '../lib/hosting/listing-lifecycle.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Public listing tests require the demo-openstay Firestore emulator.');
}

const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
const termsText =
  'Hosting on Openstay is voluntary and free. Openstay does not charge you to participate. You choose whether to host and may stop participating. Only host profile fields marked public can be viewed by others. Do not include private contact details or your exact residential address in public profile text. Openstay does not provide background checks, identity verification, insurance, or safety guarantees.';
const termsDigest = createHash('sha256').update(termsText).digest('hex');
const termsEventId = 'c'.repeat(64);

after(async () => {
  await deleteApp(app);
});

function request(data) {
  return { data };
}

function lifecycleRequest(uid, listingId, idempotencyKey) {
  return {
    auth: { uid, token: { email_verified: true } },
    data: { listingId, idempotencyKey, publicContentReviewed: true },
  };
}

function listing(uid, id, overrides = {}) {
  const timestamp = Timestamp.fromDate(new Date('2026-04-01T00:00:00Z'));
  return {
    listingId: id,
    hostUid: uid,
    title: 'A welcoming stay near the centre',
    description:
      'A comfortable and thoughtfully prepared place to stay with room to relax and enjoy the city.',
    accommodationType: 'private_room',
    country: 'New Zealand',
    city: 'Wellington',
    region: 'Te Aro',
    areaDescription: 'Near the waterfront',
    guestCapacity: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: ['wifi', 'kitchen'],
    houseRules: ['Quiet hours after ten'],
    status: 'published',
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

async function seedHost(uid, {
  accountStatus = 'active',
  consentState = 'accepted',
  visibility = 'public',
  introduction = 'I enjoy helping guests explore the neighbourhood.',
} = {}) {
  const now = Timestamp.now();
  await db.doc(`users/${uid}`).set({ accountStatus });
  await db.doc(`hostPrivate/${uid}`).set({
    uid,
    termsVersion: 'host-participation-v1',
    termsDigest,
    consentState,
    eventId: termsEventId,
    updatedAt: now,
  });
  await db.doc(`hostProfiles/${uid}`).set({
    uid,
    displayName: 'Openstay Host',
    introduction,
    languages: ['en', 'mi'],
    visibility,
    createdAt: now,
    updatedAt: now,
  });
}

async function seedListing(uid, id, overrides = {}) {
  await db.doc(`listings/${id}`).set(listing(uid, id, overrides));
}

test('screens common international street-address formats in public text', () => {
  for (const address of [
    '10 rue de Rivoli, Paris',
    '221B Baker Street',
    '12 Calle Mayor, Madrid',
    '5 Via Roma, Florence',
    '10 Straße des 17. Juni, Berlin',
    'Door No. 12, 3rd Cross Road, Indiranagar, Bengaluru',
    'No. 14, 2nd Main, Indiranagar, Bengaluru',
    'No 14, 2nd Main Road, Indiranagar, Bengaluru',
    'No.14, 2nd Cross Rd, Indiranagar, Bengaluru',
    'Flat 12, 3rd Floor, 45, M.G. Road, Bengaluru',
    'Flat No. 12, 3rd Floor, MG Road, Bengaluru',
    'H.No.12, Indiranagar, Bengaluru',
    'House # 12, Green Park, New Delhi',
    'Flat B-402, Green Park Extension, New Delhi',
    '12, MG Road, Bengaluru',
    '12, M.G. Rd., Bengaluru',
  ]) {
    assert.equal(isSafePublicText(address), false, `Expected address to be rejected: ${address}`);
  }
  assert.equal(isSafePublicText('A ten-minute walk to the main road.'), true);
});

test('distinguishes phone numbers from dates, quantities and ordinary listing descriptions', () => {
  for (const text of [
    'Bookings are open from 2025-2026 for guests visiting the city.',
    'Available 2026-01-01 to 2026-12-31, with a bright room.',
    'Available 01/01/2026 - 31/12/2026 for a comfortable stay.',
    'Enjoy 24/7 access, with 2 bedrooms and space for 4 guests.',
    'Stay for 7-14 days, a 10-minute walk from the main road.',
    'A comfortable apartment with a kitchen, garden and a quiet workspace.',
  ]) {
    assert.equal(isSafePublicText(text), true, `Expected safe text: ${text}`);
  }
  for (const text of [
    'Call +1 (415) 555-0134 to arrange a visit.',
    'Phone +91 98765 43210 for details.',
    'Contact us at +९१ ९८७६५ ४३२१० for details.',
    'Call +١ (٤١٥) ٥٥٥-٠١٣٤ to arrange a visit.',
    'Reach us on 9876543210.',
    'Call +44 20 7946 0958.',
    'Contact 01 42 68 53 00 for your stay.',
    'Telephone 1234 5678 for details.',
    'Phone 555-0123 for details.',
  ]) {
    assert.equal(isSafePublicText(text), false, `Expected phone to be rejected: ${text}`);
  }
});

test('search filters published stays on the server and paginates without duplicates', async () => {
  const uid = 'public-search-host';
  await seedHost(uid);
  await seedListing(uid, 'public-search-capacity-2', {
    country: 'Searchland',
    city: 'Search City',
    guestCapacity: 2,
    publishedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
  });
  await seedListing(uid, 'public-search-capacity-5', {
    country: 'Searchland',
    city: 'Search City',
    guestCapacity: 5,
    publishedAt: Timestamp.fromDate(new Date('2026-03-01T00:00:00Z')),
  });
  await seedListing(uid, 'public-search-other-city', {
    country: 'Searchland', city: 'Other City',
  });
  await seedListing(uid, 'public-search-other-type', {
    country: 'Searchland', city: 'Search City', accommodationType: 'entire_home',
  });
  await seedListing(uid, 'public-search-other-country', {
    country: 'Otherland', city: 'Search City',
  });
  await seedListing(uid, 'public-search-paused', { status: 'paused' });
  await seedListing(uid, 'public-search-draft', { status: 'draft' });
  await seedHost('public-search-suspended-host', { accountStatus: 'suspended' });
  await seedListing('public-search-suspended-host', 'public-search-suspended');
  await seedHost('public-search-withdrawn-host', { consentState: 'withdrawn' });
  await seedListing('public-search-withdrawn-host', 'public-search-withdrawn');

  const filters = {
    country: 'Searchland',
    city: 'Search City',
    accommodationType: 'private_room',
    minimumGuests: 2,
  };
  const first = await searchPublicListings(request({ filters, pageSize: 1 }), db);
  assert.deepEqual(first.items.map((item) => item.listingId), ['public-search-capacity-2']);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);

  const second = await searchPublicListings(
    request({ filters, pageSize: 1, cursor: first.nextCursor }),
    db,
  );
  assert.deepEqual(second.items.map((item) => item.listingId), ['public-search-capacity-5']);
  assert.equal(second.hasMore, false);
  assert.equal(second.nextCursor, null);
});

test('search rejects malformed filters, oversized pages, and cursors from another search', async () => {
  await assert.rejects(searchPublicListings(request({ filters: { hostUid: 'private' } }), db), {
    code: 'invalid-argument',
  });
  await assert.rejects(searchPublicListings(request({
    filters: {}, pageSize: 21,
  }), db), { code: 'invalid-argument' });
  await assert.rejects(searchPublicListings(request({
    filters: {}, cursor: 'not-a-valid-cursor',
  }), db), { code: 'invalid-argument' });

  const first = await searchPublicListings(request({
    filters: { city: 'Search City' }, pageSize: 1,
  }), db);
  if (first.nextCursor) {
    await assert.rejects(searchPublicListings(request({
      filters: { city: 'Other City' }, pageSize: 1, cursor: first.nextCursor,
    }), db), { code: 'invalid-argument' });
  }
});

test('public details contain only approved listing and host fields', async () => {
  const uid = 'public-detail-host';
  const listingId = 'public-detail-safe';
  await seedHost(uid);
  await seedListing(uid, listingId);

  const details = await loadPublicListingDetails(request({ listingId }), db);
  assert.ok(details);
  assert.deepEqual(Object.keys(details).sort(), [
    'accommodationType',
    'amenities',
    'bathrooms',
    'bedrooms',
    'beds',
    'city',
    'country',
    'description',
    'guestCapacity',
    'host',
    'houseRules',
    'listingId',
    'region',
    'title',
  ]);
  assert.deepEqual(details.host, {
    displayName: 'Openstay Host',
    introduction: 'I enjoy helping guests explore the neighbourhood.',
    languages: ['en', 'mi'],
  });
  assert.equal(JSON.stringify(details).includes(uid), false);
  assert.equal(JSON.stringify(details).includes('Near the waterfront'), false);
  assert.equal(JSON.stringify(details).includes('hostUid'), false);
  assert.equal(JSON.stringify(details).includes('publishedAt'), false);
});

test('private or unsafe host profile text is never included in public details', async () => {
  await seedHost('public-detail-private-host', { visibility: 'private' });
  await seedListing('public-detail-private-host', 'public-detail-private');
  const privateDetails = await loadPublicListingDetails(
    request({ listingId: 'public-detail-private' }),
    db,
  );
  assert.equal(privateDetails?.host, null);

  await seedHost('public-detail-unsafe-host', {
    introduction: 'Email host@example.com to arrange a visit.',
  });
  await seedListing('public-detail-unsafe-host', 'public-detail-unsafe-profile');
  const unsafeProfile = await loadPublicListingDetails(
    request({ listingId: 'public-detail-unsafe-profile' }),
    db,
  );
  assert.equal(unsafeProfile?.host, null);

  await seedHost('public-detail-unsafe-name-host');
  await db.doc('hostProfiles/public-detail-unsafe-name-host').update({
    displayName: 'Door No. 12, Indiranagar, Bengaluru',
  });
  await seedListing('public-detail-unsafe-name-host', 'public-detail-unsafe-name');
  const unsafeName = await loadPublicListingDetails(
    request({ listingId: 'public-detail-unsafe-name' }),
    db,
  );
  assert.equal(unsafeName?.host, null);
});

test('draft, paused, archived, suspended, and withdrawn listings are not public details', async () => {
  const uid = 'public-detail-state-host';
  await seedHost(uid);
  for (const status of ['draft', 'paused', 'archived']) {
    const listingId = `public-detail-${status}`;
    await seedListing(uid, listingId, { status });
    assert.equal(await loadPublicListingDetails(request({ listingId }), db), null);
  }

  const suspendedId = 'public-detail-after-suspension';
  await seedListing(uid, suspendedId);
  await db.doc(`users/${uid}`).update({ accountStatus: 'suspended' });
  assert.equal(await loadPublicListingDetails(request({ listingId: suspendedId }), db), null);

  await db.doc(`users/${uid}`).update({ accountStatus: 'active' });
  await db.doc(`hostPrivate/${uid}`).update({ consentState: 'withdrawn' });
  assert.equal(await loadPublicListingDetails(request({ listingId: suspendedId }), db), null);
});

test('trusted lifecycle transitions control public discovery visibility', async () => {
  const uid = 'public-lifecycle-host';
  const listingId = 'public-lifecycle-listing';
  await seedHost(uid);
  await seedListing(uid, listingId, {
    country: 'Lifecycleland',
    city: 'Lifecycle City',
    status: 'draft',
    publishedAt: null,
  });
  const filters = { country: 'Lifecycleland', city: 'Lifecycle City' };

  assert.equal((await searchPublicListings(request({ filters }), db)).items.length, 0);
  await transitionListing(
    lifecycleRequest(uid, listingId, 'public-lifecycle-publish-01'),
    'publish',
    db,
  );
  assert.deepEqual(
    (await searchPublicListings(request({ filters }), db)).items.map((item) => item.listingId),
    [listingId],
  );

  await transitionListing(
    lifecycleRequest(uid, listingId, 'public-lifecycle-pause-001'),
    'pause',
    db,
  );
  assert.equal((await searchPublicListings(request({ filters }), db)).items.length, 0);
  assert.equal(await loadPublicListingDetails(request({ listingId }), db), null);

  await transitionListing(
    lifecycleRequest(uid, listingId, 'public-lifecycle-resume-01'),
    'resume',
    db,
  );
  assert.equal((await searchPublicListings(request({ filters }), db)).items.length, 1);
  await transitionListing(
    lifecycleRequest(uid, listingId, 'public-lifecycle-archive-01'),
    'archive',
    db,
  );
  assert.equal((await searchPublicListings(request({ filters }), db)).items.length, 0);
  assert.equal(await loadPublicListingDetails(request({ listingId }), db), null);
});

test('unsafe legacy listing text is filtered from both search and direct details', async () => {
  const uid = 'public-detail-legacy-copy-host';
  const listingId = 'public-detail-legacy-copy';
  await seedHost(uid);
  await seedListing(uid, listingId, {
    description: 'A welcoming place. Contact host@example.com for a comfortable city stay.',
  });
  const page = await searchPublicListings(request({ filters: { city: 'Wellington' } }), db);
  assert.equal(page.items.some((item) => item.listingId === listingId), false);
  assert.equal(await loadPublicListingDetails(request({ listingId }), db), null);
});

test('unsafe area descriptions and international addresses are never publicly returned', async () => {
  const uid = 'public-detail-address-host';
  await seedHost(uid);
  const fixtures = [
    ['public-detail-address-area', { areaDescription: '10 rue de Rivoli, Paris' }],
    ['public-detail-address-rule', { houseRules: ['Address: 221B Baker Street'] }],
    ['public-detail-address-description', {
      description:
        'A comfortable and thoughtfully prepared place to stay at 12 Calle Mayor, Madrid.',
    }],
  ];

  for (const [listingId, overrides] of fixtures) {
    await seedListing(uid, listingId, overrides);
    assert.equal(await loadPublicListingDetails(request({ listingId }), db), null);
  }
  const page = await searchPublicListings(request({ filters: { city: 'Wellington' } }), db);
  assert.equal(page.items.some((item) => item.listingId.startsWith('public-detail-address-')), false);
});

test('screens each listing text field during publish, resume, and legacy public reads', async () => {
  const uid = 'public-screening-fields-host';
  await seedHost(uid);
  const address = 'Door No. 12, 3rd Cross Road, Indiranagar, Bengaluru';
  const flatAddress = 'Flat 12, 3rd Floor, 45, M.G. Road, Bengaluru';
  const fixtures = [
    ['title', { title: address }],
    ['description', { description: `A comfortable place at ${flatAddress}, with room to relax.` }],
    ['country', { country: address }],
    ['city', { city: address }],
    ['region', { region: address }],
    ['area', { areaDescription: flatAddress }],
    ['rule', { houseRules: [address] }],
  ];

  for (const [label, overrides] of fixtures) {
    const baseId = `screened-field-${label}`;
    for (const [status, action] of [['draft', 'publish'], ['paused', 'resume']]) {
      const listingId = `${baseId}-${status}`;
      await seedListing(uid, listingId, { ...overrides, status });
      await assert.rejects(
        transitionListing(lifecycleRequest(uid, listingId, `${baseId}-${action}-request`), action, db),
        { code: 'failed-precondition', details: { reason: 'private-content-not-allowed' } },
      );
      assert.equal((await db.doc(`listings/${listingId}`).get()).data().status, status);
    }

    const listingId = `${baseId}-legacy`;
    await seedListing(uid, listingId, {
      country: 'Screeningland',
      city: 'Screening City',
      ...overrides,
    });
    assert.equal(await loadPublicListingDetails(request({ listingId }), db), null);
    const filters = label === 'country'
      ? { city: 'Screening City' }
      : { country: 'Screeningland' };
    const page = await searchPublicListings(request({ filters }), db);
    assert.equal(page.items.some((item) => item.listingId === listingId), false);
  }
});

test('Indian numbered-road addresses and native-digit phones fail lifecycle and legacy screening', async () => {
  const uid = 'public-screening-native-details-host';
  await seedHost(uid);
  const privateTexts = [
    'A comfortable place at No. 14, 2nd Main, Indiranagar, Bengaluru, with room to relax and enjoy the city.',
    'Contact us at +९१ ९८७६५ ४३२१० for details about this comfortable city stay.',
  ];

  for (const [index, description] of privateTexts.entries()) {
    const draftId = `native-private-draft-${index}`;
    await seedListing(uid, draftId, { status: 'draft', publishedAt: null, description });
    await assert.rejects(
      transitionListing(
        lifecycleRequest(uid, draftId, `native-private-publish-${index}-request`),
        'publish',
        db,
      ),
      { code: 'failed-precondition', details: { reason: 'private-content-not-allowed' } },
    );

    const legacyId = `native-private-legacy-${index}`;
    await seedListing(uid, legacyId, {
      country: 'NativeScreeningland',
      city: 'Native Screening City',
      description,
    });
    assert.equal(await loadPublicListingDetails(request({ listingId: legacyId }), db), null);
    const page = await searchPublicListings(
      request({ filters: { country: 'NativeScreeningland' } }),
      db,
    );
    assert.equal(page.items.some((item) => item.listingId === legacyId), false);
  }
});

test('date ranges remain publishable and visible without exposing areaDescription', async () => {
  const uid = 'public-screening-dates-host';
  const listingId = 'public-screening-dates-listing';
  await seedHost(uid);
  await seedListing(uid, listingId, {
    status: 'draft',
    publishedAt: null,
    country: 'Dateland',
    description: 'Bookings are open from 2025-2026 for guests visiting the city.',
    areaDescription: 'Near the waterfront',
  });
  await transitionListing(
    lifecycleRequest(uid, listingId, 'screening-dates-publish-request'),
    'publish',
    db,
  );
  const page = await searchPublicListings(request({ filters: { country: 'Dateland' } }), db);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].listingId, listingId);
  assert.equal('areaDescription' in page.items[0], false);
  const details = await loadPublicListingDetails(request({ listingId }), db);
  assert.equal(details?.description, 'Bookings are open from 2025-2026 for guests visiting the city.');
  assert.equal('areaDescription' in details, false);
});

test('public callable wrappers enforce App Check and declare the hosting region', async () => {
  const { execFileSync } = await import('node:child_process');
  const script = `
    delete process.env.FUNCTIONS_EMULATOR;
    const [{ default: express }, { initializeApp }, { getAppCheck },
      { getPublicListingDetails, searchPublishedListings }] = await Promise.all([
        import('express'), import('firebase-admin/app'), import('firebase-admin/app-check'),
        import('./lib/hosting/public-listings.js?public-app-check'),
      ]);
    const firebaseApp = initializeApp({ projectId: 'demo-openstay' });
    getAppCheck(firebaseApp).verifyToken = async (token) => {
      if (token !== 'valid-app-check') throw new Error('Invalid App Check token');
      return { appId: 'demo-app' };
    };
    const app = express();
    app.use(express.json());
    const callables = [
      ['details', getPublicListingDetails], ['search', searchPublishedListings],
    ];
    for (const [path, callable] of callables) app.post('/' + path, callable);
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const outcomes = [];
    for (const [path] of callables) {
      const result = [];
      for (const appCheckToken of [null, 'invalid-app-check', 'valid-app-check']) {
        const headers = { 'content-type': 'application/json' };
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
  });
  const result = output.split('\n').flatMap((line) => {
    try {
      const parsed = JSON.parse(line);
      return Array.isArray(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  }).at(-1);
  assert.deepEqual(result, [
    Array.from({ length: 2 }, () => [
      [401, 'UNAUTHENTICATED'],
      [401, 'UNAUTHENTICATED'],
      [400, 'INVALID_ARGUMENT'],
    ]),
    [['us-central1'], ['us-central1']],
  ]);
});
