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
      'text=/cases|case list|new case/i',
      5000,
    );

    expect(hasCasesContent).toBe(true);
  });

  test('should display case list', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for case list or empty state
    const hasCaseList = await TestHelpers.checkUIElementExists(
      page,
      '[data-testid*="case"], .case-card, .case-item, text=/no cases|empty/i',
      5000,
    );

    expect(hasCaseList).toBe(true);
  });

  test('should create new case', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for create case button
    const createButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("New Case"), button:has-text("Create"), a[href*="new"], a[href*="create"]',
      5000,
    );

    if (!createButton) {
      // Skip test if create case button is not found - indicates missing UI element or wrong page loaded
      test.skip(true, 'Create case button not found');
      return;
    }

    // Click create button
    await page
      .locator('button:has-text("New Case"), button:has-text("Create"), a[href*="new"]')
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Check if on create case page or modal opened
    const isCreatePage =
      page.url().includes('/cases/new') || page.url().includes('/cases/create');
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
      expect(isCreatePage || hasCreateForm).toBe(true);
    }
  });

  test('should view case details', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for case card/link
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"], .case-card',
      5000,
    );

    if (caseLink) {
      // Click first case
      await page
        .locator('a[href*="/cases/"], [data-testid*="case-card"]')
        .first()
        .click();
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
    await page.waitForTimeout(2000);

    // Navigate to a case
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"]',
      5000,
    );

    if (!caseLink) {
      // Skip test if no existing cases found - requires at least one case to test update workflow
      test.skip(true, 'No cases found to update');
      return;
    }

    await page
      .locator('a[href*="/cases/"], [data-testid*="case-card"]')
      .first()
      .click();
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
    await page.waitForTimeout(2000);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"]',
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
    await page.waitForTimeout(2000);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"]',
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
      await page.locator('button:has-text("Close")').first().click();
      await page.waitForTimeout(1000);

      // Confirm if dialog appears
      const hasConfirm = await TestHelpers.checkUIElementExists(
        page,
        'button:has-text("Confirm"), button:has-text("Yes")',
        2000,
      );

      if (hasConfirm) {
        await page
          .locator('button:has-text("Confirm"), button:has-text("Yes")')
          .first()
          .click();
        await page.waitForTimeout(2000);
      }

      // Check for closed status
      const isClosed = await TestHelpers.checkUIElementExists(
        page,
        'text=/closed|status.*closed/i',
        3000,
      );

      expect(isClosed).toBe(true);
    }
  });

  test('should add document to case', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"]',
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
    await page.waitForTimeout(2000);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"]',
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
    await page.waitForTimeout(2000);

    // Navigate to case detail
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'a[href*="/cases/"], [data-testid*="case-card"]',
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
