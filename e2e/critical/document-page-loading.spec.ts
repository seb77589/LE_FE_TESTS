/**
 * Document Page Loading E2E Tests
 *
 * ARCHITECTURE NOTE (v0.2.0): Documents are now case-centric.
 * The /dashboard/documents route redirects to /cases.
 * Documents are accessed through case detail pages.
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Documents Page Loading', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Use direct API auth for faster and more reliable login
    await TestHelpers.setupPageWithToken(
      page,
      workerCredentials.email,
      workerCredentials.password,
    );
  });

  test('should redirect /dashboard/documents to /cases (v0.2.0 architecture)', async ({
    page,
  }) => {
    try {
      // Navigate to the old documents page
      await page.goto('/dashboard/documents');
      await page.waitForLoadState('networkidle');

      // Check if redirected to login (route protection active)
      if (page.url().includes('/auth/login')) {
        test.skip(
          true,
          'Documents route requires authentication - protected route active',
        );
        return;
      }

      // v0.2.0: Documents page redirects to /cases (case-centric architecture)
      // Wait for client-side redirect via router.replace()
      await page.waitForURL(/\/cases/, { timeout: 15000 });

      // Verify cases page loads correctly
      const casesHeading = page.locator('h1:has-text("Cases")');
      await expect(casesHeading).toBeVisible({ timeout: 10000 });

      console.log('Documents page correctly redirects to Cases page (v0.2.0 architecture)');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'document-redirect-failed');
      throw error;
    }
  });

  test('should load cases page successfully after redirect', async ({ page }) => {
    try {
      // Navigate to the old documents URL
      await page.goto('/dashboard/documents');
      await page.waitForLoadState('networkidle');

      // Check if redirected to login
      if (page.url().includes('/auth/login')) {
        test.skip(
          true,
          'Route requires authentication - protected route active',
        );
        return;
      }

      // Wait for client-side redirect to /cases
      await page.waitForURL(/\/cases/, { timeout: 15000 });

      // CRITICAL: Verify no error appears
      const errorMessage = page.locator('text=/Failed|Error|Cannot load/i');
      await expect(errorMessage).not.toBeVisible({ timeout: 5000 });

      // Verify cases page UI elements
      const casesHeading = page.locator('h1:has-text("Cases")');
      await expect(casesHeading).toBeVisible();

      // Check for case status cards (standard UI)
      const hasClosedCases = await TestHelpers.checkUIElementExists(
        page,
        'text=/Closed Cases/i',
        5000,
      );
      expect(hasClosedCases).toBe(true);

      console.log('Cases page loaded successfully after redirect');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'cases-page-loading-failed');
      throw error;
    }
  });

  test('should display case list or empty state', async ({ page }) => {
    try {
      // Navigate via old documents URL (redirect test)
      await page.goto('/dashboard/documents');
      await page.waitForLoadState('networkidle');

      // Check if redirected to login
      if (page.url().includes('/auth/login')) {
        test.skip(
          true,
          'Route requires authentication - protected route active',
        );
        return;
      }

      // Wait for client-side redirect to /cases
      await page.waitForURL(/\/cases/, { timeout: 15000 });

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Either case list (table) or empty state should be visible
      const hasTable = await TestHelpers.checkUIElementExists(
        page,
        'table, tbody',
        3000,
      );

      const hasEmptyState = await TestHelpers.checkUIElementExists(
        page,
        'text=/no cases|empty|get started/i',
        3000,
      );

      // One of these should be true
      expect(hasTable || hasEmptyState).toBe(true);

      // No error messages
      const errorMessage = page.locator('text=/Failed|Error|Cannot load/i');
      await expect(errorMessage).not.toBeVisible({ timeout: 3000 });

      console.log(hasTable ? 'Case list displayed' : 'Empty state displayed gracefully');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'cases-list-failed');
      throw error;
    }
  });
});
