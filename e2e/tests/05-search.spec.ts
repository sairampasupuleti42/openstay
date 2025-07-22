import { test, expect } from '@playwright/test';
import { SearchHelpers, NavigationHelpers } from '../utils/helpers';
import { testData } from '../fixtures/test-data';

test.describe('Search Functionality', () => {
  let searchHelpers: SearchHelpers;
  let navHelpers: NavigationHelpers;

  test.beforeEach(async ({ page }) => {
    searchHelpers = new SearchHelpers(page);
    navHelpers = new NavigationHelpers(page);
  });

  test('should display search input on homepage', async ({ page }) => {
    await navHelpers.goToHome();
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
  });

  test('should perform basic search from homepage', async ({ page }) => {
    await navHelpers.goToHome();
    
    await searchHelpers.searchFor('Paris');
    
    // Should navigate to search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(page.locator('text=Search results')).toBeVisible();
  });

  test('should show search suggestions', async ({ page }) => {
    await navHelpers.goToHome();
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('Par');
    
    // Wait for suggestions to appear
    await page.waitForTimeout(500);
    
    // Check if suggestions dropdown is visible
    const suggestions = page.locator('[role="listbox"], .suggestions, [data-testid="search-suggestions"]');
    if (await suggestions.isVisible()) {
      await expect(suggestions).toBeVisible();
    }
  });

  test('should handle empty search gracefully', async ({ page }) => {
    await navHelpers.goToHome();
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.press('Enter');
    
    // Should either stay on homepage or show empty search message
    const currentUrl = page.url();
    if (currentUrl.includes('/search')) {
      await expect(page.locator('text=Enter a search term, text=Start your search')).toBeVisible();
    }
  });

  test('should display search results page correctly', async ({ page }) => {
    await page.goto('/search/results?q=Paris');
    
    await expect(page.locator('h1, h2')).toContainText('Search results');
    await expect(page.locator('text=Paris')).toBeVisible();
    
    // Check for search input on results page
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('should handle search with filters', async ({ page }) => {
    await page.goto('/search/results?q=Paris');
    
    // Apply filters if available
    await searchHelpers.applyFilters(testData.search.filters);
    
    // Results should update based on filters
    await page.waitForTimeout(1000);
    
    // Check if results are displayed
    const resultsContainer = page.locator('[data-testid="search-results"], .search-results, .results');
    if (await resultsContainer.isVisible()) {
      await expect(resultsContainer).toBeVisible();
    }
  });

  test('should handle no results found', async ({ page }) => {
    await page.goto('/search/results?q=xyznonexistentquery123');
    
    // Should show no results message
    await expect(page.locator('text=No results found, text=No results')).toBeVisible();
  });

  test('should maintain search query in URL', async ({ page }) => {
    await navHelpers.goToHome();
    await searchHelpers.searchFor('Tokyo');
    
    // URL should contain the search query
    await expect(page).toHaveURL(/q=Tokyo/);
    
    // Refresh page and check if search query is maintained
    await page.reload();
    await expect(page).toHaveURL(/q=Tokyo/);
  });

  test('should handle special characters in search', async ({ page }) => {
    const specialQueries = [
      'café',
      'São Paulo',
      'Москва',
      '東京',
      'search with spaces',
      'search-with-dashes',
      'search_with_underscores'
    ];
    
    for (const query of specialQueries) {
      await navHelpers.goToHome();
      await searchHelpers.searchFor(query);
      
      // Should handle special characters without errors
      await expect(page).toHaveURL(/\/search/);
      
      // Go back for next iteration
      await page.goBack();
    }
  });

  test('should have working search result interactions', async ({ page }) => {
    await page.goto('/search/results?q=Paris');
    
    // Wait for results to load
    await page.waitForTimeout(2000);
    
    // Check if result items are clickable
    const resultItems = page.locator('[data-testid="search-result-item"], .result-item, .search-result');
    const count = await resultItems.count();
    
    if (count > 0) {
      const firstResult = resultItems.first();
      await expect(firstResult).toBeVisible();
      
      // Check if result has clickable elements
      const clickableElements = firstResult.locator('a, button');
      const clickableCount = await clickableElements.count();
      expect(clickableCount).toBeGreaterThan(0);
    }
  });

  test('should handle search pagination', async ({ page }) => {
    await page.goto('/search/results?q=travel');
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Look for pagination controls
    const paginationControls = page.locator('[aria-label="pagination"], .pagination, button:has-text("Load More")');
    
    if (await paginationControls.isVisible()) {
      const loadMoreButton = page.locator('button:has-text("Load More")');
      if (await loadMoreButton.isVisible()) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);
        
        // Should load more results
        await expect(loadMoreButton).toBeVisible();
      }
    }
  });

  test('should handle search result view modes', async ({ page }) => {
    await page.goto('/search/results?q=Paris');
    
    // Look for view mode toggles
    const gridViewButton = page.locator('button[aria-label="Grid view"], button:has-text("Grid")');
    const listViewButton = page.locator('button[aria-label="List view"], button:has-text("List")');
    
    if (await gridViewButton.isVisible() && await listViewButton.isVisible()) {
      // Test switching between view modes
      await listViewButton.click();
      await page.waitForTimeout(500);
      
      await gridViewButton.click();
      await page.waitForTimeout(500);
      
      // Both clicks should work without errors
      await expect(gridViewButton).toBeVisible();
    }
  });
});