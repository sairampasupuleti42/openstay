import { test, expect } from '@playwright/test';
import { NavigationHelpers, FormHelpers } from '../utils/helpers';
import { testData } from '../fixtures/test-data';

test.describe('Contact Form', () => {
  let navHelpers: NavigationHelpers;
  let formHelpers: FormHelpers;

  test.beforeEach(async ({ page }) => {
    navHelpers = new NavigationHelpers(page);
    formHelpers = new FormHelpers(page);
    await navHelpers.goToContact();
  });

  test('should display contact form correctly', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText('Get In Touch');
    
    // Check form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="subject"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display contact information', async ({ page }) => {
    await expect(page.locator('text=Contact Information')).toBeVisible();
    await expect(page.locator('text=sairampasupuleti.42@gmail.com')).toBeVisible();
    await expect(page.locator('text=+91 (998) 993-8828')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await formHelpers.submitForm();
    
    // Should show validation errors
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    await expect(page.locator('text=Subject must be at least 5 characters')).toBeVisible();
    await expect(page.locator('text=Message must be at least 10 characters')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await formHelpers.submitForm();
    
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('should validate field lengths', async ({ page }) => {
    await formHelpers.fillContactForm(testData.contact.invalidForm);
    await formHelpers.submitForm();
    
    // Should show length validation errors
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Subject must be at least 5 characters')).toBeVisible();
    await expect(page.locator('text=Message must be at least 10 characters')).toBeVisible();
  });

  test('should submit valid form successfully', async ({ page }) => {
    await formHelpers.fillContactForm(testData.contact.validForm);
    await formHelpers.submitForm();
    
    // Wait for success message
    await formHelpers.waitForSuccessMessage();
    
    // Form should be reset after successful submission
    await expect(page.locator('input[name="name"]')).toHaveValue('');
    await expect(page.locator('input[name="email"]')).toHaveValue('');
    await expect(page.locator('input[name="subject"]')).toHaveValue('');
    await expect(page.locator('textarea[name="message"]')).toHaveValue('');
  });

  test('should handle form submission loading state', async ({ page }) => {
    await formHelpers.fillContactForm(testData.contact.validForm);
    
    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('text=Sending Message')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline condition
    await page.context().setOffline(true);
    
    await formHelpers.fillContactForm(testData.contact.validForm);
    await formHelpers.submitForm();
    
    // Should show error message
    await formHelpers.waitForErrorMessage();
    
    // Restore network
    await page.context().setOffline(false);
  });

  test('should be accessible', async ({ page }) => {
    // Check form labels
    const nameInput = page.locator('input[name="name"]');
    const nameLabel = page.locator('label[for="name"], label:has(input[name="name"])');
    await expect(nameLabel).toBeVisible();
    
    // Check ARIA attributes
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="name"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();
  });

  test('should handle special characters in form fields', async ({ page }) => {
    const specialCharData = {
      name: 'José María O\'Connor-Smith',
      email: 'jose.maria@example.com',
      subject: 'Test with special chars: àáâãäåæçèéêë',
      message: 'Message with emojis 🎉 and special characters: ñüöß'
    };
    
    await formHelpers.fillContactForm(specialCharData);
    await formHelpers.submitForm();
    
    // Should handle special characters without issues
    await formHelpers.waitForSuccessMessage();
  });

  test('should prevent XSS attacks', async ({ page }) => {
    const xssData = {
      name: '<script>alert("xss")</script>',
      email: 'test@example.com',
      subject: '<img src=x onerror=alert("xss")>',
      message: 'javascript:alert("xss")'
    };
    
    await formHelpers.fillContactForm(xssData);
    await formHelpers.submitForm();
    
    // Should either sanitize input or show validation error
    // The form should not execute any scripts
    const alerts = page.locator('text=xss');
    await expect(alerts).not.toBeVisible();
  });
});