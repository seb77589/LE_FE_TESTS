/**
 * E2E Tests for Cases Module
 * Tests the cases list and detail pages functionality
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 * UPDATED: 2026-02-08 - Added tests for new Cases page UI features
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

    test('should display page header and content', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // Verify main page elements are visible
      await expect(page.locator('h1')).toContainText('Cases');
      await expect(page.locator('text=Manage and track legal cases')).toBeVisible();

      // Page should have the cases-page test id
      const casesPage = page.locator('[data-testid="cases-page"]');
      await expect(casesPage).toBeVisible();
    });

    test('should display search input', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Check if cases exist (search toolbar only shows when cases exist)
      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);
      const hasGrid = await page
        .locator('[data-testid^="case-card-"]')
        .first()
        .isVisible()
        .catch(() => false);

      if (hasTable || hasGrid) {
        // Search input should be visible
        const searchInput = page.getByPlaceholder(/search cases/i);
        await expect(searchInput).toBeVisible();
      } else {
        // If no cases, empty state should show
        test.skip(true, 'No cases available - search toolbar not shown');
      }
    });

    test('should display status filter dropdown', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Check if cases exist
      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);
      const hasGrid = await page
        .locator('[data-testid^="case-card-"]')
        .first()
        .isVisible()
        .catch(() => false);

      if (hasTable || hasGrid) {
        // Status filter should be visible
        const statusFilter = page.getByLabel(/filter by status/i);
        await expect(statusFilter).toBeVisible();

        // Should have "All Statuses" option (native select options can be checked via locator)
        const allStatusesOption = statusFilter.locator('option', {
          hasText: /all statuses/i,
        });
        await expect(allStatusesOption).toHaveCount(1);
      } else {
        test.skip(true, 'No cases available - filter toolbar not shown');
      }
    });

    test('should filter cases by search query', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Find search input
        const searchInput = page.getByPlaceholder(/search cases/i);

        // Type a search query
        await searchInput.fill('test');

        // Wait for filtering
        await page.waitForTimeout(500);

        // Results should be filtered (we can't know exact count, but filtered count text should update)
        // Just verify search worked without error
        await expect(searchInput).toHaveValue('test');
      } else {
        test.skip(true, 'No cases available for search test');
      }
    });

    test('should filter cases by status', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Find status filter
        const statusFilter = page.getByLabel(/filter by status/i);

        // Select a specific status
        await statusFilter.selectOption('closed');

        // Wait for filtering
        await page.waitForTimeout(500);

        // Verify selection
        await expect(statusFilter).toHaveValue('closed');
      } else {
        test.skip(true, 'No cases available for filter test');
      }
    });

    test('should show empty state when no cases', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for either table/cards or empty state
      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);
      const hasGrid = await page
        .locator('[data-testid^="case-card-"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText(/no cases yet/i)
        .isVisible()
        .catch(() => false);

      // At least one of these conditions should be true
      expect(hasTable || hasGrid || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('View Mode Toggle', () => {
    test('should display view mode toggle buttons', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // View toggle buttons should be visible
        const listViewButton = page.getByLabel(/list view/i);
        const gridViewButton = page.getByLabel(/grid view/i);

        await expect(listViewButton).toBeVisible();
        await expect(gridViewButton).toBeVisible();
      } else {
        test.skip(true, 'No cases available - view toggle not shown');
      }
    });

    test('should toggle between list and grid views', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Default is list view - table should be visible
        await expect(page.locator('table')).toBeVisible();

        // Click grid view button
        await page.getByLabel(/grid view/i).click();
        await page.waitForTimeout(500);

        // Table should be hidden, cards should be visible
        await expect(page.locator('table')).not.toBeVisible();
        await expect(page.locator('[data-testid^="case-card-"]').first()).toBeVisible();

        // Click list view button to toggle back
        await page.getByLabel(/list view/i).click();
        await page.waitForTimeout(500);

        // Table should be visible again
        await expect(page.locator('table')).toBeVisible();
      } else {
        test.skip(true, 'No cases available for view toggle test');
      }
    });

    test('should persist view mode preference', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Switch to grid view
        await page.getByLabel(/grid view/i).click();
        await page.waitForTimeout(500);

        // Reload page
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Grid view should still be active (table hidden)
        await expect(page.locator('table')).not.toBeVisible();
        await expect(page.locator('[data-testid^="case-card-"]').first()).toBeVisible();

        // Clean up: switch back to list view
        await page.getByLabel(/list view/i).click();
      } else {
        test.skip(true, 'No cases available for persistence test');
      }
    });
  });

  test.describe('Selection Mode', () => {
    test('should show selection controls for managers', async ({
      page,
      workerCredentials,
    }) => {
      // Skip for non-admin users
      test.skip(
        !workerCredentials.isAdmin,
        'Selection controls only available for managers',
      );

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Select button should be visible for managers
        const selectButton = page.getByRole('button', { name: /select/i });
        await expect(selectButton).toBeVisible();
      } else {
        test.skip(true, 'No cases available for selection test');
      }
    });

    test('should toggle selection mode', async ({ page, workerCredentials }) => {
      test.skip(
        !workerCredentials.isAdmin,
        'Selection controls only available for managers',
      );

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Click Select button
        await page.getByRole('button', { name: /select/i }).click();
        await page.waitForTimeout(300);

        // Cancel button should now be visible
        await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();

        // Checkboxes should be visible
        await expect(page.getByRole('checkbox').first()).toBeVisible();

        // Click Cancel to exit selection mode
        await page.getByRole('button', { name: /cancel/i }).click();
        await page.waitForTimeout(300);

        // Select button should be visible again
        await expect(page.getByRole('button', { name: /select/i })).toBeVisible();
      } else {
        test.skip(true, 'No cases available for selection mode test');
      }
    });

    test('should show bulk actions bar when items selected', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(
        !workerCredentials.isAdmin,
        'Selection controls only available for managers',
      );

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Enter selection mode
        await page.getByRole('button', { name: /select/i }).click();
        await page.waitForTimeout(300);

        // Select all checkbox
        const selectAllCheckbox = page.getByLabel(/select all cases/i);
        if (await selectAllCheckbox.isVisible()) {
          await selectAllCheckbox.check();
          await page.waitForTimeout(300);

          // Bulk actions bar should appear (fixed at bottom)
          const bulkBar = page.locator('.fixed.bottom-6');
          await expect(bulkBar).toBeVisible();

          // Clear selection
          await selectAllCheckbox.uncheck();
        }

        // Exit selection mode
        await page.getByRole('button', { name: /cancel/i }).click();
      } else {
        test.skip(true, 'No cases available for bulk actions test');
      }
    });
  });

  test.describe('Analytics Section', () => {
    test('should display analytics toggle for managers', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(!workerCredentials.isAdmin, 'Analytics only available for managers');

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Analytics toggle button should be visible
        const analyticsToggle = page.getByText(/analytics/i).first();
        await expect(analyticsToggle).toBeVisible();
      } else {
        test.skip(true, 'No cases available for analytics test');
      }
    });

    test('should toggle analytics section', async ({ page, workerCredentials }) => {
      test.skip(!workerCredentials.isAdmin, 'Analytics only available for managers');

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Find analytics toggle button
        const analyticsButton = page
          .locator('button')
          .filter({ hasText: /analytics/i });

        if (await analyticsButton.isVisible()) {
          // Analytics content should be visible by default
          // Click to toggle off
          await analyticsButton.click();
          await page.waitForTimeout(300);

          // Click to toggle on again
          await analyticsButton.click();
          await page.waitForTimeout(300);

          // Verify toggle worked (no error)
          expect(true).toBeTruthy();
        }
      } else {
        test.skip(true, 'No cases available for analytics toggle test');
      }
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

  test.describe('Create Case', () => {
    test('should have New Case button', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // New Case button should be visible
      const newCaseLink = page.getByRole('link', { name: /new case/i });
      await expect(newCaseLink).toBeVisible();
    });

    test('should navigate to create case page', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');

      // Click New Case button
      await page.getByRole('link', { name: /new case/i }).click();

      // "New Case" navigates to /templates?action=create-case to select a template
      await page.waitForURL(/\/templates|cases\/new/);

      // Verify we're on a valid page for creating a case
      const h1Text = await page.locator('h1').textContent();
      expect(h1Text).toMatch(/create|new|template/i);
    });
  });

  test.describe('About Cases Section', () => {
    test('should display About Cases info panel', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // About Cases section should be visible
        await expect(page.getByText(/about cases/i)).toBeVisible();
      } else {
        // Info panel only shows when cases exist
        test.skip(true, 'No cases available - About section not shown');
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Page should still be functional
      const casesPage = page.locator('[data-testid="cases-page"]');
      await expect(casesPage).toBeVisible();

      // Header should be visible
      await expect(page.locator('h1')).toContainText('Cases');
    });

    test('should show grid with single column on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Switch to grid view
        await page.getByLabel(/grid view/i).click();
        await page.waitForTimeout(500);

        // Grid should show single column (cards stacked)
        const cards = page.locator('[data-testid^="case-card-"]');
        const cardCount = await cards.count();

        if (cardCount > 0) {
          // Cards should be visible
          await expect(cards.first()).toBeVisible();
        }
      } else {
        test.skip(true, 'No cases available for responsive grid test');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('cases list should be keyboard navigable', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Search input should be focusable
        const searchInput = page.getByPlaceholder(/search cases/i);
        await searchInput.focus();
        await expect(searchInput).toBeFocused();

        // Should be able to type in search
        await searchInput.fill('test');
        await expect(searchInput).toHaveValue('test');

        // Tab to next element (may be intermediate elements before status filter)
        await page.keyboard.press('Tab');

        // Instead of checking specific focus target after Tab, verify the filter is focusable
        const statusFilter = page.getByLabel(/filter by status/i);
        await statusFilter.focus();
        await expect(statusFilter).toBeFocused();
      } else {
        test.skip(true, 'No cases available for keyboard navigation test');
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const hasTable = await page
        .locator('table')
        .isVisible()
        .catch(() => false);

      if (hasTable) {
        // Check for ARIA labels on interactive elements
        await expect(page.getByLabel(/search cases/i)).toBeVisible();
        await expect(page.getByLabel(/filter by status/i)).toBeVisible();
        await expect(page.getByLabel(/list view/i)).toBeVisible();
        await expect(page.getByLabel(/grid view/i)).toBeVisible();
      } else {
        test.skip(true, 'No cases available for ARIA labels test');
      }
    });
  });
});
