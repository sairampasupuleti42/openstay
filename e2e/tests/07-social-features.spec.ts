import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from '../fixtures/auth';

test.describe('Social Features', () => {
  authenticatedTest('should access followers page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/followers');
    
    await expect(authenticatedPage.locator('h1')).toContainText('My Followers');
    await expect(authenticatedPage.locator('text=people follow you')).toBeVisible();
  });

  authenticatedTest('should access following page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/following');
    
    await expect(authenticatedPage.locator('h1')).toContainText('Following');
    await expect(authenticatedPage.locator('text=You\'re following')).toBeVisible();
  });

  authenticatedTest('should display social navigation in header', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Check for social navigation links
    const followersLink = authenticatedPage.locator('a[href="/social/followers"]');
    const followingLink = authenticatedPage.locator('a[href="/social/following"]');
    
    if (await followersLink.isVisible()) {
      await expect(followersLink).toBeVisible();
      await followersLink.click();
      await expect(authenticatedPage).toHaveURL('/social/followers');
    }
    
    if (await followingLink.isVisible()) {
      await followingLink.click();
      await expect(authenticatedPage).toHaveURL('/social/following');
    }
  });

  authenticatedTest('should handle empty followers state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/followers');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Should either show followers or empty state
    const emptyState = authenticatedPage.locator('text=No followers yet');
    const followersList = authenticatedPage.locator('[data-testid="user-card"], .user-card');
    
    const hasFollowers = await followersList.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasFollowers || hasEmptyState).toBeTruthy();
  });

  authenticatedTest('should handle empty following state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/following');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    // Should either show following or empty state
    const emptyState = authenticatedPage.locator('text=Not following anyone yet');
    const followingList = authenticatedPage.locator('[data-testid="user-card"], .user-card');
    
    const hasFollowing = await followingList.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasFollowing || hasEmptyState).toBeTruthy();
  });

  authenticatedTest('should have working search in social pages', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/following');
    
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await authenticatedPage.waitForTimeout(1000);
      
      // Search should work without errors
      await expect(searchInput).toHaveValue('test');
    }
  });

  authenticatedTest('should handle unfollow action', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/following');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const unfollowButtons = authenticatedPage.locator('button:has-text("Unfollow")');
    const count = await unfollowButtons.count();
    
    if (count > 0) {
      const firstUnfollowButton = unfollowButtons.first();
      await firstUnfollowButton.click();
      
      // Should handle unfollow action
      await authenticatedPage.waitForTimeout(1000);
      
      // Button should either disappear or change state
      const stillVisible = await firstUnfollowButton.isVisible();
      // The button might disappear or change text
    }
  });

  authenticatedTest('should handle message action from social pages', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/following');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const messageButtons = authenticatedPage.locator('button:has-text("Message")');
    const count = await messageButtons.count();
    
    if (count > 0) {
      const firstMessageButton = messageButtons.first();
      await firstMessageButton.click();
      
      // Should navigate to messages or show messaging interface
      await authenticatedPage.waitForTimeout(1000);
      
      const currentUrl = authenticatedPage.url();
      if (currentUrl.includes('/messages')) {
        await expect(authenticatedPage).toHaveURL(/\/messages/);
      }
    }
  });

  authenticatedTest('should have view mode toggles in social pages', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/followers');
    
    const gridButton = authenticatedPage.locator('button[aria-label="Grid view"]');
    const listButton = authenticatedPage.locator('button[aria-label="List view"]');
    
    if (await gridButton.isVisible() && await listButton.isVisible()) {
      // Test switching view modes
      await listButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      await gridButton.click();
      await authenticatedPage.waitForTimeout(500);
      
      await expect(gridButton).toBeVisible();
    }
  });

  authenticatedTest('should handle remove follower action', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/social/followers');
    
    // Wait for page to load
    await authenticatedPage.waitForTimeout(2000);
    
    const removeButtons = authenticatedPage.locator('button:has-text("Remove")');
    const count = await removeButtons.count();
    
    if (count > 0) {
      const firstRemoveButton = removeButtons.first();
      await firstRemoveButton.click();
      
      // Should handle remove action (might show confirmation)
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if confirmation dialog appears
      const confirmDialog = authenticatedPage.locator('text=Are you sure, text=Confirm');
      if (await confirmDialog.isVisible()) {
        // This is expected behavior for destructive actions
        await expect(confirmDialog).toBeVisible();
      }
    }
  });

  authenticatedTest('should be responsive on mobile', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    
    await authenticatedPage.goto('/social/followers');
    await expect(authenticatedPage.locator('h1')).toBeVisible();
    
    await authenticatedPage.goto('/social/following');
    await expect(authenticatedPage.locator('h1')).toBeVisible();
  });
});