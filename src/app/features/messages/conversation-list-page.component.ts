import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ConversationCursor, ConversationSummary } from '../../core/models/conversation.model';
import { ConversationService } from '../../core/services/conversation.service';

@Component({
  selector: 'app-conversation-list-page',
  imports: [DatePipe, MatButtonModule, RouterLink],
  templateUrl: './conversation-list-page.component.html',
  styles: `
    :host { display: block; min-height: 80vh; background: var(--openstay-cream); }
    .page { width: min(100%, 900px); margin: auto; padding: 36px 16px 64px; }
    .page-header { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 52px); }
    .intro, .updated { color: var(--openstay-muted); }
    .list { display: grid; gap: 14px; margin-top: 24px; }
    .card, .state { padding: clamp(20px, 5vw, 28px); border: 1px solid var(--openstay-border); border-radius: 22px; background: var(--openstay-warm-white); }
    .card-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
    .card h2 { margin: 0; font-size: 22px; }
    .unread { min-width: 24px; padding: 3px 8px; border-radius: 999px; background: var(--openstay-forest); color: #fff; font-weight: 700; text-align: center; }
    .error { color: #a4262c; }
    .actions { display: flex; justify-content: center; margin-top: 20px; }
  `,
})
export class ConversationListPageComponent implements OnInit {
  private readonly service = inject(ConversationService);
  readonly items = signal<ConversationSummary[]>([]);
  readonly cursor = signal<ConversationCursor | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(more = false): Promise<void> {
    if (this.loadingMore() || (more && !this.cursor())) return;
    this.loading.set(!more);
    this.loadingMore.set(more);
    this.error.set('');
    try {
      const page = await this.service.list(more ? this.cursor() : null);
      this.items.set(more ? [...this.items(), ...page.items] : page.items);
      this.cursor.set(page.nextCursor);
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }
}
