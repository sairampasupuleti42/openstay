import { Injectable, inject } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Observable, shareReplay } from 'rxjs';
import { FirebaseService } from './firebase.service';

export interface TravellerProfile {
  displayName: string;
  homeBase: string;
  bio: string;
  onboardingComplete: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebase = inject(FirebaseService);
  readonly user$ = new Observable<User | null>((subscriber) =>
    onAuthStateChanged(
      this.firebase.auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
    ),
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  get currentUser(): User | null {
    return this.firebase.auth.currentUser;
  }

  async register(email: string, password: string): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(
      this.firebase.auth,
      email,
      password,
    );
    await sendEmailVerification(user);
  }

  async signIn(email: string, password: string): Promise<User> {
    const { user } = await signInWithEmailAndPassword(this.firebase.auth, email, password);
    if (!user.emailVerified) await sendEmailVerification(user);
    return user;
  }

  async signInWithGoogle(): Promise<User> {
    const { user } = await signInWithPopup(this.firebase.auth, new GoogleAuthProvider());
    if (!user.emailVerified) await sendEmailVerification(user);
    return user;
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebase.auth, email);
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
    if (!user.emailVerified) return '/auth/verify-email';
    const profile = await this.getProfile(user.uid);
    return profile?.onboardingComplete ? '/dashboard' : '/onboarding';
  }

  async getProfile(uid: string): Promise<TravellerProfile | null> {
    const snapshot = await getDoc(doc(this.firebase.firestore, 'users', uid));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (
      typeof data['displayName'] !== 'string' ||
      typeof data['homeBase'] !== 'string' ||
      typeof data['bio'] !== 'string' ||
      typeof data['onboardingComplete'] !== 'boolean'
    ) {
      throw new Error('The saved traveller profile is invalid. Please contact support.');
    }
    return {
      displayName: data['displayName'],
      homeBase: data['homeBase'],
      bio: data['bio'],
      onboardingComplete: data['onboardingComplete'],
    };
  }

  async saveProfile(uid: string, profile: TravellerProfile): Promise<void> {
    await setDoc(
      doc(this.firebase.firestore, 'users', uid),
      { ...profile, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async logOut(): Promise<void> {
    await signOut(this.firebase.auth);
  }

  getErrorMessage(error: unknown): string {
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
