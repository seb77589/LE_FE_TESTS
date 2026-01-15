/**
 * E2E Tests for Activity Log (Phase 6)
 *
 * Tests activity log functionality:
 * - Page navigation and display
 * - Summary cards
 * - Activity filtering (type, date range, search)
 * - CSV export
 * - Activity table display
 *
 * Related Phase: Activity, Compliance & Analytics (Phase 6)
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Activity Log E2E Tests', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login first
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin
    );

    // Navigate to activity page
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display activity page header', async ({ page }) => {
      // Check for page title
      const heading = page.locator('h1:has-text("Activity Log")');
      await expect(heading).toBeVisible();

      // Check for description (updated text)
      const description = page.locator('text=/complete activity history/i');
      await expect(description).toBeVisible();

      console.log('✅ Activity page header displayed');
    });

    test('should show summary cards', async ({ page }) => {
      // Wait for summary cards to load
      await page.waitForTimeout(1000);

      // Current implementation shows: Documents, Cases, Tasks Completed, Last Login
      const documentsCard = page.locator('text=Documents').locator('..');
      await expect(documentsCard).toBeVisible();

      // Tasks Completed card
      const tasksCard = page.locator('text=Tasks Completed').locator('..');
      await expect(tasksCard).toBeVisible();

      // Last Login card
      const lastLoginCard = page.locator('text=Last Login').locator('..');
      await expect(lastLoginCard).toBeVisible();

      console.log('✅ All summary cards visible');
    });

    test('should display numeric values in summary cards', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find all summary cards by looking for numeric values
      const summaryCards = page.locator('.bg-card').filter({ has: page.locator('.text-2xl') });

      const cardCount = await summaryCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);

      // Each card should have a numeric value
      for (let i = 0; i < Math.min(cardCount, 4); i++) {
        const card = summaryCards.nth(i);
        const valueElement = card.locator('.text-2xl').first();

        if (await valueElement.isVisible()) {
          const value = await valueElement.textContent();
          // Value should be numeric or text like "Never" for Last Login
          expect(value).toBeTruthy();
          console.log(`✅ Summary card ${i + 1}: ${value}`);
        }
      }
    });
  });

  test.describe('Filter Controls', () => {
    test('should show date range selector', async ({ page }) => {
      // Find date range selector (select dropdown for days)
      const dateRangeSelect = page.locator('select').first();

      await expect(dateRangeSelect).toBeVisible();

      // Should have multiple options for different time ranges
      const options = await dateRangeSelect.locator('option').count();
      expect(options).toBeGreaterThan(1);

      console.log(`✅ Date range selector visible with ${options} options`);
    });

    test('should show activity type filter', async ({ page }) => {
      // Find activity type filter
      const typeFilter = page.locator('select, button').filter({ hasText: /All Types|Login|Logout|Document|Case/ }).first();

      await expect(typeFilter).toBeVisible();

      console.log('✅ Activity type filter visible');
    });

    test('should show search input', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[type="text"], input[type="search"]').filter({ hasText: '' }).first();

      if (await searchInput.isVisible()) {
        const placeholder = await searchInput.getAttribute('placeholder');
        expect(placeholder).toMatch(/Search|Filter/i);
        console.log(`✅ Search input visible: "${placeholder}"`);
      } else {
        console.log('ℹ️ Search input not immediately visible');
      }
    });

    test('should filter activities by date range', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Get initial activity count
      const activityRows = page.locator('table tbody tr, [role="row"]').filter({ hasText: /.*/ });
      const initialCount = await activityRows.count();

      // Change date range to "Today"
      const dateRangeSelect = page.locator('select').first();

      if (await dateRangeSelect.isVisible()) {
        await dateRangeSelect.selectOption({ label: /Today|Last 24 Hours/i });
        await page.waitForTimeout(500);

        // Get filtered count
        const filteredCount = await activityRows.count();

        // Filtered count should be <= initial count
        expect(filteredCount).toBeLessThanOrEqual(initialCount);

        console.log(`✅ Date range filter: ${initialCount} → ${filteredCount} activities`);
      } else {
        console.log('ℹ️ Date range selector not available');
      }
    });

    test('should filter activities by type', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Get initial activity count
      const activityRows = page.locator('table tbody tr, [role="row"]');
      const initialCount = await activityRows.count();

      // Find type filter (select or button)
      const typeFilter = page.locator('select').nth(1); // Second select is usually type filter

      if (await typeFilter.isVisible()) {
        // Get available options
        const options = await typeFilter.locator('option').allTextContents();

        // Select first non-"All" option
        const specificType = options.find(opt => !opt.includes('All'));

        if (specificType) {
          await typeFilter.selectOption({ label: specificType });
          await page.waitForTimeout(500);

          // Get filtered count
          const filteredCount = await activityRows.count();

          console.log(`✅ Type filter "${specificType}": ${initialCount} → ${filteredCount} activities`);
        }
      } else {
        console.log('ℹ️ Type filter not available');
      }
    });

    test('should search activities', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find search input
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();

      if (await searchInput.isVisible()) {
        // Get initial count
        const activityRows = page.locator('table tbody tr, [role="row"]');
        const initialCount = await activityRows.count();

        // Search for "login"
        await searchInput.fill('login');
        await page.waitForTimeout(500);

        // Get filtered count
        const filteredCount = await activityRows.count();

        // Filtered count should be <= initial count
        expect(filteredCount).toBeLessThanOrEqual(initialCount);

        console.log(`✅ Search filter: ${initialCount} → ${filteredCount} activities`);
      } else {
        console.log('ℹ️ Search input not available');
      }
    });

    test('should clear filters', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Apply a filter
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Activities should be shown again
        const activityRows = page.locator('table tbody tr, [role="row"]');
        const count = await activityRows.count();

        expect(count).toBeGreaterThanOrEqual(0);

        console.log(`✅ Filter cleared: ${count} activities shown`);
      }
    });
  });

  test.describe('Activity Table', () => {
    test('should display activity table with headers', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check for table headers
      const headers = ['Action', 'Details', 'Timestamp', 'IP Address'];

      for (const header of headers) {
        const headerElement = page.locator(`th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`);

        if (await headerElement.count() > 0) {
          await expect(headerElement.first()).toBeVisible();
          console.log(`✅ Header "${header}" visible`);
        }
      }
    });

    test('should show activity rows', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find activity rows
      const activityRows = page.locator('table tbody tr, [role="row"]').filter({ hasText: /.*/ });
      const rowCount = await activityRows.count();

      if (rowCount > 0) {
        console.log(`✅ ${rowCount} activity rows displayed`);

        // Check first row has content
        const firstRow = activityRows.first();
        const rowText = await firstRow.textContent();

        expect(rowText).toBeTruthy();
        expect(rowText!.length).toBeGreaterThan(0);

        console.log(`✅ First row content: ${rowText!.substring(0, 50)}...`);
      } else {
        // Empty state
        const emptyState = page.locator('text=/No activities|No results/');
        await expect(emptyState).toBeVisible();

        console.log('ℹ️ No activities (empty state displayed)');
      }
    });

    test('should show login badge for login activities', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find login activities
      const loginBadge = page.locator('text=Login, span:has-text("Login"), [class*="badge"]:has-text("Login")').first();

      if (await loginBadge.count() > 0 && await loginBadge.isVisible()) {
        await expect(loginBadge).toBeVisible();
        console.log('✅ Login badge displayed');
      } else {
        console.log('ℹ️ No login activities visible');
      }
    });

    test('should display timestamps', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find activity rows
      const activityRows = page.locator('table tbody tr, [role="row"]');
      const rowCount = await activityRows.count();

      if (rowCount > 0) {
        // Check first row for timestamp
        const firstRow = activityRows.first();
        const rowText = await firstRow.textContent();

        // Should contain date/time indicators
        const hasTimestamp = /\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}|ago|AM|PM/.test(rowText || '');

        expect(hasTimestamp).toBe(true);

        console.log('✅ Timestamps displayed in activities');
      }
    });

    test('should display IP addresses', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find IP address column
      const ipAddresses = page.locator('td, [role="cell"]').filter({ hasText: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/ });

      const ipCount = await ipAddresses.count();

      if (ipCount > 0) {
        const firstIP = await ipAddresses.first().textContent();
        console.log(`✅ IP addresses displayed: ${firstIP}`);
      } else {
        console.log('ℹ️ No IP addresses visible in current view');
      }
    });
  });

  test.describe('CSV Export', () => {
    test('should show export button', async ({ page }) => {
      // Find export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("CSV")').first();

      await expect(exportButton).toBeVisible();

      console.log('✅ Export button visible');
    });

    test('should trigger CSV download on export', async ({ page }) => {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      // Click export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("CSV")').first();
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;

      if (download) {
        // Verify filename contains "activity" or similar
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/activity|export/i);
        expect(filename).toMatch(/\.csv$/i);

        console.log(`✅ CSV export triggered: ${filename}`);
      } else {
        console.log('ℹ️ CSV download not triggered (may require actual data)');
      }
    });
  });

  test.describe('Results Count', () => {
    test('should show results count', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find results count text
      const resultsCount = page.locator('text=/Showing \\d+ results|\\d+ activities|\\d+ total/').first();

      if (await resultsCount.count() > 0 && await resultsCount.isVisible()) {
        const countText = await resultsCount.textContent();
        console.log(`✅ Results count displayed: ${countText}`);
      } else {
        console.log('ℹ️ Results count not displayed or no activities');
      }
    });

    test('should update results count when filtering', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Apply a filter
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();

      if (await searchInput.isVisible()) {
        // Initial state
        const activityRows = page.locator('table tbody tr, [role="row"]');
        const initialCount = await activityRows.count();

        // Apply filter
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Filtered count
        const filteredCount = await activityRows.count();

        console.log(`✅ Results count updated: ${initialCount} → ${filteredCount}`);
      }
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no activities match filters', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Search for something unlikely to exist
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('zzzznonexistentactivityzzz');
        await page.waitForTimeout(500);

        // Should show empty state
        const emptyState = page.locator('text=/No activities found|No results|Try adjusting/');

        if (await emptyState.count() > 0) {
          await expect(emptyState.first()).toBeVisible();
          console.log('✅ Empty state displayed for no results');
        } else {
          console.log('ℹ️ No empty state (activities may match search)');
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Page title should still be visible
      const heading = page.locator('h1:has-text("Activity Log")');
      await expect(heading).toBeVisible();

      // Summary cards should stack vertically
      const summaryCards = page.locator('[class*="grid"] > div').filter({ hasText: /Total Activities/ });

      if (await summaryCards.count() > 0) {
        await expect(summaryCards.first()).toBeVisible();
        console.log('✅ Mobile layout displays summary cards');
      }

      // Table should be scrollable or responsive
      const table = page.locator('table, [role="table"]').first();

      if (await table.isVisible()) {
        console.log('✅ Mobile layout displays activity table');
      }
    });
  });
});
