import { Timestamp } from '@angular/fire/firestore';

export const HOST_PARTICIPATION_TERMS_VERSION = 'host-participation-v1';
export const HOST_PARTICIPATION_TERMS_DIGEST =
  '0cbe5ba16e71fe24803c9080c62e7f3eb413c8d3ae079289d51538d2a325a96b';
export const HOST_PARTICIPATION_TERMS_TEXT =
  'Hosting on Openstay is voluntary and free. Openstay does not charge you to participate. You choose whether to host and may stop participating. Only host profile fields marked public can be viewed by others. Do not include private contact details or your exact residential address in public profile text. Openstay does not provide background checks, identity verification, insurance, or safety guarantees.';

export type HostProfileVisibility = 'private' | 'public';
export type HostConsentState = 'accepted' | 'withdrawn';
export type HostConsentEventType = HostConsentState;

export interface HostProfile {
  uid: string;
  displayName: string;
  introduction?: string;
  languages: string[];
  visibility: HostProfileVisibility;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HostProfileInput {
  displayName: string;
  introduction?: string;
  languages: string[];
}

export type HostProfileUpdates = Partial<
  Pick<HostProfile, 'displayName' | 'introduction' | 'languages' | 'visibility'>
>;

export interface HostPrivateProfile {
  uid: string;
  termsVersion: string;
  termsDigest: string;
  consentState: HostConsentState;
  eventId: string;
  updatedAt: Timestamp;
}

export interface HostConsentEvent {
  eventId: string;
  uid: string;
  eventType: HostConsentEventType;
  termsVersion: string;
  termsDigest: string;
  recordedAt: Timestamp;
  idempotencyKey: string;
  expectedEventId: string | null;
}
