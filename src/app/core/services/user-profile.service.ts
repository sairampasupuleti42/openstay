import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { UserPrivateProfile, UserProfile } from '../models/user.model';

export type UserProfileUpdates = Partial<
  Pick<UserProfile,
    'displayName'
    | 'photoURL'
    | 'bio'
    | 'country'
    | 'city'
    | 'languages'
    | 'interests'
  >
>;

export type UserPrivateProfileUpdates = Partial<
  Pick<UserPrivateProfile, 'phoneNumber' | 'privatePreferences'>
>;

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly firestore = inject(Firestore);

  async getProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', uid));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    if (
      typeof data['uid'] !== 'string'
      || data['uid'] !== snapshot.id
      || typeof data['displayName'] !== 'string'
      || data['displayName'].trim().length === 0
      || typeof data['username'] !== 'string'
      || !/^[a-z0-9_]{3,20}$/.test(data['username'])
      || !Array.isArray(data['languages'])
      || !data['languages'].every((value: unknown) => typeof value === 'string')
      || !Array.isArray(data['interests'])
      || !data['interests'].every((value: unknown) => typeof value === 'string')
      || !Array.isArray(data['roles'])
      || data['roles'].length === 0
      || !data['roles'].every((value: unknown) => value === 'traveller' || value === 'host')
      || !['active', 'suspended', 'deleted'].includes(data['accountStatus'])
      || !['unverified', 'pending', 'verified'].includes(data['verificationStatus'])
      || !(data['createdAt'] instanceof Timestamp)
      || !(data['updatedAt'] instanceof Timestamp)
      || !this.optionalString(data['photoURL'])
      || !this.optionalString(data['bio'])
      || !this.optionalString(data['country'])
      || !this.optionalString(data['city'])
    ) {
      throw new Error('The saved user profile is invalid. Please contact support.');
    }

    return data as unknown as UserProfile;
  }

  async getPrivateProfile(uid: string): Promise<UserPrivateProfile | null> {
    const snapshot = await getDoc(doc(this.firestore, 'userPrivate', uid));
    if (!snapshot.exists()) return null;

    return validatePrivateProfileData(snapshot.data(), snapshot.id);
  }

  async createInitialProfile(
    user: User,
    profile: { displayName: string; username: string },
  ): Promise<void> {
    const displayName = profile.displayName.trim();
    if (!displayName) throw new Error('A display name is required.');
    const username = normalizeUsername(profile.username);

    await runTransaction(this.firestore, async (transaction) => {
      const publicRef = doc(this.firestore, 'users', user.uid);
      const privateRef = doc(this.firestore, 'userPrivate', user.uid);
      const usernameRef = doc(this.firestore, 'usernames', username);
      const [publicSnapshot, privateSnapshot, reservationSnapshot] = await Promise.all([
        transaction.get(publicRef),
        transaction.get(privateRef),
        transaction.get(usernameRef),
      ]);

      if (
        reservationSnapshot.exists()
        && reservationSnapshot.data()['uid'] !== user.uid
      ) {
        throw new Error('USERNAME_TAKEN');
      }

      if (publicSnapshot.exists()) {
        const existingUsername = publicSnapshot.data()['username'];
        if (
          typeof existingUsername === 'string'
          && existingUsername !== username
        ) {
          throw new Error('USERNAME_CONFLICT');
        }
      }

      if (!publicSnapshot.exists()) {
        transaction.set(publicRef, {
          uid: user.uid,
          displayName,
          username,
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          languages: [],
          interests: [],
          roles: ['traveller'],
          accountStatus: 'active',
          verificationStatus: 'unverified',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (!privateSnapshot.exists()) {
        transaction.set(
          privateRef,
          createPrivateProfileData(user.uid, serverTimestamp()),
        );
      } else {
        transaction.set(privateRef, {
          uid: user.uid,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      if (!reservationSnapshot.exists()) {
        transaction.set(usernameRef, {
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  }

  async createProfile(uid: string, displayName: string, email?: string): Promise<void> {
    await runTransaction(this.firestore, async (transaction) => {
      const publicRef = doc(this.firestore, 'users', uid);
      const privateRef = doc(this.firestore, 'userPrivate', uid);
      const [publicSnapshot, privateSnapshot] = await Promise.all([
        transaction.get(publicRef),
        transaction.get(privateRef),
      ]);

      let username: string;
      let selectedReservationExists = false;
      if (publicSnapshot.exists()) {
        const existingUsername = publicSnapshot.data()['username'];
        if (
          typeof existingUsername !== 'string'
          || !/^[a-z0-9_]{3,20}$/.test(existingUsername)
        ) {
          throw new Error('INVALID_SAVED_USERNAME');
        }
        username = existingUsername;
        const usernameRef = doc(this.firestore, 'usernames', username);
        const selectedReservationSnapshot = await transaction.get(usernameRef);
        if (
          selectedReservationSnapshot.exists()
          && selectedReservationSnapshot.data()['uid'] !== uid
        ) {
          throw new Error('USERNAME_CONFLICT');
        }
        selectedReservationExists = selectedReservationSnapshot.exists();
      } else {
        const emailName = email?.split('@')[0] ?? '';
        const candidates = buildAutomaticUsernameCandidates(emailName, uid);
        const reservationRefs = candidates.map((candidate) =>
          doc(this.firestore, 'usernames', candidate),
        );
        const reservationSnapshots = await Promise.all(
          reservationRefs.map((reservationRef) => transaction.get(reservationRef)),
        );
        const availableIndex = reservationSnapshots.findIndex(
          (snapshot) =>
            !snapshot.exists()
            || snapshot.data()['uid'] === uid,
        );
        if (availableIndex === -1) throw new Error('USERNAME_TAKEN');
        username = candidates[availableIndex];
        selectedReservationExists = reservationSnapshots[availableIndex].exists();

        transaction.set(publicRef, {
          uid,
          displayName: displayName.trim() || username,
          username,
          languages: [],
          interests: [],
          roles: ['traveller'],
          accountStatus: 'active',
          verificationStatus: 'unverified',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (!privateSnapshot.exists()) {
        transaction.set(privateRef, createPrivateProfileData(uid, serverTimestamp()));
      } else {
        transaction.set(privateRef, {
          uid,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      const usernameRef = doc(this.firestore, 'usernames', username);
      if (!selectedReservationExists) {
        transaction.set(usernameRef, {
          uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  }

  async ensureProfile(user: User): Promise<UserProfile> {
    await runTransaction(this.firestore, async (transaction) => {
      const publicRef = doc(this.firestore, 'users', user.uid);
      const privateRef = doc(this.firestore, 'userPrivate', user.uid);
      const [publicSnapshot, privateSnapshot] = await Promise.all([
        transaction.get(publicRef),
        transaction.get(privateRef),
      ]);

      let username: string;
      let publicData: Record<string, unknown>;

      if (publicSnapshot.exists()) {
        const data = publicSnapshot.data();
        if (
          typeof data['username'] !== 'string'
          || !/^[a-z0-9_]{3,20}$/.test(data['username'])
        ) {
          throw new Error('INVALID_SAVED_USERNAME');
        }
        username = data['username'];
        publicData = { ...data };
      } else {
        const emailName = user.email?.split('@')[0] ?? '';
        const displayName = user.displayName?.trim() || emailName;
        username = '';
        publicData = {
          uid: user.uid,
          displayName: displayName.trim() || `traveller_${user.uid.slice(0, 8)}`,
          username: '',
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          languages: [],
          interests: [],
          roles: ['traveller'],
          accountStatus: 'active',
          verificationStatus: 'unverified',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }

      const candidates = publicSnapshot.exists()
        ? [username]
        : buildAutomaticUsernameCandidates(
            user.email?.split('@')[0] ?? '',
            user.uid,
          );
      const reservationRefs = candidates.map((candidate) =>
        doc(this.firestore, 'usernames', candidate),
      );
      const reservationSnapshots = await Promise.all(
        reservationRefs.map((reservationRef) => transaction.get(reservationRef)),
      );

      if (publicSnapshot.exists()) {
        const reservationSnapshot = reservationSnapshots[0];
        if (
          reservationSnapshot.exists()
          && reservationSnapshot.data()['uid'] !== user.uid
        ) {
          throw new Error('USERNAME_CONFLICT');
        }
      } else {
        const availableIndex = reservationSnapshots.findIndex(
          (reservationSnapshot) =>
            !reservationSnapshot.exists()
            || reservationSnapshot.data()['uid'] === user.uid,
        );
        if (availableIndex === -1) throw new Error('USERNAME_TAKEN');
        username = candidates[availableIndex];
        publicData['username'] = username;
      }

      if (!privateSnapshot.exists()) {
        transaction.set(
          privateRef,
          createPrivateProfileData(user.uid, serverTimestamp()),
        );
      } else {
        transaction.set(privateRef, {
          uid: user.uid,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      if (!publicSnapshot.exists()) {
        transaction.set(publicRef, {
          ...publicData,
          uid: user.uid,
          updatedAt: serverTimestamp(),
        });
      }

      const selectedReservationRef = doc(this.firestore, 'usernames', username);
      const selectedReservationSnapshot = reservationSnapshots[
        candidates.indexOf(username)
      ];
      if (!selectedReservationSnapshot?.exists()) {
        transaction.set(selectedReservationRef, {
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    const created = await this.getProfile(user.uid);
    if (!created) throw new Error('The user profile could not be created.');
    return created;
  }

  async updateProfile(uid: string, updates: UserProfileUpdates): Promise<void> {
    this.assertNoProtectedPublicFields(updates);
    await setDoc(
      doc(this.firestore, 'users', uid),
      { ...updates, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async updatePrivateProfile(
    uid: string,
    updates: UserPrivateProfileUpdates,
  ): Promise<void> {
    this.assertNoProtectedPrivateFields(updates);
    await setDoc(
      doc(this.firestore, 'userPrivate', uid),
      { ...updates, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async reserveUsername(uid: string, username: string): Promise<void> {
    const normalized = normalizeUsername(username);
    await runTransaction(this.firestore, async (transaction) => {
      const publicRef = doc(this.firestore, 'users', uid);
      const usernameRef = doc(this.firestore, 'usernames', normalized);
      const [publicSnapshot, reservationSnapshot] = await Promise.all([
        transaction.get(publicRef),
        transaction.get(usernameRef),
      ]);

      if (!publicSnapshot.exists()) throw new Error('PROFILE_NOT_FOUND');
      if (publicSnapshot.data()['username'] !== normalized) {
        throw new Error('PROFILE_USERNAME_MISMATCH');
      }
      if (
        reservationSnapshot.exists()
        && reservationSnapshot.data()['uid'] !== uid
      ) {
        throw new Error('USERNAME_TAKEN');
      }
      if (!reservationSnapshot.exists()) {
        transaction.set(usernameRef, {
          uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  }

  async changeUsername(uid: string, username: string): Promise<void> {
    const normalized = normalizeUsername(username);
    await runTransaction(this.firestore, async (transaction) => {
      const publicRef = doc(this.firestore, 'users', uid);
      const [publicSnapshot] = await Promise.all([
        transaction.get(publicRef),
      ]);
      if (!publicSnapshot.exists()) throw new Error('PROFILE_NOT_FOUND');

      const currentUsername = String(publicSnapshot.data()['username'] ?? '');
      if (currentUsername === normalized) return;

      const newReservationRef = doc(this.firestore, 'usernames', normalized);
      const oldReservationRef = currentUsername
        ? doc(this.firestore, 'usernames', currentUsername)
        : null;
      const [newReservationSnapshot, oldReservationSnapshot] = await Promise.all([
        transaction.get(newReservationRef),
        oldReservationRef
          ? transaction.get(oldReservationRef)
          : Promise.resolve(null),
      ]);
      if (
        newReservationSnapshot.exists()
        && newReservationSnapshot.data()['uid'] !== uid
      ) {
        throw new Error('USERNAME_TAKEN');
      }
      if (
        oldReservationSnapshot?.exists()
        && oldReservationSnapshot.data()['uid'] !== uid
      ) {
        throw new Error('USERNAME_OWNERSHIP_MISMATCH');
      }

      transaction.set(newReservationRef, {
        uid,
        createdAt: newReservationSnapshot.exists()
          ? newReservationSnapshot.data()['createdAt'] ?? serverTimestamp()
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(publicRef, {
        username: normalized,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (oldReservationSnapshot?.exists()) {
        transaction.delete(oldReservationRef!);
      }
    });
  }

  private optionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
  }

  private assertNoProtectedPublicFields(
    updates: UserProfileUpdates,
  ): void {
    const protectedFields = [
      'uid',
      'email',
      'emailVerified',
      'username',
      'roles',
      'accountStatus',
      'verificationStatus',
      'createdAt',
    ];
    if (protectedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(updates, field),
    )) {
      throw new Error('A protected profile field cannot be updated.');
    }
  }

  private assertNoProtectedPrivateFields(
    updates: UserPrivateProfileUpdates,
  ): void {
    const protectedFields = ['uid', 'email', 'updatedAt'];
    if (protectedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(updates, field),
    )) {
      throw new Error('A protected private profile field cannot be updated.');
    }
  }
}

export function createPrivateProfileData(
  uid: string,
  updatedAt: unknown,
): Record<string, unknown> {
  return {
    uid,
    privatePreferences: {},
    updatedAt,
  };
}

export function validatePrivateProfileData(
  data: Record<string, unknown>,
  documentId: string,
): UserPrivateProfile {
  if (
    typeof data['uid'] !== 'string'
    || data['uid'] !== documentId
    || (data['phoneNumber'] !== undefined && typeof data['phoneNumber'] !== 'string')
    || typeof data['privatePreferences'] !== 'object'
    || data['privatePreferences'] === null
    || Array.isArray(data['privatePreferences'])
    || !(data['updatedAt'] instanceof Timestamp)
  ) {
    throw new Error('The saved private profile is invalid. Please contact support.');
  }

  return data as unknown as UserPrivateProfile;
}

export function normalizeUsername(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    throw new Error('USERNAME_INVALID');
  }
  return normalized;
}

export function buildAutomaticUsernameCandidates(
  value: string,
  uid: string,
): string[] {
  const normalizedBase = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  const uidKey = uid
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 12);
  const candidates: string[] = [];
  if (normalizedBase.length >= 3) candidates.push(normalizedBase.slice(0, 20));

  const fallbackBase = `traveller_${uidKey || 'user'}`.slice(0, 20);
  candidates.push(fallbackBase);
  for (let suffix = 2; suffix <= 10; suffix += 1) {
    const suffixText = `_${suffix}`;
    candidates.push(
      `${fallbackBase.slice(0, 20 - suffixText.length)}${suffixText}`,
    );
  }

  return [...new Set(candidates)].filter((candidate) =>
    /^[a-z0-9_]{3,20}$/.test(candidate),
  );
}

export function selectAvailableUsername(
  candidates: string[],
  reservations: Array<{ exists: boolean; uid?: string }>,
  uid: string,
): string {
  const availableIndex = reservations.findIndex(
    (reservation, index) =>
      index < candidates.length
      && (!reservation.exists || reservation.uid === uid),
  );
  if (availableIndex === -1) throw new Error('USERNAME_TAKEN');
  return candidates[availableIndex];
}
