import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  query,
  where,
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

function profile(uid, username, overrides = {}) {
  return {
    uid,
    displayName: 'Traveller',
    username,
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

function privateProfile(uid, overrides = {}) {
  return {
    uid,
    privatePreferences: {},
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function hostProfile(uid, overrides = {}) {
  return {
    uid,
    displayName: 'Host',
    languages: ['en'],
    visibility: 'private',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function hostPrivateProfile(uid, overrides = {}) {
  return {
    uid,
    termsVersion: 'host-participation-v1',
    termsDigest: '0cbe5ba16e71fe24803c9080c62e7f3eb413c8d3ae079289d51538d2a325a96b',
    consentState: 'accepted',
    eventId: 'consent-event-1',
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

async function seedHostConsent(uid, consentState = 'accepted') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const userRef = doc(context.firestore(), `users/${uid}`);
    if (!(await getDoc(userRef)).exists()) {
      await setDoc(userRef, { uid, accountStatus: 'active' });
    }
    await setDoc(
      doc(context.firestore(), `hostPrivate/${uid}`),
      hostPrivateProfile(uid, { consentState }),
    );
  });
}

function hostConsentEvent(uid, overrides = {}) {
  return {
    eventId: 'consent-event-1',
    uid,
    eventType: 'accepted',
    termsVersion: 'host-participation-v1',
    termsDigest: 'a'.repeat(64),
    recordedAt: serverTimestamp(),
    idempotencyKey: 'stable-request-key-1234',
    ...overrides,
  };
}

function usernameReservation(uid) {
  return {
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function authenticatedDb(uid, emailVerified = false) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@example.com`,
    email_verified: emailVerified,
  }).firestore();
}

async function createAccount(db, uid, username, {
  publicOverrides = {},
  privateOverrides = {},
} = {}) {
  await runTransaction(db, async (transaction) => {
    transaction.set(
      doc(db, `users/${uid}`),
      profile(uid, username, publicOverrides),
    );
    transaction.set(
      doc(db, `userPrivate/${uid}`),
      privateProfile(uid, privateOverrides),
    );
    transaction.set(
      doc(db, `usernames/${username}`),
      usernameReservation(uid),
    );
  });
}

test('creates an initial public, private, and username profile atomically', async () => {
  const uid = 'initial-profile-owner';
  const db = authenticatedDb(uid);

  await assertSucceeds(createAccount(db, uid, 'traveller_1'));
  await assertSucceeds(getDoc(doc(db, `users/${uid}`)));
  await assertSucceeds(getDoc(doc(db, `userPrivate/${uid}`)));
  await assertSucceeds(getDoc(doc(db, 'usernames/traveller_1')));
});

test('public profile reads expose only the declared public schema', async (t) => {
  const uid = 'public-profile-owner';
  await assertSucceeds(createAccount(authenticatedDb(uid), uid, 'public_user'));

  await t.test('unauthenticated users can read a valid public profile', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, `users/${uid}`)));
  });

  await t.test('email and unexpected legacy fields are not publicly readable', async () => {
    const legacyUid = 'legacy-public-profile';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), `users/${legacyUid}`),
        profile(legacyUid, 'legacy_user', {
          email: 'legacy@example.com',
          emailVerified: false,
        }),
      );
    });

    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, `users/${legacyUid}`)));
    await assertSucceeds(getDoc(doc(authenticatedDb(legacyUid), `users/${legacyUid}`)));
  });
});

test('private profiles are readable and writable only by their owner', async (t) => {
  const uid = 'private-profile-owner';
  const ownerDb = authenticatedDb(uid);
  const privateRef = doc(ownerDb, `userPrivate/${uid}`);
  await assertSucceeds(setDoc(privateRef, privateProfile(uid)));
  await assertSucceeds(getDoc(privateRef));

  await t.test('unauthenticated users cannot read or write', async () => {
    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, `userPrivate/${uid}`)));
    await assertFails(setDoc(
      doc(anonymousDb, 'userPrivate/anonymous'),
      privateProfile('anonymous'),
    ));
  });

  await t.test('another authenticated user cannot read or write', async () => {
    const otherDb = authenticatedDb('another-private-user');
    await assertFails(getDoc(doc(otherDb, `userPrivate/${uid}`)));
    await assertFails(setDoc(
      doc(otherDb, 'userPrivate/someone-else'),
      privateProfile('some person'),
    ));
  });
});

test('rejects public and private profile writes containing email fields', async (t) => {
  const uid = 'email-field-test';
  const db = authenticatedDb(uid);

  await t.test('public profile creation with email', async () => {
    await assertFails(createAccount(db, uid, 'email_user', {
      publicOverrides: { email: 'email@example.com' },
    }));
  });

  await t.test('public profile creation with emailVerified', async () => {
    await assertFails(createAccount(db, uid, 'email_user', {
      publicOverrides: { emailVerified: false },
    }));
  });

  await t.test('public profile update with email or emailVerified', async () => {
    const ownerUid = 'email-update-owner';
    const ownerDb = authenticatedDb(ownerUid, true);
    await createAccount(ownerDb, ownerUid, 'email_update');
    const publicRef = doc(ownerDb, `users/${ownerUid}`);
    await assertFails(updateDoc(publicRef, {
      email: 'email@example.com',
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(publicRef, {
      emailVerified: false,
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('private profile creation with email or emailVerified', async () => {
    await assertFails(setDoc(
      doc(db, `userPrivate/${uid}`),
      privateProfile(uid, { email: 'email@example.com' }),
    ));
    await assertFails(setDoc(
      doc(db, `userPrivate/${uid}`),
      privateProfile(uid, { emailVerified: false }),
    ));
  });

  await t.test('private profile update with email or emailVerified', async () => {
    const ownerUid = 'private-email-update';
    const ownerDb = authenticatedDb(ownerUid, true);
    const privateRef = doc(ownerDb, `userPrivate/${ownerUid}`);
    await assertSucceeds(setDoc(privateRef, privateProfile(ownerUid)));
    await assertFails(updateDoc(privateRef, {
      email: 'email@example.com',
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(privateRef, {
      emailVerified: false,
      updatedAt: serverTimestamp(),
    }));
  });
});

test('only the approved default profile state and roles can be created', async (t) => {
  const uid = 'role-create-owner';
  const db = authenticatedDb(uid);

  await t.test('verified status is rejected', async () => {
    await assertFails(createAccount(db, uid, 'role_user', {
      publicOverrides: { verificationStatus: 'verified' },
    }));
  });

  await t.test('host role is rejected', async () => {
    await assertFails(createAccount(db, uid, 'role_user', {
      publicOverrides: { roles: ['traveller', 'host'] },
    }));
  });

  await t.test('unsupported privileged role is rejected', async () => {
    await assertFails(createAccount(db, uid, 'role_user', {
      publicOverrides: { roles: ['admin'] },
    }));
  });
});

test('profile updates cannot alter protected fields or add unexpected fields', async (t) => {
  const uid = 'protected-profile-owner';
  const db = authenticatedDb(uid, true);
  await assertSucceeds(createAccount(db, uid, 'protected_user'));
  const profileRef = doc(db, `users/${uid}`);

  await t.test('account status', async () => {
    await assertFails(updateDoc(profileRef, {
      accountStatus: 'suspended',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('verification status', async () => {
    await assertFails(updateDoc(profileRef, {
      verificationStatus: 'verified',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('roles', async () => {
    await assertFails(updateDoc(profileRef, {
      roles: ['traveller', 'host'],
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('UID', async () => {
    await assertFails(updateDoc(profileRef, {
      uid: 'another-user',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('unexpected field', async () => {
    await assertFails(updateDoc(profileRef, {
      surprise: 'not part of the schema',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('valid profile changes', async () => {
    await assertSucceeds(updateDoc(profileRef, {
      displayName: 'Updated Traveller',
      bio: 'A short public bio',
      updatedAt: serverTimestamp(),
    }));
  });
});

test('preserves the email-verification and suspended-account update guards', async () => {
  const uid = 'unverified-update-owner';
  const unverifiedDb = authenticatedDb(uid);
  await assertSucceeds(createAccount(unverifiedDb, uid, 'unverified_user'));
  await assertFails(updateDoc(doc(unverifiedDb, `users/${uid}`), {
    bio: 'Not verified',
    updatedAt: serverTimestamp(),
  }));

  const suspendedUid = 'suspended-update-owner';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await createAccount(adminDb, suspendedUid, 'suspended_user', {
      publicOverrides: { accountStatus: 'suspended' },
    });
  });
  const suspendedDb = authenticatedDb(suspendedUid, true);
  await assertFails(updateDoc(doc(suspendedDb, `users/${suspendedUid}`), {
    bio: 'Suspended accounts cannot update',
    updatedAt: serverTimestamp(),
  }));
});

test('private profile updates allow only permitted fields and preserve UID', async () => {
  const uid = 'private-update-owner';
  const db = authenticatedDb(uid);
  const privateRef = doc(db, `userPrivate/${uid}`);
  await assertSucceeds(setDoc(privateRef, privateProfile(uid)));

  await assertSucceeds(updateDoc(privateRef, {
    phoneNumber: '+64210000000',
    privatePreferences: { notifications: true },
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(privateRef, {
    uid: 'another-user',
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(privateRef, {
    unexpected: true,
    updatedAt: serverTimestamp(),
  }));
});

test('username reservations stay owner-bound and consistent with public profiles', async (t) => {
  const ownerUid = 'username-owner';
  const username = 'username_owner';
  const ownerDb = authenticatedDb(ownerUid, true);
  const profileRef = doc(ownerDb, `users/${ownerUid}`);

  await t.test('a user can reserve their own available profile username', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), `users/${ownerUid}`),
        profile(ownerUid, username),
      );
    });

    await assertSucceeds(runTransaction(ownerDb, async (transaction) => {
      await transaction.get(profileRef);
      const reservationRef = doc(ownerDb, `usernames/${username}`);
      await transaction.get(reservationRef);
      transaction.set(reservationRef, usernameReservation(ownerUid));
    }));
  });

  await t.test('another user cannot reserve the owner profile username', async () => {
    const otherUid = 'username-impostor';
    const otherDb = authenticatedDb(otherUid);
    await assertFails(createAccount(otherDb, otherUid, username));
    await assertFails(setDoc(
      doc(otherDb, `usernames/${username}`),
      usernameReservation(otherUid),
    ));
  });

  await t.test('another user cannot overwrite or delete the reservation', async () => {
    const otherDb = authenticatedDb('username-attacker');
    const reservationRef = doc(otherDb, `usernames/${username}`);
    await assertFails(updateDoc(reservationRef, {
      updatedAt: serverTimestamp(),
    }));
    await assertFails(deleteDoc(reservationRef));
  });

  await t.test('the owner cannot delete their active username reservation', async () => {
    await assertFails(deleteDoc(doc(ownerDb, `usernames/${username}`)));
  });

  await t.test('invalid username formats are rejected', async () => {
    await assertFails(setDoc(
      doc(ownerDb, 'usernames/invalid-name'),
      usernameReservation(ownerUid),
    ));
  });

  await t.test('a username change must release the old reservation atomically', async () => {
    const attemptedUsername = 'stale_reservation';
    await assertFails(runTransaction(ownerDb, async (transaction) => {
      await transaction.get(profileRef);
      const newReservationRef = doc(ownerDb, `usernames/${attemptedUsername}`);
      await transaction.get(newReservationRef);

      transaction.set(newReservationRef, usernameReservation(ownerUid));
      transaction.update(profileRef, {
        username: attemptedUsername,
        updatedAt: serverTimestamp(),
      });
    }));
  });

  await t.test('a username change atomically replaces the old reservation', async () => {
    const nextUsername = 'next_username';
    await assertSucceeds(runTransaction(ownerDb, async (transaction) => {
      await transaction.get(profileRef);
      const oldReservationRef = doc(ownerDb, `usernames/${username}`);
      const newReservationRef = doc(ownerDb, `usernames/${nextUsername}`);
      const [oldReservation, newReservation] = await Promise.all([
        transaction.get(oldReservationRef),
        transaction.get(newReservationRef),
      ]);
      if (!oldReservation.exists() || newReservation.exists()) {
        throw new Error('Unexpected username test state.');
      }

      transaction.set(newReservationRef, usernameReservation(ownerUid));
      transaction.update(profileRef, {
        username: nextUsername,
        updatedAt: serverTimestamp(),
      });
      transaction.delete(oldReservationRef);
    }));
  });
});

test('rejects usernames with invalid length and reservation/profile mismatches', async (t) => {
  const uid = 'invalid-username-owner';
  const db = authenticatedDb(uid);

  await t.test('too-short and too-long document IDs', async () => {
    await assertFails(setDoc(
      doc(db, 'usernames/ab'),
      usernameReservation(uid),
    ));
    await assertFails(setDoc(
      doc(db, `usernames/${'a'.repeat(21)}`),
      usernameReservation(uid),
    ));
  });

  await t.test('reservation without a matching public profile', async () => {
    await assertFails(setDoc(
      doc(db, 'usernames/no_profile'),
      usernameReservation(uid),
    ));
  });
});

test('username changes cannot delete another UID reservation referenced as the old name', async () => {
  const uid = 'old-reservation-owner';
  const oldUsername = 'contested_old';
  const newUsername = 'replacement_name';
  const db = authenticatedDb(uid, true);

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, `users/${uid}`), profile(uid, oldUsername));
    await setDoc(
      doc(adminDb, `usernames/${oldUsername}`),
      usernameReservation('actual-reservation-owner'),
    );
  });

  await assertFails(runTransaction(db, async (transaction) => {
    const profileRef = doc(db, `users/${uid}`);
    const oldReservationRef = doc(db, `usernames/${oldUsername}`);
    const newReservationRef = doc(db, `usernames/${newUsername}`);
    await transaction.get(profileRef);
    await transaction.get(oldReservationRef);
    await transaction.get(newReservationRef);

    transaction.set(newReservationRef, usernameReservation(uid));
    transaction.update(profileRef, {
      username: newUsername,
      updatedAt: serverTimestamp(),
    });
    transaction.delete(oldReservationRef);
  }));
});

test('prevents creating profiles for another UID and denies unspecified collections', async (t) => {
  const db = authenticatedDb('profile-attacker');

  await t.test('public profile creation for another user', async () => {
    await assertFails(createAccount(db, 'victim-user', 'victim_user'));
  });

  await t.test('public profile update for another user', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await createAccount(context.firestore(), 'existing-victim', 'existing_victim');
    });

    await assertFails(updateDoc(doc(db, 'users/existing-victim'), {
      bio: 'Not the owner',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('unspecified collection reads and writes', async () => {
    await assertFails(getDoc(doc(db, 'privateMessages/message-1')));
    await assertFails(setDoc(doc(db, 'privateMessages/message-1'), {
      content: 'not allowed',
    }));
  });
});

test('host profiles are owner-created as private and support allowlisted updates', async (t) => {
  const uid = 'host-profile-owner';
  const db = authenticatedDb(uid, true);
  const hostRef = doc(db, `hostProfiles/${uid}`);

  await seedHostConsent(uid);
  await assertSucceeds(setDoc(hostRef, hostProfile(uid)));
  await assertSucceeds(updateDoc(hostRef, {
    displayName: 'Updated Host',
    introduction: 'A short public introduction.',
    languages: ['en', 'mi'],
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(hostRef, {
    uid: 'different-user',
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(hostRef, {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(hostRef, {
    privatePhoneNumber: '+64000000000',
    updatedAt: serverTimestamp(),
  }));

  await t.test('a profile cannot be created as public', async () => {
    const publicUid = 'public-on-create';
    await seedHostConsent(publicUid);
    await assertFails(setDoc(
      doc(authenticatedDb(publicUid, true), `hostProfiles/${publicUid}`),
      hostProfile(publicUid, { visibility: 'public' }),
    ));
  });

  await t.test('unverified email cannot create or update a host profile', async () => {
    const unverifiedUid = 'unverified-host';
    const unverifiedDb = authenticatedDb(unverifiedUid);
    await seedHostConsent(unverifiedUid);
    await assertFails(setDoc(
      doc(unverifiedDb, `hostProfiles/${unverifiedUid}`),
      hostProfile(unverifiedUid),
    ));
  });
});

test('host profile writes are bound to the authenticated UID', async () => {
  const attackerUid = 'host-profile-attacker';
  const victimUid = 'host-profile-victim';
  const attackerDb = authenticatedDb(attackerUid, true);
  await seedHostConsent(victimUid);

  await assertFails(setDoc(
    doc(attackerDb, `hostProfiles/${victimUid}`),
    hostProfile(victimUid),
  ));
});

test('host profile writes require an active account', async () => {
  const uid = 'suspended-host';
  const db = authenticatedDb(uid, true);
  const hostRef = doc(db, `hostProfiles/${uid}`);
  await seedHostConsent(uid);
  await assertSucceeds(setDoc(hostRef, hostProfile(uid)));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), `users/${uid}`), { accountStatus: 'suspended' });
  });
  await assertFails(updateDoc(hostRef, { visibility: 'public', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(hostRef, hostProfile(uid)));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), `hostProfiles/${uid}`));
  });
  await assertFails(setDoc(hostRef, hostProfile(uid)));
});

test('public host reads are denied after suspension', async () => {
  const uid = 'suspended-public-host';
  const owner = authenticatedDb(uid, true);
  const anonymous = testEnv.unauthenticatedContext().firestore();
  await seedHostConsent(uid);
  await assertSucceeds(setDoc(doc(owner, `hostProfiles/${uid}`), hostProfile(uid)));
  await assertSucceeds(updateDoc(doc(owner, `hostProfiles/${uid}`), {
    visibility: 'public', updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(doc(anonymous, `hostProfiles/${uid}`)));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), `users/${uid}`), { accountStatus: 'suspended' });
  });
  await assertFails(getDoc(doc(anonymous, `hostProfiles/${uid}`)));
  await assertFails(getDoc(doc(authenticatedDb('other-host', true), `hostProfiles/${uid}`)));
  await assertSucceeds(getDoc(doc(owner, `hostProfiles/${uid}`)));
});

test('host profiles cannot be created without trusted current consent', async () => {
  const uid = 'host-without-consent';
  await assertFails(setDoc(
    doc(authenticatedDb(uid, true), `hostProfiles/${uid}`),
    hostProfile(uid),
  ));
});

test('host profile rules reject unknown fields and invalid types', async (t) => {
  const invalidCases = [
    ['unknown field', { internalNotes: 'private' }],
    ['display name type', { displayName: 7 }],
    ['introduction type', { introduction: false }],
    ['languages type', { languages: 'en' }],
    ['language item type', { languages: [7] }],
    ['invalid language code', { languages: ['English'] }],
    ['duplicate language', { languages: ['en', 'en'] }],
    ['too many languages', { languages: Array(11).fill('en') }],
    ['invalid visibility', { visibility: 'draft' }],
  ];

  for (const [index, [label, overrides]] of invalidCases.entries()) {
    await t.test(label, async () => {
      const uid = `invalid-host-${index}`;
      await seedHostConsent(uid);
      await assertFails(setDoc(
        doc(authenticatedDb(uid, true), `hostProfiles/${uid}`),
        hostProfile(uid, overrides),
      ));
    });
  }
});

test('public host profiles are readable publicly only after visibility changes', async () => {
  const uid = 'host-visibility-owner';
  const ownerDb = authenticatedDb(uid, true);
  await seedHostConsent(uid);
  await assertSucceeds(setDoc(
    doc(ownerDb, `hostProfiles/${uid}`),
    hostProfile(uid),
  ));

  const anonymousDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymousDb, `hostProfiles/${uid}`)));
  await assertSucceeds(updateDoc(doc(ownerDb, `hostProfiles/${uid}`), {
    visibility: 'public',
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(doc(anonymousDb, `hostProfiles/${uid}`)));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), `hostPrivate/${uid}`), { termsDigest: 'old-digest' });
  });
  await assertFails(getDoc(doc(anonymousDb, `hostProfiles/${uid}`)));

  await seedHostConsent(uid, 'withdrawn');
  await assertFails(getDoc(doc(anonymousDb, `hostProfiles/${uid}`)));
  await assertFails(updateDoc(doc(ownerDb, `hostProfiles/${uid}`), {
    visibility: 'public',
    updatedAt: serverTimestamp(),
  }));
});

test('host private state and consent history are owner-readable and client-immutable', async (t) => {
  const uid = 'host-private-owner';
  const eventId = 'consent-event-1';
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, `hostPrivate/${uid}`), hostPrivateProfile(uid));
    await setDoc(
      doc(adminDb, `hostPrivate/${uid}/consentEvents/${eventId}`),
      hostConsentEvent(uid),
    );
  });

  const ownerDb = authenticatedDb(uid);
  const otherDb = authenticatedDb('host-private-outsider');
  const privateRef = doc(ownerDb, `hostPrivate/${uid}`);
  const eventRef = doc(ownerDb, `hostPrivate/${uid}/consentEvents/${eventId}`);
  await assertSucceeds(getDoc(privateRef));
  await assertSucceeds(getDoc(eventRef));

  await t.test('another user cannot read private state or consent events', async () => {
    await assertFails(getDoc(doc(otherDb, `hostPrivate/${uid}`)));
    await assertFails(getDoc(doc(otherDb, `hostPrivate/${uid}/consentEvents/${eventId}`)));
  });

  await t.test('client-created or rewritten consent is rejected', async () => {
    await assertFails(setDoc(
      doc(ownerDb, `hostPrivate/${uid}/consentEvents/fake-event`),
      hostConsentEvent(uid, { eventId: 'fake-event' }),
    ));
    await assertFails(updateDoc(eventRef, {
      recordedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(privateRef, {
      consentState: 'withdrawn',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('another user cannot write private host state or events', async () => {
    await assertFails(setDoc(
      doc(otherDb, `hostPrivate/${uid}`),
      hostPrivateProfile(uid),
    ));
    await assertFails(setDoc(
      doc(otherDb, `hostPrivate/${uid}/consentEvents/outsider-event`),
      hostConsentEvent('host-private-outsider', { eventId: 'outsider-event' }),
    ));
  });
});

// Listing tests
function listing(hostUid, overrides = {}) {
  return {
    listingId: 'listing-1',
    hostUid,
    title: 'Cozy room in Paris',
    description: 'A lovely space with natural light and access to shared kitchen facilities.',
    accommodationType: 'private_room',
    country: 'France',
    city: 'Paris',
    guestCapacity: 1,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: ['wifi', 'kitchen'],
    houseRules: ['No smoking', 'Quiet hours after 10 PM'],
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

async function createListing(db, hostUid, listingId, overrides = {}) {
  const data = listing(hostUid, { listingId, ...overrides });
  return setDoc(doc(db, `listings/${listingId}`), data);
}

async function seedListingHost(uid) {
  await seedHostConsent(uid);
  const db = authenticatedDb(uid, true);
  await assertSucceeds(setDoc(doc(db, `hostProfiles/${uid}`), hostProfile(uid)));
}

test('listing writes enforce owner, eligibility, and lifecycle access', async (t) => {
  const hostUid = 'listing-host-1';
  const otherHostUid = 'listing-host-2';
  await seedListingHost(hostUid);
  await seedListingHost(otherHostUid);

  const hostDb = authenticatedDb(hostUid);
  const otherHostDb = authenticatedDb(otherHostUid);
  const anonymousDb = testEnv.unauthenticatedContext().firestore();

  await t.test('an active host with current consent and a private host profile can create a draft', async () => {
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-1'));
  });

  await t.test('an eligible user cannot create a draft until their host profile exists', async () => {
    const uid = 'listing-no-profile';
    const db = authenticatedDb(uid, true);
    await seedHostConsent(uid);
    await assertFails(createListing(db, uid, 'listing-no-profile'));
    await assertSucceeds(setDoc(doc(db, `hostProfiles/${uid}`), hostProfile(uid)));
    await assertSucceeds(createListing(db, uid, 'listing-no-profile'));
  });

  await t.test('another user’s host profile cannot satisfy the prerequisite', async () => {
    const uid = 'listing-wrong-profile';
    const db = authenticatedDb(uid, true);
    await seedHostConsent(uid);
    const otherProfile = await assertSucceeds(getDoc(doc(otherHostDb, `hostProfiles/${otherHostUid}`)));
    assert.equal(otherProfile.data().uid, otherHostUid);
    await assertFails(createListing(db, uid, 'listing-wrong-profile'));
    await assertSucceeds(setDoc(doc(db, `hostProfiles/${uid}`), hostProfile(uid)));
    await assertSucceeds(createListing(db, uid, 'listing-wrong-profile'));
  });

  await t.test('an unverified auth token does not add a separate listing gate', async () => {
    const uid = 'listing-unverified-token';
    await seedListingHost(uid);
    await assertSucceeds(createListing(authenticatedDb(uid, false), uid, 'listing-unverified'));
  });

  await t.test('unauthenticated users and hosts without consent cannot create', async () => {
    await assertFails(createListing(anonymousDb, hostUid, 'listing-anonymous'));

    const noConsentUid = 'listing-host-no-consent';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `users/${noConsentUid}`), {
        accountStatus: 'active',
      });
      await setDoc(doc(context.firestore(), `hostProfiles/${noConsentUid}`), hostProfile(noConsentUid));
    });
    await assertFails(createListing(
      authenticatedDb(noConsentUid),
      noConsentUid,
      'listing-no-consent',
    ));
    await seedHostConsent(noConsentUid);
    await assertSucceeds(createListing(
      authenticatedDb(noConsentUid),
      noConsentUid,
      'listing-no-consent',
    ));
  });

  for (const [label, overrides, omitted] of [
    ['wrong consent UID', { uid: 'another-owner' }],
    ['outdated consent version', { termsVersion: 'old-version' }],
    ['wrong consent digest', { termsDigest: 'wrong-digest' }],
    ['withdrawn consent', { consentState: 'withdrawn' }],
    ['non-string consent event ID', { eventId: 5 }],
    ['missing consent event ID', {}, 'eventId'],
  ]) {
    await t.test(`draft creation requires current consent: ${label}`, async () => {
      const uid = `listing-consent-${label.replaceAll(' ', '-')}`;
      await seedListingHost(uid);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const consent = hostPrivateProfile(uid, overrides);
        if (omitted) delete consent[omitted];
        await setDoc(doc(context.firestore(), `hostPrivate/${uid}`), consent);
      });
      const db = authenticatedDb(uid);
      await assertFails(createListing(db, uid, uid));
      await seedHostConsent(uid);
      await assertSucceeds(createListing(db, uid, uid));
    });
  }

  await t.test('suspended hosts and forged owner IDs cannot create', async () => {
    const suspendedUid = 'listing-suspended-host';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, `users/${suspendedUid}`), { accountStatus: 'suspended' });
      await setDoc(
        doc(adminDb, `hostPrivate/${suspendedUid}`),
        hostPrivateProfile(suspendedUid),
      );
      await setDoc(doc(adminDb, `hostProfiles/${suspendedUid}`), hostProfile(suspendedUid));
    });
    await assertFails(createListing(
      authenticatedDb(suspendedUid),
      suspendedUid,
      'listing-suspended',
    ));
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), `users/${suspendedUid}`), { accountStatus: 'active' });
    });
    await assertSucceeds(createListing(
      authenticatedDb(suspendedUid),
      suspendedUid,
      'listing-suspended',
    ));
    await assertFails(createListing(hostDb, hostUid, 'listing-forged-owner', {
      hostUid: otherHostUid,
    }));
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-forged-owner'));
    await assertFails(createListing(hostDb, hostUid, 'listing-publish-on-create', {
      status: 'published',
    }));
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-publish-on-create'));
  });

  await t.test('owners can read their own drafts; other users cannot', async () => {
    await assertSucceeds(getDoc(doc(hostDb, 'listings/listing-1')));
    await assertFails(getDoc(doc(anonymousDb, 'listings/listing-1')));
    await assertFails(getDoc(doc(otherHostDb, 'listings/listing-1')));
    await assertFails(updateDoc(doc(otherHostDb, 'listings/listing-1'), {
      title: 'Modified listing title',
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('owners can query their listings, including drafts', async () => {
    const ownerQuery = query(
      collection(hostDb, 'listings'),
      where('hostUid', '==', hostUid),
      orderBy('updatedAt', 'desc'),
      limit(21),
    );
    const result = await assertSucceeds(getDocs(ownerQuery));
    assert.ok(result.docs.some((snapshot) => snapshot.id === 'listing-1'));
    assert.ok(result.docs.every((snapshot) => snapshot.data().hostUid === hostUid));
  });

  await t.test('eligible published listings are readable by ID, but public queries are denied', async () => {
    const publishedId = 'listing-published-1';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), `listings/${publishedId}`),
        listing(hostUid, {
          listingId: publishedId,
          status: 'published',
          publishedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
        }),
      );
    });

    await assertSucceeds(getDoc(doc(anonymousDb, `listings/${publishedId}`)));

    const publishedQuery = query(
      collection(anonymousDb, 'listings'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(21),
    );
    await assertFails(getDocs(publishedQuery));
    await assertFails(getDocs(collection(anonymousDb, 'listings')));
  });

  await t.test('anonymous users cannot directly read paused or archived listings', async () => {
    for (const [status, timestampField] of [
      ['paused', 'pausedAt'],
      ['archived', 'archivedAt'],
    ]) {
      const listingId = `listing-${status}`;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), `listings/${listingId}`),
          listing(hostUid, {
            listingId,
            status,
            [timestampField]: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
          }),
        );
      });
      await assertFails(getDoc(doc(anonymousDb, `listings/${listingId}`)));
    }
  });
});

test('listing query cursors preserve documents with matching timestamps', async () => {
  const uid = 'listing-pagination-host';
  const firstTime = Timestamp.fromDate(new Date('2100-01-02T00:00:00Z'));
  const olderTime = Timestamp.fromDate(new Date('2100-01-01T00:00:00Z'));
  const ids = ['pagination-c', 'pagination-b', 'pagination-a', 'pagination-old'];

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [index, id] of ids.entries()) {
      const time = index === 3 ? olderTime : firstTime;
      await setDoc(doc(db, `listings/${id}`), listing(uid, {
        listingId: id,
        status: 'published',
        updatedAt: time,
        publishedAt: time,
      }));
    }
  });

  const db = authenticatedDb(uid);
  const constraints = [
    where('hostUid', '==', uid),
    orderBy('updatedAt', 'desc'),
    orderBy(documentId(), 'desc'),
  ];
  const listings = collection(db, 'listings');
  const first = await assertSucceeds(getDocs(query(listings, ...constraints, limit(2))));
  assert.deepEqual(first.docs.map((snapshot) => snapshot.id), ids.slice(0, 2));
  const last = first.docs[first.docs.length - 1];
  const second = await assertSucceeds(getDocs(query(
    listings, ...constraints, startAfter(last.data()['updatedAt'], last.id), limit(2),
  )));
  assert.deepEqual(second.docs.map((snapshot) => snapshot.id), ids.slice(2));
});

test('public listing reads require an active host with current consent', async (t) => {
  const anonymousDb = testEnv.unauthenticatedContext().firestore();
  const cases = [
    ['suspended host', 'accountStatus', 'suspended'],
    ['withdrawn consent', 'consentState', 'withdrawn'],
  ];

  for (const [label, field, value] of cases) {
    await t.test(label, async () => {
      const uid = `listing-public-${label.replaceAll(' ', '-')}`;
      const listingId = `${uid}-published`;
      await seedListingHost(uid);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), `listings/${listingId}`),
          listing(uid, {
            listingId,
            status: 'published',
            publishedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
          }),
        );
      });

      const listingRef = doc(anonymousDb, `listings/${listingId}`);
      await assertSucceeds(getDoc(listingRef));

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const collectionName = field === 'accountStatus' ? 'users' : 'hostPrivate';
        await updateDoc(doc(context.firestore(), `${collectionName}/${uid}`), {
          [field]: value,
        });
      });

      await assertFails(getDoc(listingRef));
      await assertSucceeds(getDoc(doc(authenticatedDb(uid), `listings/${listingId}`)));
      await assertFails(getDocs(query(
        collection(anonymousDb, 'listings'),
        where('status', '==', 'published'),
      )));
    });
  }
});

test('listing creation validates the complete schema and every field boundary', async (t) => {
  const hostUid = 'listing-validation-host';
  await seedListingHost(hostUid);
  const hostDb = authenticatedDb(hostUid);
  const wrongTimestamp = Timestamp.fromDate(new Date('2000-01-01T00:00:00Z'));
  const invalidCases = [
    ['missing listingId', {}, ['listingId']],
    ['missing hostUid', {}, ['hostUid']],
    ['missing title', {}, ['title']],
    ['missing description', {}, ['description']],
    ['missing accommodationType', {}, ['accommodationType']],
    ['missing country', {}, ['country']],
    ['missing city', {}, ['city']],
    ['missing guestCapacity', {}, ['guestCapacity']],
    ['missing bedrooms', {}, ['bedrooms']],
    ['missing beds', {}, ['beds']],
    ['missing bathrooms', {}, ['bathrooms']],
    ['missing amenities', {}, ['amenities']],
    ['missing houseRules', {}, ['houseRules']],
    ['missing status', {}, ['status']],
    ['missing createdAt', {}, ['createdAt']],
    ['missing updatedAt', {}, ['updatedAt']],
    ['unexpected field', { internalNotes: 'private' }],
    ['listing ID differs from document ID', { listingId: 'different-id' }],
    ['host UID has wrong type', { hostUid: 5 }],
    ['title below minimum', { title: 'x'.repeat(9) }],
    ['title above maximum', { title: 'x'.repeat(101) }],
    ['description below minimum', { description: 'x'.repeat(49) }],
    ['description above maximum', { description: 'x'.repeat(2001) }],
    ['invalid accommodation enum', { accommodationType: 'invalid_type' }],
    ['country has wrong type', { country: 5 }],
    ['country below minimum', { country: 'x' }],
    ['country above maximum', { country: 'x'.repeat(101) }],
    ['city has wrong type', { city: 5 }],
    ['city below minimum', { city: 'x' }],
    ['city above maximum', { city: 'x'.repeat(101) }],
    ['region has wrong type', { region: 5 }],
    ['region is empty', { region: '' }],
    ['region above maximum', { region: 'x'.repeat(101) }],
    ['area description has wrong type', { areaDescription: 5 }],
    ['area description is empty', { areaDescription: '' }],
    ['area description above maximum', { areaDescription: 'x'.repeat(201) }],
    ['guest capacity below minimum', { guestCapacity: 0 }],
    ['guest capacity above maximum', { guestCapacity: 11 }],
    ['guest capacity is not an integer', { guestCapacity: 1.5 }],
    ['guest capacity has wrong type', { guestCapacity: '1' }],
    ['bedrooms below minimum', { bedrooms: -1 }],
    ['bedrooms above maximum', { bedrooms: 11 }],
    ['bedrooms is not an integer', { bedrooms: 1.5 }],
    ['bedrooms has wrong type', { bedrooms: '1' }],
    ['beds below minimum', { beds: 0 }],
    ['beds above maximum', { beds: 16 }],
    ['beds is not an integer', { beds: 1.5 }],
    ['beds has wrong type', { beds: '1' }],
    ['bathrooms below minimum', { bathrooms: 0 }],
    ['bathrooms above maximum', { bathrooms: 11 }],
    ['bathrooms has wrong type', { bathrooms: '1' }],
    ['amenities has wrong type', { amenities: 'wifi' }],
    ['amenities above maximum', { amenities: Array(31).fill('wifi') }],
    ['amenity has wrong type', { amenities: [5] }],
    ['amenity is not approved', { amenities: ['not-approved'] }],
    ['house rules has wrong type', { houseRules: 'quiet' }],
    ['house rules above maximum', { houseRules: Array(16).fill('Valid house rule') }],
    ['house rule has wrong type', { houseRules: [5] }],
    ['house rule below minimum', { houseRules: ['x'.repeat(4)] }],
    ['house rule above maximum', { houseRules: ['x'.repeat(201)] }],
    ['last house rule has wrong type', { houseRules: [...Array(14).fill('Valid house rule'), 5] }],
    ['last house rule is too short', { houseRules: [...Array(14).fill('Valid house rule'), 'bad'] }],
    ['invalid status enum', { status: 'live' }],
    ['createdAt is not request time', { createdAt: wrongTimestamp }],
    ['updatedAt is not request time', { updatedAt: wrongTimestamp }],
    ['publication timestamp cannot be client-set', {
      publishedAt: wrongTimestamp,
      status: 'draft',
    }],
    ['publication timestamp has wrong type', { publishedAt: 'not-a-timestamp' }],
    ['pause timestamp cannot be client-set', { pausedAt: wrongTimestamp }],
    ['pause timestamp has wrong type', { pausedAt: 'not-a-timestamp' }],
    ['archive timestamp cannot be client-set', { archivedAt: wrongTimestamp }],
    ['archive timestamp has wrong type', { archivedAt: 'not-a-timestamp' }],
  ];

  for (const [index, [label, overrides, omittedFields = []]] of invalidCases.entries()) {
    await t.test(label, async () => {
      const listingId = `listing-invalid-${index}`;
      const data = listing(hostUid, { listingId, ...overrides });
      for (const field of omittedFields) delete data[field];
      await assertFails(setDoc(doc(hostDb, `listings/${listingId}`), data));
    });
  }

  await t.test('allows the maximum amenities array size', async () => {
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-at-limits', {
      amenities: Array(30).fill('wifi'),
    }));
  });

  await t.test('allows the maximum house-rules array size', async () => {
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-max-house-rules', {
      amenities: [],
      houseRules: Array(15).fill('x'.repeat(200)),
    }));
  });

  await t.test('validates every house-rule position', async () => {
    for (let index = 0; index < 15; index += 1) {
      const houseRules = Array(15).fill('Valid house rule');
      houseRules[index] = 'bad';
      await assertFails(createListing(hostDb, hostUid, `listing-invalid-rule-${index}`, { houseRules }));
      houseRules[index] = 'Valid house rule';
      await assertSucceeds(createListing(hostDb, hostUid, `listing-invalid-rule-${index}`, { houseRules }));
    }
  });

  await t.test('allows inclusive scalar field limits', async () => {
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-max-scalar-limits', {
      title: 'x'.repeat(100),
      description: 'x'.repeat(2000),
      country: 'x'.repeat(100),
      city: 'x'.repeat(100),
      region: 'x'.repeat(100),
      areaDescription: 'x'.repeat(200),
      guestCapacity: 10,
      bedrooms: 10,
      beds: 15,
      bathrooms: 10,
      amenities: [],
      houseRules: [],
    }));
    await assertSucceeds(createListing(hostDb, hostUid, 'listing-minimum-limits', {
      title: 'x'.repeat(10),
      description: 'x'.repeat(50),
      country: 'xx',
      city: 'xx',
      region: 'x',
      areaDescription: 'x',
      guestCapacity: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: ['x'.repeat(5)],
    }));
  });
});

test('listing updates validate content and preserve owner, status, and timestamps', async (t) => {
  const hostUid = 'listing-update-host';
  await seedListingHost(hostUid);
  const hostDb = authenticatedDb(hostUid);
  const listingRef = doc(hostDb, 'listings/listing-update');
  await assertSucceeds(createListing(hostDb, hostUid, 'listing-update'));

  await t.test('valid content changes update updatedAt at request time', async () => {
    await assertSucceeds(updateDoc(listingRef, {
      title: 'Updated listing title',
      description: 'Updated description that remains long enough to satisfy all minimum requirements.',
      amenities: ['wifi', 'kitchen', 'ac'],
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('a draft update accepts all maximum-sized valid fields together', async () => {
    await assertSucceeds(updateDoc(listingRef, {
      title: 'x'.repeat(100),
      description: 'x'.repeat(2000),
      country: 'x'.repeat(100),
      city: 'x'.repeat(100),
      region: 'x'.repeat(100),
      areaDescription: 'x'.repeat(200),
      guestCapacity: 10,
      bedrooms: 10,
      beds: 15,
      bathrooms: 10,
      amenities: Array(30).fill('wifi'),
      houseRules: Array(15).fill('x'.repeat(200)),
      updatedAt: serverTimestamp(),
    }));
  });

  await t.test('lifecycle timestamps cannot be added when initially absent', async () => {
    const id = 'listing-without-lifecycle-timestamps';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const data = listing(hostUid, { listingId: id });
      delete data.publishedAt;
      delete data.pausedAt;
      delete data.archivedAt;
      await setDoc(doc(context.firestore(), `listings/${id}`), data);
    });
    const ref = doc(hostDb, `listings/${id}`);
    for (const field of ['publishedAt', 'pausedAt', 'archivedAt']) {
      await assertFails(updateDoc(ref, { [field]: null, updatedAt: serverTimestamp() }));
    }
    await assertSucceeds(updateDoc(ref, {
      title: 'Updated listing title',
      updatedAt: serverTimestamp(),
    }));
  });

  for (const [label, updates] of [
    ['listing ID', { listingId: 'different-id' }],
    ['owner UID', { hostUid: 'different-owner' }],
    ['status', { status: 'published' }],
    ['createdAt', { createdAt: serverTimestamp() }],
    ['publishedAt', { publishedAt: serverTimestamp() }],
    ['publishedAt removal', { publishedAt: deleteField() }],
    ['pausedAt', { pausedAt: serverTimestamp() }],
    ['pausedAt removal', { pausedAt: deleteField() }],
    ['archivedAt', { archivedAt: serverTimestamp() }],
    ['archivedAt removal', { archivedAt: deleteField() }],
    ['unexpected field', { privateNotes: 'private' }],
    ['invalid title', { title: 'Short' }],
    ['invalid optional region type', { region: 5 }],
    ['invalid area description length', { areaDescription: 'x'.repeat(201) }],
    ['invalid house rule type', { houseRules: [5] }],
    ['invalid house rule length', { houseRules: ['x'.repeat(4)] }],
    ['updatedAt not request time', { updatedAt: Timestamp.fromDate(new Date('2000-01-01')) }],
    ['updatedAt omitted', {}],
  ]) {
    await t.test(`cannot change ${label}`, async () => {
      const update = { ...updates };
      if (label !== 'updatedAt omitted' && !Object.hasOwn(update, 'updatedAt')) {
        update.updatedAt = serverTimestamp();
      }
      await assertFails(updateDoc(listingRef, {
        ...update,
      }));
    });
  }
});
