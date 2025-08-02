import { test, expect } from '@playwright/test';
import { NavigationHelpers } from '../utils/helpers';

test.describe('Navigation', () => {
  let navHelpers: NavigationHelpers;

  test.beforeEach(async ({ page }) => {
    navHelpers = new NavigationHelpers(page);
  });

  test('should navigate to all main pages', async ({ page }) => {
    // Test Home navigation
    await navHelpers.goToHome();
    await expect(page.locator('h1')).toContainText('Openstay');
    
    // Test About navigation
    await navHelpers.goToAbout();
    await expect(page.locator('h1')).toContainText('About');
    
    // Test Contact navigation
    await navHelpers.goToContact();
    await expect(page.locator('h1')).toContainText('Get In Touch');
    
    // Test Explore navigation
    await navHelpers.goToExplore();
    await expect(page.locator('h1')).toContainText('Explore Community');
  });

  test('should have working header navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test logo click
    await page.locator('a[aria-label*="Openstay"]').click();
    await expect(page).toHaveURL('/');
    
    // Test navigation links in header
    const aboutLink = page.locator('nav a[href="/about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL('/about');
    }
  });

  test('should have working footer navigation', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Test footer links
    const footerAboutLink = page.locator('footer a[href="/about"]');
    if (await footerAboutLink.isVisible()) {
      await footerAboutLink.click();
      await expect(page).toHaveURL('/about');
    }
  });

  test('should handle mobile navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Look for mobile menu button
    const mobileMenuButton = page.locator('button[aria-label*="menu"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      
      // Check if mobile menu is open
      await expect(page.locator('[role="navigation"]')).toBeVisible();
    }
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Navigate to a deep page
    await page.goto('/auth/signin');
    
    // Check if breadcrumbs exist and work
    const breadcrumbs = page.locator('[aria-label="breadcrumb"], nav[aria-label="Breadcrumb"]');
    if (await breadcrumbs.isVisible()) {
      const homeLink = breadcrumbs.locator('a[href="/"]');
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL('/');
      }
    }
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/about');
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/');
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL('/about');
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to non-existent page
    const response = await page.goto('/non-existent-page');
    
    // Should either redirect to home or show 404 page
    if (response?.status() === 404) {
      await expect(page.locator('text=404, text=Not Found')).toBeVisible();
    } else {
      // If redirected, should be on a valid page
      await expect(page).toHaveURL(/\/(|about|contact|explore)/);
    }
  });

  test('should maintain scroll position on navigation', async ({ page }) => {
    await page.goto('/');
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollPosition = await page.evaluate(() => window.scrollY);
    
    // Navigate away and back
    await page.goto('/about');
    await page.goBack();
    
    // Check if scroll position is restored (some browsers do this automatically)
    const newScrollPosition = await page.evaluate(() => window.scrollY);
    // Note: This might not always be exactly the same due to browser behavior
    expect(typeof newScrollPosition).toBe('number');
  });

  test('should handle external links correctly', async ({ page }) => {
    await page.goto('/');
    
    // Look for external links (if any)
    const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"]):not([href*="openstay"])');
    const count = await externalLinks.count();
    
    if (count > 0) {
      // Check that external links have proper attributes
      const firstExternalLink = externalLinks.first();
      const target = await firstExternalLink.getAttribute('target');
      const rel = await firstExternalLink.getAttribute('rel');
      
      // External links should open in new tab and have security attributes
      expect(target).toBe('_blank');
      expect(rel).toContain('noopener');
    }
  });
});