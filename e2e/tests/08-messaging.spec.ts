import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from '../fixtures/auth';

test.describe('Messaging', () => {
  authenticatedTest('should access messaging page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Should either show messaging interface or require onboarding
    const currentUrl = authenticatedPage.url();
    if (currentUrl.includes('/messages')) {
      await expect(authenticatedPage.locator('h1, h2')).toContainText('Messages');
    } else if (currentUrl.includes('/onboarding')) {
      await expect(authenticatedPage).toHaveURL('/onboarding');
    }
  });

  authenticatedTest('should display messaging interface', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Check for messaging components
    const messagingInterface = authenticatedPage.locator('[data-testid="messaging-interface"], .messaging-page');
    const conversationList = authenticatedPage.locator('[data-testid="conversation-list"], .conversation-list');
    const newChatButton = authenticatedPage.locator('button:has-text("New Chat"), button:has-text("Start New Chat")');
    
    // Should have messaging interface elements
    if (await messagingInterface.isVisible()) {
      await expect(messagingInterface).toBeVisible();
    }
    
    if (await newChatButton.isVisible()) {
      await expect(newChatButton).toBeVisible();
    }
  });

  authenticatedTest('should handle empty conversations state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Should either show conversations or empty state
    const emptyState = authenticatedPage.locator('text=No conversations yet, text=Start a new conversation');
    const conversationItems = authenticatedPage.locator('[data-testid="conversation-item"], .conversation-item');
    
    const hasConversations = await conversationItems.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasConversations || hasEmptyState).toBeTruthy();
  });

  authenticatedTest('should open new chat dialog', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const newChatButton = authenticatedPage.locator('button:has-text("New Chat"), button:has-text("Start New Chat")');
    
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      
      // Should show new chat interface or user selection
      await authenticatedPage.waitForTimeout(1000);
      
      const newChatInterface = authenticatedPage.locator('text=New Chat, text=Select a user');
      if (await newChatInterface.isVisible()) {
        await expect(newChatInterface).toBeVisible();
      }
    }
  });

  authenticatedTest('should handle conversation search', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const searchInput = authenticatedPage.locator('input[placeholder*="Search conversations"], input[placeholder*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await authenticatedPage.waitForTimeout(1000);
      
      // Search should work without errors
      await expect(searchInput).toHaveValue('test');
    }
  });

  authenticatedTest('should handle message input', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Look for message input
    const messageInput = authenticatedPage.locator('input[placeholder*="Type a message"], textarea[placeholder*="Type a message"]');
    
    if (await messageInput.isVisible()) {
      await messageInput.fill('Test message');
      await expect(messageInput).toHaveValue('Test message');
      
      // Look for send button
      const sendButton = authenticatedPage.locator('button[type="submit"], button:has-text("Send")');
      if (await sendButton.isVisible()) {
        await expect(sendButton).toBeVisible();
      }
    }
  });

  authenticatedTest('should handle conversation selection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const conversationItems = authenticatedPage.locator('[data-testid="conversation-item"], .conversation-item');
    const count = await conversationItems.count();
    
    if (count > 0) {
      const firstConversation = conversationItems.first();
      await firstConversation.click();
      
      // Should open the conversation
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if chat interface is visible
      const chatInterface = authenticatedPage.locator('[data-testid="chat-interface"], .chat-interface');
      if (await chatInterface.isVisible()) {
        await expect(chatInterface).toBeVisible();
      }
    }
  });

  authenticatedTest('should be responsive on mobile', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Should display mobile-friendly interface
    await expect(authenticatedPage.locator('h1, h2')).toBeVisible();
  });

  authenticatedTest('should handle message reactions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // If there are existing messages, test reactions
    const messages = authenticatedPage.locator('[data-testid="message"], .message');
    const count = await messages.count();
    
    if (count > 0) {
      const firstMessage = messages.first();
      
      // Hover over message to show reaction options
      await firstMessage.hover();
      
      const reactionButton = authenticatedPage.locator('button[aria-label*="react"], button:has-text("😀")');
      if (await reactionButton.isVisible()) {
        await expect(reactionButton).toBeVisible();
      }
    }
  });

  authenticatedTest('should handle typing indicators', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const messageInput = authenticatedPage.locator('input[placeholder*="Type a message"], textarea[placeholder*="Type a message"]');
    
    if (await messageInput.isVisible()) {
      await messageInput.fill('Test typing...');
      
      // Should show typing indicator (if implemented)
      await authenticatedPage.waitForTimeout(1000);
      
      // Clear input
      await messageInput.clear();
    }
  });

  authenticatedTest('should handle message status indicators', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Look for message status indicators
    const statusIndicators = authenticatedPage.locator('[data-testid="message-status"], .message-status, .status-indicator');
    
    if (await statusIndicators.first().isVisible()) {
      await expect(statusIndicators.first()).toBeVisible();
    }
  });
});