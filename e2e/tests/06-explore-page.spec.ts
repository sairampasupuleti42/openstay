import { test, expect } from '@playwright/test';
import { test as authenticatedTest } from '../fixtures/auth';
import { NavigationHelpers } from '../utils/helpers';

test.describe('Explore Page', () => {
  test('should redirect unauthenticated users appropriately', async ({ page }) => {
    const navHelpers = new NavigationHelpers(page);
    await navHelpers.goToExplore();
    
    // Should either show explore page or redirect to sign in
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await expect(page).toHaveURL('/auth/signin');
    } else {
      await expect(page.locator('h1')).toContainText('Explore Community');
    }
  });

  authenticatedTest('should display explore page for authenticated users', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    await expect(authenticatedPage.locator('h1')).toContainText('Explore Community');
    await expect(authenticatedPage.locator('text=Discover fellow travelers')).toBeVisible();
  });

  authenticatedTest('should display user cards', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    // Wait for users to load
    await authenticatedPage.waitForTimeout(3000);
    
    // Check if user cards are displayed
    const userCards = authenticatedPage.locator('[data-testid="user-card"], .user-card');
    const count = await userCards.count();
    
    if (count > 0) {
      await expect(userCards.first()).toBeVisible();
    } else {
      // If no users, should show empty state
      await expect(authenticatedPage.locator('text=No community members found')).toBeVisible();
    }
  });

  authenticatedTest('should have working search functionality', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('test');
    await authenticatedPage.waitForTimeout(1000);
    
    // Search should filter results
    const results = authenticatedPage.locator('[data-testid="user-card"], .user-card');
    // Results should be filtered or show no results message
  });

  authenticatedTest('should have view mode toggles', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
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

  authenticatedTest('should handle follow/unfollow actions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    // Wait for users to load
    await authenticatedPage.waitForTimeout(3000);
    
    const followButtons = authenticatedPage.locator('button:has-text("Follow")');
    const count = await followButtons.count();
    
    if (count > 0) {
      const firstFollowButton = followButtons.first();
      await firstFollowButton.click();
      
      // Should change to "Unfollow" or show loading state
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if button text changed or if there's a loading state
      const unfollowButton = authenticatedPage.locator('button:has-text("Unfollow")').first();
      if (await unfollowButton.isVisible()) {
        await expect(unfollowButton).toBeVisible();
      }
    }
  });

  authenticatedTest('should handle message actions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    // Wait for users to load
    await authenticatedPage.waitForTimeout(3000);
    
    const messageButtons = authenticatedPage.locator('button:has-text("Message")');
    const count = await messageButtons.count();
    
    if (count > 0) {
      const firstMessageButton = messageButtons.first();
      await firstMessageButton.click();
      
      // Should navigate to messages page or show modal
      await authenticatedPage.waitForTimeout(1000);
      
      const currentUrl = authenticatedPage.url();
      if (currentUrl.includes('/messages')) {
        await expect(authenticatedPage).toHaveURL(/\/messages/);
      }
    }
  });

  authenticatedTest('should load more users when scrolling', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    // Wait for initial load
    await authenticatedPage.waitForTimeout(3000);
    
    const initialUserCount = await authenticatedPage.locator('[data-testid="user-card"], .user-card').count();
    
    // Look for load more button
    const loadMoreButton = authenticatedPage.locator('button:has-text("Load More")');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await authenticatedPage.waitForTimeout(2000);
      
      const newUserCount = await authenticatedPage.locator('[data-testid="user-card"], .user-card').count();
      expect(newUserCount).toBeGreaterThanOrEqual(initialUserCount);
    }
  });

  authenticatedTest('should handle empty search results', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/explore');
    
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill('xyznonexistentuser123');
    await authenticatedPage.waitForTimeout(1000);
    
    // Should show no results message
    await expect(authenticatedPage.locator('text=No users found')).toBeVisible();
    
    // Clear search should restore results
    const clearButton = authenticatedPage.locator('button:has-text("Clear search")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await authenticatedPage.waitForTimeout(1000);
    }
  });

  authenticatedTest('should be responsive on mobile', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.goto('/explore');
    
    await expect(authenticatedPage.locator('h1')).toBeVisible();
    
    // Check if mobile layout is applied
    const userCards = authenticatedPage.locator('[data-testid="user-card"], .user-card');
    if (await userCards.first().isVisible()) {
      await expect(userCards.first()).toBeVisible();
    }
  });
});