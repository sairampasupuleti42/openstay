import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { pausePublishedListings } from './listing-state.js';

export const pauseListingsOnAccountSuspension = onDocumentUpdated(
  {
    document: 'users/{uid}',
    region: 'us-central1',
    retry: true,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (
      before?.['accountStatus'] === 'suspended'
      || after?.['accountStatus'] !== 'suspended'
    ) {
      return;
    }
    await pauseListingsForSuspendedAccount(getFirestore(), event.params.uid);
  },
);

export async function pauseListingsForSuspendedAccount(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<void> {
  await pausePublishedListings(db, uid);
}
