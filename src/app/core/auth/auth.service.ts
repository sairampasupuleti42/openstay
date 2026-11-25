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
    await this.profiles.ensureProfile(user);
    if (!user.emailVerified) await sendEmailVerification(user);
    return user;
  }

  async signInWithGoogle(): Promise<User> {
    const { user } = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.profiles.ensureProfile(user);
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
    if (user.emailVerified) {
      await user.getIdToken(true);
      await this.profiles.updateEmailVerified(user.uid, true);
    }
    return user;
  }

  async destinationFor(user: User): Promise<string> {
    if (!user.emailVerified) return '/auth/verify-email';
    const profile = await this.profiles.ensureProfile(user);
    return profile.city?.trim() ? '/dashboard' : '/onboarding';
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
    if (error instanceof Error && error.message === 'NO_SIGNED_IN_USER') {
      return 'Sign in again to request a verification email.';
    }
    if (error instanceof Error && error.message === 'MISSING_ACCOUNT_EMAIL') {
      return 'Your account does not have an email address. Please contact support.';
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
