import { randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { pausePublishedListings } from './listing-state.js';

function suspensionRefs(db: FirebaseFirestore.Firestore, uid: string) {
  return {
    userRef: db.doc(`users/${uid}`),
    stateRef: db.doc(`hostPrivate/${uid}/listingLifecycleState/suspension`),
  };
}

export async function suspendAccount(
  db: FirebaseFirestore.Firestore,
  uid: string,
  expectedPreviousSuspensionId: string | null,
): Promise<void> {
  const { userRef, stateRef } = suspensionRefs(db, uid);
  const suspensionId = randomUUID();
  await db.runTransaction(async (transaction) => {
    const [user, state] = await Promise.all([
      transaction.get(userRef),
      transaction.get(stateRef),
    ]);
    if (user.data()?.['accountStatus'] === 'suspended') {
      if (
        (state.data()?.['status'] === 'pending' || state.data()?.['status'] === 'complete')
        && state.data()?.['previousSuspensionId'] === expectedPreviousSuspensionId
      ) return;
      throw new HttpsError('failed-precondition', 'This suspension requires administrative reconciliation.');
    }
    if (user.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Only an active account can be suspended.');
    }
    if (
      state.exists
        ? state.data()?.['status'] !== 'reactivated'
          || state.data()?.['suspensionId'] !== expectedPreviousSuspensionId
        : expectedPreviousSuspensionId !== null
    ) {
      throw new HttpsError('failed-precondition', 'The account suspension state has changed.');
    }
    transaction.set(stateRef, {
      suspensionId,
      previousSuspensionId: expectedPreviousSuspensionId,
      status: 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(userRef, {
      accountStatus: 'suspended',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function reactivateAccount(
  db: FirebaseFirestore.Firestore,
  uid: string,
  expectedSuspensionId: string,
): Promise<void> {
  const { userRef, stateRef } = suspensionRefs(db, uid);
  await db.runTransaction(async (transaction) => {
    const [user, state] = await Promise.all([
      transaction.get(userRef),
      transaction.get(stateRef),
    ]);
    if (
      user.data()?.['accountStatus'] === 'active'
      && state.data()?.['status'] === 'reactivated'
      && state.data()?.['suspensionId'] === expectedSuspensionId
    ) return;
    if (
      user.data()?.['accountStatus'] !== 'suspended'
      || state.data()?.['status'] !== 'complete'
      || state.data()?.['suspensionId'] !== expectedSuspensionId
    ) {
      throw new HttpsError('failed-precondition', 'Suspension processing must complete before reactivation.');
    }
    transaction.update(stateRef, { status: 'reactivated', updatedAt: FieldValue.serverTimestamp() });
    transaction.update(userRef, {
      accountStatus: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

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
  const { userRef, stateRef } = suspensionRefs(db, uid);
  const [user, state] = await Promise.all([userRef.get(), stateRef.get()]);
  if (user.data()?.['accountStatus'] !== 'suspended') return;
  const suspensionId = state.data()?.['suspensionId'];
  if (state.data()?.['status'] === 'complete') return;
  if (state.data()?.['status'] !== 'pending' || typeof suspensionId !== 'string') {
    throw new HttpsError('failed-precondition', 'This suspension requires administrative reconciliation.');
  }
  await pausePublishedListings(db, uid, undefined, { userRef, stateRef, suspensionId });
  await db.runTransaction(async (transaction) => {
    const [currentUser, currentState] = await Promise.all([
      transaction.get(userRef),
      transaction.get(stateRef),
    ]);
    if (
      currentUser.data()?.['accountStatus'] === 'suspended'
      && currentState.data()?.['suspensionId'] === suspensionId
      && currentState.data()?.['status'] === 'pending'
    ) {
      transaction.update(stateRef, { status: 'complete', updatedAt: FieldValue.serverTimestamp() });
    }
  });
}
