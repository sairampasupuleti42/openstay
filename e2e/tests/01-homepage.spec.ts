import { test, expect } from '@playwright/test';
import { NavigationHelpers, ScreenshotHelpers, AccessibilityHelpers } from '../utils/helpers';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    const nav = new NavigationHelpers(page);
    await nav.goToHome();
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Host or Travel with');
    await expect(page.locator('h1')).toContainText('Openstay');
    
    // Check main description
    await expect(page.locator('text=Connect with verified local hosts')).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    // Test About link
    await page.locator('text=Learn More About Us').click();
    await expect(page).toHaveURL('/about');
    
    // Go back to home
    await page.goto('/');
    
    // Test Contact link
    await page.locator('text=Get In Touch').click();
    await expect(page).toHaveURL('/contact');
  });

  test('should display statistics section', async ({ page }) => {
    await expect(page.locator('text=10K+')).toBeVisible();
    await expect(page.locator('text=Verified Hosts')).toBeVisible();
    await expect(page.locator('text=50K+')).toBeVisible();
    await expect(page.locator('text=Happy Travelers')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    
    // Test search input
    await searchInput.fill('Paris');
    await searchInput.press('Enter');
    
    // Should navigate to search results
    await expect(page).toHaveURL(/\/search/);
  });

  test('should display feature cards', async ({ page }) => {
    await expect(page.locator('text=Why Choose Openstay?')).toBeVisible();
    await expect(page.locator('text=Verified Community')).toBeVisible();
    await expect(page.locator('text=Authentic Experiences')).toBeVisible();
    await expect(page.locator('text=Group Travel')).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should pass accessibility checks', async ({ page }) => {
    const a11y = new AccessibilityHelpers(page);
    await a11y.checkPageAccessibility();
    await a11y.testKeyboardNavigation();
  });

  test('should take homepage screenshot', async ({ page }) => {
    const screenshot = new ScreenshotHelpers(page);
    await screenshot.takeFullPageScreenshot('homepage-full');
  });
});