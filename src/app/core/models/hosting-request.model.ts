export interface HostingRequestInput {
  listingId: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  introductoryMessage: string;
}

export interface HostingRequest {
  requestId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  introductoryMessage: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  completion: StayCompletionState;
  createdAt: string | null;
  updatedAt: string | null;
}

export type StayCompletionStatus = 'not_started' | 'pending' | 'completed';
export type StayCompletionReason =
  | 'awaiting_confirmation'
  | 'disputed'
  | 'response_window_expired';

export interface StayCompletionState {
  status: StayCompletionStatus;
  reason: StayCompletionReason | null;
  viewerConfirmed: boolean;
  otherParticipantConfirmed: boolean;
  responseDeadline: string | null;
  completedAt: string | null;
}

export interface PublicStayReview {
  rating: number;
  text: string | null;
  publishedAt: string;
}

export interface HostingRequestDetails extends HostingRequest {
  viewerIsHost: boolean;
  viewerHasBlockedOther: boolean;
  viewerReviewSubmitted: boolean;
  otherParticipantReviewStats: { reviewCount: number; averageRating: number } | null;
  otherParticipantReviews: PublicStayReview[];
  listingTitle: string | null;
  listingLocation: string | null;
  otherParticipantName: string | null;
  traveller: { displayName: string } | null;
}

export interface HostingRequestPage {
  items: HostingRequest[];
  nextCursor: string | null;
}
