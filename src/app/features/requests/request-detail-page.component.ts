import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HostingRequestDetails } from '../../core/models/hosting-request.model';
import { BlockService } from '../../core/services/block.service';
import { ConversationService } from '../../core/services/conversation.service';
import { HostingRequestService } from '../../core/services/hosting-request.service';

@Component({
  selector: 'app-request-detail-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './request-detail-page.component.html',
  styles: `
    :host { display: block; background: var(--openstay-cream); min-height: 80vh; }
    .page { max-width: 720px; margin: auto; padding: 40px 20px; }
    .panel { padding: clamp(20px, 5vw, 36px); border: 1px solid var(--openstay-border); border-radius: var(--openstay-card-radius); background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); }
    h1 { margin-top: 0; font-size: clamp(32px, 6vw, 48px); line-height: 1.1; }
    .panel > section { margin: 24px 0; padding: 20px; border: 1px solid var(--openstay-border); border-radius: 16px; }
    .panel > section h2 { margin-top: 0; }
    .panel > button, .panel > a, section button { margin: 4px 8px 4px 0; }
    label { display: block; margin: 16px 0 6px; font-weight: 700; }
    select, textarea { display: block; width: 100%; min-height: 48px; padding: 12px; border: 1px solid var(--openstay-muted); border-radius: var(--openstay-radius-control); background: var(--openstay-surface); color: var(--openstay-charcoal); }
    textarea { min-height: 100px; resize: vertical; }
    .message { white-space: pre-wrap; overflow-wrap: anywhere; }
    .error { color: #a4262c; }
  `,
})
export class RequestDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(HostingRequestService);
  private readonly blocks = inject(BlockService);
  private readonly conversations = inject(ConversationService);
  readonly details = signal<HostingRequestDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly success = signal('');
  readonly acting = signal(false);
  readonly completionActing = signal(false);
  readonly reviewActing = signal(false);
  readonly reviewRating = signal(5);
  readonly reviewText = signal('');
  readonly openingConversation = signal(false);
  readonly blockingParticipant = signal(false);
  private requestId = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('requestId') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.details.set(await this.service.details(this.requestId));
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async decide(action: 'accept' | 'decline' | 'cancel'): Promise<void> {
    if (this.acting()) return;
    const descriptions = {
      accept: 'Accept this request and confirm the stay?',
      decline: 'Decline this request?',
      cancel: 'Cancel this request or confirmed stay?',
    };
    if (!window.confirm(descriptions[action])) return;
    this.acting.set(true);
    this.actionError.set('');
    this.success.set('');
    try {
      await this.service.decide(this.requestId, action);
      this.success.set(action === 'accept' ? 'Stay confirmed.' : action === 'decline' ? 'Request declined.' : 'Cancelled.');
      await this.load();
    } catch (error) {
      this.actionError.set(this.service.errorMessage(error));
    } finally {
      this.acting.set(false);
    }
  }

  async openConversation(): Promise<void> {
    if (this.openingConversation() || this.details()?.status !== 'accepted') return;
    this.openingConversation.set(true);
    this.actionError.set('');
    try {
      const conversation = await this.conversations.open(this.requestId);
      await this.router.navigateByUrl(`/messages/${conversation.conversationId}`);
    } catch (error) {
      this.actionError.set(this.conversations.errorMessage(error));
    } finally {
      this.openingConversation.set(false);
    }
  }

  async blockParticipant(request: HostingRequestDetails): Promise<void> {
    if (this.blockingParticipant() || request.viewerHasBlockedOther) return;
    if (!window.confirm(
      `Block ${request.otherParticipantName || 'this participant'}? This prevents new requests, acceptance, conversations, messages, and reviews. Existing history remains available, and an accepted stay will not be cancelled.`,
    )) return;
    this.blockingParticipant.set(true);
    this.actionError.set('');
    this.success.set('');
    try {
      await this.blocks.blockRequest(this.requestId);
      this.success.set('This participant is blocked from future interactions. Existing history remains available.');
      await this.load();
    } catch (error) {
      this.actionError.set(this.blocks.errorMessage(error));
    } finally {
      this.blockingParticipant.set(false);
    }
  }

  canStartCompletion(): boolean {
    const request = this.details();
    return request?.status === 'accepted'
      && request.completion.status === 'not_started'
      && request.endDate < new Date().toISOString().slice(0, 10);
  }

  canConfirmCompletion(): boolean {
    const completion = this.details()?.completion;
    return completion?.status === 'pending'
      && completion.reason === 'awaiting_confirmation'
      && !completion.viewerConfirmed;
  }

  async initiateCompletion(): Promise<void> {
    await this.updateCompletion(() => this.service.initiateCompletion(this.requestId));
  }

  async confirmCompletion(): Promise<void> {
    await this.updateCompletion(() => this.service.confirmCompletion(this.requestId));
  }

  async disputeCompletion(): Promise<void> {
    if (!window.confirm('Dispute completion? This stay will remain incomplete and cannot be reviewed.')) return;
    await this.updateCompletion(() => this.service.disputeCompletion(this.requestId));
  }

  setReviewRating(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isInteger(value) && value >= 1 && value <= 5) this.reviewRating.set(value);
  }

  setReviewText(event: Event): void {
    this.reviewText.set((event.target as HTMLTextAreaElement).value);
  }

  async submitReview(): Promise<void> {
    const request = this.details();
    if (this.reviewActing() || request?.completion.status !== 'completed'
        || request.viewerReviewSubmitted || request.viewerHasBlockedOther) return;
    this.reviewActing.set(true);
    this.actionError.set('');
    this.success.set('');
    try {
      await this.service.submitReview(this.requestId, this.reviewRating(), this.reviewText());
      this.success.set('Your review was submitted.');
      this.reviewText.set('');
      await this.load();
    } catch (error) {
      this.actionError.set(this.service.errorMessage(error));
    } finally {
      this.reviewActing.set(false);
    }
  }

  private async updateCompletion(
    action: () => Promise<unknown>,
  ): Promise<void> {
    if (this.completionActing()) return;
    this.completionActing.set(true);
    this.actionError.set('');
    this.success.set('');
    try {
      await action();
      this.success.set('Stay completion status updated.');
      await this.load();
    } catch (error) {
      this.actionError.set(this.service.errorMessage(error));
      await this.load();
    } finally {
      this.completionActing.set(false);
    }
  }
}
