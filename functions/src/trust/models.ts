import type { Timestamp } from 'firebase-admin/firestore';

export type VerificationCaseStatus = 'pending' | 'verified' | 'rejected' | 'cancelled';

export interface VerificationCase {
  caseId: string;
  subjectUid: string;
  status: VerificationCaseStatus;
  providerKey?: string;
  providerReference?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type VerificationEventType =
  | 'request_created'
  | 'provider_outcome_recorded'
  | 'case_cancelled';

export interface VerificationEvent {
  eventId: string;
  caseId: string;
  actorUid: string;
  eventType: VerificationEventType;
  fromStatus: VerificationCaseStatus | null;
  toStatus: VerificationCaseStatus;
  createdAt: Timestamp;
}

export type ReportTargetType =
  | 'user'
  | 'listing'
  | 'hostingRequest'
  | 'conversationMessage'
  | 'stayReview';

export type ReportStatus = 'submitted';

export interface PrivateReportCase {
  reportId: string;
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  category: string;
  description: string;
  status: ReportStatus;
  createdAt: Timestamp;
}

export interface ReporterReportStatus {
  reporterUid: string;
  status: ReportStatus;
  createdAt: Timestamp;
}
