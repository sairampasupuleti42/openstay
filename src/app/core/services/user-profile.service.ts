import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { UserProfile } from '../models/user.model';

export type UserProfileUpdates = Partial<
  Pick<UserProfile, 'displayName' | 'bio' | 'country' | 'city' | 'languages' | 'interests'>
>;

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly firestore = inject(Firestore);

  async getProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', uid));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    if (
      typeof data['uid'] !== 'string' ||
      data['uid'] !== snapshot.id ||
      typeof data['displayName'] !== 'string' ||
      data['displayName'].trim().length === 0 ||
      typeof data['username'] !== 'string' ||
      !/^[a-z0-9_]{3,20}$/.test(data['username']) ||
      typeof data['email'] !== 'string' ||
      typeof data['emailVerified'] !== 'boolean' ||
      !Array.isArray(data['languages']) ||
      !data['languages'].every((value: unknown) => typeof value === 'string') ||
      !Array.isArray(data['interests']) ||
      !data['interests'].every((value: unknown) => typeof value === 'string') ||
      !Array.isArray(data['roles']) ||
      data['roles'].length === 0 ||
      !data['roles'].every((value: unknown) => value === 'traveller' || value === 'host') ||
      !['active', 'suspended', 'deleted'].includes(data['accountStatus']) ||
      !['unverified', 'pending', 'verified'].includes(data['verificationStatus']) ||
      !(data['createdAt'] instanceof Timestamp) ||
      !(data['updatedAt'] instanceof Timestamp) ||
      !this.optionalString(data['photoURL']) ||
      !this.optionalString(data['bio']) ||
      !this.optionalString(data['country']) ||
      !this.optionalString(data['city'])
    ) {
      throw new Error('The saved user profile is invalid. Please contact support.');
    }

    return data as UserProfile;
  }

  async createInitialProfile(
    user: User,
    profile: { displayName: string; username: string },
  ): Promise<void> {
    if (!user.email) throw new Error('MISSING_ACCOUNT_EMAIL');
    await this.writeInitialProfile(
      user.uid,
      profile.displayName,
      profile.username,
      user.email,
      user.emailVerified,
      user.photoURL,
    );
  }

  async createProfile(uid: string, displayName: string, email: string): Promise<void> {
    const emailName = email.split('@')[0] ?? '';
    const username = this.usernameFrom(emailName, uid);
    await this.writeInitialProfile(uid, displayName, username, email, false);
  }

  async ensureProfile(user: User): Promise<UserProfile> {
    const existing = await this.getProfile(user.uid);
    if (existing) {
      if (user.emailVerified && !existing.emailVerified) {
        await this.updateEmailVerified(user.uid, true);
        return { ...existing, emailVerified: true };
      }
      return existing;
    }
    if (!user.email) throw new Error('MISSING_ACCOUNT_EMAIL');

    const emailName = user.email.split('@')[0] ?? '';
    const username = this.usernameFrom(emailName, user.uid);
    const displayName = user.displayName?.trim() || emailName || username;
    await this.createInitialProfile(user, { displayName, username });

    const created = await this.getProfile(user.uid);
    if (!created) throw new Error('The user profile could not be created.');
    return created;
  }

  async updateProfile(uid: string, updates: UserProfileUpdates): Promise<void> {
    await setDoc(
      doc(this.firestore, 'users', uid),
      { ...updates, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async updateEmailVerified(uid: string, emailVerified: boolean): Promise<void> {
    await setDoc(
      doc(this.firestore, 'users', uid),
      { emailVerified, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  private optionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
  }

  private async writeInitialProfile(
    uid: string,
    displayName: string,
    username: string,
    email: string,
    emailVerified: boolean,
    photoURL?: string | null,
  ): Promise<void> {
    await setDoc(doc(this.firestore, 'users', uid), {
      uid,
      displayName,
      username,
      email,
      emailVerified,
      ...(photoURL ? { photoURL } : {}),
      languages: [],
      interests: [],
      roles: ['traveller'],
      accountStatus: 'active',
      verificationStatus: 'unverified',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private usernameFrom(value: string, uid: string): string {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    const candidate = normalized.length >= 3 ? normalized : `traveller_${uid.slice(0, 8)}`;
    return candidate;
  }
}
