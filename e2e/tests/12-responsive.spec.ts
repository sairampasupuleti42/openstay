import { test, expect } from '@playwright/test';

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile Portrait', width: 375, height: 667 },
    { name: 'Mobile Landscape', width: 667, height: 375 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Desktop Small', width: 1280, height: 720 },
    { name: 'Desktop Large', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Check if main content is visible
      await expect(page.locator('h1')).toBeVisible();
      
      // Check if navigation is accessible
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check if content doesn't overflow
      const body = page.locator('body');
      const bodyWidth = await body.evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin
    });
  }

  test('should handle mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Look for mobile menu button
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")');
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      
      // Mobile menu should open
      await page.waitForTimeout(500);
      
      // Check if menu items are visible
      const menuItems = page.locator('nav a, .mobile-menu a');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);
      
      // Close menu
      await mobileMenuButton.click();
    }
  });

  test('should handle touch interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Test touch-friendly button sizes
    const buttons = page.locator('button, a');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(5, buttonCount); i++) {
      const button = buttons.nth(i);
      
      if (await button.isVisible()) {
        const boundingBox = await button.boundingBox();
        
        if (boundingBox) {
          // Touch targets should be at least 44px (iOS) or 48px (Android)
          expect(boundingBox.height).toBeGreaterThanOrEqual(40);
          expect(boundingBox.width).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('should handle form layouts on different screen sizes', async ({ page }) => {
    await page.goto('/contact');
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Form should be visible and usable
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Form fields should not overflow
      const form = page.locator('form');
      const formWidth = await form.evaluate(el => el.scrollWidth);
      expect(formWidth).toBeLessThanOrEqual(viewport.width + 50); // Allow some margin
    }
  });

  test('should handle image responsiveness', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Check first few images
        for (let i = 0; i < Math.min(3, imageCount); i++) {
          const img = images.nth(i);
          
          if (await img.isVisible()) {
            const boundingBox = await img.boundingBox();
            
            if (boundingBox) {
              // Images should not exceed viewport width
              expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
            }
          }
        }
      }
    }
  });

  test('should handle text readability on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check font sizes
    const textElements = page.locator('p, span, div:not(:empty)');
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(5, count); i++) {
      const element = textElements.nth(i);
      
      if (await element.isVisible()) {
        const fontSize = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return parseFloat(computed.fontSize);
        });
        
        // Font size should be at least 14px for readability on mobile
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    }
  });

  test('should handle horizontal scrolling', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Check for horizontal overflow
      const horizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      // Should not have horizontal scroll unless intentional
      expect(horizontalScroll).toBeFalsy();
    }
  });

  test('should handle search interface on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      // Search input should be usable on mobile
      await searchInput.click();
      await searchInput.fill('test search');
      
      // Should not cause layout issues
      const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375 + 20);
    }
  });

  test('should handle card layouts responsively', async ({ page }) => {
    await page.goto('/explore');
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const cards = page.locator('[data-testid="user-card"], .user-card, .card');
      const cardCount = await cards.count();
      
      if (cardCount > 0) {
        // Cards should be visible and properly sized
        const firstCard = cards.first();
        
        if (await firstCard.isVisible()) {
          const boundingBox = await firstCard.boundingBox();
          
          if (boundingBox) {
            // Card should not exceed viewport width
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
          }
        }
      }
    }
  });

  test('should handle navigation responsively', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Navigation should be accessible
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
      
      // Check if navigation adapts to screen size
      if (viewport.width < 768) {
        // Mobile: should have hamburger menu or mobile navigation
        const mobileNav = page.locator('button[aria-label*="menu"], .mobile-menu');
        const hasMobileNav = await mobileNav.count() > 0;
        
        if (hasMobileNav) {
          await expect(mobileNav.first()).toBeVisible();
        }
      } else {
        // Desktop: should have full navigation
        const desktopNav = page.locator('nav a');
        const navLinkCount = await desktopNav.count();
        expect(navLinkCount).toBeGreaterThan(0);
      }
    }
  });
});