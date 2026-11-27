import { initializeApp } from 'firebase-admin/app';

initializeApp();

export {
  acceptHostParticipation,
  withdrawHostParticipation,
} from './hosting/host-participation.js';
export {
  archiveListing,
  pauseListing,
  publishListing,
  resumeListing,
} from './hosting/listing-lifecycle.js';
export {
  getPublicListingDetails,
  searchPublishedListings,
} from './hosting/public-listings.js';
export { pauseListingsOnAccountSuspension } from './hosting/account-suspension.js';
export {
  createHostingRequest,
  listTravellerHostingRequests,
  listHostHostingRequests,
  getHostingRequest,
} from './hosting/hosting-requests.js';
