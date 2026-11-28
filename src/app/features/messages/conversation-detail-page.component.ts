import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { AuthService } from '../../core/auth/auth.service';
import { ConversationMessage } from '../../core/models/conversation.model';
import { BlockService } from '../../core/services/block.service';
import { ConversationService } from '../../core/services/conversation.service';

@Component({
  selector: 'app-conversation-detail-page',
  imports: [DatePipe, MatButtonModule, RouterLink],
  templateUrl: './conversation-detail-page.component.html',
  styles: `
    :host { display: block; min-height: 80vh; background: var(--openstay-cream); }
    .page { width: min(100%, 860px); margin: auto; padding: 32px 16px 56px; }
    .panel { overflow: hidden; border: 1px solid var(--openstay-border); border-radius: 24px; background: var(--openstay-warm-white); }
    .header { padding: 22px clamp(18px, 5vw, 30px); border-bottom: 1px solid var(--openstay-border); }
    .header h1 { margin: 0; font-size: clamp(26px, 6vw, 38px); }
    .header p, .timestamp, .muted { color: var(--openstay-muted); }
    .header-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .messages { display: grid; gap: 14px; min-height: 260px; max-height: 62vh; overflow-y: auto; padding: 20px clamp(14px, 4vw, 28px); }
    .bubble { width: fit-content; max-width: min(82%, 620px); padding: 12px 15px; border-radius: 18px; background: #f0eee7; overflow-wrap: anywhere; }
    .bubble.own { justify-self: end; background: #e4f1e9; }
    .bubble p { margin: 0; white-space: pre-wrap; }
    .timestamp { display: block; margin-top: 7px; font-size: 12px; }
    .composer { display: grid; gap: 12px; padding: 18px clamp(14px, 4vw, 28px); border-top: 1px solid var(--openstay-border); }
    textarea { box-sizing: border-box; width: 100%; min-height: 94px; resize: vertical; padding: 13px; border: 1px solid var(--openstay-border); border-radius: 14px; font: inherit; }
    .composer-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .send { background: var(--openstay-forest); color: #fff; }
    .state { margin: 18px; padding: 16px; border-radius: 16px; background: var(--openstay-cream); }
    .error { color: #a4262c; }
  `,
})
export class ConversationDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ConversationService);
  private readonly blocks = inject(BlockService);
  private readonly auth = inject(AuthService);
  private unsubscribeMessages?: () => void;
  private olderHistoryLoaded = false;
  requestId = '';
  private submissionKey: string | null = null;
  private submittedText = '';

  readonly conversationId = signal('');
  readonly otherParticipantName = signal('Openstay member');
  readonly viewerHasBlockedOther = signal(false);
  readonly status = signal('');
  readonly messages = signal<ConversationMessage[]>([]);
  readonly text = signal('');
  readonly loading = signal(true);
  readonly loadingOlder = signal(false);
  readonly sending = signal(false);
  readonly blocking = signal(false);
  readonly hasOlder = signal(false);
  readonly cursor = signal<QueryDocumentSnapshot<DocumentData> | null>(null);
  readonly error = signal('');
  readonly sendError = signal('');
  readonly success = signal('');

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('conversationId') ?? '';
    void this.open();
  }

  ngOnDestroy(): void {
    this.unsubscribeMessages?.();
  }

  async open(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.unsubscribeMessages?.();
    try {
      const conversation = await this.service.open(this.requestId);
      this.conversationId.set(conversation.conversationId);
      this.otherParticipantName.set(conversation.otherParticipantName);
      this.viewerHasBlockedOther.set(conversation.viewerHasBlockedOther);
      this.status.set(conversation.status);
      this.unsubscribeMessages = this.service.watchMessages(
        this.requestId,
        (page) => {
          this.merge(page.items);
          if (!this.olderHistoryLoaded) {
            this.cursor.set(page.cursor);
            this.hasOlder.set(page.hasOlder);
          }
          this.loading.set(false);
          void this.service.markRead(this.requestId).catch((error) => {
            this.error.set(this.service.errorMessage(error));
          });
        },
        (error) => {
          this.error.set(this.service.errorMessage(error));
          this.loading.set(false);
        },
      );
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
      this.loading.set(false);
    }
  }

  async loadOlder(): Promise<void> {
    const cursor = this.cursor();
    if (!cursor || this.loadingOlder() || !this.hasOlder()) return;
    this.loadingOlder.set(true);
    this.olderHistoryLoaded = true;
    this.error.set('');
    try {
      const page = await this.service.loadOlder(this.requestId, cursor);
      this.merge(page.items);
      this.cursor.set(page.cursor);
      this.hasOlder.set(page.hasOlder);
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.loadingOlder.set(false);
    }
  }

  updateText(value: string): void {
    this.text.set(value);
    if (this.submissionKey && value !== this.submittedText && !this.sending()) {
      this.submissionKey = null;
      this.submittedText = '';
    }
    this.sendError.set('');
  }

  async send(): Promise<void> {
    const text = this.text().normalize('NFKC').replace(/\r\n?/g, '\n').trim();
    if (this.sending() || this.status() !== 'accepted' || this.viewerHasBlockedOther()) return;
    if (!text || text.length > 2000) {
      this.sendError.set('Enter a message of up to 2,000 characters.');
      return;
    }
    if (!this.auth.currentUser) {
      this.sendError.set('Sign in again before sending a message.');
      return;
    }
    if (!this.submissionKey || this.submittedText !== text) {
      this.submissionKey = globalThis.crypto.randomUUID();
      this.submittedText = text;
    }
    this.sending.set(true);
    this.sendError.set('');
    this.success.set('');
    try {
      await this.service.send(this.requestId, text, this.submissionKey);
      this.text.set('');
      this.submissionKey = null;
      this.submittedText = '';
      this.success.set('Message sent.');
    } catch (error) {
      this.sendError.set(this.service.errorMessage(error));
    } finally {
      this.sending.set(false);
    }
  }

  async blockParticipant(): Promise<void> {
    if (!this.requestId || this.blocking() || this.viewerHasBlockedOther()) return;
    if (!window.confirm(
      `Block ${this.otherParticipantName()}? New requests, acceptance, conversations, messages, and reviews will be prevented. Existing history remains available, and an accepted stay will not be cancelled.`,
    )) return;
    this.blocking.set(true);
    this.sendError.set('');
    this.success.set('');
    try {
      await this.blocks.blockRequest(this.requestId);
      this.viewerHasBlockedOther.set(true);
      this.success.set('This participant is blocked from future interactions. Existing history remains available.');
    } catch (error) {
      this.sendError.set(this.blocks.errorMessage(error));
    } finally {
      this.blocking.set(false);
    }
  }

  isOwn(message: ConversationMessage): boolean {
    return message.senderUid === this.auth.currentUser?.uid;
  }

  private merge(messages: ConversationMessage[]): void {
    const merged = new Map(this.messages().map((message) => [message.id, message]));
    for (const message of messages) merged.set(message.id, message);
    this.messages.set([...merged.values()].sort((first, second) =>
      first.createdAt.toMillis() - second.createdAt.toMillis()));
  }
}
