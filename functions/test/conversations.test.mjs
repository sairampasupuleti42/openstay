import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HOST_PARTICIPATION_TERMS_DIGEST, HOST_PARTICIPATION_TERMS_VERSION } from '../lib/hosting/host-participation.js';
import { getOrCreateConversation, listParticipantConversations, markRead, sendMessage } from '../lib/hosting/conversations.js';
import { transitionRequest } from '../lib/hosting/hosting-requests.js';
import { removeBlock, setBlock } from '../lib/trust/blocking.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Conversation tests require the demo-openstay Firestore emulator.');
}
const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
after(async () => deleteApp(app));

const call = (uid, data, emailVerified = true) => ({
  auth: uid ? { uid, token: { email_verified: emailVerified } } : undefined,
  data,
});
const id = (value) => createHash('sha256').update(value).digest('hex');
const key = (value) => `message-submission-${value}`.padEnd(24, '0');

async function seed(label, status = 'accepted', sharedTravellerUid) {
  const hostUid = `chat-host-${label}`;
  const travellerUid = sharedTravellerUid ?? `chat-traveller-${label}`;
  const listingId = `chat-listing-${label}`;
  const startDate = '2030-01-10';
  const endDate = '2030-01-15';
  const requestId = createHash('sha256')
    .update(JSON.stringify([travellerUid, listingId, startDate, endDate]))
    .digest('hex');
  await Promise.all([
    db.doc(`users/${hostUid}`).set({ accountStatus: 'active', displayName: 'Host' }),
    db.doc(`users/${travellerUid}`).set({ accountStatus: 'active', displayName: 'Traveller' }),
    db.doc(`hostPrivate/${hostUid}`).set({
      uid: hostUid,
      consentState: 'accepted',
      termsVersion: HOST_PARTICIPATION_TERMS_VERSION,
      termsDigest: HOST_PARTICIPATION_TERMS_DIGEST,
      eventId: 'a'.repeat(64),
    }),
    db.doc(`hostPrivate/${hostUid}`).set({
      uid: hostUid,
      consentState: 'accepted',
      termsVersion: HOST_PARTICIPATION_TERMS_VERSION,
      termsDigest: HOST_PARTICIPATION_TERMS_DIGEST,
      eventId: 'a'.repeat(64),
    }),
    db.doc(`hostingRequests/${requestId}`).set({
      requestId, listingId, hostUid, travellerUid, startDate, endDate, guestCount: 1,
      introductoryMessage: 'Hello', status, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    }),
  ]);
  if (status === 'accepted') {
    await db.doc(`listingSchedules/${listingId}`).set({ version: 1 });
    await db.doc(`listingSchedules/${listingId}/confirmed/${requestId}`).set({ startDate, endDate });
  }
  return { hostUid, travellerUid, listingId, requestId, startDate, endDate };
}

test('conversation creation is deterministic and safe under concurrent opens', async () => {
  const { hostUid, travellerUid, requestId } = await seed('open-race');
  await assert.rejects(getOrCreateConversation(call('outsider', { requestId }), db), { code: 'not-found' });
  const opens = await Promise.all(Array.from({ length: 8 }, (_, index) =>
    getOrCreateConversation(call(index % 2 ? hostUid : travellerUid, { requestId }), db)));
  assert.ok(opens.every((conversation) => conversation.conversationId === requestId));
  assert.ok(opens.some((conversation) => conversation.created));
  assert.equal((await db.collection('conversations').where('requestId', '==', requestId).get()).size, 1);
  const conversation = (await db.doc(`conversations/${requestId}`).get()).data();
  assert.deepEqual(conversation.participantUids, [hostUid, travellerUid]);
  assert.equal(conversation.otherParticipantName, undefined);
  assert.equal(conversation.unreadByUid[hostUid], 0);
  assert.equal(conversation.unreadByUid[travellerUid], 0);
});

test('messaging requires an accepted stay and validates identity, text and idempotent retries', async () => {
  const pending = await seed('pending', 'pending');
  await assert.rejects(getOrCreateConversation(call(pending.travellerUid, { requestId: pending.requestId }), db), {
    code: 'failed-precondition',
  });
  await assert.rejects(sendMessage(call(pending.travellerUid, {
    requestId: pending.requestId, text: 'Hello', idempotencyKey: key('pending'),
  }), db), { code: 'failed-precondition' });

  const { hostUid, travellerUid, requestId } = await seed('message');
  await getOrCreateConversation(call(hostUid, { requestId }), db);
  await assert.rejects(sendMessage(call(null, {
    requestId, text: 'Hello', idempotencyKey: key('anonymous'),
  }), db), { code: 'unauthenticated' });
  await assert.rejects(sendMessage(call('chat-outsider', {
    requestId, text: 'Hello', idempotencyKey: key('outsider'),
  }), db), { code: 'not-found' });
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'Hello', senderUid: 'forged', idempotencyKey: key('forged'),
  }), db), { code: 'invalid-argument' });
  for (const text of [' ', '\n\t', 'x'.repeat(2001), 'Reach me at someone@example.com']) {
    await assert.rejects(sendMessage(call(hostUid, {
      requestId, text, idempotencyKey: key(`invalid-${text.length}`),
    }), db), { code: 'invalid-argument' });
  }
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'Hello', idempotencyKey: 'short',
  }), db), { code: 'invalid-argument' });

  const request = call(hostUid, {
    requestId, text: '  Hello\u00a0there  ', idempotencyKey: key('repeat'),
  });
  const [first, second] = await Promise.all([
    sendMessage(request, db),
    sendMessage(request, db),
  ]);
  assert.deepEqual(first, second);
  const messages = await db.collection(`conversations/${requestId}/messages`).get();
  assert.equal(messages.size, 1);
  assert.deepEqual(Object.keys(messages.docs[0].data()).sort(), [
    'conversationId', 'createdAt', 'senderUid', 'text',
  ]);
  assert.equal(messages.docs[0].data().senderUid, hostUid);
  assert.equal(messages.docs[0].data().text, 'Hello there');
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'Different content', idempotencyKey: key('repeat'),
  }), db), { code: 'already-exists' });
  assert.equal((await db.doc(`conversations/${requestId}`).get()).data().unreadByUid[travellerUid], 1);
});

test('blocks in either direction prevent new conversations and messages but preserve history reads', async () => {
  const { hostUid, travellerUid, requestId } = await seed('blocked-messaging');
  await setBlock(call(hostUid, { targetUid: travellerUid }), db);
  await assert.rejects(getOrCreateConversation(call(hostUid, { requestId }), db), {
    code: 'failed-precondition',
  });
  assert.equal((await db.doc(`conversations/${requestId}`).get()).exists, false);

  await removeBlock(call(hostUid, { targetUid: travellerUid }), db);
  await getOrCreateConversation(call(hostUid, { requestId }), db);
  await setBlock(call(hostUid, { targetUid: travellerUid }), db);
  const history = await getOrCreateConversation(call(travellerUid, { requestId }), db);
  assert.equal(history.created, false);
  assert.equal(history.viewerHasBlockedOther, false);
  await assert.rejects(sendMessage(call(travellerUid, {
    requestId, text: 'After the block', idempotencyKey: key('blocked-host-first'),
  }), db), { code: 'failed-precondition' });
  assert.equal((await listParticipantConversations(call(travellerUid, { cursor: null }), db)).items.length, 1);
  await markRead(call(travellerUid, { requestId }), db);

  await removeBlock(call(hostUid, { targetUid: travellerUid }), db);
  await setBlock(call(travellerUid, { targetUid: hostUid }), db);
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'After the reverse block', idempotencyKey: key('blocked-traveller-first'),
  }), db), { code: 'failed-precondition' });
  assert.equal((await db.collection(`conversations/${requestId}/messages`).get()).size, 0);
});

test('a concurrent block conflicts with message sending and wins on retry', async () => {
  const { hostUid, travellerUid, requestId } = await seed('block-message-race');
  await getOrCreateConversation(call(hostUid, { requestId }), db);
  let releaseReads;
  let announceReads;
  const pairRead = new Promise((resolve) => { announceReads = resolve; });
  const gate = new Promise((resolve) => { releaseReads = resolve; });
  let blockReads = 0;
  const racingDb = {
    doc: db.doc.bind(db),
    collection: db.collection.bind(db),
    runTransaction: (callback) => db.runTransaction((transaction) => callback(new Proxy(transaction, {
      get(target, property) {
        if (property === 'get') {
          return async (reference) => {
            if (reference.path.includes('/blocked/')) {
              blockReads += 1;
              if (blockReads === 2) announceReads();
              if (blockReads <= 2) await gate;
            }
            return target.get(reference);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }))),
  };
  const sending = sendMessage(call(travellerUid, {
    requestId, text: 'Racing message', idempotencyKey: key('block-race'),
  }), racingDb);
  await pairRead;
  await setBlock(call(hostUid, { targetUid: travellerUid }), db);
  releaseReads();
  await assert.rejects(sending, { code: 'failed-precondition' });
  assert.equal((await db.collection(`conversations/${requestId}/messages`).get()).size, 0);
});

test('declined, cancelled, suspended and withdrawn participants cannot send messages', async () => {
  for (const [label, status] of [['declined', 'declined'], ['cancelled', 'cancelled']]) {
    const request = await seed(label, status);
    await assert.rejects(sendMessage(call(request.hostUid, {
      requestId: request.requestId, text: 'Hello', idempotencyKey: key(label),
    }), db), { code: 'failed-precondition' });
  }

  const { hostUid, travellerUid, requestId, listingId, startDate, endDate } = await seed('suspended');
  await getOrCreateConversation(call(travellerUid, { requestId }), db);
  await db.doc(`users/${travellerUid}`).update({ accountStatus: 'suspended' });
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'Hello', idempotencyKey: key('suspended'),
  }), db), { code: 'failed-precondition' });
  await db.doc(`users/${travellerUid}`).update({ accountStatus: 'active' });
  await db.doc(`hostPrivate/${hostUid}`).update({ consentState: 'withdrawn' });
  await assert.rejects(sendMessage(call(travellerUid, {
    requestId, text: 'Hello', idempotencyKey: key('withdrawn'),
  }), db), { code: 'failed-precondition' });
  await db.doc(`hostPrivate/${hostUid}`).update({ consentState: 'accepted' });

  const outcome = await Promise.allSettled([
    sendMessage(call(travellerUid, {
      requestId, text: 'Sent while cancellation races', idempotencyKey: key('race'),
    }), db),
    transitionRequest(call(hostUid, { requestId, action: 'cancel' }), db),
  ]);
  assert.equal(outcome[1].status, 'fulfilled');
  assert.equal((await db.doc(`hostingRequests/${requestId}`).get()).data().status, 'cancelled');
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'After cancellation', idempotencyKey: key('after-cancel'),
  }), db), { code: 'failed-precondition' });
  if (outcome[0].status === 'fulfilled') {
    const message = (await db.doc(`conversations/${requestId}/messages/${outcome[0].value.messageId}`).get()).data();
    assert.equal(message.text, 'Sent while cancellation races');
  }
  assert.equal((await db.doc(`listingSchedules/${listingId}/confirmed/${requestId}`).get()).exists, false);
  assert.equal(startDate, '2030-01-10');
  assert.equal(endDate, '2030-01-15');
});

test('accepts the exact message length limit and enforces the per-conversation rate limit', async () => {
  const { hostUid, requestId } = await seed('message-rate');
  await getOrCreateConversation(call(hostUid, { requestId }), db);
  const longMessage = 'x'.repeat(2000);
  const first = await sendMessage(call(hostUid, {
    requestId, text: longMessage, idempotencyKey: key('rate-0'),
  }), db);
  assert.equal((await db.doc(`conversations/${requestId}/messages/${first.messageId}`).get()).data().text.length, 2000);
  for (let index = 1; index < 20; index++) {
    await sendMessage(call(hostUid, {
      requestId, text: `Message ${index}`, idempotencyKey: key(`rate-${index}`),
    }), db);
  }
  await assert.rejects(sendMessage(call(hostUid, {
    requestId, text: 'One too many', idempotencyKey: key('rate-over'),
  }), db), { code: 'resource-exhausted' });
});

test('message read counters and participant conversation pagination stay bounded', async () => {
  const first = await seed('pages-0');
  for (let index = 0; index < 21; index++) {
    const request = index === 0 ? first : await seed(`pages-${index}`, 'accepted', first.travellerUid);
    await getOrCreateConversation(call(request.travellerUid, { requestId: request.requestId }), db);
  }
  const [firstPage, otherTabPage] = await Promise.all([
    listParticipantConversations(call(first.travellerUid, { cursor: null }), db),
    listParticipantConversations(call(first.travellerUid, { cursor: null }), db),
  ]);
  assert.equal(firstPage.items.length, 20);
  assert.ok(firstPage.nextCursor);
  assert.ok(otherTabPage.nextCursor);
  assert.notEqual(firstPage.nextCursor, otherTabPage.nextCursor);
  assert.match(firstPage.nextCursor, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(firstPage.nextCursor.includes(first.requestId), false);
  await db.doc('users/chat-cursor-outsider').set({ accountStatus: 'active' });
  await assert.rejects(listParticipantConversations(call(first.travellerUid, {
    cursor: 'malformed',
  }), db), { code: 'invalid-argument' });
  await assert.rejects(listParticipantConversations(call('chat-cursor-outsider', {
    cursor: firstPage.nextCursor,
  }), db), { code: 'invalid-argument' });
  const secondPage = await listParticipantConversations(call(first.travellerUid, {
    cursor: firstPage.nextCursor,
  }), db);
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.nextCursor, null);
  const otherTabSecondPage = await listParticipantConversations(call(first.travellerUid, {
    cursor: otherTabPage.nextCursor,
  }), db);
  assert.deepEqual(otherTabSecondPage, secondPage);
  const cursorRef = db.doc(`conversationListCursors/${id(first.travellerUid)}`);
  await cursorRef.update(`cursors.${firstPage.nextCursor}.expiresAt`, Timestamp.fromMillis(0));
  await assert.rejects(listParticipantConversations(call(first.travellerUid, {
    cursor: firstPage.nextCursor,
  }), db), { code: 'invalid-argument' });
  assert.deepEqual(await listParticipantConversations(call(first.travellerUid, {
    cursor: otherTabPage.nextCursor,
  }), db), secondPage);
  const state = (await cursorRef.get()).data();
  const boundary = state.cursors[otherTabPage.nextCursor];
  const tokens = Array.from({ length: 100 }, (_, index) =>
    createHash('sha256').update(`cursor-limit-${index}`).digest('base64url'));
  await cursorRef.set({
    uid: first.travellerUid,
    cursors: Object.fromEntries(tokens.map((token) => [token, boundary])),
  });
  await assert.rejects(listParticipantConversations(call(first.travellerUid, {
    cursor: null,
  }), db), { code: 'resource-exhausted' });
  await cursorRef.update(`cursors.${tokens[0]}.expiresAt`, Timestamp.fromMillis(0));
  const refreshedPage = await listParticipantConversations(call(first.travellerUid, { cursor: null }), db);
  assert.ok(refreshedPage.nextCursor);
  assert.equal(Object.keys((await cursorRef.get()).data().cursors).length, 100);
  await cursorRef.set({
    uid: first.travellerUid,
    token: otherTabPage.nextCursor,
    ...boundary,
  });
  assert.deepEqual(await listParticipantConversations(call(first.travellerUid, {
    cursor: otherTabPage.nextCursor,
  }), db), secondPage);
  await listParticipantConversations(call(first.travellerUid, { cursor: null }), db);
  assert.deepEqual(await listParticipantConversations(call(first.travellerUid, {
    cursor: otherTabPage.nextCursor,
  }), db), secondPage);
  assert.ok(firstPage.items.every((item) => item.otherParticipantName === 'Host'));

  const requestId = first.requestId;
  await sendMessage(call(first.hostUid, {
    requestId, text: 'Unread message', idempotencyKey: key('mark-read'),
  }), db);
  await assert.rejects(markRead(call('chat-outsider-pages-0', { requestId }), db), { code: 'not-found' });
  await Promise.all([
    markRead(call(first.travellerUid, { requestId }), db),
    markRead(call(first.travellerUid, { requestId }), db),
  ]);
  assert.equal((await db.doc(`conversations/${requestId}`).get()).data().unreadByUid[first.travellerUid], 0);
});

test('conversation summaries and read state require eligible participants', async () => {
  const { hostUid, travellerUid, requestId } = await seed('conversation-access');
  await getOrCreateConversation(call(hostUid, { requestId }), db);
  await sendMessage(call(hostUid, {
    requestId, text: 'Unread message', idempotencyKey: key('conversation-access'),
  }), db);

  await db.doc(`users/${travellerUid}`).update({ accountStatus: 'suspended' });
  const suspendedParticipantPage = await listParticipantConversations(call(hostUid, { cursor: null }), db);
  assert.deepEqual(suspendedParticipantPage.items, []);
  await assert.rejects(markRead(call(hostUid, { requestId }), db), { code: 'failed-precondition' });

  await db.doc(`users/${travellerUid}`).update({ accountStatus: 'active' });
  await db.doc(`hostPrivate/${hostUid}`).update({ consentState: 'withdrawn' });
  const withdrawnHostPage = await listParticipantConversations(call(hostUid, { cursor: null }), db);
  const otherParticipantPage = await listParticipantConversations(call(travellerUid, { cursor: null }), db);
  assert.deepEqual(withdrawnHostPage.items, []);
  assert.deepEqual(otherParticipantPage.items, []);
  await assert.rejects(markRead(call(hostUid, { requestId }), db), { code: 'failed-precondition' });
  await assert.rejects(markRead(call(travellerUid, { requestId }), db), { code: 'failed-precondition' });
});
