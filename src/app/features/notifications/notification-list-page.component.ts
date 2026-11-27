import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationPage, StayNotification } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-list-page',
  imports: [DatePipe, MatButtonModule],
  templateUrl: './notification-list-page.component.html',
  styles: `
    :host { display: block; min-height: 80vh; background: var(--openstay-cream); }
    .page { width: min(100%, 900px); margin: auto; padding: 36px 16px 64px; }
    .page-header { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 52px); }
    .intro, time { color: var(--openstay-muted); }
    .list { display: grid; gap: 14px; margin-top: 24px; }
    .card, .state { padding: clamp(20px, 5vw, 28px); border: 1px solid var(--openstay-border); border-radius: 22px; background: var(--openstay-warm-white); }
    .card.unread { border-color: var(--openstay-forest); }
    .card h2 { margin: 0; font-size: 21px; }
    .card p { line-height: 1.5; }
    .card time { display: block; margin: 12px 0; font-size: 13px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .error { color: #a4262c; }
    .load-more { display: flex; justify-content: center; margin-top: 20px; }
  `,
})
export class NotificationListPageComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);
  private unsubscribeNotifications?: () => void;
  private unsubscribeCount?: () => void;
  private liveItems: StayNotification[] = [];
  private olderItems: StayNotification[] = [];
  private uid = '';

  readonly items = signal<StayNotification[]>([]);
  readonly cursor = signal<QueryDocumentSnapshot<DocumentData> | null>(null);
  readonly hasOlder = signal(false);
  readonly unreadCount = signal(0);
  readonly loading = signal(true);
  readonly loadingOlder = signal(false);
  readonly markingAll = signal(false);
  readonly updatingId = signal('');
  readonly error = signal('');
  readonly actionError = signal('');
  readonly success = signal('');

  ngOnInit(): void {
    this.uid = this.auth.currentUser?.uid ?? '';
    if (!this.uid) {
      this.error.set('Sign in to view notifications.');
      this.loading.set(false);
      return;
    }
    this.startWatch();
  }

  ngOnDestroy(): void {
    this.unsubscribeNotifications?.();
    this.unsubscribeCount?.();
  }

  retry(): void {
    this.unsubscribeNotifications?.();
    this.unsubscribeCount?.();
    this.liveItems = [];
    this.olderItems = [];
    this.items.set([]);
    this.cursor.set(null);
    this.hasOlder.set(false);
    this.startWatch();
  }

  async loadOlder(): Promise<void> {
    const cursor = this.cursor();
    if (!cursor || this.loadingOlder() || !this.hasOlder()) return;
    this.loadingOlder.set(true);
    this.actionError.set('');
    try {
      const page = await this.service.loadOlder(this.uid, cursor);
      this.olderItems = mergeUnique([...this.olderItems, ...page.items]);
      this.items.set(mergeUnique([...this.liveItems, ...this.olderItems]));
      this.cursor.set(page.cursor);
      this.hasOlder.set(page.hasOlder);
    } catch (error) {
      this.actionError.set(this.service.errorMessage(error));
    } finally {
      this.loadingOlder.set(false);
    }
  }

  async open(notification: StayNotification): Promise<void> {
    this.actionError.set('');
    if (!notification.read) {
      this.updatingId.set(notification.notificationId);
      try {
        await this.service.markRead(notification.notificationId);
      } catch (error) {
        this.actionError.set(this.service.errorMessage(error));
        this.updatingId.set('');
        return;
      }
      this.updatingId.set('');
    }
    if (notification.type === 'new_message' && notification.conversationId
        && /^[a-f0-9]{64}$/.test(notification.conversationId)) {
      await this.router.navigateByUrl(`/messages/${notification.conversationId}`);
    } else if (/^[a-f0-9]{64}$/.test(notification.requestId)) {
      await this.router.navigateByUrl(`/requests/${notification.requestId}`);
    } else {
      this.actionError.set('This notification has an invalid destination.');
    }
  }

  async markOne(notification: StayNotification): Promise<void> {
    if (notification.read || this.updatingId()) return;
    this.updatingId.set(notification.notificationId);
    this.actionError.set('');
    try {
      await this.service.markRead(notification.notificationId);
    } catch (error) {
      this.actionError.set(this.service.errorMessage(error));
    } finally {
      this.updatingId.set('');
    }
  }

  async markAllRead(): Promise<void> {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    this.actionError.set('');
    this.success.set('');
    try {
      const markedRead = await this.service.markAllRead();
      this.success.set(markedRead === 0 ? 'There are no unread notifications.' : 'All notifications marked as read.');
    } catch (error) {
      this.actionError.set(this.service.errorMessage(error));
    } finally {
      this.markingAll.set(false);
    }
  }

  private startWatch(): void {
    this.loading.set(true);
    this.error.set('');
    this.unsubscribeNotifications = this.service.watch(
      this.uid,
      (page) => this.receivePage(page),
      (error) => {
        this.error.set(this.service.errorMessage(error));
        this.loading.set(false);
      },
    );
    this.unsubscribeCount = this.service.watchUnreadCount(
      this.uid,
      (count) => this.unreadCount.set(count),
      (error) => this.error.set(this.service.errorMessage(error)),
    );
  }

  private receivePage(page: NotificationPage): void {
    const hadOlderItems = this.olderItems.length > 0;
    const previousCursor = this.cursor();
    const nextIds = new Set(page.items.map((item) => item.notificationId));
    const displaced = this.liveItems.filter((item) => !nextIds.has(item.notificationId));
    if (displaced.length > 0) {
      this.olderItems = mergeUnique([...this.olderItems, ...displaced]);
    }
    this.liveItems = page.items;
    this.items.set(mergeUnique([...this.liveItems, ...this.olderItems]));
    if (!hadOlderItems) {
      this.cursor.set(displaced.length > 0 ? previousCursor ?? page.cursor : page.cursor);
      this.hasOlder.set(page.hasOlder || displaced.length > 0);
    }
    this.loading.set(false);
  }
}

function mergeUnique(items: StayNotification[]): StayNotification[] {
  const unique = new Map(items.map((item) => [item.notificationId, item]));
  return [...unique.values()].sort((first, second) =>
    second.createdAt.toMillis() - first.createdAt.toMillis());
}
