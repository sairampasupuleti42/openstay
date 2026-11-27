import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { DocumentData, QueryDocumentSnapshot, Timestamp } from '@angular/fire/firestore';
import { vi } from 'vitest';
import { AuthService } from '../core/auth/auth.service';
import { RealtimeMessagePage } from '../core/models/conversation.model';
import { ConversationService } from '../core/services/conversation.service';
import { NotificationService } from '../core/services/notification.service';
import { ConversationDetailPageComponent } from './messages/conversation-detail-page.component';
import { ConversationListPageComponent } from './messages/conversation-list-page.component';
import { NotificationListPageComponent } from './notifications/notification-list-page.component';

const requestId = 'c'.repeat(64);
const stamp = Timestamp.fromDate(new Date('2030-01-10T12:00:00.000Z'));

describe('M4.3 messaging and notification pages', () => {
  const listConversations = vi.fn();
  const openConversation = vi.fn();
  const sendMessage = vi.fn();
  const markConversationRead = vi.fn();
  const watchMessages = vi.fn();
  const loadOlderMessages = vi.fn();
  const watchNotifications = vi.fn();
  const watchUnreadCount = vi.fn();
  const markNotificationRead = vi.fn();
  const markAllNotificationsRead = vi.fn();
  const route = { snapshot: { paramMap: { get: () => requestId } } };

  beforeEach(async () => {
    vi.resetAllMocks();
    listConversations.mockResolvedValue({
      items: [{
        conversationId: requestId,
        requestId,
        listingId: 'listing-1',
        otherParticipantName: 'Host',
        lastMessageAt: null,
        unreadCount: 2,
      }],
      nextCursor: null,
    });
    openConversation.mockResolvedValue({
      conversationId: requestId,
      requestId,
      listingId: 'listing-1',
      status: 'accepted',
      otherParticipantName: 'Host',
    });
    sendMessage.mockResolvedValue({ messageId: 'message-1' });
    markConversationRead.mockResolvedValue(undefined);
    markNotificationRead.mockResolvedValue(undefined);
    watchMessages.mockImplementation((_id, next) => {
      next({
        items: [{
          id: 'message-1',
          conversationId: requestId,
          senderUid: 'host-1',
          text: 'Coordinate your arrival here.',
          createdAt: stamp,
        }],
        cursor: null,
        hasOlder: false,
      });
      return () => undefined;
    });
    watchNotifications.mockImplementation((_uid, next) => {
      next({
        items: [{
          notificationId: 'd'.repeat(64),
          recipientUid: 'traveller-1',
          type: 'new_message',
          requestId,
          conversationId: requestId,
          title: 'New message',
          message: 'You received a new message about your stay.',
          createdAt: stamp,
          read: false,
        }],
        cursor: null,
        hasOlder: false,
      });
      return () => undefined;
    });
    watchUnreadCount.mockImplementation((_uid, next) => {
      next(1);
      return () => undefined;
    });

    await TestBed.configureTestingModule({
      imports: [
        ConversationListPageComponent,
        ConversationDetailPageComponent,
        NotificationListPageComponent,
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: { currentUser: { uid: 'traveller-1' } } },
        {
          provide: ConversationService,
          useValue: {
            list: listConversations,
            open: openConversation,
            send: sendMessage,
            markRead: markConversationRead,
            watchMessages,
            loadOlder: loadOlderMessages,
            errorMessage: (error: unknown) => error instanceof Error ? error.message : 'Error',
          },
        },
        {
          provide: NotificationService,
          useValue: {
            watch: watchNotifications,
            watchUnreadCount,
            markRead: markNotificationRead,
            markAllRead: markAllNotificationsRead,
            errorMessage: (error: unknown) => error instanceof Error ? error.message : 'Error',
          },
        },
      ],
    }).compileComponents();
  });

  it('lists private conversations with unread counts and opens live message history', async () => {
    const listFixture = TestBed.createComponent(ConversationListPageComponent);
    listFixture.detectChanges();
    await listFixture.whenStable();
    listFixture.detectChanges();
    expect(listFixture.nativeElement.textContent).toContain('Host');
    expect(listFixture.nativeElement.textContent).toContain('2');
    expect(listConversations).toHaveBeenCalledWith(null);

    const detailFixture = TestBed.createComponent(ConversationDetailPageComponent);
    detailFixture.detectChanges();
    await detailFixture.whenStable();
    detailFixture.detectChanges();
    expect(openConversation).toHaveBeenCalledWith(requestId);
    expect(watchMessages).toHaveBeenCalledWith(requestId, expect.any(Function), expect.any(Function));
    expect(markConversationRead).toHaveBeenCalledWith(requestId);
    expect(detailFixture.nativeElement.textContent).toContain('Coordinate your arrival here.');
    detailFixture.componentInstance.updateText('  I will arrive in the afternoon. ');
    await detailFixture.componentInstance.send();
    expect(sendMessage).toHaveBeenCalledWith(
      requestId,
      'I will arrive in the afternoon.',
      expect.any(String),
    );
    expect(detailFixture.componentInstance.text()).toBe('');
    listFixture.destroy();
    detailFixture.destroy();
  });

  it('distinguishes an empty conversation page from an exhausted list', async () => {
    const nextCursor = 'opaque-conversation-cursor';
    listConversations.mockResolvedValueOnce({
      items: [],
      nextCursor,
    });
    const fixture = TestBed.createComponent(ConversationListPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No available conversations on this page');
    expect(fixture.nativeElement.textContent).toContain('Load older conversations');
    expect(fixture.nativeElement.textContent).not.toContain('No conversations yet.');
    const loadOlderButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(loadOlderButton).toBeTruthy();
    expect(loadOlderButton.disabled).toBe(false);
    loadOlderButton.click();
    await fixture.whenStable();
    expect(listConversations).toHaveBeenNthCalledWith(2, nextCursor);
    fixture.destroy();
  });

  it('shows unread notifications and uses a validated conversation navigation target', async () => {
    const fixture = TestBed.createComponent(NotificationListPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 unread notification');
    expect(fixture.nativeElement.textContent).toContain('New message');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.componentInstance.open(fixture.componentInstance.items()[0]);
    expect(markNotificationRead).toHaveBeenCalledWith('d'.repeat(64));
    expect(navigate).toHaveBeenCalledWith(`/messages/${requestId}`);
    fixture.destroy();
  });

  it('keeps the older-history cursor when live messages arrive', async () => {
    const recentCursor = {} as unknown as QueryDocumentSnapshot<DocumentData>;
    const olderCursor = {} as unknown as QueryDocumentSnapshot<DocumentData>;
    let emitPage: (page: RealtimeMessagePage) => void = () => {
      throw new Error('Message listener was not initialized.');
    };
    watchMessages.mockImplementation((_id, next: (page: RealtimeMessagePage) => void) => {
      emitPage = next;
      next({
        items: [],
        cursor: recentCursor,
        hasOlder: true,
      });
      return () => undefined;
    });
    loadOlderMessages.mockResolvedValue({
      items: [],
      cursor: olderCursor,
      hasOlder: true,
    });

    const fixture = TestBed.createComponent(ConversationDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    await component.loadOlder();
    emitPage({ items: [], cursor: recentCursor, hasOlder: true });
    await component.loadOlder();

    expect(loadOlderMessages).toHaveBeenNthCalledWith(1, requestId, recentCursor);
    expect(loadOlderMessages).toHaveBeenNthCalledWith(2, requestId, olderCursor);
    fixture.destroy();
  });
});
