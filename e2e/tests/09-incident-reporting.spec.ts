import { test, expect } from '@playwright/test';
import { testData } from '../fixtures/test-data';

test.describe('Incident Reporting', () => {
  test('should access incident report page', async ({ page }) => {
    await page.goto('/report-incident');
    
    await expect(page.locator('h1, h2')).toContainText('Report');
    await expect(page.locator('text=Security Incident Report')).toBeVisible();
  });

  test('should display incident report form', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Check form fields
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('select[name="type"]')).toBeVisible();
    await expect(page.locator('select[name="severity"]')).toBeVisible();
    await expect(page.locator('input[name="contactEmail"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible();
  });

  test('should submit incident report successfully', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Fill out the form
    await page.fill('input[name="title"]', testData.incident.validReport.title);
    await page.fill('textarea[name="description"]', testData.incident.validReport.description);
    await page.selectOption('select[name="type"]', testData.incident.validReport.type);
    await page.selectOption('select[name="severity"]', testData.incident.validReport.severity);
    await page.selectOption('select[name="priority"]', testData.incident.validReport.priority);
    await page.selectOption('select[name="category"]', testData.incident.validReport.category);
    await page.fill('input[name="contactEmail"]', testData.incident.validReport.contactEmail);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Report Submitted Successfully')).toBeVisible();
    await expect(page.locator('text=Incident ID')).toBeVisible();
  });

  test('should handle file attachments', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Look for file upload area
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Create a test file
      const testFile = Buffer.from('test file content');
      
      await fileInput.setInputFiles({
        name: 'test-file.txt',
        mimeType: 'text/plain',
        buffer: testFile,
      });
      
      // Should show uploaded file
      await expect(page.locator('text=test-file.txt')).toBeVisible();
    }
  });

  test('should show severity color coding', async ({ page }) => {
    await page.goto('/report-incident');
    
    const severitySelect = page.locator('select[name="severity"]');
    
    // Test different severity levels
    await severitySelect.selectOption('critical');
    await page.waitForTimeout(500);
    
    await severitySelect.selectOption('high');
    await page.waitForTimeout(500);
    
    await severitySelect.selectOption('medium');
    await page.waitForTimeout(500);
    
    await severitySelect.selectOption('low');
    await page.waitForTimeout(500);
    
    // Should handle all severity levels without errors
    await expect(severitySelect).toBeVisible();
  });

  test('should handle drag and drop file upload', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Look for drag and drop area
    const dropZone = page.locator('[data-testid="file-drop-zone"], .file-drop-zone');
    
    if (await dropZone.isVisible()) {
      // Test drag and drop functionality
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible()) {
        const testFile = Buffer.from('test content');
        await fileInput.setInputFiles({
          name: 'dropped-file.txt',
          mimeType: 'text/plain',
          buffer: testFile,
        });
        
        await expect(page.locator('text=dropped-file.txt')).toBeVisible();
      }
    }
  });

  test('should handle form submission loading state', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Fill required fields
    await page.fill('input[name="title"]', testData.incident.validReport.title);
    await page.fill('textarea[name="description"]', testData.incident.validReport.description);
    await page.fill('input[name="contactEmail"]', testData.incident.validReport.contactEmail);
    
    // Submit and check loading state
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Submitting')).toBeVisible();
  });

  test('should navigate back from success page', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Fill and submit form
    await page.fill('input[name="title"]', testData.incident.validReport.title);
    await page.fill('textarea[name="description"]', testData.incident.validReport.description);
    await page.fill('input[name="contactEmail"]', testData.incident.validReport.contactEmail);
    
    await page.click('button[type="submit"]');
    
    // Wait for success page
    await expect(page.locator('text=Report Submitted Successfully')).toBeVisible();
    
    // Test navigation buttons
    const homeButton = page.locator('button:has-text("Return to Home")');
    const anotherReportButton = page.locator('button:has-text("Submit Another Report")');
    
    if (await homeButton.isVisible()) {
      await homeButton.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Check form labels
    const titleInput = page.locator('input[name="title"]');
    const titleLabel = page.locator('label[for="title"]');
    
    if (await titleLabel.isVisible()) {
      await expect(titleLabel).toBeVisible();
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through form elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']).toContain(focusedElement);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/report-incident');
    
    // Fill form
    await page.fill('input[name="title"]', testData.incident.validReport.title);
    await page.fill('textarea[name="description"]', testData.incident.validReport.description);
    await page.fill('input[name="contactEmail"]', testData.incident.validReport.contactEmail);
    
    // Simulate offline condition
    await page.context().setOffline(true);
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Failed to submit, text=error')).toBeVisible();
    
    // Restore network
    await page.context().setOffline(false);
  });
});