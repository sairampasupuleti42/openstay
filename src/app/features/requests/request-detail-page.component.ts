import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HostingRequestDetails } from '../../core/models/hosting-request.model';
import { ConversationService } from '../../core/services/conversation.service';
import { HostingRequestService } from '../../core/services/hosting-request.service';

@Component({
  selector: 'app-request-detail-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './request-detail-page.component.html',
  styles: `
    :host { display: block; background: var(--openstay-cream); min-height: 80vh; }
    .page { max-width: 720px; margin: auto; padding: 40px 20px; }
    .panel { padding: 28px; border-radius: 22px; background: var(--openstay-warm-white); }
    .message { white-space: pre-wrap; overflow-wrap: anywhere; }
    .error { color: #a4262c; }
  `,
})
export class RequestDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(HostingRequestService);
  private readonly conversations = inject(ConversationService);
  readonly details = signal<HostingRequestDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly success = signal('');
  readonly acting = signal(false);
  readonly openingConversation = signal(false);
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
}
