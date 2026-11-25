import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-openstay';
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('./firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

function initialProfile(uid, overrides = {}) {
  return {
    uid,
    displayName: 'Traveller',
    username: 'traveller_1',
    email: 'traveller@example.com',
    emailVerified: false,
    languages: [],
    interests: [],
    roles: ['traveller'],
    accountStatus: 'active',
    verificationStatus: 'unverified',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

test('allows an owner to create a valid unverified initial profile', async () => {
  const db = testEnv.authenticatedContext('traveller-1', {
    email: 'traveller@example.com',
    email_verified: false,
  }).firestore();

  await assertSucceeds(
    setDoc(doc(db, 'users/traveller-1'), initialProfile('traveller-1')),
  );
});

test('denies creating a profile for another user', async () => {
  const db = testEnv.authenticatedContext('traveller-1', {
    email: 'traveller@example.com',
    email_verified: false,
  }).firestore();

  await assertFails(
    setDoc(doc(db, 'users/traveller-2'), initialProfile('traveller-2')),
  );
});

test('denies client-assigned verified status and elevated roles', async (t) => {
  const db = testEnv.authenticatedContext('traveller-1', {
    email: 'traveller@example.com',
    email_verified: false,
  }).firestore();

  await t.test('verified email flag', async () => {
    await assertFails(
      setDoc(
        doc(db, 'users/traveller-1'),
        initialProfile('traveller-1', { emailVerified: true }),
      ),
    );
  });

  await t.test('verified profile status', async () => {
    await assertFails(
      setDoc(
        doc(db, 'users/traveller-1'),
        initialProfile('traveller-1', { verificationStatus: 'verified' }),
      ),
    );
  });

  await t.test('host role', async () => {
    await assertFails(
      setDoc(
        doc(db, 'users/traveller-1'),
        initialProfile('traveller-1', { roles: ['traveller', 'host'] }),
      ),
    );
  });
});

test('denies elevating profile privileges after initial creation', async (t) => {
  const uid = 'privilege-test';
  const db = testEnv.authenticatedContext(uid, {
    email: 'traveller@example.com',
    email_verified: false,
  }).firestore();
  const profileRef = doc(db, `users/${uid}`);
  await assertSucceeds(setDoc(profileRef, initialProfile(uid)));

  await t.test('host role', async () => {
    await assertFails(updateDoc(profileRef, { roles: ['traveller', 'host'] }));
  });

  await t.test('verified profile status', async () => {
    await assertFails(updateDoc(profileRef, { verificationStatus: 'verified' }));
  });

  await t.test('verified email flag', async () => {
    await assertFails(updateDoc(profileRef, { emailVerified: true }));
  });
});

test('denies profile updates from an unverified user', async () => {
  const uid = 'unverified-user';
  const db = testEnv.authenticatedContext(uid, {
    email: 'traveller@example.com',
    email_verified: false,
  }).firestore();
  const profileRef = doc(db, `users/${uid}`);
  await assertSucceeds(setDoc(profileRef, initialProfile(uid)));

  await assertFails(updateDoc(profileRef, { bio: 'A new profile bio' }));
});
