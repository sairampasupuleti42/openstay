import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  HOST_PARTICIPATION_TERMS_VERSION,
  recordParticipationEvent,
} from '../lib/hosting/host-participation.js';
import { transitionListing } from '../lib/hosting/listing-lifecycle.js';
import { searchPublicListings } from '../lib/hosting/public-listings.js';
import { createRequest, getRequest, transitionRequest } from '../lib/hosting/hosting-requests.js';
import { listParticipantConversations, sendMessage } from '../lib/hosting/conversations.js';
import { processRequestCreatedNotification } from '../lib/hosting/notifications.js';

if (process.env.GCLOUD_PROJECT !== 'demo-openstay'
    || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080'
    || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
  throw new Error('Demo seeding requires demo-openstay and the local Firestore and Auth emulators.');
}

const termsText =
  'Hosting on Openstay is voluntary and free. Openstay does not charge you to participate. You choose whether to host and may stop participating. Only host profile fields marked public can be viewed by others. Do not include private contact details or your exact residential address in public profile text. Openstay does not provide background checks, identity verification, insurance, or safety guarantees.';
const samples = [
  { name: 'Maya Chen', city: 'Kyoto', country: 'Japan', title: 'A quiet room near the gardens', type: 'private_room', language: 'ja' },
  { name: 'Sofia Costa', city: 'Lisbon', country: 'Portugal', title: 'A sunny home above the river', type: 'entire_home', language: 'pt' },
  { name: 'Arun Rao', city: 'Bengaluru', country: 'India', title: 'A leafy neighbourhood guest room', type: 'private_room', language: 'hi' },
  { name: 'Lina Morales', city: 'Mexico City', country: 'Mexico', title: 'A welcoming stay near the park', type: 'guest_house', language: 'es' },
  { name: 'Noah Wilson', city: 'Wellington', country: 'New Zealand', title: 'A relaxed coastal home', type: 'private_room', language: 'en' },
];
const call = (uid, data) => ({ auth: { uid, token: { email_verified: true } }, data });
const userId = (index) => `demo-user-${index + 1}`;
const listingId = (index) => `demo-listing-${index + 1}`;
const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
const auth = getAuth(app);

try {
  const collections = [
    'users', 'userPrivate', 'usernames', 'hostProfiles', 'hostPrivate', 'listings',
    'hostingRequests', 'hostingRequestReservations', 'conversations', 'notifications',
  ];
  for (const collection of collections) {
    if (!(await db.collection(collection).limit(1).get()).empty) {
      throw new Error(`Refusing to seed a non-empty emulator collection: ${collection}.`);
    }
  }
  if ((await auth.listUsers(1)).users.length) {
    throw new Error('Refusing to seed a non-empty Auth emulator.');
  }

  const now = Timestamp.now();
  for (const [index, sample] of samples.entries()) {
    const uid = userId(index);
    const username = `demo_user_${index + 1}`;
    await auth.createUser({
      uid,
      email: `demo${index + 1}@example.test`,
      password: 'Openstay-demo-2026!',
      displayName: sample.name,
      emailVerified: true,
    });
    const batch = db.batch();
    batch.create(db.doc(`users/${uid}`), {
      uid, displayName: sample.name, username, city: sample.city, country: sample.country,
      bio: 'I enjoy meeting people, sharing local recommendations and exploring new places.',
      languages: [...new Set(['en', sample.language])], interests: ['food', 'walking'],
      roles: ['traveller', 'host'], accountStatus: 'active', verificationStatus: 'unverified',
      createdAt: now, updatedAt: now,
    });
    batch.create(db.doc(`userPrivate/${uid}`), { uid, privatePreferences: {}, updatedAt: now });
    batch.create(db.doc(`usernames/${username}`), { uid, createdAt: now, updatedAt: now });
    batch.create(db.doc(`hostProfiles/${uid}`), {
      uid, displayName: sample.name, introduction: 'I enjoy sharing local walks and favourite neighbourhood spots.',
      languages: [...new Set(['en', sample.language])], visibility: 'public', createdAt: now, updatedAt: now,
    });
    batch.create(db.doc(`listings/${listingId(index)}`), {
      listingId: listingId(index), hostUid: uid, title: sample.title,
      description: 'A comfortable place to unwind, with a welcoming host and plenty of local places to explore nearby.',
      accommodationType: sample.type, country: sample.country, city: sample.city,
      guestCapacity: 2, bedrooms: 1, beds: 1, bathrooms: 1,
      amenities: ['wifi', 'kitchen', 'hot_water'], houseRules: ['Please respect quiet hours.'],
      status: 'draft', createdAt: now, updatedAt: now,
    });
    await batch.commit();
    await recordParticipationEvent(call(uid, {
      idempotencyKey: `demo-consent-key-${index + 1}`, expectedEventId: null,
      termsVersion: HOST_PARTICIPATION_TERMS_VERSION, termsText,
    }), 'accepted');
    await transitionListing(call(uid, {
      listingId: listingId(index), idempotencyKey: `demo-publish-key-${index + 1}`,
      publicContentReviewed: true,
    }), 'publish', db);
  }

  for (const [index] of samples.entries()) {
    const host = userId(index);
    const traveller = userId((index + 1) % samples.length);
    const { requestId } = await createRequest(call(traveller, {
      listingId: listingId(index), startDate: '2031-04-10', endDate: '2031-04-14', guestCount: 1,
      introductoryMessage: 'Hello! I am looking forward to exploring the area and meeting local people.',
    }), db);
    await processRequestCreatedNotification({
      requestId, data: (await db.doc(`hostingRequests/${requestId}`).get()).data(),
    }, db);
    await transitionRequest(call(host, { requestId, action: 'accept' }), db);
    await sendMessage(call(traveller, {
      requestId, text: 'Thank you for welcoming me. I look forward to the stay!',
      idempotencyKey: `demo-message-key-${index + 1}`,
    }), db);
    assert.equal((await getRequest(call(traveller, { requestId }), db)).status, 'accepted');
  }

  for (const collection of [...collections, 'notificationCounts', 'listingSchedules']) {
    assert.equal((await db.collection(collection).get()).size, 5, `${collection} must contain five records`);
  }
  assert.equal((await db.collectionGroup('messages').get()).size, 5);
  assert.equal((await searchPublicListings({ data: { filters: {} } }, db)).items.length, 5);
  assert.equal((await listParticipantConversations(call(userId(0), {}), db)).items.length, 2);
  console.log('Seeded and verified five demo accounts, listings, requests, conversations, messages and notifications.');
} finally {
  await deleteApp(app);
}
