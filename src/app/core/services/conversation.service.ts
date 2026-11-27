import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';
import {
  ConversationCursor,
  ConversationMessage,
  ConversationPage,
  ConversationSummary,
  RealtimeMessagePage,
} from '../models/conversation.model';

const messagePageSize = 50;

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly app = inject(FirebaseApp);
  private readonly firestore = inject(Firestore);
  private functions?: ReturnType<typeof import('firebase/functions').getFunctions>;

  async list(cursor: ConversationCursor | null): Promise<ConversationPage> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<{ cursor: ConversationCursor | null }, ConversationPage>(
      functions, 'listConversations',
    )({ cursor })).data;
  }

  async open(requestId: string): Promise<{
    conversationId: string;
    requestId: string;
    listingId: string;
    status: string;
    otherParticipantName: string;
  }> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<
      { requestId: string },
      { conversationId: string; requestId: string; listingId: string; status: string; otherParticipantName: string }
    >(functions, 'openConversation')({ requestId })).data;
  }

  async send(requestId: string, text: string, idempotencyKey: string): Promise<{ messageId: string }> {
    const { sdk, functions } = await this.getFunctions();
    return (await sdk.httpsCallable<
      { requestId: string; text: string; idempotencyKey: string },
      { messageId: string; conversationId: string }
    >(functions, 'sendConversationMessage')({ requestId, text, idempotencyKey })).data;
  }

  async markRead(requestId: string): Promise<void> {
    const { sdk, functions } = await this.getFunctions();
    await sdk.httpsCallable<{ requestId: string }, { read: true }>(functions, 'markConversationRead')({ requestId });
  }

  watchMessages(
    requestId: string,
    next: (page: RealtimeMessagePage) => void,
    error: (error: unknown) => void,
  ): () => void {
    const messageQuery = query(
      collection(this.firestore, 'conversations', requestId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(messagePageSize + 1),
    );
    return onSnapshot(messageQuery, (snapshot) => {
      try {
        const page = snapshot.docs.slice(0, messagePageSize);
        next({
          items: page.map((item) => this.message(item, requestId)).reverse(),
          cursor: page.at(-1) ?? null,
          hasOlder: snapshot.docs.length > messagePageSize,
        });
      } catch (validationError) {
        error(validationError);
      }
    }, error);
  }

  async loadOlder(
    requestId: string,
    cursor: QueryDocumentSnapshot<DocumentData>,
  ): Promise<RealtimeMessagePage> {
    const olderQuery = query(
      collection(this.firestore, 'conversations', requestId, 'messages'),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(messagePageSize + 1),
    );
    const { getDocs } = await import('@angular/fire/firestore');
    const snapshot = await getDocs(olderQuery);
    const page = snapshot.docs.slice(0, messagePageSize);
    return {
      items: page.map((item) => this.message(item, requestId)).reverse(),
      cursor: page.at(-1) ?? null,
      hasOlder: snapshot.docs.length > messagePageSize,
    };
  }

  errorMessage(error: unknown): string {
    return error instanceof Error && error.message.trim()
      ? error.message
      : 'Something went wrong. Please try again.';
  }

  private message(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    requestId: string,
  ): ConversationMessage {
    const data = snapshot.data();
    if (data['conversationId'] !== requestId
        || typeof data['senderUid'] !== 'string'
        || typeof data['text'] !== 'string'
        || data['text'].trim().length === 0
        || data['text'].length > 2000
        || !(data['createdAt'] instanceof Timestamp)) {
      throw new Error('A saved message is invalid. Please try again.');
    }
    return {
      id: snapshot.id,
      conversationId: data['conversationId'],
      senderUid: data['senderUid'],
      text: data['text'],
      createdAt: data['createdAt'],
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
