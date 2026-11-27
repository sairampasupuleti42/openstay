import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { FirebaseApp } from '@angular/fire/app';
import {
  Firestore,
  Timestamp,
  doc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';
import {
  HostProfile,
  HostProfileInput,
  HostProfileUpdates,
  HostPrivateProfile,
  HOST_PARTICIPATION_TERMS_TEXT,
  HOST_PARTICIPATION_TERMS_VERSION,
} from '../models/host-profile.model';

const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const PROFILE_FIELDS = [
  'displayName',
  'introduction',
  'languages',
  'visibility',
] as const;

let hostingFunctions: ReturnType<typeof import('firebase/functions').getFunctions> | undefined;
const FUNCTIONS_REGION = 'us-central1';

@Injectable()
export class HostProfileService {
  private readonly auth = inject(Auth);
  private readonly firebaseApp = inject(FirebaseApp);
  private readonly firestore = inject(Firestore);

  async getProfile(uid: string): Promise<HostProfile | null> {
    const snapshot = await getDoc(doc(this.firestore, 'hostProfiles', uid));
    if (!snapshot.exists()) return null;
    return validateHostProfileData(snapshot.data(), snapshot.id);
  }

  async getOwnProfile(): Promise<HostProfile | null> {
    return this.getProfile(this.requireCurrentUid());
  }

  async getOwnConsentState(): Promise<HostPrivateProfile | null> {
    const uid = this.requireCurrentUid();
    const snapshot = await getDocFromServer(doc(this.firestore, 'hostPrivate', uid));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (
      Object.keys(data).some((key) => ![
        'uid',
        'termsVersion',
        'termsDigest',
        'consentState',
        'eventId',
        'updatedAt',
      ].includes(key))
      || data['uid'] !== uid
      || typeof data['termsVersion'] !== 'string'
      || typeof data['termsDigest'] !== 'string'
      || (data['consentState'] !== 'accepted' && data['consentState'] !== 'withdrawn')
      || typeof data['eventId'] !== 'string'
      || !/^[a-f0-9]{64}$/.test(data['eventId'])
      || !(data['updatedAt'] instanceof Timestamp)
    ) {
      throw new Error('The saved host consent state is invalid. Please contact support.');
    }
    return {
      uid,
      termsVersion: data['termsVersion'],
      termsDigest: data['termsDigest'],
      consentState: data['consentState'],
      eventId: data['eventId'],
      updatedAt: data['updatedAt'],
    };
  }

  async acceptParticipation(idempotencyKey: string, expectedEventId: string | null): Promise<string> {
    this.validateIdempotencyKey(idempotencyKey);
    const { sdk, functions } = await getHostingFunctions(this.firebaseApp);
    const accept = sdk.httpsCallable<
      { idempotencyKey: string; expectedEventId: string | null; termsVersion: string; termsText: string },
      { eventId: string }
    >(functions, 'acceptHostParticipation');
    const result = await accept({
      idempotencyKey,
      expectedEventId,
      termsVersion: HOST_PARTICIPATION_TERMS_VERSION,
      termsText: HOST_PARTICIPATION_TERMS_TEXT,
    });
    return result.data.eventId;
  }

  async withdrawParticipation(idempotencyKey: string, expectedEventId: string | null): Promise<string> {
    this.validateIdempotencyKey(idempotencyKey);
    const { sdk, functions } = await getHostingFunctions(this.firebaseApp);
    const withdraw = sdk.httpsCallable<
      { idempotencyKey: string; expectedEventId: string | null },
      { eventId: string }
    >(functions, 'withdrawHostParticipation', { timeout: 330_000 });
    const result = await withdraw({ idempotencyKey, expectedEventId });
    return result.data.eventId;
  }

  async createProfile(input: HostProfileInput): Promise<void> {
    const uid = this.requireCurrentUid();
    const profile = validateHostProfileInput(input);
    await setDoc(doc(this.firestore, 'hostProfiles', uid), {
      uid,
      ...profile,
      visibility: 'private',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async updateOwnProfile(updates: HostProfileUpdates): Promise<void> {
    const uid = this.requireCurrentUid();
    const keys = Object.keys(updates);
    const editableFields: readonly string[] = PROFILE_FIELDS;
    if (keys.some((key) => !editableFields.includes(key))) {
      throw new Error('A host profile field is not editable.');
    }

    const safeUpdates: HostProfileUpdates = {};
    if (updates.displayName !== undefined) {
      safeUpdates.displayName = validateDisplayName(updates.displayName);
    }
    if (updates.introduction !== undefined) {
      safeUpdates.introduction = validateIntroduction(updates.introduction);
    }
    if (updates.languages !== undefined) {
      safeUpdates.languages = validateLanguages(updates.languages);
    }
    if (updates.visibility !== undefined) {
      if (updates.visibility !== 'private' && updates.visibility !== 'public') {
        throw new Error('Host profile visibility is invalid.');
      }
      safeUpdates.visibility = updates.visibility;
    }

    await setDoc(
      doc(this.firestore, 'hostProfiles', uid),
      { ...safeUpdates, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  private requireCurrentUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('NO_SIGNED_IN_USER');
    return uid;
  }

  private validateIdempotencyKey(value: string): void {
    if (!/^[A-Za-z0-9-]{16,128}$/.test(value)) {
      throw new Error('HOST_CONSENT_IDEMPOTENCY_KEY_INVALID');
    }
  }
}

async function getHostingFunctions(app: FirebaseApp) {
  const sdk = await import('firebase/functions');
  if (!hostingFunctions) {
    hostingFunctions = sdk.getFunctions(app, FUNCTIONS_REGION);
    if (environment.useEmulators) {
      sdk.connectFunctionsEmulator(hostingFunctions, '127.0.0.1', 5001);
    }
  }
  return { sdk, functions: hostingFunctions };
}

export function validateHostProfileInput(
  input: HostProfileInput,
): Pick<HostProfile, 'displayName' | 'introduction' | 'languages'> {
  const allowedFields = ['displayName', 'introduction', 'languages'];
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
    || Object.keys(input).some((key) => !allowedFields.includes(key))
  ) {
    throw new Error('A host profile field is not allowed.');
  }
  const displayName = validateDisplayName(input.displayName);
  const introduction = input.introduction === undefined
    ? undefined
    : validateIntroduction(input.introduction);
  const languages = validateLanguages(input.languages);

  return {
    displayName,
    ...(introduction ? { introduction } : {}),
    languages,
  };
}

export function validateHostProfileData(
  data: Record<string, unknown>,
  documentId: string,
): HostProfile {
  const allowedFields = [
    'uid',
    'displayName',
    'introduction',
    'languages',
    'visibility',
    'createdAt',
    'updatedAt',
  ];
  if (
    Object.keys(data).some((key) => !allowedFields.includes(key))
    || data['uid'] !== documentId
    || typeof data['displayName'] !== 'string'
    || data['displayName'].trim().length === 0
    || data['displayName'].length > 100
    || (data['introduction'] !== undefined &&
      (typeof data['introduction'] !== 'string' || data['introduction'].length > 500))
    || !Array.isArray(data['languages'])
    || data['languages'].length > 10
    || !data['languages'].every((value: unknown) =>
      typeof value === 'string' && LANGUAGE_CODE.test(value),
    )
    || new Set(data['languages']).size !== data['languages'].length
    || (data['visibility'] !== 'private' && data['visibility'] !== 'public')
    || !(data['createdAt'] instanceof Timestamp)
    || !(data['updatedAt'] instanceof Timestamp)
  ) {
    throw new Error('The saved host profile is invalid. Please contact support.');
  }
  return data as unknown as HostProfile;
}

function validateDisplayName(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Enter a public host name of up to 100 characters.');
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 100) {
    throw new Error('Enter a public host name of up to 100 characters.');
  }
  return normalized;
}

function validateIntroduction(value: string): string {
  if (typeof value !== 'string' || value.length > 500) {
    throw new Error('The introduction must be 500 characters or fewer.');
  }
  return value.trim();
}

function validateLanguages(values: string[]): string[] {
  if (
    !Array.isArray(values)
    || values.length > 10
    || !values.every((value) => typeof value === 'string' && LANGUAGE_CODE.test(value))
    || new Set(values).size !== values.length
  ) {
    throw new Error('Use up to 10 unique language codes, such as en or mi.');
  }
  return [...values];
}
