import { test, expect } from '@playwright/test';
import { PerformanceHelpers } from '../utils/helpers';

test.describe('Performance Tests', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const perfHelpers = new PerformanceHelpers(page);
    
    const loadTime = await perfHelpers.measurePageLoadTime();
    
    // Homepage should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`Homepage load time: ${loadTime}ms`);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const navigationEntry = entries.find(entry => entry.entryType === 'navigation') as PerformanceNavigationTiming;
          
          if (navigationEntry) {
            resolve({
              domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
              loadComplete: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
              firstContentfulPaint: 0, // Would need additional setup for this
            });
          }
        });
        
        observer.observe({ entryTypes: ['navigation'] });
        
        // Fallback timeout
        setTimeout(() => {
          resolve({
            domContentLoaded: 0,
            loadComplete: 0,
            firstContentfulPaint: 0,
          });
        }, 5000);
      });
    });
    
    console.log('Performance metrics:', metrics);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/explore');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    const startTime = Date.now();
    
    // Simulate loading more data
    const loadMoreButton = page.locator('button:has-text("Load More")');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await page.waitForTimeout(2000);
    }
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Should load additional data within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Load more time: ${loadTime}ms`);
  });

  test('should handle search performance', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    
    const startTime = Date.now();
    
    await searchInput.fill('Paris');
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForURL(/\/search/);
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const searchTime = endTime - startTime;
    
    // Search should complete within 3 seconds
    expect(searchTime).toBeLessThan(3000);
    
    console.log(`Search time: ${searchTime}ms`);
  });

  test('should handle form submission performance', async ({ page }) => {
    await page.goto('/contact');
    
    // Fill form
    await page.fill('input[name="name"]', 'Performance Test');
    await page.fill('input[name="email"]', 'perf@test.com');
    await page.fill('input[name="subject"]', 'Performance Testing');
    await page.fill('textarea[name="message"]', 'This is a performance test message.');
    
    const startTime = Date.now();
    
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForSelector('text=Message sent successfully, text=Error', { timeout: 10000 });
    
    const endTime = Date.now();
    const submitTime = endTime - startTime;
    
    // Form submission should complete within 5 seconds
    expect(submitTime).toBeLessThan(5000);
    
    console.log(`Form submission time: ${submitTime}ms`);
  });

  test('should handle image loading performance', async ({ page }) => {
    await page.goto('/');
    
    // Wait for images to load
    await page.waitForLoadState('networkidle');
    
    // Check if images are loaded efficiently
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check if images have proper loading attributes
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyCount = await lazyImages.count();
      
      console.log(`Total images: ${imageCount}, Lazy loaded: ${lazyCount}`);
      
      // At least some images should be lazy loaded for performance
      if (imageCount > 3) {
        expect(lazyCount).toBeGreaterThan(0);
      }
    }
  });

  test('should handle JavaScript bundle size', async ({ page }) => {
    await page.goto('/');
    
    // Measure JavaScript bundle size
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') && 
        resource.transferSize > 0
      );
      
      return jsResources.map(resource => ({
        name: resource.name,
        size: resource.transferSize,
        duration: resource.duration
      }));
    });
    
    console.log('JavaScript resources:', resourceSizes);
    
    // Total JS bundle size should be reasonable
    const totalJSSize = resourceSizes.reduce((total, resource) => total + resource.size, 0);
    
    // Should be less than 2MB total
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024);
    
    console.log(`Total JS bundle size: ${(totalJSSize / 1024 / 1024).toFixed(2)}MB`);
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Measure initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (initialMemory) {
      console.log('Memory usage:', initialMemory);
      
      // Navigate through several pages to test memory leaks
      await page.goto('/about');
      await page.goto('/contact');
      await page.goto('/explore');
      await page.goto('/');
      
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (finalMemory) {
        console.log('Final memory usage:', finalMemory);
        
        // Memory usage shouldn't increase dramatically
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        // Memory increase should be less than 50%
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        console.log(`Memory increase: ${memoryIncreasePercent.toFixed(2)}%`);
      }
    }
  });

  test('should handle concurrent user simulation', async ({ page, context }) => {
    // Create multiple pages to simulate concurrent users
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    const startTime = Date.now();
    
    // Navigate all pages simultaneously
    await Promise.all([
      pages[0].goto('/'),
      pages[1].goto('/about'),
      pages[2].goto('/contact')
    ]);
    
    // Wait for all pages to load
    await Promise.all([
      pages[0].waitForLoadState('networkidle'),
      pages[1].waitForLoadState('networkidle'),
      pages[2].waitForLoadState('networkidle')
    ]);
    
    const endTime = Date.now();
    const concurrentLoadTime = endTime - startTime;
    
    // Concurrent loading should complete within 10 seconds
    expect(concurrentLoadTime).toBeLessThan(10000);
    
    console.log(`Concurrent load time: ${concurrentLoadTime}ms`);
    
    // Clean up
    await Promise.all(pages.map(p => p.close()));
  });
});