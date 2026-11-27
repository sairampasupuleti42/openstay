import { Timestamp } from '@angular/fire/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export type NotificationType =
  | 'host_request_received'
  | 'host_request_cancelled'
  | 'host_stay_cancelled'
  | 'traveller_request_accepted'
  | 'traveller_request_declined'
  | 'traveller_stay_cancelled'
  | 'new_message';

export interface StayNotification {
  notificationId: string;
  recipientUid: string;
  type: NotificationType;
  requestId: string;
  conversationId?: string;
  title: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
  readAt?: Timestamp;
}

export interface NotificationPage {
  items: StayNotification[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasOlder: boolean;
}
