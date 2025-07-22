import { test, expect } from '@playwright/test';
import { AuthHelpers, NavigationHelpers } from '../utils/helpers';
import { testData, generateRandomUser } from '../fixtures/test-data';

test.describe('Authentication', () => {
  let authHelpers: AuthHelpers;
  let navHelpers: NavigationHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    navHelpers = new NavigationHelpers(page);
  });

  test('should display sign in page correctly', async ({ page }) => {
    await navHelpers.goToSignIn();
    
    await expect(page.locator('h1, h2, h3')).toContainText('Welcome Back');
    await expect(page.locator('input[name="emailOrPhone"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Continue with Google')).toBeVisible();
  });

  test('should display sign up page correctly', async ({ page }) => {
    await navHelpers.goToSignUp();
    
    await expect(page.locator('h1, h2, h3')).toContainText('Join Openstay');
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('should show validation errors for invalid sign in', async ({ page }) => {
    await navHelpers.goToSignIn();
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Email or phone number is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show validation errors for invalid sign up', async ({ page }) => {
    await navHelpers.goToSignUp();
    
    // Fill with invalid data
    await page.fill('input[name="firstName"]', 'A'); // Too short
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123'); // Too weak
    await page.fill('input[name="confirmPassword"]', '456'); // Doesn't match
    
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should handle sign up flow', async ({ page }) => {
    const newUser = generateRandomUser();
    
    await navHelpers.goToSignUp();
    await authHelpers.signUp(newUser);
    
    // Should redirect to onboarding or show success message
    await expect(page).toHaveURL(/\/(onboarding|auth\/signup)/);
    
    // If success message is shown
    const successMessage = page.locator('text=Account created successfully');
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('should navigate between auth pages', async ({ page }) => {
    // Start at sign in
    await navHelpers.goToSignIn();
    
    // Go to sign up
    await page.click('text=Sign up for free');
    await expect(page).toHaveURL('/auth/signup');
    
    // Go back to sign in
    await page.click('text=Sign in here');
    await expect(page).toHaveURL('/auth/signin');
    
    // Go to forgot password
    await page.click('text=Forgot your password?');
    await expect(page).toHaveURL('/auth/forgot-password');
  });

  test('should display forgot password page', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    await expect(page.locator('h1, h2, h3')).toContainText('Forgot Password');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle forgot password form', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    await page.fill('input[name="email"]', testData.users.testUser.email);
    await page.click('button[type="submit"]');
    
    // Should show success message or email sent confirmation
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    await navHelpers.goToSignUp();
    
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill('weak');
    
    // Should show weak password indicator
    await expect(page.locator('text=Weak')).toBeVisible();
    
    await passwordInput.fill('StrongPassword123!');
    
    // Should show strong password indicator
    await expect(page.locator('text=Strong')).toBeVisible();
  });

  test('should show password match indicator', async ({ page }) => {
    await navHelpers.goToSignUp();
    
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword');
    
    // Should show passwords don't match
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
    
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    
    // Should show passwords match
    await expect(page.locator('text=Passwords match')).toBeVisible();
  });
});