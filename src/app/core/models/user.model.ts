import { Timestamp } from '@angular/fire/firestore';

export type UserRole = 'traveller' | 'host';
export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  emailVerified: boolean;
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
