import { Timestamp } from '@angular/fire/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export type ConversationCursor = string;

export interface ConversationSummary {
  conversationId: string;
  requestId: string;
  listingId: string;
  otherParticipantName: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ConversationPage {
  items: ConversationSummary[];
  nextCursor: ConversationCursor | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  text: string;
  createdAt: Timestamp;
}

export interface RealtimeMessagePage {
  items: ConversationMessage[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasOlder: boolean;
}
