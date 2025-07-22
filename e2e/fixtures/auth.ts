import { test as base, expect } from '@playwright/test';

// Test user credentials for automation
export const TEST_USER = {
  email: 'test@openstay.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User'
};

// Extended test with authentication helpers
export const test = base.extend<{
  authenticatedPage: any;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to sign in page
    await page.goto('/auth/signin');
    
    // Fill in credentials
    await page.fill('input[name="emailOrPhone"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for successful authentication
    await expect(page).toHaveURL(/\/(onboarding|$)/);
    
    // If redirected to onboarding, complete it quickly
    if (page.url().includes('/onboarding')) {
      await completeOnboarding(page);
    }
    
    await use(page);
  },
});

async function completeOnboarding(page: any) {
  // Skip profile picture
  const skipButton = page.locator('text=Skip for now');
  if (await skipButton.isVisible()) {
    await skipButton.click();
  }
  
  // Skip personal info if present
  const skipPersonalInfo = page.locator('text=Skip this step');
  if (await skipPersonalInfo.isVisible()) {
    await skipPersonalInfo.click();
  }
  
  // Complete onboarding
  const continueButton = page.locator('text=Continue to Openstay');
  if (await continueButton.isVisible()) {
    await continueButton.click();
  }
  
  // Wait for home page
  await expect(page).toHaveURL('/');
}

export { expect };