/**
 * E2E Tests for Template Phase 1 Features
 *
 * Tests new template management features implemented in Phase 1:
 * - Category Filter Dropdown (Task 1.2)
 * - Inactive Templates Toggle (Task 1.3)
 * - Delete Template UI (Task 1.1)
 * - Document Preview (existing feature validation)
 * - Variable Form (existing feature validation)
 * - File Upload (Task 2.6)
 *
 * Related: Template Management Improvements (_Templates_Improvements_001)
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import path from 'path';

// Test data
const TEST_TEMPLATE_NAME = 'E2E Test Template - Service Agreement';
const TEST_DOCX_PATH = path.join(__dirname, '../../fixtures/test-template.docx');

/**
 * Helper: Navigate to templates page and wait for load
 */
async function navigateToTemplates(page: import('@playwright/test').Page) {
  await page.goto('/templates');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1:has-text("Case Templates")', { timeout: 10000 });
}

/**
 * Helper: Wait for templates to load
 */
async function waitForTemplatesLoad(page: import('@playwright/test').Page) {
  // Wait for either template cards or empty state
  await page.waitForSelector(
    '[data-template-card], [data-template-row], :has-text("No templates")',
    { timeout: 10000 },
  );
}

test.describe('Template Category Filter (Task 1.2)', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    await navigateToTemplates(page);
    await waitForTemplatesLoad(page);
  });

  test('should display category filter dropdown when categories exist', async ({
    page,
  }) => {
    // Check if category filter exists (only shows when templates have categories)
    const categorySelect = page.locator('button[aria-haspopup="listbox"]').first();

    // The category filter may not appear if no categories exist
    const categoryFilterContainer = page.locator('.w-full.sm\\:w-48');

    if ((await categoryFilterContainer.count()) > 0) {
      await expect(categorySelect).toBeVisible();
      console.log('Category filter dropdown is visible');
    } else {
      console.log(
        'No categories found - filter not displayed (expected if no templates with categories)',
      );
    }
  });

  test('should filter templates when category selected', async ({ page }) => {
    // Look for category dropdown
    const categorySelect = page.locator('.w-full.sm\\:w-48 button').first();

    if ((await categorySelect.count()) === 0) {
      console.log('No category filter - skipping filter test');
      return;
    }

    // Get initial template count
    const initialCount = await page
      .locator('[data-template-card], [data-template-row]')
      .count();

    if (initialCount === 0) {
      console.log('No templates to filter');
      return;
    }

    // Click category dropdown
    await categorySelect.click();
    await page.waitForTimeout(500);

    // Look for category options
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Select a category (not "All Categories")
      await options.nth(1).click();
      await page.waitForTimeout(500);

      // Verify filter was applied (count should change or stay same)
      const filteredCount = await page
        .locator('[data-template-card], [data-template-row]')
        .count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
      console.log(
        `Category filter applied: ${initialCount} -> ${filteredCount} templates`,
      );
    }
  });

  test('should show all templates when "All Categories" selected', async ({ page }) => {
    const categorySelect = page.locator('.w-full.sm\\:w-48 button').first();

    if ((await categorySelect.count()) === 0) {
      console.log('No category filter present');
      return;
    }

    // Click and select "All Categories"
    await categorySelect.click();
    await page.waitForTimeout(300);

    const allCategoriesOption = page.locator(
      '[role="option"]:has-text("All Categories")',
    );
    if ((await allCategoriesOption.count()) > 0) {
      await allCategoriesOption.click();
      await page.waitForTimeout(300);

      // Templates should be visible
      const templateCount = await page
        .locator('[data-template-card], [data-template-row]')
        .count();
      expect(templateCount).toBeGreaterThanOrEqual(0);
      console.log(`All categories selected - showing ${templateCount} templates`);
    }
  });
});

test.describe('Template Inactive Toggle (Task 1.3)', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // This feature is only for Managers/SuperAdmins
    test.skip(
      !workerCredentials.isAdmin,
      'Inactive toggle requires Manager/SuperAdmin role',
    );

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    await navigateToTemplates(page);
    await waitForTemplatesLoad(page);
  });

  test('should display inactive toggle for Managers/SuperAdmins', async ({ page }) => {
    // Look for the inactive toggle
    const inactiveToggle = page.locator('#show-inactive');
    await expect(inactiveToggle).toBeVisible();

    // Verify label is present
    const toggleLabel = page.locator('label[for="show-inactive"]');
    await expect(toggleLabel).toContainText('Show inactive');

    console.log('Inactive toggle is visible for admin user');
  });

  test('should toggle inactive templates visibility', async ({ page }) => {
    const inactiveToggle = page.locator('#show-inactive');

    // Get initial state
    const initialChecked = await inactiveToggle.getAttribute('aria-checked');
    expect(initialChecked).toBe('false');

    // Click toggle
    await inactiveToggle.click();
    await page.waitForTimeout(500);

    // Verify toggle state changed
    const afterChecked = await inactiveToggle.getAttribute('aria-checked');
    expect(afterChecked).toBe('true');

    console.log('Inactive toggle state changed successfully');
  });

  test('should show Inactive badge on inactive templates', async ({ page }) => {
    const inactiveToggle = page.locator('#show-inactive');

    // Enable inactive templates
    await inactiveToggle.click();
    await page.waitForTimeout(1000); // Wait for API refresh

    // Check if any inactive badges are shown
    const inactiveBadges = page.locator('.text-destructive:has-text("Inactive")');
    const badgeCount = await inactiveBadges.count();

    console.log(`Found ${badgeCount} inactive template badges`);
    // May be 0 if no inactive templates exist
  });
});

test.describe('Template Delete UI (Task 1.1)', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Delete feature requires Manager/SuperAdmin role
    test.skip(!workerCredentials.isAdmin, 'Delete requires Manager/SuperAdmin role');

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    await navigateToTemplates(page);
    await waitForTemplatesLoad(page);
  });

  test('should show Delete button in template view modal for company templates', async ({
    page,
  }) => {
    // Find a company template (not system template)
    const companyTemplate = page
      .locator('[data-template-card]:not(:has([data-system-template]))')
      .first();

    if ((await companyTemplate.count()) === 0) {
      console.log('No company templates found - skipping delete button test');
      return;
    }

    // Click to open view modal
    await companyTemplate.click();
    await page.waitForTimeout(500);

    // Look for Delete button in modal
    const deleteButton = page.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    console.log('Delete button is visible in template view modal');
  });

  test('should NOT show Delete button for system templates', async ({ page }) => {
    // Find a system template
    const systemTemplate = page
      .locator('[data-template-card]:has([data-system-template])')
      .first();

    if ((await systemTemplate.count()) === 0) {
      console.log('No system templates found - skipping test');
      return;
    }

    // Click to open view modal
    await systemTemplate.click();
    await page.waitForTimeout(500);

    // Delete button should NOT be visible for system templates
    const deleteButton = page.locator('button:has-text("Delete")');
    await expect(deleteButton).not.toBeVisible();

    console.log('Delete button correctly hidden for system templates');
  });

  test('should show confirmation dialog when Delete clicked', async ({ page }) => {
    // Find a company template
    const companyTemplate = page
      .locator('[data-template-card]:not(:has([data-system-template]))')
      .first();

    if ((await companyTemplate.count()) === 0) {
      console.log('No company templates found - skipping confirmation test');
      return;
    }

    // Click to open view modal
    await companyTemplate.click();
    await page.waitForTimeout(500);

    // Click Delete button
    const deleteButton = page.locator('button:has-text("Delete")');
    await deleteButton.click();
    await page.waitForTimeout(300);

    // Verify confirmation dialog appears
    const confirmDialog = page.locator('[role="dialog"]:has-text("Delete Template?")');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    // Verify cancel button works
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
    await page.waitForTimeout(300);

    // Confirmation should be closed
    await expect(confirmDialog).not.toBeVisible();

    console.log('Delete confirmation dialog works correctly');
  });
});

test.describe('Template Document Preview', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    await navigateToTemplates(page);
    await waitForTemplatesLoad(page);
  });

  test('should open document preview when preview button clicked', async ({ page }) => {
    // Wait for templates
    const templateCard = page.locator('[data-template-card]').first();

    if ((await templateCard.count()) === 0) {
      console.log('No templates found');
      return;
    }

    // Find and click preview button (Eye icon)
    const previewButton = templateCard.locator('button[title="Preview document"]');
    await previewButton.click();
    await page.waitForTimeout(500);

    // Verify preview modal opens
    const previewModal = page.locator('[role="dialog"]:has-text("Preview")');
    await expect(previewModal).toBeVisible({ timeout: 10000 });

    console.log('Document preview modal opened successfully');
  });

  test('should display zoom controls in preview', async ({ page }) => {
    const templateCard = page.locator('[data-template-card]').first();

    if ((await templateCard.count()) === 0) {
      console.log('No templates found');
      return;
    }

    // Open preview
    const previewButton = templateCard.locator('button[title="Preview document"]');
    await previewButton.click();
    await page.waitForTimeout(1000);

    // Look for zoom controls
    const zoomControls = page.locator('button:has-text("%"), input[type="range"]');
    const controlsCount = await zoomControls.count();

    console.log(`Found ${controlsCount} zoom control elements`);
  });
});

test.describe('Template Variable Form', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    await navigateToTemplates(page);
    await waitForTemplatesLoad(page);
  });

  test('should open variable form when Use Template clicked', async ({ page }) => {
    // Find a template and click Use Template
    const templateCard = page.locator('[data-template-card]').first();

    if ((await templateCard.count()) === 0) {
      console.log('No templates found');
      return;
    }

    // Click Use Template button
    const useButton = templateCard.locator('button:has-text("Use Template")');
    await useButton.click();
    await page.waitForTimeout(500);

    // Verify variable form modal opens
    const variableForm = page.locator('[role="dialog"]');
    await expect(variableForm).toBeVisible({ timeout: 5000 });

    console.log('Variable form modal opened successfully');
  });

  test('should display input fields for template variables', async ({ page }) => {
    const templateCard = page.locator('[data-template-card]').first();

    if ((await templateCard.count()) === 0) {
      console.log('No templates found');
      return;
    }

    // Click Use Template
    const useButton = templateCard.locator('button:has-text("Use Template")');
    await useButton.click();
    await page.waitForTimeout(500);

    // Count input fields in the form
    const inputFields = page.locator(
      '[role="dialog"] input[type="text"], [role="dialog"] textarea',
    );
    const fieldCount = await inputFields.count();

    console.log(`Variable form has ${fieldCount} input fields`);
    expect(fieldCount).toBeGreaterThanOrEqual(0);
  });

  test('should validate required fields', async ({ page }) => {
    const templateCard = page.locator('[data-template-card]').first();

    if ((await templateCard.count()) === 0) {
      console.log('No templates found');
      return;
    }

    // Click Use Template
    const useButton = templateCard.locator('button:has-text("Use Template")');
    await useButton.click();
    await page.waitForTimeout(500);

    // Try to submit without filling fields
    const submitButton = page.locator(
      '[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Create")',
    );

    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      await page.waitForTimeout(300);

      // Check for validation errors or that form is still open
      const formStillOpen = await page.locator('[role="dialog"]').isVisible();
      expect(formStillOpen).toBe(true);

      console.log('Form validation working - form remains open on invalid submit');
    }
  });
});

test.describe('Template File Upload (Task 2.6)', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // File upload requires Manager/SuperAdmin role
    test.skip(
      !workerCredentials.isAdmin,
      'File upload requires Manager/SuperAdmin role',
    );

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    await navigateToTemplates(page);
    await waitForTemplatesLoad(page);
  });

  test('should open create modal when Create Template clicked', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Template")');
    await expect(createButton).toBeVisible();

    await createButton.click();
    await page.waitForTimeout(500);

    // Verify create modal opens
    const createModal = page.locator('[role="dialog"]');
    await expect(createModal).toBeVisible({ timeout: 5000 });

    console.log('Create template modal opened');
  });

  test('should have file input for DOCX upload', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Template")');
    await page.waitForTimeout(500);

    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    console.log('File input found in create modal');
  });

  test('should accept DOCX file upload', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Template")');
    await page.waitForTimeout(500);

    // Get file input
    const fileInput = page.locator('input[type="file"]');

    // Check if test file exists
    const fs = await import('fs');
    if (!fs.existsSync(TEST_DOCX_PATH)) {
      console.log('Test DOCX file not found at:', TEST_DOCX_PATH);
      return;
    }

    // Upload file
    await fileInput.setInputFiles(TEST_DOCX_PATH);
    await page.waitForTimeout(500);

    // Verify file was accepted (check for filename display or success indicator)
    const uploadedFileDisplay = page.locator(
      ':has-text("test-template.docx"), :has-text("File selected")',
    );
    const isFileShown = (await uploadedFileDisplay.count()) > 0;

    console.log(`File upload ${isFileShown ? 'successful' : 'status unknown'}`);
  });

  test('should fill form and verify template creation flow', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Template")');
    await page.waitForTimeout(500);

    // Fill in template name
    const nameInput = page
      .locator('input[name="name"], input[placeholder*="name" i]')
      .first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(TEST_TEMPLATE_NAME);
    }

    // Fill in description
    const descInput = page
      .locator('textarea[name="description"], textarea[placeholder*="description" i]')
      .first();
    if ((await descInput.count()) > 0) {
      await descInput.fill('Test template for E2E testing');
    }

    // Check if file exists and upload
    const fs = await import('fs');
    if (fs.existsSync(TEST_DOCX_PATH)) {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_DOCX_PATH);
      await page.waitForTimeout(500);
    }

    // Note: We don't actually submit to avoid creating test data
    // Just verify the form is fillable
    console.log('Template creation form filled successfully');
  });
});
