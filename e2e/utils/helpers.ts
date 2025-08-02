import { Page, expect } from '@playwright/test';

// Navigation helpers
export class NavigationHelpers {
  constructor(private page: Page) {}

  async goToHome() {
    await this.page.goto('/');
    await expect(this.page).toHaveURL('/');
  }

  async goToAbout() {
    await this.page.goto('/about');
    await expect(this.page).toHaveURL('/about');
  }

  async goToContact() {
    await this.page.goto('/contact');
    await expect(this.page).toHaveURL('/contact');
  }

  async goToExplore() {
    await this.page.goto('/explore');
    await expect(this.page).toHaveURL('/explore');
  }

  async goToSignIn() {
    await this.page.goto('/auth/signin');
    await expect(this.page).toHaveURL('/auth/signin');
  }

  async goToSignUp() {
    await this.page.goto('/auth/signup');
    await expect(this.page).toHaveURL('/auth/signup');
  }
}

// Authentication helpers
export class AuthHelpers {
  constructor(private page: Page) {}

  async signUp(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.page.goto('/auth/signup');
    
    await this.page.locator('input[name="firstName"]').fill(userData.firstName);
    await this.page.locator('input[name="lastName"]').fill(userData.lastName);
    await this.page.locator('input[name="email"]').fill(userData.email);
    await this.page.locator('input[name="password"]').fill(userData.password);
    await this.page.locator('input[name="confirmPassword"]').fill(userData.password);
    
    // Accept terms
    await this.page.locator('input[name="terms"]').check();
    
    await this.page.locator('button[type="submit"]').click();
  }

  async signIn(email: string, password: string) {
    await this.page.goto('/auth/signin');
    
    await this.page.locator('input[name="emailOrPhone"]').fill(email);
    await this.page.locator('input[name="password"]').fill(password);
    
    await this.page.locator('button[type="submit"]').click();
  }

  async signOut() {
    // Click on user profile dropdown
    await this.page.click('[data-testid="user-profile-dropdown"]');
    
    // Click sign out
    await this.page.click('text=Sign Out');
    
    // Verify redirected to home page
    await expect(this.page).toHaveURL('/');
  }

  async isSignedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-profile-dropdown"]', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Form helpers
export class FormHelpers {
  constructor(private page: Page) {}

  async fillContactForm(formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    await this.page.locator('input[name="name"]').fill(formData.name);
    await this.page.locator('input[name="email"]').fill(formData.email);
    await this.page.locator('input[name="subject"]').fill(formData.subject);
    await this.page.locator('textarea[name="message"]').fill(formData.message);
  }

  async submitForm() {
    await this.page.locator('button[type="submit"]').click();
  }

  async waitForSuccessMessage() {
    await expect(this.page.locator('text=Message sent successfully')).toBeVisible();
  }

  async waitForErrorMessage() {
    await expect(this.page.locator('[role="alert"]')).toBeVisible();
  }
}

// Search helpers
export class SearchHelpers {
  constructor(private page: Page) {}

  async searchFor(query: string) {
    await this.page.fill('input[placeholder*="Search"]', query);
    await this.page.press('input[placeholder*="Search"]', 'Enter');
  }

  async applyFilters(filters: {
    type?: string;
    priceRange?: string;
    rating?: number;
  }) {
    // Open filters if not already open
    const filterButton = this.page.locator('button:has-text("Filters")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    if (filters.type) {
      await this.page.selectOption('select[name="type"]', filters.type);
    }

    if (filters.priceRange) {
      await this.page.selectOption('select[name="priceRange"]', filters.priceRange);
    }

    if (filters.rating) {
      await this.page.selectOption('select[name="rating"]', filters.rating.toString());
    }
  }

  async getSearchResults() {
    await this.page.waitForSelector('[data-testid="search-results"]');
    return await this.page.locator('[data-testid="search-result-item"]').count();
  }
}

// Wait helpers
export class WaitHelpers {
  constructor(private page: Page) {}

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForText(text: string, timeout = 10000) {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  async waitForURL(url: string | RegExp, timeout = 10000) {
    await this.page.waitForURL(url, { timeout });
  }
}

// Screenshot helpers
export class ScreenshotHelpers {
  constructor(private page: Page) {}

  async takeFullPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}.png`, 
      fullPage: true 
    });
  }

  async takeElementScreenshot(selector: string, name: string) {
    await this.page.locator(selector).screenshot({ 
      path: `e2e/screenshots/${name}.png` 
    });
  }
}

// Accessibility helpers
export class AccessibilityHelpers {
  constructor(private page: Page) {}

  async checkPageAccessibility() {
    // Check for basic accessibility requirements
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);

    // Check for alt text on images
    const images = await this.page.locator('img').count();
    if (images > 0) {
      const imagesWithAlt = await this.page.locator('img[alt]').count();
      expect(imagesWithAlt).toBe(images);
    }

    // Check for form labels
    const inputs = await this.page.locator('input[type="text"], input[type="email"], textarea').count();
    if (inputs > 0) {
      const inputsWithLabels = await this.page.locator('input[aria-label], input[aria-labelledby], textarea[aria-label], textarea[aria-labelledby]').count();
      expect(inputsWithLabels).toBeGreaterThan(0);
    }
  }

  async testKeyboardNavigation() {
    // Test tab navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  }
}

// Performance helpers
export class PerformanceHelpers {
  constructor(private page: Page) {}

  async measurePageLoadTime() {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    const endTime = Date.now();
    return endTime - startTime;
  }

  async checkCoreWebVitals() {
    const metrics = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries);
        }).observe({ entryTypes: ['navigation', 'paint'] });
      });
    });
    
    return metrics;
  }
}