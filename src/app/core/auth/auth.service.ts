import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  authState,
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { Observable, shareReplay } from 'rxjs';
import { RegistrationProfile } from './auth.models';
import { UserProfileService } from '../services/user-profile.service';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly profiles = inject(UserProfileService);
  readonly user$: Observable<User | null> = authState(this.auth).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  async register(
    email: string,
    password: string,
    profile: RegistrationProfile,
  ): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(this.auth, email, password);
    await this.profiles.createInitialProfile(user, {
      displayName: profile.displayName,
      username: profile.username,
    });
    await sendEmailVerification(user);
  }

  async signIn(email: string, password: string): Promise<User> {
    const { user } = await signInWithEmailAndPassword(this.auth, email, password);
    await this.ensureAccountAccess(user);
    if (!user.emailVerified) await sendEmailVerification(user);
    return user;
  }

  async signInWithGoogle(): Promise<User> {
    const { user } = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.ensureAccountAccess(user);
    if (!user.emailVerified) await sendEmailVerification(user);
    return user;
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async resendVerification(): Promise<void> {
    const user = this.currentUser;
    if (!user) throw new Error('NO_SIGNED_IN_USER');
    await sendEmailVerification(user);
  }

  async refreshCurrentUser(): Promise<User | null> {
    const user = this.currentUser;
    if (!user) return null;
    await reload(user);
    if (user.emailVerified) await user.getIdToken(true);
    return user;
  }

  async destinationFor(user: User): Promise<string> {
    const profile = await this.getAccountProfile(user);
    if (!user.emailVerified) return '/auth/verify-email';
    return profile?.city?.trim() ? '/dashboard' : '/onboarding';
  }

  async ensureAccountAccess(user: User): Promise<UserProfile> {
    const profile = await this.profiles.ensureProfile(user);
    await this.assertAccountActive(profile);
    return profile;
  }

  async getAccountProfile(user: User): Promise<UserProfile | null> {
    const profile = await this.profiles.getProfile(user.uid);
    if (profile) await this.assertAccountActive(profile);
    return profile;
  }

  private async assertAccountActive(profile: UserProfile): Promise<void> {
    if (profile.accountStatus !== 'active') {
      await signOut(this.auth);
      throw new Error(
        profile.accountStatus === 'suspended'
          ? 'ACCOUNT_SUSPENDED'
          : 'ACCOUNT_DELETED',
      );
    }
  }

  isAccountUnavailableError(error: unknown): boolean {
    return error instanceof Error &&
      (error.message === 'ACCOUNT_SUSPENDED' || error.message === 'ACCOUNT_DELETED');
  }

  getProfile(uid: string) {
    return this.profiles.getProfile(uid);
  }

  saveProfile(uid: string, profile: Parameters<UserProfileService['updateProfile']>[1]) {
    return this.profiles.updateProfile(uid, profile);
  }

  async logOut(): Promise<void> {
    await signOut(this.auth);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof Error && [
      'USERNAME_TAKEN',
      'USERNAME_CONFLICT',
      'USERNAME_INVALID',
    ].includes(error.message)) {
      if (error.message === 'USERNAME_INVALID') {
        return 'Use 3–20 lowercase letters, numbers, or underscores.';
      }
      return 'That username is already in use. Choose another username.';
    }
    if (error instanceof Error && error.message === 'ACCOUNT_SUSPENDED') {
      return 'This account has been suspended. Contact support for assistance.';
    }
    if (error instanceof Error && error.message === 'ACCOUNT_DELETED') {
      return 'This account is no longer available. Contact support for assistance.';
    }
    if (error instanceof Error && error.message === 'NO_SIGNED_IN_USER') {
      return 'Sign in again to request a verification email.';
    }
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account already exists for this email. Try signing in instead.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'The email or password is incorrect.';
      case 'auth/weak-password':
        return 'Choose a stronger password with at least 8 characters.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'USERNAME_TAKEN':
      case 'USERNAME_CONFLICT':
        return 'That username is already in use. Choose another username.';
      case 'USERNAME_INVALID':
        return 'Use 3–20 lowercase letters, numbers, or underscores.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was cancelled.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
      default:
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
  }

  isUnknownEmailError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'auth/user-not-found';
  }
}
