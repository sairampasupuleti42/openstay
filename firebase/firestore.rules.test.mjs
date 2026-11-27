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
  runTransaction,
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
