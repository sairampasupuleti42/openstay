import { Timestamp } from '@angular/fire/firestore';

export type UserRole = 'traveller' | 'host';
export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  bio?: string;
  country?: string;
  city?: string;
  languages: string[];
  interests: string[];
  roles: UserRole[];
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserPrivateProfile {
  uid: string;
  phoneNumber?: string;
  privatePreferences: Record<string, unknown>;
  updatedAt: Timestamp;
}

export interface UsernameReservation {
  uid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
