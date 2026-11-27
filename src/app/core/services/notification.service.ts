import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';
import {
  NotificationPage,
  NotificationType,
  StayNotification,
} from '../models/notification.model';

const pageSize = 20;
const notificationTypes: NotificationType[] = [
  'host_request_received',
  'host_request_cancelled',
  'host_stay_cancelled',
  'traveller_request_accepted',
  'traveller_request_declined',
  'traveller_stay_cancelled',
  'new_message',
];

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly app = inject(FirebaseApp);
  private readonly firestore = inject(Firestore);
  private functions?: ReturnType<typeof import('firebase/functions').getFunctions>;

  watch(
    uid: string,
    next: (page: NotificationPage) => void,
    error: (error: unknown) => void,
  ): () => void {
    const notificationQuery = query(
      collection(this.firestore, 'notifications'),
      where('recipientUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    return onSnapshot(notificationQuery, (snapshot) => {
      try {
        next({
          items: snapshot.docs.map((item) => this.notification(item, uid)),
          cursor: snapshot.docs.at(-1) ?? null,
          hasOlder: snapshot.docs.length === pageSize,
        });
      } catch (validationError) {
        error(validationError);
      }
    }, error);
  }

  async loadOlder(
    uid: string,
    cursor: QueryDocumentSnapshot<DocumentData>,
  ): Promise<NotificationPage> {
    const olderQuery = query(
      collection(this.firestore, 'notifications'),
      where('recipientUid', '==', uid),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(pageSize),
    );
    const snapshot = await getDocs(olderQuery);
    return {
      items: snapshot.docs.map((item) => this.notification(item, uid)),
      cursor: snapshot.docs.at(-1) ?? null,
      hasOlder: snapshot.docs.length === pageSize,
    };
  }

  watchUnreadCount(
    uid: string,
    next: (count: number) => void,
    error: (error: unknown) => void,
  ): () => void {
    return onSnapshot(doc(this.firestore, 'notificationCounts', uid), (snapshot) => {
      if (!snapshot.exists()) {
        next(0);
        return;
      }
      const data = snapshot.data();
      if (data['recipientUid'] !== uid
          || !Number.isInteger(data['unreadCount'])
          || data['unreadCount'] < 0) {
        error(new Error('The saved notification count is invalid.'));
        return;
      }
      next(data['unreadCount']);
    }, error);
  }

  async unreadCount(uid: string): Promise<number> {
    const snapshot = await getDoc(doc(this.firestore, 'notificationCounts', uid));
    if (!snapshot.exists()) return 0;
    const data = snapshot.data();
    if (data['recipientUid'] !== uid
        || !Number.isInteger(data['unreadCount'])
        || data['unreadCount'] < 0) {
      throw new Error('The saved notification count is invalid.');
    }
    return data['unreadCount'];
  }

  async markRead(notificationId: string): Promise<void> {
    const { sdk, functions } = await this.getFunctions();
    await sdk.httpsCallable<{ notificationId: string }, { read: true }>(
      functions, 'markNotificationRead',
    )({ notificationId });
  }

  async markAllRead(): Promise<number> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<Record<string, never>, { markedRead: number }>(
      functions, 'markAllNotificationsRead',
    )({})).data.markedRead;
  }

  errorMessage(error: unknown): string {
    return error instanceof Error && error.message.trim()
      ? error.message
      : 'Something went wrong. Please try again.';
  }

  private notification(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    uid: string,
  ): StayNotification {
    const data = snapshot.data();
    if (data['notificationId'] !== snapshot.id
        || data['recipientUid'] !== uid
        || !notificationTypes.includes(data['type'])
        || typeof data['requestId'] !== 'string'
        || !/^[a-f0-9]{64}$/.test(data['requestId'])
        || typeof data['title'] !== 'string'
        || data['title'].length > 100
        || typeof data['message'] !== 'string'
        || data['message'].length > 200
        || !(data['createdAt'] instanceof Timestamp)
        || typeof data['read'] !== 'boolean'
        || (data['type'] === 'new_message'
          && (typeof data['conversationId'] !== 'string'
            || !/^[a-f0-9]{64}$/.test(data['conversationId'])))) {
      throw new Error('A saved notification is invalid. Please try again.');
    }
    return {
      notificationId: data['notificationId'],
      recipientUid: data['recipientUid'],
      type: data['type'],
      requestId: data['requestId'],
      ...(typeof data['conversationId'] === 'string' ? { conversationId: data['conversationId'] } : {}),
      title: data['title'],
      message: data['message'],
      createdAt: data['createdAt'],
      read: data['read'],
      ...(data['readAt'] instanceof Timestamp ? { readAt: data['readAt'] } : {}),
    };
  }

  private async getFunctions() {
    const sdk = await import('firebase/functions');
    if (!this.functions) {
      this.functions = sdk.getFunctions(this.app, 'us-central1');
      if (environment.useEmulators) sdk.connectFunctionsEmulator(this.functions, '127.0.0.1', 5001);
    }
    return { sdk, functions: this.functions };
  }
}
