import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { loadPublicListingDetails, searchPublicListings } from '../lib/hosting/public-listings.js';
import { getRequest, listRequests } from '../lib/hosting/hosting-requests.js';

if (process.env.GCLOUD_PROJECT !== 'demo-openstay'
    || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080'
    || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
  throw new Error('Demo tests require the local demo-openstay emulators.');
}

const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
const client = initializeClientApp({ projectId: 'demo-openstay', apiKey: 'demo-openstay' });
const auth = getAuth(client);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const call = (uid, data) => ({ auth: { uid, token: { email_verified: true } }, data });

after(async () => {
  await deleteClientApp(client);
  await deleteApp(app);
});

test('imported demo accounts and stays are usable through existing application logic', async () => {
  const signedIn = await signInWithEmailAndPassword(auth, 'demo1@example.test', 'Openstay-demo-2026!');
  assert.equal(signedIn.user.uid, 'demo-user-1');
  assert.equal(signedIn.user.emailVerified, true);
  const listings = await searchPublicListings({ data: { filters: {} } }, db);
  assert.equal(listings.items.length, 5);
  const details = await loadPublicListingDetails({ data: { listingId: 'demo-listing-1' } }, db);
  assert.equal(details.host.displayName, 'Maya Chen');
  const requests = await listRequests(call('demo-user-1', {}), 'travellerUid', db);
  assert.equal(requests.items.length, 1);
  assert.equal((await getRequest(call('demo-user-1', { requestId: requests.items[0].requestId }), db)).status, 'accepted');
  await assert.rejects(getRequest(call('outsider', { requestId: requests.items[0].requestId }), db));
});

test('seeder refuses an existing emulator without changing its records', async () => {
  assert.throws(() => execFileSync(process.execPath, ['functions/scripts/seed-demo.mjs'], {
    env: process.env, stdio: 'pipe',
  }), /non-empty emulator collection/);
  assert.equal((await db.collection('users').get()).size, 5);
  assert.equal((await db.collection('listings').get()).size, 5);
});
