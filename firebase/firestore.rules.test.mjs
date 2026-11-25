import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

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

function initialPrivateProfile(uid, overrides = {}) {
  return {
    uid,
    privatePreferences: {},
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function initialUsernameReservation(uid) {
  return {
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

  await t.test('email field', async () => {
    await assertFails(
      setDoc(
        doc(db, 'users/traveller-1'),
        initialProfile('traveller-1', { email: 'traveller@example.com' }),
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

  await t.test('email field', async () => {
    await assertFails(updateDoc(profileRef, { email: 'new@example.com' }));
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

test('denies profile updates for a suspended account', async () => {
  const uid = 'suspended-user';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), `users/${uid}`),
      initialProfile(uid, { accountStatus: 'suspended' }),
    );
  });

  const db = testEnv.authenticatedContext(uid, {
    email: 'traveller@example.com',
    email_verified: true,
  }).firestore();
  await assertFails(updateDoc(doc(db, `users/${uid}`), { bio: 'A new profile bio' }));
});

test('allows owners to create and read private profiles without email', async (t) => {
  const uid = 'private-profile-owner';
  const ownerDb = testEnv.authenticatedContext(uid).firestore();
  const ownerRef = doc(ownerDb, `userPrivate/${uid}`);

  await assertSucceeds(setDoc(ownerRef, initialPrivateProfile(uid)));
  await assertSucceeds(getDoc(ownerRef));

  await t.test('denies access to another owner', async () => {
    const otherDb = testEnv.authenticatedContext('another-user').firestore();
    await assertFails(getDoc(doc(otherDb, `userPrivate/${uid}`)));
    await assertFails(
      setDoc(
        doc(otherDb, 'userPrivate/someone-else'),
        initialPrivateProfile('someone-else'),
      ),
    );
  });
});

test('allows private preference updates and protects the UID', async () => {
  const uid = 'private-profile-update';
  const db = testEnv.authenticatedContext(uid).firestore();
  const profileRef = doc(db, `userPrivate/${uid}`);
  await assertSucceeds(setDoc(profileRef, initialPrivateProfile(uid)));

  await assertSucceeds(updateDoc(profileRef, {
    phoneNumber: '+64210000000',
    privatePreferences: { notifications: true },
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(profileRef, {
    uid: 'another-user',
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(profileRef, {
    email: 'new@example.com',
    updatedAt: serverTimestamp(),
  }));
});

test('allows updating legacy private documents without changing their email', async () => {
  const uid = 'legacy-private-profile';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), `userPrivate/${uid}`),
      initialPrivateProfile(uid, { email: 'legacy@example.com' }),
    );
  });

  const db = testEnv.authenticatedContext(uid).firestore();
  await assertSucceeds(updateDoc(doc(db, `userPrivate/${uid}`), {
    phoneNumber: '+64210000000',
    updatedAt: serverTimestamp(),
  }));
});

test('supports username reservation transactions without allowing listing', async (t) => {
  const uid = 'username-owner';
  const ownerDb = testEnv.authenticatedContext(uid).firestore();
  const reservationRef = doc(ownerDb, 'usernames/traveller_1');
  await assertSucceeds(setDoc(reservationRef, initialUsernameReservation(uid)));

  await t.test('authenticated users can get individual reservations', async () => {
    const otherDb = testEnv.authenticatedContext('another-user').firestore();
    await assertSucceeds(getDoc(doc(otherDb, 'usernames/traveller_1')));
    await assertFails(getDocs(collection(otherDb, 'usernames')));
  });

  await t.test('only the owner can mutate or delete the reservation', async () => {
    const otherDb = testEnv.authenticatedContext('another-user').firestore();
    await assertFails(updateDoc(doc(otherDb, 'usernames/traveller_1'), {
      updatedAt: serverTimestamp(),
    }));
    await assertFails(deleteDoc(doc(otherDb, 'usernames/traveller_1')));
    await assertFails(setDoc(doc(otherDb, 'usernames/claimed_name'), {
      ...initialUsernameReservation(uid),
    }));
  });
});
