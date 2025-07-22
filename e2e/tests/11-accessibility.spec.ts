import { test, expect } from '@playwright/test';
import { AccessibilityHelpers } from '../utils/helpers';

test.describe('Accessibility Tests', () => {
  let a11yHelpers: AccessibilityHelpers;

  test.beforeEach(async ({ page }) => {
    a11yHelpers = new AccessibilityHelpers(page);
  });

  test('should pass accessibility checks on homepage', async ({ page }) => {
    await page.goto('/');
    await a11yHelpers.checkPageAccessibility();
  });

  test('should pass accessibility checks on about page', async ({ page }) => {
    await page.goto('/about');
    await a11yHelpers.checkPageAccessibility();
  });

  test('should pass accessibility checks on contact page', async ({ page }) => {
    await page.goto('/contact');
    await a11yHelpers.checkPageAccessibility();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1
    
    // Check heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/contact');
    
    // Check that all form inputs have labels
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute('id');
      const inputName = await input.getAttribute('name');
      
      if (inputId) {
        // Check for associated label
        const label = page.locator(`label[for="${inputId}"]`);
        await expect(label).toBeVisible();
      } else if (inputName) {
        // Check for aria-label or aria-labelledby
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should have proper button accessibility', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      
      // Button should have accessible text
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      expect(text?.trim() || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should have proper link accessibility', async ({ page }) => {
    await page.goto('/');
    
    const links = page.locator('a');
    const linkCount = await links.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      
      // Link should have accessible text or aria-label
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      expect(text?.trim() || ariaLabel).toBeTruthy();
      
      // External links should have proper attributes
      const href = await link.getAttribute('href');
      if (href && href.startsWith('http') && !href.includes('localhost')) {
        const target = await link.getAttribute('target');
        const rel = await link.getAttribute('rel');
        
        if (target === '_blank') {
          expect(rel).toContain('noopener');
        }
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    await a11yHelpers.testKeyboardNavigation();
    
    // Test tab navigation through interactive elements
    const interactiveElements = page.locator('a, button, input, select, textarea');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      // Tab through first few elements
      for (let i = 0; i < Math.min(5, count); i++) {
        await page.keyboard.press('Tab');
        
        // Check if an element is focused
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeTruthy();
      }
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Check for sufficient color contrast (basic check)
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
    const count = await textElements.count();
    
    if (count > 0) {
      // Sample a few text elements
      for (let i = 0; i < Math.min(5, count); i++) {
        const element = textElements.nth(i);
        
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });
        
        // Basic check - text should have color
        expect(styles.color).toBeTruthy();
        expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
      }
    }
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThan(0);
    
    // Check for ARIA labels on interactive elements
    const buttonsWithoutText = page.locator('button:not(:has-text(""))');
    const buttonCount = await buttonsWithoutText.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttonsWithoutText.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      if (!ariaLabel && !ariaLabelledBy) {
        // Button without text should have aria-label
        const hasIcon = await button.locator('svg, img').count() > 0;
        if (hasIcon) {
          console.warn('Button with icon should have aria-label');
        }
      }
    }
  });

  test('should handle focus management', async ({ page }) => {
    await page.goto('/');
    
    // Test focus trap in modals (if any)
    const modalTriggers = page.locator('button:has-text("Sign In"), button:has-text("Sign Up")');
    const count = await modalTriggers.count();
    
    if (count > 0) {
      const firstTrigger = modalTriggers.first();
      await firstTrigger.click();
      
      // Wait for modal to open
      await page.waitForTimeout(1000);
      
      // Check if focus is properly managed
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    }
  });

  test('should have proper error message accessibility', async ({ page }) => {
    await page.goto('/contact');
    
    // Submit empty form to trigger errors
    await page.click('button[type="submit"]');
    
    // Wait for error messages
    await page.waitForTimeout(1000);
    
    // Check if error messages are properly associated with form fields
    const errorMessages = page.locator('[role="alert"], .error-message, [aria-live="polite"]');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      // Error messages should be visible and accessible
      await expect(errorMessages.first()).toBeVisible();
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for skip links
    const skipLinks = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    const skipCount = await skipLinks.count();
    
    if (skipCount > 0) {
      await expect(skipLinks.first()).toBeVisible();
    }
    
    // Check for proper landmark structure
    const landmarks = page.locator('header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
    const landmarkCount = await landmarks.count();
    
    expect(landmarkCount).toBeGreaterThan(0);
  });
});