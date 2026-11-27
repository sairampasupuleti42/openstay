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
  status: 'pending';
  createdAt: string | null;
  updatedAt: string | null;
}

export interface HostingRequestDetails extends HostingRequest {
  viewerIsHost: boolean;
  listingTitle: string | null;
  traveller: { displayName: string } | null;
}

export interface HostingRequestPage {
  items: HostingRequest[];
  nextCursor: string | null;
}
