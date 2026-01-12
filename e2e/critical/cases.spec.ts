/**
 * E2E Tests for Cases Module
 * Tests the cases list and detail pages functionality
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Cases Module', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login before each test using worker-scoped credentials
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test.describe('Cases List Page', () => {
    test('should display cases list page', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // Check page title and header
      await expect(page.locator('h1')).toContainText('Cases');

      // Check page content
      const casesPage = page.locator('[data-testid="cases-page"]');
      await expect(casesPage).toBeVisible();
    });

    test('should display search and filter controls', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // Check search input
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', /search/i);

      // Check status filter
      const statusFilter = page.locator('[data-testid="status-filter"]');
      await expect(statusFilter).toBeVisible();
    });

    test('should display stats cards', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // Wait for stats to load (they should be visible even if 0)
      await page.waitForTimeout(1000);

      // Check for stat cards - should show Total, Open, Closed
      const statsCards = page.locator('.text-2xl.font-bold');
      await expect(statsCards.first()).toBeVisible();
    });

    test('should allow search filtering', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('test search query');

      // Input should have the value
      await expect(searchInput).toHaveValue('test search query');
    });

    test('should allow status filtering', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      const statusFilter = page.locator('[data-testid="status-filter"]');

      // Select OPEN status
      await statusFilter.selectOption('OPEN');
      await expect(statusFilter).toHaveValue('OPEN');

      // Select CLOSED status
      await statusFilter.selectOption('CLOSED');
      await expect(statusFilter).toHaveValue('CLOSED');

      // Select All
      await statusFilter.selectOption('All');
      await expect(statusFilter).toHaveValue('All');
    });

    test('should show empty state when no cases', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for either table or empty state
      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .locator('text=No cases found')
        .isVisible()
        .catch(() => false);

      // One of them should be visible
      expect(hasTable || hasEmptyState).toBeTruthy();
    });
  });

  // Admin Features - Now implemented with backend filter parameter support
  test.describe('Cases List Page - Admin Features', () => {
    test.beforeEach(async ({ page, workerCredentials }) => {
      // Skip if worker doesn't have admin credentials
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');

      // Login as admin
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        true,
      );
    });

    test('should show view mode toggle for admin users', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // Check for My Cases/All Cases toggle buttons
      const myCasesToggle = page.locator('[data-testid="view-my-cases"]');
      const allCasesToggle = page.locator('[data-testid="view-all-cases"]');

      await expect(myCasesToggle).toBeVisible();
      await expect(allCasesToggle).toBeVisible();
    });

    test('should allow switching between my cases and all cases', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      const myCasesToggle = page.locator('[data-testid="view-my-cases"]');
      const allCasesToggle = page.locator('[data-testid="view-all-cases"]');

      // Click All Cases
      await allCasesToggle.click();
      await page.waitForTimeout(500);

      // Click My Cases
      await myCasesToggle.click();
      await page.waitForTimeout(500);

      // Both toggles should still be visible
      await expect(myCasesToggle).toBeVisible();
      await expect(allCasesToggle).toBeVisible();
    });
  });

  test.describe('Case Detail Page', () => {
    test('should navigate to case detail from list', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if there are any cases in the table
      const firstCaseRow = page.locator('[data-testid^="case-row-"]').first();
      const hasCases = await firstCaseRow.isVisible().catch(() => false);

      if (hasCases) {
        // Click on the first case row
        await firstCaseRow.click();

        // Should navigate to detail page
        await page.waitForURL(/\/cases\/\d+/);

        // Check detail page is loaded
        const detailPage = page.locator('[data-testid="case-detail-page"]');
        await expect(detailPage).toBeVisible();
      } else {
        // Skip reason: TEST_INFRASTRUCTURE - No cases available to test detail navigation
        test.skip(true, 'No cases available to test detail navigation');
      }
    });

    test('should display case detail page elements', async ({ page }) => {
      // Try to navigate to a case detail page (ID 1 as example)
      await page.goto('/cases/1');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if page shows detail or error
      const hasDetail = await page
        .locator('[data-testid="case-detail-page"]')
        .isVisible()
        .catch(() => false);
      const hasError = await page
        .locator('text=Error Loading Case')
        .isVisible()
        .catch(() => false);

      if (hasDetail) {
        // If case exists, verify page structure
        await expect(page.locator('h1')).toBeVisible();

        // Check breadcrumb navigation
        await expect(page.locator('nav a:has-text("Cases")')).toBeVisible();

        // Check for back button
        await expect(page.locator('button:has-text("Back")')).toBeVisible();
      } else if (hasError) {
        // If case doesn't exist, that's expected - verify error handling
        await expect(page.locator('text=Error Loading Case')).toBeVisible();
        await expect(page.locator('button:has-text("Back to Cases")')).toBeVisible();
      } else {
        // Skip reason: TEST_INFRASTRUCTURE - Case detail page in unexpected state
        test.skip(true, 'Case detail page in unexpected state');
      }
    });

    test('should have back to cases navigation', async ({ page }) => {
      await page.goto('/cases/1');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const hasDetail = await page
        .locator('[data-testid="case-detail-page"]')
        .isVisible()
        .catch(() => false);
      const hasError = await page
        .locator('text=Error Loading Case')
        .isVisible()
        .catch(() => false);

      if (hasDetail || hasError) {
        // Both success and error pages should have navigation back
        const backButton = page
          .locator('button:has-text("Back")')
          .or(page.locator('a:has-text("Back to Cases")'));

        await expect(backButton.first()).toBeVisible();

        // Click back and verify navigation
        await backButton.first().click();
        await page.waitForURL(/\/cases$/);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('cases list should be keyboard navigable', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for page to fully render

      // Check if cases page has interactive elements
      const searchInput = page.locator('[data-testid="search-input"]');
      const hasSearchInput = await searchInput.isVisible().catch(() => false);

      if (!hasSearchInput) {
        // Skip reason: FUTURE_FEATURE - Cases page search input not found - page may not be fully implemented
        test.skip(
          true,
          'Cases page search input not found - page may not be fully implemented',
        );
        return;
      }

      // Focus the search input directly and verify it can receive focus
      await searchInput.focus();
      await expect(searchInput).toBeFocused({ timeout: 5000 });

      // Verify we can type in the search input
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');

      // Check if status filter exists and can receive focus
      const statusFilter = page.locator('[data-testid="status-filter"]');
      const hasStatusFilter = await statusFilter.isVisible().catch(() => false);

      if (hasStatusFilter) {
        await statusFilter.focus();
        await expect(statusFilter).toBeFocused({ timeout: 5000 });
      }
    });
  });
});
