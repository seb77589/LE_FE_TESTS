import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Document Analytics Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await TestHelpers.clearApplicationData(page);
  });

  test('should switch between Documents and Analytics tabs', async ({ page, workerCredentials }) => {
    try {
      // Login using worker credentials (more reliable than registration)
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );

      // Navigate to the documents page
      await page.goto('/dashboard/documents');
      await page.waitForLoadState('networkidle');

      // Verify we're on the documents page
      await expect(page).toHaveURL(/\/dashboard\/documents/);

      // Verify Documents tab is active by default
      // Use more specific selector to avoid matching "Upload Documents" button
      const documentsTab = page
        .locator('button.border-b-2:has-text("Documents")')
        .first();
      await expect(documentsTab).toBeVisible();

      // Check that Documents tab has active styling (blue color)
      await expect(documentsTab).toHaveClass(/border-blue-500/);

      // Verify Analytics tab exists and is not active
      const analyticsTab = page
        .locator('button.border-b-2:has-text("Analytics")')
        .first();
      await expect(analyticsTab).toBeVisible();
      await expect(analyticsTab).toHaveClass(/border-transparent/);

      // Verify Documents content is visible
      const documentsContent = page.locator('text=/My Documents|Upload Documents/i');
      await expect(documentsContent.first()).toBeVisible();

      // Click on Analytics tab
      await analyticsTab.click();

      // Wait for tab switch animation
      await page.waitForTimeout(300);

      // Verify Analytics tab is now active
      await expect(analyticsTab).toHaveClass(/border-blue-500/);
      await expect(documentsTab).toHaveClass(/border-transparent/);

      // Verify Analytics content is visible
      const analyticsHeader = page.locator('text=Document Analytics');
      await expect(analyticsHeader).toBeVisible({ timeout: 10000 });

      // Verify analytics cards are visible (at least one)
      const analyticsCards = page.locator(
        'text=/Total Documents|Storage Used|Active Shares/i',
      );
      await expect(analyticsCards.first()).toBeVisible();

      // Verify Documents content is now hidden
      const uploadButton = page.locator('button:has-text("Upload Documents")');
      await expect(uploadButton).not.toBeVisible();

      // Switch back to Documents tab
      await documentsTab.click();
      await page.waitForTimeout(300);

      // Verify Documents tab is active again
      await expect(documentsTab).toHaveClass(/border-blue-500/);
      await expect(analyticsTab).toHaveClass(/border-transparent/);

      // Verify Documents content is visible again
      await expect(documentsContent.first()).toBeVisible();

      // Verify Analytics content is hidden
      await expect(analyticsHeader).not.toBeVisible();

      console.log('Document analytics tab navigation test passed');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'document-analytics-tabs-failed');
      throw error;
    }
  });

  test('should load analytics data when Analytics tab is opened', async ({ page, workerCredentials }) => {
    try {
      // Login using worker credentials (more reliable than registration)
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );

      // Navigate to the documents page
      await page.goto('/dashboard/documents');
      await page.waitForLoadState('networkidle');

      // Click on Analytics tab
      const analyticsTab = page.locator('button:has-text("Analytics")');
      await analyticsTab.click();

      // Wait for analytics to load (spinner should appear then disappear)
      const spinner = page.locator('.animate-spin');

      // Either wait for spinner to appear and disappear, or just wait for content
      try {
        await spinner.waitFor({ state: 'visible', timeout: 2000 });
        await spinner.waitFor({ state: 'hidden', timeout: 10000 });
      } catch {
        // Spinner might load too fast to catch, that's okay
        console.log('Analytics loaded quickly without visible spinner');
      }

      // Verify analytics header is visible
      const analyticsHeader = page.locator('text=Document Analytics');
      await expect(analyticsHeader).toBeVisible({ timeout: 10000 });

      // Verify time range selector is visible
      const timeRangeSelector = page.locator('select').filter({ hasText: /Last/ });
      await expect(timeRangeSelector).toBeVisible();

      // Verify at least one analytics card is visible
      const analyticsCard = page
        .locator('.bg-white')
        .filter({ hasText: /Total Documents|Storage Used/ });
      await expect(analyticsCard.first()).toBeVisible();

      console.log('Analytics data loading test passed');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'analytics-data-loading-failed');
      throw error;
    }
  });

  test('should handle analytics loading errors gracefully', async ({ page, workerCredentials }) => {
    try {
      // Login using worker credentials (more reliable than registration)
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );

      // Intercept the analytics API call and make it fail
      await page.route('**/api/v1/documents/analytics*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      });

      // Navigate to the documents page
      await page.goto('/dashboard/documents');
      await page.waitForLoadState('networkidle');

      // Click on Analytics tab
      const analyticsTab = page.locator('button:has-text("Analytics")');
      await analyticsTab.click();

      // Wait for error message to appear (flexible to match various error messages)
      const errorMessage = page.locator('text=/Failed|Error|Cannot load/i');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify error icon is visible
      const errorIcon = page
        .locator('svg')
        .filter({ has: page.locator('title:has-text("BarChart3")') });
      // Just verify any icon appears in the error state
      const anyIcon = page.locator('.text-red-400');
      await expect(anyIcon).toBeVisible();

      console.log('Analytics error handling test passed');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'analytics-error-handling-failed');
      throw error;
    }
  });
});
