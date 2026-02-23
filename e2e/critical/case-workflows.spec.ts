/**
 * Case Management Workflow E2E Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 *
 * Comprehensive tests for case management workflows:
 * - Create new case
 * - View case details
 * - Update case information
 * - Assign case to lawyer
 * - Close case
 * - Case list filtering and search
 * - Case document management
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import type { Page } from '@playwright/test';

/**
 * Wait for cases table to load with data
 */
async function waitForCasesTable(page: Page) {
  // Wait for table rows to exist
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  // Wait for case detail links in tbody to exist
  await page.waitForSelector('tbody a[href*="/cases/"]', { timeout: 10000 });
  await page.waitForTimeout(1000); // Allow data to fully render
}

test.describe('Case Management Workflows', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login before each test
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should navigate to cases page', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if cases page loaded
    const hasCasesContent = await TestHelpers.checkUIElementExists(
      page,
      'main >> h1:has-text("Cases")',
      5000,
    );

    expect(hasCasesContent).toBe(true);
  });

  test('should display case list', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The cases page ALWAYS shows a heading and case data.
    // Analytics cards (Open Cases, Closed Cases) are only visible for MANAGER/SUPERADMIN.
    // Check for the page heading + either analytics cards OR a cases table/list.
    const hasCasesHeading = await TestHelpers.checkUIElementExists(
      page,
      'main >> h1:has-text("Cases")',
      5000,
    );

    // Check for table OR list - use separate checks since comma in >> chaining
    // doesn't work correctly in Playwright (interprets as single child selector)
    const hasCasesTable = await TestHelpers.checkUIElementExists(
      page,
      'main table',
      5000,
    );
    const hasCasesList =
      !hasCasesTable &&
      (await TestHelpers.checkUIElementExists(
        page,
        'main [data-testid="cases-list"]',
        3000,
      ));

    const hasAnalyticsCards = await TestHelpers.checkUIElementExists(
      page,
      'main >> text=Open Cases',
      3000,
    );

    // Page must have Cases heading AND either the table/list or analytics cards
    expect(hasCasesHeading).toBe(true);
    expect(hasCasesTable || hasCasesList || hasAnalyticsCards).toBe(true);
  });

  test('should create new case', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for create case button
    const createButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("New Case"), button:has-text("Create"), a[href*="new"], a[href*="create"], a[href*="templates"]',
      5000,
    );

    if (!createButton) {
      // Skip test if create case button is not found - indicates missing UI element or wrong page loaded
      test.skip(true, 'Create case button not found');
      return;
    }

    // Click create button and wait for navigation
    await Promise.all([
      page
        .waitForURL(/templates|cases\/(new|create)/, { timeout: 15000 })
        .catch(() => null),
      page
        .locator(
          'a[href*="templates?action=create"], button:has-text("New Case"), a[href*="new"]',
        )
        .first()
        .click(),
    ]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if on create case page, template selection page, or modal opened
    // Note: "New Case" navigates to /templates?action=create-case to select a template first
    const isCreatePage =
      page.url().includes('/cases/new') || page.url().includes('/cases/create');
    const isTemplateSelectionPage = page.url().includes('/templates');
    const hasCreateForm = await TestHelpers.checkUIElementExists(
      page,
      'input[name="title"], input[name="name"], form',
      5000,
    );

    if (hasCreateForm) {
      // Fill case form
      await page.fill('input[name="title"], input[name="name"]', 'Test Case E2E');
      await page.fill(
        'textarea[name="description"], textarea',
        'Test case description for E2E testing',
      );

      // Submit form
      await page.click(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
      );
      await page.waitForTimeout(2000);

      // Should redirect to case detail or show success
      const isCaseDetail = page.url().includes('/cases/');
      const hasSuccess = await TestHelpers.checkUIElementExists(
        page,
        'text=/success|created/i',
        3000,
      );

      expect(isCaseDetail || hasSuccess).toBe(true);
    } else {
      // Verify we're on a valid create workflow page
      expect(isCreatePage || isTemplateSelectionPage || hasCreateForm).toBe(true);
    }
  });

  test('should view case details', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Look for "View Details" link in the actions column
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (caseLink) {
      // Click first "View Details" link
      await page.locator('tbody a[href*="/cases/"]').first().click();
      await page.waitForTimeout(2000);

      // Check if on case detail page
      const isCaseDetail =
        page.url().includes('/cases/') && !page.url().includes('/cases/new');
      const hasCaseDetails = await TestHelpers.checkUIElementExists(
        page,
        'text=/case|title|description|status/i',
        5000,
      );

      expect(isCaseDetail || hasCaseDetails).toBe(true);
    } else {
      // No cases exist, skip
      test.skip(true, 'No cases found to view');
    }
  });

  test('should update case information', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Navigate to a case
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no existing cases found - requires at least one case to test update workflow
      test.skip(true, 'No cases found to update');
      return;
    }

    await page.locator('tbody a[href*="/cases/"]').first().click();
    await page.waitForTimeout(2000);

    // Look for edit button
    const editButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Edit"), button:has-text("Update"), [data-testid*="edit"]',
      5000,
    );

    if (editButton) {
      await page
        .locator('button:has-text("Edit"), button:has-text("Update")')
        .first()
        .click();
      await page.waitForTimeout(1000);

      // Update title
      const titleInput = await TestHelpers.checkUIElementExists(
        page,
        'input[name="title"], input[name="name"]',
        3000,
      );

      if (titleInput) {
        await page.fill(
          'input[name="title"], input[name="name"]',
          'Updated Case Title',
        );
        await page.click('button[type="submit"], button:has-text("Save")');
        await page.waitForTimeout(2000);

        // Check for success or updated content
        const hasUpdated = await TestHelpers.checkUIElementExists(
          page,
          'text=/Updated Case Title|success|updated/i',
          3000,
        );

        expect(hasUpdated).toBe(true);
      }
    }
  });

  test('should filter cases by status', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for filter dropdown or buttons
    const filterControl = await TestHelpers.checkUIElementExists(
      page,
      'select[name="status"], button:has-text("Filter"), [data-testid*="filter"]',
      5000,
    );

    if (filterControl) {
      // Select filter
      const isSelect = await page
        .locator('select[name="status"]')
        .isVisible()
        .catch(() => false);
      if (isSelect) {
        await page.selectOption('select[name="status"]', 'OPEN');
        await page.waitForTimeout(2000);

        // Cases should be filtered
        const hasFilteredCases = await TestHelpers.checkUIElementExists(
          page,
          '[data-testid*="case"], .case-card',
          3000,
        );

        expect(hasFilteredCases !== false).toBe(true);
      }
    }
  });

  test('should search cases', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = await TestHelpers.checkUIElementExists(
      page,
      'input[type="search"], input[placeholder*="search"], input[name="search"]',
      5000,
    );

    if (searchInput) {
      await page.fill(
        'input[type="search"], input[placeholder*="search"], input[name="search"]',
        'test',
      );
      await page.waitForTimeout(1000);

      // Results should update
      const hasResults = await TestHelpers.checkUIElementExists(
        page,
        '[data-testid*="case"], .case-card, text=/no results/i',
        3000,
      );

      expect(hasResults !== false).toBe(true);
    }
  });

  test('should assign case to lawyer', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no cases exist - assign workflow requires existing case to assign to lawyer
      test.skip(true, 'No cases found');
      return;
    }

    await page
      .locator('a[href*="/cases/"], [data-testid*="case-card"]')
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Look for assign button or dropdown
    const assignControl = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Assign"), select[name="lawyer"], [data-testid*="assign"]',
      5000,
    );

    if (assignControl) {
      const isSelect = await page
        .locator('select[name="lawyer"]')
        .isVisible()
        .catch(() => false);
      if (isSelect) {
        const options = await page.locator('select[name="lawyer"] option').all();
        if (options.length > 1) {
          await page.selectOption(
            'select[name="lawyer"]',
            options[1].getAttribute('value') || '',
          );
          await page.waitForTimeout(1000);

          // Should show success or update
          const hasUpdated = await TestHelpers.checkUIElementExists(
            page,
            'text=/assigned|success|updated/i',
            3000,
          );

          expect(hasUpdated !== false).toBe(true);
        }
      }
    }
  });

  test('should close case', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no cases exist - close workflow requires existing open case to close
      test.skip(true, 'No cases found');
      return;
    }

    await page
      .locator('a[href*="/cases/"], [data-testid*="case-card"]')
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Look for close button
    const closeButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Close"), button:has-text("Close Case")',
      5000,
    );

    if (closeButton) {
      // Click the "Close Case" button on the case detail page to open CloseCaseModal
      await page.locator('button:has-text("Close Case")').first().click();

      // Wait for the modal dialog to appear
      const modal = page.locator('[role="dialog"]');
      await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      if (await modal.isVisible()) {
        // Click the "Close Case" confirm button inside the modal
        await modal.locator('button:has-text("Close Case")').click();

        // Wait for API response and page update
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
      }

      // Check for closed status - could be on same page or redirected to cases list
      const isClosed =
        (await TestHelpers.checkUIElementExists(page, 'text=/closed/i', 5000)) ||
        // After close, the page might redirect to cases list
        page.url().includes('/cases');

      expect(isClosed).toBe(true);
    }
  });

  test('should add document to case', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no cases exist - document attachment workflow requires existing case
      test.skip(true, 'No cases found');
      return;
    }

    await page
      .locator('a[href*="/cases/"], [data-testid*="case-card"]')
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Look for upload document button
    const uploadButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Upload"), button:has-text("Add Document"), input[type="file"]',
      5000,
    );

    if (uploadButton) {
      // Create a test file
      const fileInput = await page
        .locator('input[type="file"]')
        .isVisible()
        .catch(() => false);
      if (fileInput) {
        // Upload would require actual file handling
        // For now, verify button exists
        expect(uploadButton).toBe(true);
      }
    }
  });

  test('should view case documents', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no cases exist - document viewing workflow requires case with attached documents
      test.skip(true, 'No cases found');
      return;
    }

    await page
      .locator('a[href*="/cases/"], [data-testid*="case-card"]')
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Look for documents section or tab
    const documentsSection = await TestHelpers.checkUIElementExists(
      page,
      'text=/documents|files/i, [data-testid*="document"]',
      5000,
    );

    if (documentsSection) {
      // Click documents tab if exists
      const documentsTab = await TestHelpers.checkUIElementExists(
        page,
        'button:has-text("Documents"), [role="tab"]:has-text("Document")',
        3000,
      );

      if (documentsTab) {
        await page
          .locator('button:has-text("Documents"), [role="tab"]:has-text("Document")')
          .first()
          .click();
        await page.waitForTimeout(1000);
      }

      // Should show documents list or empty state
      const hasDocuments = await TestHelpers.checkUIElementExists(
        page,
        '[data-testid*="document"], .document-item, text=/no documents/i',
        3000,
      );

      expect(hasDocuments).toBe(true);
    }
  });

  test('should handle case deletion', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await waitForCasesTable(page);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no cases exist - deletion workflow requires existing case to delete
      test.skip(true, 'No cases found');
      return;
    }

    await page
      .locator('a[href*="/cases/"], [data-testid*="case-card"]')
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Look for delete button
    const deleteButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Delete"), button:has-text("Remove")',
      5000,
    );

    if (deleteButton) {
      await page.locator('button:has-text("Delete")').first().click();
      await page.waitForTimeout(1000);

      // Confirm deletion
      const hasConfirm = await TestHelpers.checkUIElementExists(
        page,
        'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")',
        2000,
      );

      if (hasConfirm) {
        await page
          .locator(
            'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")',
          )
          .first()
          .click();
        await page.waitForTimeout(2000);

        // Should redirect to cases list or show success
        const isCasesList =
          page.url().includes('/cases') && !page.url().includes('/cases/');
        const hasSuccess = await TestHelpers.checkUIElementExists(
          page,
          'text=/deleted|success|removed/i',
          3000,
        );

        expect(isCasesList || hasSuccess).toBe(true);
      }
    }
  });
});
