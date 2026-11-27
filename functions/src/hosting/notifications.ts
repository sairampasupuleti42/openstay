import { createHash } from 'node:crypto';
import { FieldPath, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';

const region = 'us-central1';
const options = { region, enforceAppCheck: process.env['FUNCTIONS_EMULATOR'] !== 'true' };
const idPattern = /^[a-f0-9]{64}$/;
const pageSize = 400;

type NotificationType =
  | 'host_request_received'
  | 'host_request_cancelled'
  | 'host_stay_cancelled'
  | 'traveller_request_accepted'
  | 'traveller_request_declined'
  | 'traveller_stay_cancelled'
  | 'new_message';

interface NotificationContent {
  type: NotificationType;
  title: string;
  message: string;
}

const content: Record<NotificationType, NotificationContent> = {
  host_request_received: {
    type: 'host_request_received',
    title: 'New hosting request',
    message: 'A traveller sent you a hosting request.',
  },
  host_request_cancelled: {
    type: 'host_request_cancelled',
    title: 'Request cancelled',
    message: 'A traveller cancelled a hosting request.',
  },
  host_stay_cancelled: {
    type: 'host_stay_cancelled',
    title: 'Stay cancelled',
    message: 'The other participant cancelled this stay.',
  },
  traveller_request_accepted: {
    type: 'traveller_request_accepted',
    title: 'Stay confirmed',
    message: 'The host accepted your hosting request.',
  },
  traveller_request_declined: {
    type: 'traveller_request_declined',
    title: 'Request declined',
    message: 'The host declined your hosting request.',
  },
  traveller_stay_cancelled: {
    type: 'traveller_stay_cancelled',
    title: 'Stay cancelled',
    message: 'The other participant cancelled this stay.',
  },
  new_message: {
    type: 'new_message',
    title: 'New message',
    message: 'You received a new message about your stay.',
  },
};

export const notifyHostingRequestCreated = onDocumentCreated(
  { document: 'hostingRequests/{requestId}', region, retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    await processRequestCreatedNotification({
      requestId: event.params.requestId,
      data: snapshot.data(),
    }, getFirestore());
  },
);

export const notifyHostingRequestTransition = onDocumentCreated(
  { document: 'hostingRequests/{requestId}/events/{eventId}', region, retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const request = await getFirestore().doc(`hostingRequests/${event.params.requestId}`).get();
    await processRequestTransitionNotification({
      requestId: event.params.requestId,
      eventId: event.params.eventId,
      event: snapshot.data(),
      request: request.data(),
    }, getFirestore());
  },
);

export const notifyNewConversationMessage = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region, retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    await processMessageNotification({
      conversationId: event.params.conversationId,
      messageId: event.params.messageId,
      message: snapshot.data(),
    }, getFirestore());
  },
);

export const markNotificationRead = onCall(options, (request) => readOneNotification(request, getFirestore()));
export const markAllNotificationsRead = onCall(options, (request) => readAllNotifications(request, getFirestore()));

function caller(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage notifications.');
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before managing notifications.');
  }
  return uid;
}

function object(data: unknown, fields: string[]): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some((key) => !fields.includes(key))) {
    throw new HttpsError('invalid-argument', 'The notification request is invalid.');
  }
  return data as Record<string, unknown>;
}

function validUid(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');
}

function notificationId(sourcePath: string): string {
  return createHash('sha256').update(sourcePath).digest('hex');
}

async function createNotification(
  db: FirebaseFirestore.Firestore,
  sourcePath: string,
  recipientUid: string,
  requestId: string,
  notificationContent: NotificationContent,
  conversationId?: string,
): Promise<void> {
  const id = notificationId(sourcePath);
  const notificationRef = db.doc(`notifications/${id}`);
  const countRef = db.doc(`notificationCounts/${recipientUid}`);
  await db.runTransaction(async (tx) => {
    const [existing, count] = await Promise.all([tx.get(notificationRef), tx.get(countRef)]);
    if (existing.exists) return;
    const currentCount = count.data()?.['unreadCount'] ?? 0;
    if (!Number.isInteger(currentCount) || currentCount < 0) {
      throw new Error('The notification unread count requires attention.');
    }
    tx.create(notificationRef, {
      notificationId: id,
      recipientUid,
      type: notificationContent.type,
      requestId,
      ...(conversationId ? { conversationId } : {}),
      title: notificationContent.title,
      message: notificationContent.message,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
    tx.set(countRef, {
      recipientUid,
      unreadCount: currentCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function processRequestCreatedNotification(
  event: { requestId: string; data: FirebaseFirestore.DocumentData | undefined },
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const request = event.data;
  if (!idPattern.test(event.requestId) || !request
      || request['requestId'] !== event.requestId
      || request['status'] !== 'pending'
      || !validUid(request['hostUid'])
      || !validUid(request['travellerUid'])
      || request['hostUid'] === request['travellerUid']) return;
  await createNotification(
    db,
    `hostingRequests/${event.requestId}`,
    request['hostUid'],
    event.requestId,
    content['host_request_received'],
  );
}

export async function processRequestTransitionNotification(
  event: {
    requestId: string;
    eventId: string;
    event: FirebaseFirestore.DocumentData | undefined;
    request: FirebaseFirestore.DocumentData | undefined;
  },
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const transition = event.event;
  const request = event.request;
  if (!idPattern.test(event.requestId) || !event.eventId || !transition || !request
      || !validUid(request['hostUid']) || !validUid(request['travellerUid'])
      || request['hostUid'] === request['travellerUid']
      || !validUid(transition['actorUid'])) return;

  let recipientUid: string;
  let notificationContent: NotificationContent;
  if (transition['action'] === 'accept' && transition['fromStatus'] === 'pending'
      && transition['toStatus'] === 'accepted' && transition['actorUid'] === request['hostUid']) {
    recipientUid = request['travellerUid'];
    notificationContent = content['traveller_request_accepted'];
  } else if (transition['action'] === 'decline' && transition['fromStatus'] === 'pending'
      && transition['toStatus'] === 'declined' && transition['actorUid'] === request['hostUid']) {
    recipientUid = request['travellerUid'];
    notificationContent = content['traveller_request_declined'];
  } else if (transition['action'] === 'cancel' && transition['toStatus'] === 'cancelled'
      && transition['fromStatus'] === 'pending'
      && transition['actorUid'] === request['travellerUid']) {
    recipientUid = request['hostUid'];
    notificationContent = content['host_request_cancelled'];
  } else if (transition['action'] === 'cancel' && transition['toStatus'] === 'cancelled'
      && transition['fromStatus'] === 'accepted'
      && (transition['actorUid'] === request['hostUid'] || transition['actorUid'] === request['travellerUid'])) {
    const hostCancelled = transition['actorUid'] === request['hostUid'];
    recipientUid = hostCancelled ? request['travellerUid'] : request['hostUid'];
    notificationContent = hostCancelled
      ? content['traveller_stay_cancelled']
      : content['host_stay_cancelled'];
  } else {
    return;
  }
  await createNotification(
    db,
    `hostingRequests/${event.requestId}/events/${event.eventId}`,
    recipientUid,
    event.requestId,
    notificationContent,
  );
}

export async function processMessageNotification(
  event: {
    conversationId: string;
    messageId: string;
    message: FirebaseFirestore.DocumentData | undefined;
  },
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const message = event.message;
  if (!idPattern.test(event.conversationId) || !event.messageId || !message
      || message['conversationId'] !== event.conversationId
      || !validUid(message['senderUid'])) return;
  const conversation = (await db.doc(`conversations/${event.conversationId}`).get()).data();
  if (!conversation || conversation['conversationId'] !== event.conversationId
      || !validUid(conversation['hostUid']) || !validUid(conversation['travellerUid'])
      || conversation['hostUid'] === conversation['travellerUid']
      || (message['senderUid'] !== conversation['hostUid']
        && message['senderUid'] !== conversation['travellerUid'])) return;
  const recipientUid = message['senderUid'] === conversation['hostUid']
    ? conversation['travellerUid'] as string
    : conversation['hostUid'] as string;
  await createNotification(
    db,
    `conversations/${event.conversationId}/messages/${event.messageId}`,
    recipientUid,
    conversation['requestId'] as string,
    content['new_message'],
    event.conversationId,
  );
}

async function activeCaller(request: CallableRequest<unknown>, db: FirebaseFirestore.Firestore): Promise<string> {
  const uid = caller(request);
  if ((await db.doc(`users/${uid}`).get()).data()?.['accountStatus'] !== 'active') {
    throw new HttpsError('failed-precondition', 'Your account cannot access notifications.');
  }
  return uid;
}

export async function readOneNotification(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = await activeCaller(request, db);
  const input = object(request.data, ['notificationId']);
  const id = input['notificationId'];
  if (typeof id !== 'string' || !idPattern.test(id)) {
    throw new HttpsError('invalid-argument', 'The notification ID is invalid.');
  }
  const notificationRef = db.doc(`notifications/${id}`);
  const countRef = db.doc(`notificationCounts/${uid}`);
  await db.runTransaction(async (tx) => {
    const [notification, count] = await Promise.all([tx.get(notificationRef), tx.get(countRef)]);
    const data = notification.data();
    if (!notification.exists || data?.['recipientUid'] !== uid) {
      throw new HttpsError('not-found', 'This notification could not be found.');
    }
    if (data['read'] === true) return;
    const unreadCount = count.data()?.['unreadCount'];
    if (!Number.isInteger(unreadCount) || (unreadCount as number) < 1) {
      throw new HttpsError('internal', 'The notification unread count requires attention.');
    }
    tx.update(notificationRef, { read: true, readAt: FieldValue.serverTimestamp() });
    tx.update(countRef, { unreadCount: (unreadCount as number) - 1, updatedAt: FieldValue.serverTimestamp() });
  });
  return { read: true };
}

export async function readAllNotifications(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
) {
  const uid = await activeCaller(request, db);
  object(request.data, []);
  const countRef = db.doc(`notificationCounts/${uid}`);
  let markedRead = 0;
  while (true) {
    const snapshot = await db.collection('notifications')
      .where('recipientUid', '==', uid)
      .where('read', '==', false)
      .orderBy(FieldPath.documentId())
      .limit(pageSize)
      .get();
    if (snapshot.empty) break;
    markedRead += await db.runTransaction(async (tx) => {
      const [count, ...notifications] = await Promise.all([
        tx.get(countRef),
        ...snapshot.docs.map((doc) => tx.get(doc.ref)),
      ]);
      const unread = notifications.filter((notification) =>
        notification.exists
        && notification.data()?.['recipientUid'] === uid
        && notification.data()?.['read'] === false);
      if (unread.length === 0) return 0;
      const currentCount = count.data()?.['unreadCount'];
      if (!Number.isInteger(currentCount) || (currentCount as number) < unread.length) {
        throw new HttpsError('internal', 'The notification unread count requires attention.');
      }
      const readAt = FieldValue.serverTimestamp();
      for (const notification of unread) {
        tx.update(notification.ref, { read: true, readAt });
      }
      tx.update(countRef, {
        unreadCount: (currentCount as number) - unread.length,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return unread.length;
    });
  }
  return { markedRead };
}
