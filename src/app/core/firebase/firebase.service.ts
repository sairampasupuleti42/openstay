import { Injectable } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  AppCheck,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'firebase/app-check';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, FirebaseStorage, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, Functions, getFunctions } from 'firebase/functions';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly firestore: Firestore;
  readonly storage: FirebaseStorage;
  readonly functions: Functions;
  readonly appCheck: AppCheck | null;

  constructor() {
    if (!environment.useEmulators) {
      const missingFirebaseOptions = Object.entries(environment.firebase)
        .filter(([, value]) => !value.trim())
        .map(([key]) => key);

      if (missingFirebaseOptions.length > 0) {
        throw new Error(
          `Firebase configuration is incomplete. Set: ${missingFirebaseOptions.join(', ')}.`,
        );
      }

      if (!environment.appCheckSiteKey.trim()) {
        throw new Error('Configure the App Check reCAPTCHA site key before connecting to Firebase.');
      }
    }

    this.app = initializeApp(environment.firebase);
    this.appCheck = environment.useEmulators
      ? null
      : initializeAppCheck(this.app, {
          provider: new ReCaptchaV3Provider(environment.appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);
    this.functions = getFunctions(this.app);

    if (environment.useEmulators) {
      connectAuthEmulator(this.auth, 'http://127.0.0.1:9099', {
        disableWarnings: true,
      });
      connectFirestoreEmulator(this.firestore, '127.0.0.1', 8080);
      connectStorageEmulator(this.storage, '127.0.0.1', 9199);
      connectFunctionsEmulator(this.functions, '127.0.0.1', 5001);
    }
  }
}
