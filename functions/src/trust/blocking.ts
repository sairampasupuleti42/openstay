import { FieldPath, FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { isSafePublicText } from '../hosting/public-listings.js';

const options = {
  region: 'us-central1',
  enforceAppCheck: process.env['FUNCTIONS_EMULATOR'] !== 'true',
};
const uidPattern = /^[^/]{1,128}$/;
const pageSize = 50;

export const blockUser = onCall(options, (request) => setBlock(request, getFirestore()));
export const blockRequestParticipant = onCall(options, (request) =>
  setBlockRequestParticipant(request, getFirestore()));
export const unblockUser = onCall(options, (request) => removeBlock(request, getFirestore()));
export const listBlockedUsers = onCall(options, (request) => listBlocks(request, getFirestore()));

function caller(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage blocked users.');
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before managing blocked users.');
  }
  return uid;
}

function inputObject(data: unknown, fields: string[]): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some((key) => !fields.includes(key))) {
    throw new HttpsError('invalid-argument', 'The blocked-user request is invalid.');
  }
  return data as Record<string, unknown>;
}

export function blockReference(
  db: FirebaseFirestore.Firestore,
  ownerUid: string,
  targetUid: string,
): FirebaseFirestore.DocumentReference {
  return db.doc(`userBlocks/${ownerUid}/blocked/${targetUid}`);
}

export async function readBlockRelationship(
  transaction: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  firstUid: string,
  secondUid: string,
): Promise<{ blocked: boolean; firstBlockedSecond: boolean }> {
  const firstRef = blockReference(db, firstUid, secondUid);
  const secondRef = blockReference(db, secondUid, firstUid);
  const [first, second] = await Promise.all([
    transaction.get(firstRef),
    transaction.get(secondRef),
  ]);
  return {
    blocked: first.exists || second.exists,
    firstBlockedSecond: first.exists,
  };
}

export async function setBlock(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['targetUid']);
  const targetUid = input['targetUid'];
  if (typeof targetUid !== 'string' || !uidPattern.test(targetUid)) {
    throw new HttpsError('invalid-argument', 'The target user is invalid.');
  }
  if (targetUid === uid) {
    throw new HttpsError('failed-precondition', 'You cannot block your own account.');
  }

  return createBlock(uid, targetUid, db);
}

export async function setBlockRequestParticipant(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['requestId']);
  const requestId = input['requestId'];
  if (typeof requestId !== 'string' || !/^[a-f0-9]{64}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'The hosting request ID is invalid.');
  }
  const stay = (await db.doc(`hostingRequests/${requestId}`).get()).data();
  if (!stay || (stay['hostUid'] !== uid && stay['travellerUid'] !== uid)) {
    throw new HttpsError('not-found', 'This participant could not be found.');
  }
  const targetUid = stay['hostUid'] === uid ? stay['travellerUid'] : stay['hostUid'];
  if (typeof targetUid !== 'string' || !uidPattern.test(targetUid) || targetUid === uid) {
    throw new HttpsError('failed-precondition', 'The participant record requires attention.');
  }
  return createBlock(uid, targetUid, db);
}

async function createBlock(
  uid: string,
  targetUid: string,
  db: FirebaseFirestore.Firestore,
) {
  const actorRef = db.doc(`users/${uid}`);
  const targetRef = db.doc(`users/${targetUid}`);
  const blockRef = blockReference(db, uid, targetUid);
  await db.runTransaction(async (transaction) => {
    const [actor, target, existing] = await Promise.all([
      transaction.get(actorRef),
      transaction.get(targetRef),
      transaction.get(blockRef),
    ]);
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot manage blocked users.');
    }
    if (!target.exists || (target.data()?.['uid'] !== undefined
        && target.data()?.['uid'] !== targetUid)) {
      throw new HttpsError('not-found', 'This user could not be found.');
    }
    if (existing.exists) {
      const data = existing.data();
      if (data?.['ownerUid'] !== uid || data['blockedUid'] !== targetUid) {
        throw new HttpsError('failed-precondition', 'The blocked-user record requires attention.');
      }
      return;
    }
    transaction.create(blockRef, {
      ownerUid: uid,
      blockedUid: targetUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { blocked: true };
}

export async function removeBlock(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['targetUid']);
  const targetUid = input['targetUid'];
  if (typeof targetUid !== 'string' || !uidPattern.test(targetUid) || targetUid === uid) {
    throw new HttpsError('invalid-argument', 'The target user is invalid.');
  }
  const actorRef = db.doc(`users/${uid}`);
  const blockRef = blockReference(db, uid, targetUid);
  await db.runTransaction(async (transaction) => {
    const [actor, existing] = await Promise.all([
      transaction.get(actorRef),
      transaction.get(blockRef),
    ]);
    if (actor.data()?.['accountStatus'] !== 'active') {
      throw new HttpsError('failed-precondition', 'Your account cannot manage blocked users.');
    }
    if (!existing.exists) return;
    const data = existing.data();
    if (data?.['ownerUid'] !== uid || data['blockedUid'] !== targetUid) {
      throw new HttpsError('failed-precondition', 'The blocked-user record requires attention.');
    }
    transaction.delete(blockRef);
  });
  return { blocked: false };
}

export async function listBlocks(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['cursor']);
  const cursor = input['cursor'];
  if (cursor !== null && cursor !== undefined
      && (typeof cursor !== 'string' || !uidPattern.test(cursor))) {
    throw new HttpsError('invalid-argument', 'The blocked-user cursor is invalid.');
  }
  if ((await db.doc(`users/${uid}`).get()).data()?.['accountStatus'] !== 'active') {
    throw new HttpsError('failed-precondition', 'Your account cannot access blocked users.');
  }

  let query = db.collection(`userBlocks/${uid}/blocked`)
    .orderBy(FieldPath.documentId())
    .limit(pageSize + 1);
  if (typeof cursor === 'string') query = query.startAfter(cursor);
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, pageSize);
  const profiles = docs.length
    ? await db.getAll(...docs.map((doc) => db.doc(`users/${doc.id}`)))
    : [];
  const items = docs.map((doc, index) => {
    const block = doc.data();
    if (block['ownerUid'] !== uid || block['blockedUid'] !== doc.id) {
      throw new HttpsError('failed-precondition', 'A blocked-user record requires attention.');
    }
    const displayName = profiles[index]?.data()?.['displayName'];
    return {
      uid: doc.id,
      displayName: typeof displayName === 'string'
        && displayName.trim().length > 0
        && displayName.length <= 100
        && isSafePublicText(displayName)
        ? displayName
        : 'Openstay member',
    };
  });
  return {
    items,
    nextCursor: snapshot.size > pageSize ? docs[docs.length - 1].id : null,
  };
}
