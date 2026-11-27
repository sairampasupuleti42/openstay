import { createHash, randomBytes } from 'node:crypto';
import { FieldPath, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from './host-participation.js';
import { isSafePublicText } from './public-listings.js';

const options = { region: 'us-central1', enforceAppCheck: process.env['FUNCTIONS_EMULATOR'] !== 'true' };
const idPattern = /^[a-f0-9]{64}$/;
const idempotencyPattern = /^[A-Za-z0-9_-]{16,128}$/;
const messageMaxLength = 2000;
const pageSize = 20;
const maxMessagesPerMinute = 20;
const rateWindowMs = 60_000;
const minTimestampSeconds = -62_135_596_800;
const maxTimestampSeconds = 253_402_300_799;
const cursorTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const cursorLifetimeMs = 15 * 60 * 1000;
const maxActiveConversationCursors = 100;

export const openConversation = onCall(options, (request) => getOrCreateConversation(request, getFirestore()));
export const sendConversationMessage = onCall(options, (request) => sendMessage(request, getFirestore()));
export const listConversations = onCall(options, (request) => listParticipantConversations(request, getFirestore()));
export const markConversationRead = onCall(options, (request) => markRead(request, getFirestore()));

function inputObject(data: unknown, fields: string[]): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some((key) => !fields.includes(key))) {
    throw new HttpsError('invalid-argument', 'The conversation request is invalid.');
  }
  return data as Record<string, unknown>;
}

function caller(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to access conversations.');
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before accessing conversations.');
  }
  return uid;
}

function assertRequestParticipants(data: FirebaseFirestore.DocumentData | undefined, requestId: string) {
  if (!data
      || data['requestId'] !== requestId
      || typeof data['listingId'] !== 'string'
      || typeof data['hostUid'] !== 'string'
      || typeof data['travellerUid'] !== 'string'
      || data['hostUid'] === data['travellerUid']) {
    throw new HttpsError('failed-precondition', 'The hosting request cannot be used for messaging.');
  }
  return {
    listingId: data['listingId'] as string,
    hostUid: data['hostUid'] as string,
    travellerUid: data['travellerUid'] as string,
  };
}

function eligibleHost(
  hostUid: string,
  host: FirebaseFirestore.DocumentSnapshot,
  consent: FirebaseFirestore.DocumentSnapshot,
  lock: FirebaseFirestore.DocumentSnapshot,
): boolean {
  const consentData = consent.data();
  const lockData = lock.data();
  return host.data()?.['accountStatus'] === 'active'
    && consentData?.['uid'] === hostUid
    && consentData['consentState'] === 'accepted'
    && consentData['termsVersion'] === HOST_PARTICIPATION_TERMS_VERSION
    && consentData['termsDigest'] === HOST_PARTICIPATION_TERMS_DIGEST
    && typeof consentData['eventId'] === 'string'
    && idPattern.test(consentData['eventId'])
    && (!lockData || (lockData['leaseExpiresAt'] instanceof Timestamp
      && lockData['leaseExpiresAt'].toMillis() <= Date.now()));
}

function eligibleTraveller(traveller: FirebaseFirestore.DocumentSnapshot): boolean {
  return traveller.data()?.['accountStatus'] === 'active';
}

function eligibleParticipants(
  hostUid: string,
  host: FirebaseFirestore.DocumentSnapshot,
  traveller: FirebaseFirestore.DocumentSnapshot,
  consent: FirebaseFirestore.DocumentSnapshot,
  lock: FirebaseFirestore.DocumentSnapshot,
): boolean {
  return eligibleTraveller(traveller) && eligibleHost(hostUid, host, consent, lock);
}

function validConversation(
  data: FirebaseFirestore.DocumentData | undefined,
  requestId: string,
  listingId: string,
  hostUid: string,
  travellerUid: string,
): boolean {
  return data?.['requestId'] === requestId
    && data['conversationId'] === requestId
    && data['listingId'] === listingId
    && data['hostUid'] === hostUid
    && data['travellerUid'] === travellerUid
    && Array.isArray(data['participantUids'])
    && data['participantUids'].length === 2
    && data['participantUids'][0] === hostUid
    && data['participantUids'][1] === travellerUid;
}

async function resolveConversationCursor(
  value: unknown,
  uid: string,
  db: FirebaseFirestore.Firestore,
): Promise<{
  seconds: number;
  nanoseconds: number;
  conversationId: string;
} | null> {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !cursorTokenPattern.test(value)) {
    throw new HttpsError('invalid-argument', 'The conversation cursor is invalid.');
  }
  const stateRef = conversationCursorRef(db, uid);
  const snapshot = await stateRef.get();
  const state = snapshot.data();
  const cursors = state?.['cursors'];
  const found = state?.['token'] === value ? state : isRecord(cursors)
    ? cursors[value]
    : undefined;
  const cursor = isRecord(found) ? found : undefined;
  const updatedAt = cursor?.['updatedAt'];
  const conversationId = cursor?.['conversationId'];
  const expiresAt = cursor?.['expiresAt'];
  if (!snapshot.exists || !state
      || state['uid'] !== uid
      || !cursor
      || !(updatedAt instanceof Timestamp)
      || typeof conversationId !== 'string'
      || !idPattern.test(conversationId)
      || !(expiresAt instanceof Timestamp)
      || expiresAt.toMillis() <= Date.now()
      || updatedAt.seconds < minTimestampSeconds
      || updatedAt.seconds > maxTimestampSeconds
      || !Number.isInteger(updatedAt.nanoseconds)
      || updatedAt.nanoseconds < 0
      || updatedAt.nanoseconds > 999_999_999) {
    throw new HttpsError('invalid-argument', 'The conversation cursor is invalid.');
  }
  return {
    seconds: updatedAt.seconds,
    nanoseconds: updatedAt.nanoseconds,
    conversationId,
  };
}

function conversationCursorRef(db: FirebaseFirestore.Firestore, uid: string) {
  const ownerId = createHash('sha256').update(uid).digest('hex');
  return db.doc(`conversationListCursors/${ownerId}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function storeConversationCursor(
  db: FirebaseFirestore.Firestore,
  uid: string,
  updatedAt: Timestamp,
  conversationId: string,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const ref = conversationCursorRef(db, uid);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const state = snapshot.data();
    const existing = isRecord(state?.['cursors'])
      ? state['cursors']
      : typeof state?.['token'] === 'string'
        ? { [state['token']]: state }
        : undefined;
    if (snapshot.exists && (state?.['uid'] !== uid || !isRecord(existing))) {
      throw new HttpsError('failed-precondition', 'Conversation cursor state requires attention.');
    }
    const now = Date.now();
    const active: Record<string, { updatedAt: Timestamp; conversationId: string; expiresAt: Timestamp }> = {};
    for (const [key, value] of Object.entries(existing ?? {})) {
      if (!cursorTokenPattern.test(key) || !isRecord(value) || !(value['expiresAt'] instanceof Timestamp)
          || !(value['updatedAt'] instanceof Timestamp)
          || typeof value['conversationId'] !== 'string' || !idPattern.test(value['conversationId'])) {
        throw new HttpsError('failed-precondition', 'Conversation cursor state requires attention.');
      }
      if (value['expiresAt'].toMillis() > now) {
        active[key] = {
          updatedAt: value['updatedAt'],
          conversationId: value['conversationId'],
          expiresAt: value['expiresAt'],
        };
      }
    }
    if (Object.keys(active).length >= maxActiveConversationCursors) {
      throw new HttpsError('resource-exhausted', 'Too many active conversation cursors. Please try again later.');
    }
    active[token] = {
      updatedAt,
      conversationId,
      expiresAt: Timestamp.fromMillis(now + cursorLifetimeMs),
    };
    tx.set(ref, { uid, cursors: active });
  });
  return token;
}

function newConversation(
  requestId: string,
  listingId: string,
  hostUid: string,
  travellerUid: string,
) {
  return {
    conversationId: requestId,
    requestId,
    listingId,
    hostUid,
    travellerUid,
    participantUids: [hostUid, travellerUid],
    unreadByUid: { [hostUid]: 0, [travellerUid]: 0 },
    lastMessageAt: null,
    lastMessageSenderUid: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function getOrCreateConversation(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['requestId']);
  const requestId = input['requestId'];
  if (typeof requestId !== 'string' || !idPattern.test(requestId)) {
    throw new HttpsError('invalid-argument', 'The request ID is invalid.');
  }

  const requestRef = db.doc(`hostingRequests/${requestId}`);
  const conversationRef = db.doc(`conversations/${requestId}`);
  const [requestSnapshot, conversationSnapshot, host, traveller] = await db.runTransaction(
    async (tx) => {
      const requestDoc = await tx.get(requestRef);
      const participants = assertRequestParticipants(requestDoc.data(), requestId);
      if (uid !== participants.hostUid && uid !== participants.travellerUid) {
        throw new HttpsError('not-found', 'This conversation could not be found.');
      }
      const [conversationDoc, hostDoc, travellerDoc, consentDoc, lockDoc, actorDoc] = await Promise.all([
        tx.get(conversationRef),
        tx.get(db.doc(`users/${participants.hostUid}`)),
        tx.get(db.doc(`users/${participants.travellerUid}`)),
        tx.get(db.doc(`hostPrivate/${participants.hostUid}`)),
        tx.get(db.doc(`hostPrivate/${participants.hostUid}/listingLifecycleState/current`)),
        tx.get(db.doc(`users/${uid}`)),
      ]);
      if (!eligibleParticipants(participants.hostUid, hostDoc, travellerDoc, consentDoc, lockDoc)
          || !eligibleTraveller(actorDoc)) {
        throw new HttpsError('failed-precondition', 'The conversation participants are not currently eligible.');
      }
      if (conversationDoc.exists) {
        if (!validConversation(conversationDoc.data(), requestId, participants.listingId,
          participants.hostUid, participants.travellerUid)) {
          throw new HttpsError('failed-precondition', 'The conversation requires attention.');
        }
      } else {
        if (requestDoc.data()?.['status'] !== 'accepted') {
          throw new HttpsError('failed-precondition', 'Messaging is available only for accepted stays.');
        }
        tx.create(conversationRef, newConversation(
          requestId, participants.listingId, participants.hostUid, participants.travellerUid,
        ));
      }
      return [requestDoc, conversationDoc, hostDoc, travellerDoc] as const;
    },
  );
  const participants = assertRequestParticipants(requestSnapshot.data(), requestId);
  return {
    conversationId: requestId,
    requestId,
    listingId: participants.listingId,
    hostUid: participants.hostUid,
    travellerUid: participants.travellerUid,
    status: requestSnapshot.data()?.['status'],
    otherParticipantName: (() => {
      const profile = uid === participants.hostUid ? traveller.data() : host.data();
      const name = profile?.['displayName'];
      return typeof name === 'string' && name.trim() && isSafePublicText(name) ? name : 'Openstay member';
    })(),
    created: !conversationSnapshot.exists,
  };
}

function normalizeMessage(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'Enter a message of up to 2,000 characters.');
  }
  const normalized = value.normalize('NFKC').replace(/\r\n?/g, '\n').trim();
  if (!normalized || normalized.length > messageMaxLength
      || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)
      || !isSafePublicText(normalized)) {
    throw new HttpsError('invalid-argument', 'Enter a message of up to 2,000 characters without contact details or exact addresses.');
  }
  return normalized;
}

export async function sendMessage(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['requestId', 'text', 'idempotencyKey']);
  const requestId = input['requestId'];
  const idempotencyKey = input['idempotencyKey'];
  const text = normalizeMessage(input['text']);
  if (typeof requestId !== 'string' || !idPattern.test(requestId)
      || typeof idempotencyKey !== 'string' || !idempotencyPattern.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'The message request is invalid.');
  }

  const requestRef = db.doc(`hostingRequests/${requestId}`);
  const conversationRef = db.doc(`conversations/${requestId}`);
  const [messageId, rateLimitId] = [
    createHash('sha256').update(`${requestId}\0${uid}\0${idempotencyKey}`).digest('hex'),
    createHash('sha256').update(`${requestId}\0${uid}`).digest('hex'),
  ];
  const messageRef = conversationRef.collection('messages').doc(messageId);
  const rateRef = db.doc(`conversationRateLimits/${rateLimitId}`);

  await db.runTransaction(async (tx) => {
    const requestDoc = await tx.get(requestRef);
    const participants = assertRequestParticipants(requestDoc.data(), requestId);
    if (uid !== participants.hostUid && uid !== participants.travellerUid) {
      throw new HttpsError('not-found', 'This conversation could not be found.');
    }
    if (requestDoc.data()?.['status'] !== 'accepted') {
      throw new HttpsError('failed-precondition', 'Messages cannot be sent unless the stay is accepted.');
    }
    const recipientUid = uid === participants.hostUid ? participants.travellerUid : participants.hostUid;
    const [conversationDoc, sender, host, traveller, consent, lock, existingMessage, rate] = await Promise.all([
      tx.get(conversationRef),
      tx.get(db.doc(`users/${uid}`)),
      tx.get(db.doc(`users/${participants.hostUid}`)),
      tx.get(db.doc(`users/${participants.travellerUid}`)),
      tx.get(db.doc(`hostPrivate/${participants.hostUid}`)),
      tx.get(db.doc(`hostPrivate/${participants.hostUid}/listingLifecycleState/current`)),
      tx.get(messageRef),
      tx.get(rateRef),
    ]);
    const conversation = conversationDoc.data();
    if (!conversationDoc.exists || !validConversation(conversation, requestId, participants.listingId,
      participants.hostUid, participants.travellerUid)) {
      throw new HttpsError('failed-precondition', 'The conversation is not available.');
    }
    if (!eligibleTraveller(sender)
        || !eligibleParticipants(participants.hostUid, host, traveller, consent, lock)) {
      throw new HttpsError('failed-precondition', 'The conversation participants are not currently eligible.');
    }
    if (existingMessage.exists) {
      const existing = existingMessage.data();
      if (existing?.['senderUid'] !== uid || existing['text'] !== text
          || existing['conversationId'] !== requestId) {
        throw new HttpsError('already-exists', 'This message submission key has already been used.');
      }
      return;
    }
    const now = Timestamp.now();
    const rateData = rate.data();
    const previousWindow = rateData?.['windowStartedAt'];
    const inWindow = previousWindow instanceof Timestamp
      && now.toMillis() - previousWindow.toMillis() < rateWindowMs;
    const count = inWindow && Number.isInteger(rateData?.['count']) ? rateData?.['count'] as number : 0;
    if (count >= maxMessagesPerMinute) {
      throw new HttpsError('resource-exhausted', 'Too many messages. Please try again later.');
    }
    const unreadByUid = conversation?.['unreadByUid'];
    if (!unreadByUid || typeof unreadByUid !== 'object'
        || !Number.isInteger(unreadByUid[recipientUid]) || unreadByUid[recipientUid] < 0) {
      throw new HttpsError('failed-precondition', 'The conversation requires attention.');
    }
    tx.create(messageRef, {
      conversationId: requestId,
      senderUid: uid,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(conversationRef, {
      unreadByUid: { ...unreadByUid, [recipientUid]: unreadByUid[recipientUid] + 1 },
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSenderUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(rateRef, {
      windowStartedAt: inWindow ? previousWindow : now,
      count: count + 1,
    });
  });
  return { messageId, conversationId: requestId };
}

export async function listParticipantConversations(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = caller(request);
  const input = inputObject(request.data, ['cursor']);
  const cursor = await resolveConversationCursor(input['cursor'], uid, db);
  const actor = await db.doc(`users/${uid}`).get();
  if (!eligibleTraveller(actor)) {
    throw new HttpsError('failed-precondition', 'Your account cannot access conversations.');
  }
  let query = db.collection('conversations')
    .where('participantUids', 'array-contains', uid)
    .orderBy('updatedAt', 'desc')
    .orderBy(FieldPath.documentId(), 'desc')
    .limit(pageSize + 1);
  if (cursor) {
    query = query.startAfter(
      new Timestamp(cursor.seconds, cursor.nanoseconds),
      cursor.conversationId,
    );
  }
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, pageSize);
  const relatedUids = [...new Set(docs.map((doc) => {
    const data = doc.data();
    const hostUid = data['hostUid'];
    const travellerUid = data['travellerUid'];
    if (data['requestId'] !== doc.id
        || data['conversationId'] !== doc.id
        || typeof data['listingId'] !== 'string'
        || typeof hostUid !== 'string'
        || typeof travellerUid !== 'string'
        || !validConversation(data, doc.id, data['listingId'], hostUid, travellerUid)
        || (hostUid !== uid && travellerUid !== uid)) {
      throw new HttpsError('failed-precondition', 'The conversation requires attention.');
    }
    return hostUid === uid ? travellerUid : hostUid;
  }))];
  const relatedProfiles = relatedUids.length
    ? await db.getAll(...relatedUids.map((relatedUid) => db.doc(`users/${relatedUid}`)))
    : [];
  const profiles = new Map(
    [actor, ...relatedProfiles].map((profile) => [profile.id, profile]),
  );
  const hostUids = [...new Set(docs.map((doc) => doc.data()['hostUid'] as string))];
  const [consentDocs, lockDocs] = hostUids.length
    ? await Promise.all([
      db.getAll(...hostUids.map((hostUid) => db.doc(`hostPrivate/${hostUid}`))),
      db.getAll(...hostUids.map((hostUid) => db.doc(`hostPrivate/${hostUid}/listingLifecycleState/current`))),
    ])
    : [[], []];
  const consents = new Map(hostUids.map((hostUid, index) => [hostUid, consentDocs[index]]));
  const locks = new Map(hostUids.map((hostUid, index) => [hostUid, lockDocs[index]]));
  const displayNames = new Map(relatedProfiles.map((profile) => {
    const name = profile.data()?.['displayName'];
    return [profile.id, typeof name === 'string' && name.trim() && isSafePublicText(name) ? name : 'Openstay member'];
  }));
  const eligibleDocs = docs.filter((doc) => {
    const data = doc.data();
    const hostUid = data['hostUid'] as string;
    const travellerUid = data['travellerUid'] as string;
    const host = profiles.get(hostUid);
    const traveller = profiles.get(travellerUid);
    const consent = consents.get(hostUid);
    const lock = locks.get(hostUid);
    return host && traveller && consent && lock
      && eligibleParticipants(hostUid, host, traveller, consent, lock);
  });
  const items = eligibleDocs.map((doc) => {
    const data = doc.data();
    const otherUid = data['hostUid'] === uid ? data['travellerUid'] as string : data['hostUid'] as string;
    const unreadByUid = data['unreadByUid'];
    const lastMessageAt = data['lastMessageAt'];
    if (!(data['updatedAt'] instanceof Timestamp)
        || !unreadByUid || typeof unreadByUid !== 'object' || Array.isArray(unreadByUid)
        || !Number.isInteger(unreadByUid[uid]) || unreadByUid[uid] < 0
        || !(lastMessageAt === null || lastMessageAt instanceof Timestamp)) {
      throw new HttpsError('failed-precondition', 'The conversation requires attention.');
    }
    return {
      conversationId: doc.id,
      requestId: data['requestId'],
      listingId: data['listingId'],
      otherParticipantName: displayNames.get(otherUid) ?? 'Openstay member',
      lastMessageAt: lastMessageAt instanceof Timestamp ? lastMessageAt.toDate().toISOString() : null,
      unreadCount: unreadByUid[uid],
    };
  });
  const last = docs[docs.length - 1];
  const lastUpdatedAt = last?.data()['updatedAt'];
  if (snapshot.size > pageSize && last && !(lastUpdatedAt instanceof Timestamp)) {
    throw new HttpsError('failed-precondition', 'The conversation requires attention.');
  }
  const nextCursor = snapshot.size > pageSize && last && lastUpdatedAt instanceof Timestamp
    ? await storeConversationCursor(db, uid, lastUpdatedAt, last.id)
    : null;
  return {
    items,
    nextCursor,
  };
}

export async function markRead(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore) {
  const uid = caller(request);
  const input = inputObject(request.data, ['requestId']);
  const requestId = input['requestId'];
  if (typeof requestId !== 'string' || !idPattern.test(requestId)) {
    throw new HttpsError('invalid-argument', 'The request ID is invalid.');
  }
  const conversationRef = db.doc(`conversations/${requestId}`);
  await db.runTransaction(async (tx) => {
    const [conversation, hostingRequest] = await Promise.all([
      tx.get(conversationRef),
      tx.get(db.doc(`hostingRequests/${requestId}`)),
    ]);
    const data = conversation.data();
    const participants = assertRequestParticipants(hostingRequest.data(), requestId);
    if (uid !== participants.hostUid && uid !== participants.travellerUid) {
      throw new HttpsError('not-found', 'This conversation could not be found.');
    }
    if (!conversation.exists || !data || !validConversation(data, requestId, participants.listingId,
      participants.hostUid, participants.travellerUid)) {
      throw new HttpsError('failed-precondition', 'The conversation requires attention.');
    }
    const [host, traveller, consent, lock] = await Promise.all([
      tx.get(db.doc(`users/${participants.hostUid}`)),
      tx.get(db.doc(`users/${participants.travellerUid}`)),
      tx.get(db.doc(`hostPrivate/${participants.hostUid}`)),
      tx.get(db.doc(`hostPrivate/${participants.hostUid}/listingLifecycleState/current`)),
    ]);
    if (!eligibleParticipants(participants.hostUid, host, traveller, consent, lock)) {
      throw new HttpsError('failed-precondition', 'The conversation participants are not currently eligible.');
    }
    const unreadByUid = data['unreadByUid'];
    if (!unreadByUid || typeof unreadByUid !== 'object'
        || !Number.isInteger(unreadByUid[uid]) || unreadByUid[uid] < 0) {
      throw new HttpsError('failed-precondition', 'The conversation requires attention.');
    }
    if (unreadByUid[uid] > 0) {
      tx.update(conversationRef, {
        unreadByUid: { ...unreadByUid, [uid]: 0 },
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  return { read: true };
}
