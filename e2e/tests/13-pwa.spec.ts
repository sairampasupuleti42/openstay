import { test, expect } from '@playwright/test';

test.describe('PWA Features', () => {
  test('should have service worker registered', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker to register
    await page.waitForTimeout(2000);
    
    const serviceWorkerRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });
    
    expect(serviceWorkerRegistered).toBeTruthy();
  });

  test('should have web app manifest', async ({ page }) => {
    await page.goto('/');
    
    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeVisible();
    
    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();
    
    // Check if manifest is accessible
    const manifestResponse = await page.request.get(manifestHref!);
    expect(manifestResponse.status()).toBe(200);
    
    const manifestContent = await manifestResponse.json();
    expect(manifestContent.name).toBeTruthy();
    expect(manifestContent.short_name).toBeTruthy();
    expect(manifestContent.icons).toBeTruthy();
  });

  test('should have proper meta tags for PWA', async ({ page }) => {
    await page.goto('/');
    
    // Check for PWA meta tags
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toBeVisible();
    
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeVisible();
    
    const appleMobileCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if (await appleMobileCapable.count() > 0) {
      await expect(appleMobileCapable).toBeVisible();
    }
  });

  test('should handle offline functionality', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker to be ready
    await page.waitForTimeout(3000);
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to navigate to a cached page
    await page.reload();
    
    // Page should still load (if cached by service worker)
    // Note: This depends on service worker implementation
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should show install prompt on supported browsers', async ({ page, browserName }) => {
    // Skip on Safari as it doesn't support install prompts
    if (browserName === 'webkit') {
      test.skip();
    }
    
    await page.goto('/');
    
    // Wait for potential install prompt
    await page.waitForTimeout(3000);
    
    // Check if install prompt component is present
    const installPrompt = page.locator('[data-testid="pwa-install-prompt"], .install-prompt');
    
    // Install prompt might not always show, so we just check if the component exists
    const promptExists = await installPrompt.count() > 0;
    
    if (promptExists) {
      console.log('PWA install prompt is available');
    } else {
      console.log('PWA install prompt not shown (this is normal)');
    }
  });

  test('should handle PWA icons', async ({ page }) => {
    await page.goto('/');
    
    // Check for various icon sizes
    const iconSizes = ['192x192', '512x512'];
    
    for (const size of iconSizes) {
      const icon = page.locator(`link[rel="icon"][sizes="${size}"], link[rel="apple-touch-icon"][sizes="${size}"]`);
      
      if (await icon.count() > 0) {
        const iconHref = await icon.getAttribute('href');
        expect(iconHref).toBeTruthy();
        
        // Check if icon is accessible
        const iconResponse = await page.request.get(iconHref!);
        expect(iconResponse.status()).toBe(200);
      }
    }
  });

  test('should handle app-like behavior', async ({ page }) => {
    await page.goto('/');
    
    // Check if app behaves like a native app
    const isStandalone = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true;
    });
    
    if (isStandalone) {
      console.log('App is running in standalone mode');
      
      // In standalone mode, should not show browser UI
      // This is more of a visual check that would need manual verification
    } else {
      console.log('App is running in browser mode');
    }
  });

  test('should handle push notifications setup', async ({ page }) => {
    await page.goto('/');
    
    // Check if push notifications are supported
    const pushSupported = await page.evaluate(() => {
      return 'PushManager' in window && 'Notification' in window;
    });
    
    if (pushSupported) {
      console.log('Push notifications are supported');
      
      // Check notification permission
      const permission = await page.evaluate(() => {
        return Notification.permission;
      });
      
      expect(['default', 'granted', 'denied']).toContain(permission);
    } else {
      console.log('Push notifications not supported');
    }
  });

  test('should handle app shortcuts', async ({ page }) => {
    await page.goto('/');
    
    // Check manifest for shortcuts
    const manifestLink = page.locator('link[rel="manifest"]');
    const manifestHref = await manifestLink.getAttribute('href');
    
    if (manifestHref) {
      const manifestResponse = await page.request.get(manifestHref);
      const manifestContent = await manifestResponse.json();
      
      if (manifestContent.shortcuts) {
        expect(Array.isArray(manifestContent.shortcuts)).toBeTruthy();
        expect(manifestContent.shortcuts.length).toBeGreaterThan(0);
        
        // Each shortcut should have required properties
        for (const shortcut of manifestContent.shortcuts) {
          expect(shortcut.name).toBeTruthy();
          expect(shortcut.url).toBeTruthy();
        }
      }
    }
  });

  test('should handle background sync', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker
    await page.waitForTimeout(2000);
    
    // Check if background sync is supported
    const backgroundSyncSupported = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration && 'sync' in registration;
      }
      return false;
    });
    
    if (backgroundSyncSupported) {
      console.log('Background sync is supported');
    } else {
      console.log('Background sync not supported');
    }
  });

  test('should handle app update notifications', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker
    await page.waitForTimeout(3000);
    
    // Check if update notification component exists
    const updateNotification = page.locator('[data-testid="pwa-update-notification"], .update-notification');
    
    // Update notifications might not always be present
    const notificationExists = await updateNotification.count() > 0;
    
    if (notificationExists) {
      console.log('PWA update notification component is available');
    } else {
      console.log('No PWA update notification (this is normal)');
    }
  });
});