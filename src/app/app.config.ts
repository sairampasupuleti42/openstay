import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { FirebaseApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, connectAuthEmulator, getAuth } from '@angular/fire/auth';
import { provideFirestore, connectFirestoreEmulator, getFirestore } from '@angular/fire/firestore';
import { provideStorage, connectStorageEmulator, getStorage } from '@angular/fire/storage';
import { AppCheck, provideAppCheck } from '@angular/fire/app-check';
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { environment } from '../environments/environment';

function initializeConfiguredFirebase() {
  if (!environment.useEmulators) {
    const missingOptions = Object.entries(environment.firebase)
      .filter(([, value]) => !value.trim())
      .map(([key]) => key);
    if (missingOptions.length > 0) {
      throw new Error(
        `Firebase configuration is incomplete. Set: ${missingOptions.join(', ')}.`,
      );
    }
    if (!environment.appCheckSiteKey.trim()) {
      console.warn(
        'Firebase App Check is not configured. Set appCheckSiteKey before deploying to production.',
      );
    }
  }
  return initializeApp(environment.firebase);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebaseApp(() => initializeConfiguredFirebase()),
    provideAuth(() => {
      const auth = getAuth(inject(FirebaseApp));
      if (environment.useEmulators) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
          disableWarnings: true,
        });
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore(inject(FirebaseApp));
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      }
      return firestore;
    }),
    provideStorage(() => {
      const storage = getStorage(inject(FirebaseApp));
      if (environment.useEmulators) {
        connectStorageEmulator(storage, '127.0.0.1', 9199);
      }
      return storage;
    }),
    ...(environment.useEmulators || !environment.appCheckSiteKey.trim()
      ? []
      : [
          provideAppCheck(() =>
            initializeAppCheck(inject(FirebaseApp), {
              provider: new ReCaptchaEnterpriseProvider(environment.appCheckSiteKey),
              isTokenAutoRefreshEnabled: true,
            }),
          ),
          provideEnvironmentInitializer(() => {
            inject(AppCheck);
          }),
        ]),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
