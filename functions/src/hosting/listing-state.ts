import {
  FieldPath,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const LISTING_PAUSE_PAGE_SIZE = 200;
const WITHDRAWAL_LEASE_MS = 60_000;

export interface ListingPauseLock {
  ref: FirebaseFirestore.DocumentReference;
  requestId: string;
  workerId: string;
}

export interface ListingSuspensionGuard {
  userRef: FirebaseFirestore.DocumentReference;
  stateRef: FirebaseFirestore.DocumentReference;
  suspensionId: string;
}

export async function pausePublishedListings(
  db: FirebaseFirestore.Firestore,
  uid: string,
  lock?: ListingPauseLock,
  suspension?: ListingSuspensionGuard,
): Promise<void> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (true) {
    const page = await db.runTransaction(async (transaction) => {
      const lockSnapshot = lock ? await transaction.get(lock.ref) : null;
      if (suspension) {
        const [user, state] = await Promise.all([
          transaction.get(suspension.userRef),
          transaction.get(suspension.stateRef),
        ]);
        if (
          user.data()?.['accountStatus'] !== 'suspended'
          || state.data()?.['suspensionId'] !== suspension.suspensionId
          || state.data()?.['status'] !== 'pending'
        ) return null;
      }
      if (lock) {
        const lockData = lockSnapshot?.data();
        if (
          !lockSnapshot?.exists
          || lockData?.['requestId'] !== lock.requestId
          || lockData?.['workerId'] !== lock.workerId
          || !(lockData['leaseExpiresAt'] instanceof Timestamp)
          || lockData['leaseExpiresAt'].toMillis() <= Timestamp.now().toMillis()
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The host participation change is no longer current. Retry the request.',
            { reason: 'stale-withdrawal-lock' },
          );
        }
      }

      let pageQuery = db.collection('listings')
        .where('hostUid', '==', uid)
        .orderBy(FieldPath.documentId())
        .limit(LISTING_PAUSE_PAGE_SIZE);
      if (cursor) pageQuery = pageQuery.startAfter(cursor);
      const listings = await transaction.get(pageQuery);

      if (lock) {
        transaction.update(lock.ref, {
          leaseExpiresAt: Timestamp.fromMillis(Timestamp.now().toMillis() + WITHDRAWAL_LEASE_MS),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      for (const listing of listings.docs) {
        if (listing.data()['status'] === 'published') {
          transaction.update(listing.ref, {
            status: 'paused',
            pausedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      return listings;
    });

    if (!page || page.empty) return;
    cursor = page.docs[page.docs.length - 1];
    if (page.size < LISTING_PAUSE_PAGE_SIZE) return;
  }
}
