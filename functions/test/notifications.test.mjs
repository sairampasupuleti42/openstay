import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  readAllNotifications,
  processMessageNotification,
  processRequestCreatedNotification,
  processRequestTransitionNotification,
  readOneNotification,
} from '../lib/hosting/notifications.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Notification tests require the demo-openstay Firestore emulator.');
}
const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
after(async () => deleteApp(app));

const call = (uid, data, emailVerified = true) => ({
  auth: uid ? { uid, token: { email_verified: emailVerified } } : undefined,
  data,
});
const hash = (value) => createHash('sha256').update(value).digest('hex');
const notificationId = (path) => hash(path);
const requestId = (value) => hash(`notification-request-${value}`);

async function seedUsers(label) {
  const hostUid = `notify-host-${label}`;
  const travellerUid = `notify-traveller-${label}`;
  await Promise.all([
    db.doc(`users/${hostUid}`).set({ accountStatus: 'active' }),
    db.doc(`users/${travellerUid}`).set({ accountStatus: 'active' }),
  ]);
  return { hostUid, travellerUid };
}

test('request creation and all supported request transitions notify only the opposite participant', async () => {
  const { hostUid, travellerUid } = await seedUsers('events');
  const reqId = requestId('events');
  const request = { requestId: reqId, hostUid, travellerUid, status: 'pending' };
  await Promise.all([
    processRequestCreatedNotification({ requestId: reqId, data: request }, db),
    processRequestCreatedNotification({ requestId: reqId, data: request }, db),
  ]);
  let page = await db.collection('notifications').where('requestId', '==', reqId).get();
  assert.equal(page.size, 1);
  assert.equal(page.docs[0].data().recipientUid, hostUid);
  assert.equal(page.docs[0].data().type, 'host_request_received');

  const cases = [
    { eventId: 'accept-event', action: 'accept', fromStatus: 'pending', toStatus: 'accepted', actorUid: hostUid, recipientUid: travellerUid, type: 'traveller_request_accepted' },
    { eventId: 'decline-event', action: 'decline', fromStatus: 'pending', toStatus: 'declined', actorUid: hostUid, recipientUid: travellerUid, type: 'traveller_request_declined' },
    { eventId: 'pending-cancel', action: 'cancel', fromStatus: 'pending', toStatus: 'cancelled', actorUid: travellerUid, recipientUid: hostUid, type: 'host_request_cancelled' },
    { eventId: 'host-cancel', action: 'cancel', fromStatus: 'accepted', toStatus: 'cancelled', actorUid: hostUid, recipientUid: travellerUid, type: 'traveller_stay_cancelled' },
    { eventId: 'traveller-cancel', action: 'cancel', fromStatus: 'accepted', toStatus: 'cancelled', actorUid: travellerUid, recipientUid: hostUid, type: 'host_stay_cancelled' },
  ];
  for (const item of cases) {
    const event = { ...item };
    await processRequestTransitionNotification({
      requestId: reqId, eventId: item.eventId, event, request,
    }, db);
    await processRequestTransitionNotification({
      requestId: reqId, eventId: item.eventId, event, request,
    }, db);
    const saved = (await db.doc(`notifications/${notificationId(
      `hostingRequests/${reqId}/events/${item.eventId}`,
    )}`).get()).data();
    assert.equal(saved.recipientUid, item.recipientUid);
    assert.equal(saved.type, item.type);
    assert.equal(saved.requestId, reqId);
    assert.equal('messageText' in saved, false);
  }
  await processRequestTransitionNotification({
    requestId: reqId,
    eventId: 'forged-event',
    event: { action: 'accept', fromStatus: 'pending', toStatus: 'accepted', actorUid: 'outsider' },
    request,
  }, db);
  assert.equal((await db.collection('notifications').where('requestId', '==', reqId).get()).size, 6);
  assert.equal((await db.doc(`notificationCounts/${hostUid}`).get()).data().unreadCount, 3);
  assert.equal((await db.doc(`notificationCounts/${travellerUid}`).get()).data().unreadCount, 3);
});

test('message notifications are deterministic and never contain message contents', async () => {
  const { hostUid, travellerUid } = await seedUsers('message');
  const reqId = requestId('message');
  const conversation = db.doc(`conversations/${reqId}`);
  await conversation.set({
    conversationId: reqId,
    requestId: reqId,
    listingId: 'notify-listing-message',
    hostUid,
    travellerUid,
    participantUids: [hostUid, travellerUid],
    unreadByUid: { [hostUid]: 0, [travellerUid]: 1 },
    lastMessageAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const event = {
    conversationId: reqId,
    messageId: 'message-event-1',
    message: { conversationId: reqId, senderUid: hostUid, text: 'private message text' },
  };
  await Promise.all([
    processMessageNotification(event, db),
    processMessageNotification(event, db),
  ]);
  const saved = (await db.doc(`notifications/${notificationId(
    `conversations/${reqId}/messages/message-event-1`,
  )}`).get()).data();
  assert.equal(saved.recipientUid, travellerUid);
  assert.equal(saved.type, 'new_message');
  assert.equal(saved.conversationId, reqId);
  assert.equal(JSON.stringify(saved).includes('private message text'), false);
  assert.equal((await db.collection('notifications').where('requestId', '==', reqId).get()).size, 1);
  assert.equal((await db.doc(`notificationCounts/${travellerUid}`).get()).data().unreadCount, 1);
});

test('completion and review notifications are generic, recipient-scoped and idempotent', async () => {
  const { hostUid, travellerUid } = await seedUsers('completion');
  const reqId = requestId('completion');
  const request = { requestId: reqId, hostUid, travellerUid, status: 'accepted' };
  const cases = [
    {
      eventId: 'completion-started',
      event: {
        action: 'completion_initiated',
        actorUid: hostUid,
        fromCompletionStatus: 'not_started',
        toCompletionStatus: 'pending',
      },
      recipientUid: travellerUid,
      type: 'stay_completion_requested',
    },
    {
      eventId: 'completion-finished',
      event: {
        action: 'completion_confirmed',
        actorUid: travellerUid,
        toCompletionStatus: 'completed',
      },
      recipientUid: hostUid,
      type: 'stay_completed',
    },
    {
      eventId: 'completion-disputed',
      event: {
        action: 'completion_disputed',
        actorUid: travellerUid,
        toCompletionStatus: 'pending',
      },
      recipientUid: hostUid,
      type: 'stay_completion_disputed',
    },
    {
      eventId: 'completion-expired',
      event: {
        action: 'completion_window_expired',
        actorUid: hostUid,
        completionReason: 'response_window_expired',
      },
      recipientUid: hostUid,
      type: 'stay_completion_window_expired',
    },
    {
      eventId: 'review-submitted',
      event: {
        action: 'review_submitted',
        actorUid: hostUid,
        subjectUid: travellerUid,
        reviewId: 'review-id',
        fromStatus: 'completed',
        toStatus: 'completed',
      },
      recipientUid: travellerUid,
      type: 'stay_review_received',
    },
  ];
  for (const item of cases) {
    await processRequestTransitionNotification({
      requestId: reqId,
      eventId: item.eventId,
      event: item.event,
      request,
    }, db);
    await processRequestTransitionNotification({
      requestId: reqId,
      eventId: item.eventId,
      event: item.event,
      request,
    }, db);
    const saved = (await db.doc(`notifications/${notificationId(
      `hostingRequests/${reqId}/events/${item.eventId}`,
    )}`).get()).data();
    assert.equal(saved.recipientUid, item.recipientUid);
    assert.equal(saved.type, item.type);
    assert.equal(saved.requestId, reqId);
    assert.equal('reviewId' in saved, false);
    assert.equal('review text' in saved, false);
  }
});

test('notification read operations are owner-only, idempotent and count-consistent', async () => {
  const { hostUid, travellerUid } = await seedUsers('read');
  const reqId = requestId('read');
  const paths = ['read-a', 'read-b', 'read-c'].map((source) => `hostingRequests/${reqId}/events/${source}`);
  for (const [index, path] of paths.entries()) {
    const id = notificationId(path);
    await db.doc(`notifications/${id}`).set({
      notificationId: id,
      recipientUid: travellerUid,
      type: 'traveller_request_accepted',
      requestId: reqId,
      title: 'Stay confirmed',
      message: 'The host accepted your hosting request.',
      createdAt: Timestamp.now(),
      read: index === 2,
    });
  }
  await db.doc(`notificationCounts/${travellerUid}`).set({ recipientUid: travellerUid, unreadCount: 2 });
  await assert.rejects(readOneNotification({ data: {
    notificationId: notificationId(paths[0]),
  } }, db), { code: 'unauthenticated' });
  await assert.rejects(readOneNotification(call(hostUid, {
    notificationId: notificationId(paths[0]),
  }), db), { code: 'not-found' });
  await assert.rejects(readOneNotification(call(travellerUid, {
    notificationId: notificationId(paths[0]), recipientUid: hostUid,
  }), db), { code: 'invalid-argument' });
  await readOneNotification(call(travellerUid, { notificationId: notificationId(paths[0]) }), db);
  await readOneNotification(call(travellerUid, { notificationId: notificationId(paths[0]) }), db);
  assert.equal((await db.doc(`notificationCounts/${travellerUid}`).get()).data().unreadCount, 1);

  const results = await Promise.all([
    readAllNotifications(call(travellerUid, {}), db),
    readAllNotifications(call(travellerUid, {}), db),
  ]);
  assert.ok(results.every((result) => Number.isInteger(result.markedRead)));
  assert.equal((await db.doc(`notificationCounts/${travellerUid}`).get()).data().unreadCount, 0);
  const unread = await db.collection('notifications')
    .where('recipientUid', '==', travellerUid)
    .where('read', '==', false)
    .get();
  assert.equal(unread.size, 0);
});
