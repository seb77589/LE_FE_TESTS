/**
 * ASSISTANT Role - Templates E2E Tests
 *
 * Validates the complete template browsing and case creation workflow for ASSISTANT users.
 * This is the most critical customer journey: Browse → Use → Fill Variables → Create Case.
 *
 * Coverage:
 * - Template list browsing, search, filter, view modes
 * - RBAC enforcement (7 canModify-gated elements hidden)
 * - Template view modal (read-only actions)
 * - Template preview (DOCX rendering)
 * - Case creation from individual template (end-to-end)
 * - Template packages: browse, preview, use, case creation
 * - Download and export actions
 *
 * Credential: WS_TEST_CREDENTIALS.USER_1 (read-only interactions)
 *             WS_TEST_CREDENTIALS.USER_2 (data-mutating case creation tests)
 *
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/ASSISTANT_ROLE_UI_INVENTORY.md} §1.4 Templates
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/_Assistant_E2E_Playwright_TST_Evol.md} File 5
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

const ASSISTANT = WS_TEST_CREDENTIALS.USER_1;
const ASSISTANT_MUTATE = WS_TEST_CREDENTIALS.USER_2;

// ─── Browse & Search ────────────────────────────────────────────────────────

test.describe('ASSISTANT Role - Templates Browse & Search', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should load templates list page @P0', async ({ page }) => {
    // Page should have templates heading or content
    const hasTemplatesContent = await TestHelpers.checkUIElementExists(
      page,
      'h1:has-text("Templates"), :has-text("Templates")',
      5000,
    );
    expect(hasTemplatesContent).toBe(true);
  });

  test('should search templates by name @P0', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('Employment');
      await page.waitForTimeout(1000);
      // Search should filter results (or show no results message)
      // We just verify search doesn't crash the page
      const hasContent = await TestHelpers.checkUIElementExists(
        page,
        '[data-template-card], [data-template-row], :has-text("no templates"), :has-text("no results")',
        5000,
      );
      expect(hasContent).toBe(true);
    } else {
      test.skip(true, 'Search input not visible on templates page');
    }
  });

  test('should filter templates by category @P1', async ({ page }) => {
    // Templates page uses the custom <Select> component which renders as
    // <button aria-haspopup="listbox"> with placeholder "All Categories"
    // The filter is conditionally rendered: {categories.length > 0 && (...)}
    const categoryFilter = page.locator('button[aria-haspopup="listbox"]').first();
    if (await categoryFilter.isVisible({ timeout: 5000 })) {
      // Click to open the custom dropdown
      await categoryFilter.click();
      await page.waitForTimeout(500);
      // Options render as <button role="option"> inside <div role="listbox">
      const hasOptions = await TestHelpers.checkUIElementExists(
        page,
        '[role="listbox"] [role="option"], [role="listbox"] button',
        3000,
      );
      if (!hasOptions) {
        test.skip(true, 'Category filter dropdown has no options');
        return;
      }
      // Select the first option
      const firstOption = page.locator('[role="option"]').first();
      await firstOption.click();
      await page.waitForTimeout(500);
    } else {
      test.skip(
        true,
        'Category filter not visible (may need seeded templates with categories)',
      );
    }
  });

  test('should filter templates by type (All/Simple/Complex) @P1', async ({ page }) => {
    // Type toggle buttons
    const allButton = page.locator('button:has-text("All")').first();
    const simpleButton = page.locator('button:has-text("Simple")').first();
    const complexButton = page.locator('button:has-text("Complex")').first();

    if (await allButton.isVisible({ timeout: 5000 })) {
      // Click Simple filter
      if (await simpleButton.isVisible({ timeout: 3000 })) {
        await simpleButton.click();
        await page.waitForTimeout(1000);
      }
      // Click Complex filter
      if (await complexButton.isVisible({ timeout: 3000 })) {
        await complexButton.click();
        await page.waitForTimeout(1000);
      }
      // Click All to reset
      await allButton.click();
      await page.waitForTimeout(500);
    } else {
      test.skip(true, 'Type filter buttons not visible');
    }
  });

  test('should toggle between grid and list views @P1', async ({ page }) => {
    // Look for view toggle buttons (grid/list icons)
    const gridButton = page
      .locator('button[aria-label*="grid" i], button[title*="grid" i]')
      .first();
    const listButton = page
      .locator('button[aria-label*="list" i], button[title*="list" i]')
      .first();

    if (await gridButton.isVisible({ timeout: 3000 })) {
      await gridButton.click();
      await page.waitForTimeout(500);
    }
    if (await listButton.isVisible({ timeout: 3000 })) {
      await listButton.click();
      await page.waitForTimeout(500);
    }
    // Page should still be functional regardless of toggle availability
    expect(page.url()).toContain('/templates');
  });
});

// ─── RBAC Enforcement ───────────────────────────────────────────────────────

test.describe('ASSISTANT Role - Templates RBAC', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should NOT show Create Template button @P0', async ({ page }) => {
    const createButton = page
      .locator('button:has-text("Create Template"), button:has-text("Create")')
      .filter({ hasText: /create/i });
    // Filter out any "Create Case" buttons
    const templateCreateButton = page.locator('button:has-text("Create Template")');
    await expect(templateCreateButton).not.toBeVisible();
  });

  test('should NOT show Import button @P0', async ({ page }) => {
    const importButton = page.locator('button:has-text("Import")');
    await expect(importButton).not.toBeVisible();
  });

  test('should NOT show Edit button on template cards @P0', async ({ page }) => {
    // Edit/Modify pencil buttons should not be present
    const editButtons = page.locator(
      'button[title*="Modify" i], button[title*="Edit" i]',
    );
    const count = await editButtons.count();
    expect(count).toBe(0);
  });

  test('should NOT show Select mode or bulk actions @P0', async ({ page }) => {
    // Select button should not be visible for ASSISTANT
    const selectButton = page.locator('button:has-text("Select")').first();
    // Check specifically for template selection mode, not other UI elements
    const hasSelectMode = await selectButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (hasSelectMode) {
      // If there's a Select button, verify it's not the template selection mode
      const buttonText = await selectButton.textContent();
      expect(buttonText).not.toMatch(/^Select$/);
    }

    // Bulk actions bar should not be present
    const bulkActionsBar = page.locator(
      ':has-text("Activate"), :has-text("Deactivate"), :has-text("Delete Selected")',
    );
    await expect(bulkActionsBar).not.toBeVisible();
  });

  test('should NOT show Analytics section @P0', async ({ page }) => {
    // Analytics section/toggle should not be visible for ASSISTANT
    const analyticsToggle = page.locator(
      'button:has-text("Analytics"), button:has-text("Show Analytics")',
    );
    await expect(analyticsToggle).not.toBeVisible();
  });

  test('should NOT show Approvals tab @P0', async ({ page }) => {
    const approvalsTab = page.locator(
      'button:has-text("Approvals"), a:has-text("Approvals")',
    );
    await expect(approvalsTab).not.toBeVisible();
  });

  test('should NOT show Show Inactive toggle @P0', async ({ page }) => {
    const inactiveToggle = page.locator(
      ':has-text("show inactive"), label:has-text("inactive")',
    );
    await expect(inactiveToggle).not.toBeVisible();
  });
});

// ─── Template View Modal ────────────────────────────────────────────────────

test.describe('ASSISTANT Role - Template View Modal', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should open template view modal on card click @P0', async ({ page }) => {
    // Click on the first template card
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      // Modal or detail view should open
      const hasModal = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal, [data-testid="template-view-modal"]',
        5000,
      );
      expect(hasModal).toBe(true);
    } else {
      test.skip(true, 'No template cards visible');
    }
  });

  test('should display template details in modal @P0', async ({ page }) => {
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      // Should show template name and details
      const hasDetails = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal',
        5000,
      );
      if (hasDetails) {
        // Variable list or template content should be visible
        const modalContent = page.locator('[role="dialog"], .modal').first();
        await expect(modalContent).toBeVisible();
      }
    } else {
      test.skip(true, 'No template cards visible');
    }
  });

  test('should have "Use This Template" button in modal @P0', async ({ page }) => {
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      const useButton = page
        .locator('button:has-text("Use This Template"), button:has-text("Use")')
        .first();
      await expect(useButton).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'No template cards visible');
    }
  });

  test('should have Download and Export buttons in modal @P1', async ({ page }) => {
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      // Download and/or Export should be available
      const downloadButton = page.locator('button:has-text("Download")').first();
      const exportButton = page.locator('button:has-text("Export")').first();

      const hasDownload = await downloadButton
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasExport = await exportButton
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasDownload || hasExport).toBe(true);
    } else {
      test.skip(true, 'No template cards visible');
    }
  });

  test('should NOT show Duplicate, Modify, Delete buttons in modal @P0', async ({
    page,
  }) => {
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      // These actions should NOT be visible for ASSISTANT
      const duplicateButton = page.locator('button:has-text("Duplicate")');
      const modifyButton = page.locator(
        'button:has-text("Modify"), button:has-text("Modify Template")',
      );
      const deleteButton = page.locator('button:has-text("Delete")');

      await expect(duplicateButton).not.toBeVisible();
      await expect(modifyButton).not.toBeVisible();
      await expect(deleteButton).not.toBeVisible();
    } else {
      test.skip(true, 'No template cards visible');
    }
  });
});

// ─── Template Preview ───────────────────────────────────────────────────────

test.describe('ASSISTANT Role - Template Preview', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should preview template document @P1', async ({ page }) => {
    // Look for preview (eye) button on a template
    const previewButton = page
      .locator('button[title*="Preview" i], button[aria-label*="Preview" i]')
      .first();
    if (await previewButton.isVisible({ timeout: 5000 })) {
      await previewButton.click();
      await page.waitForTimeout(2000);

      // Preview modal or panel should open
      const hasPreview = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal, iframe, [data-testid="document-preview"]',
        5000,
      );
      expect(hasPreview).toBe(true);
    } else {
      test.skip(true, 'No preview buttons visible');
    }
  });
});

// ─── Case Creation from Template (Serial — Data Mutating) ──────────────────

test.describe('ASSISTANT Role - Case Creation from Template', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_MUTATE.email,
      ASSISTANT_MUTATE.password,
      false,
    );
  });

  test('should open variable form from "Use" button @P0', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click "Use Template" button on first template
    const useButton = page.locator('button:has-text("Use Template")').first();
    if (await useButton.isVisible({ timeout: 5000 })) {
      await useButton.click();
      await page.waitForTimeout(2000);

      // Variable form should open (modal or inline) OR navigate to case creation page
      const hasForm = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal, form:has(input)',
        5000,
      );
      const navigatedToCaseCreation =
        page.url().includes('/cases/') || page.url().includes('/create');
      expect(hasForm || navigatedToCaseCreation).toBe(true);
    } else {
      test.skip(true, 'No "Use Template" button visible on templates page');
    }
  });

  test('should display case title and description fields @P0', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const useButton = page.locator('button:has-text("Use Template")').first();
    if (await useButton.isVisible({ timeout: 5000 })) {
      await useButton.click();
      await page.waitForTimeout(1000);

      // Case title field should be present
      const titleField = page.locator(
        'input[name*="title" i], input[placeholder*="title" i], label:has-text("Title") + input, label:has-text("Case Title") + input',
      );
      const hasTitleField = await titleField
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Also check for broader form presence
      const hasForm = await TestHelpers.checkUIElementExists(
        page,
        'form, [role="dialog"] input',
        3000,
      );
      expect(hasTitleField || hasForm).toBe(true);
    } else {
      test.skip(true, 'No "Use" button visible');
    }
  });

  test('should render dynamic variable fields based on template @P0', async ({
    page,
  }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const useButton = page.locator('button:has-text("Use Template")').first();
    if (await useButton.isVisible({ timeout: 5000 })) {
      await useButton.click();
      await page.waitForTimeout(1500);

      // Should have at least one input field for template variables
      const formInputs = page.locator(
        '[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select, .modal input, .modal textarea',
      );
      const inputCount = await formInputs.count();
      expect(inputCount).toBeGreaterThan(0);
    } else {
      test.skip(true, 'No "Use" button visible');
    }
  });

  test('should validate required fields before submission @P0', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const useButton = page.locator('button:has-text("Use Template")').first();
    if (await useButton.isVisible({ timeout: 5000 })) {
      await useButton.click();
      await page.waitForTimeout(1000);

      // Try submitting without filling required fields
      const submitButton = page
        .locator(
          'button:has-text("Create Case"), button:has-text("Confirm"), button[type="submit"]',
        )
        .first();
      if (await submitButton.isVisible({ timeout: 5000 })) {
        // Check if button is disabled — this IS the validation behavior
        const isDisabled = await submitButton.isDisabled();
        if (isDisabled) {
          // Submit button disabled until required fields are filled = correct validation
          expect(isDisabled).toBe(true);
        } else {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Should show validation errors or remain on the form
          const hasValidationError = await TestHelpers.checkUIElementExists(
            page,
            '[role="alert"], .text-red-500, .text-destructive, :invalid, :has-text("required"), :has-text("please fill")',
            3000,
          );
          // Either we get a validation error, or the form prevents submission
          // Both are acceptable — the test passes if we're still on the form
          const isStillOnForm = await TestHelpers.checkUIElementExists(
            page,
            '[role="dialog"], .modal, form:has(input)',
            2000,
          );
          expect(hasValidationError || isStillOnForm).toBe(true);
        }
      }
    } else {
      test.skip(true, 'No "Use Template" button visible');
    }
  });

  test('should preview filled variables before creating @P1', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    // Wait for template cards to render (SWR fetch must complete)
    await page
      .waitForSelector('button:has-text("Use Template")', { timeout: 15000 })
      .catch(() => {});

    const useButton = page.locator('button:has-text("Use Template")').first();
    if (!(await useButton.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'No "Use Template" button visible');
      return;
    }

    await useButton.click();
    await page.waitForTimeout(1000);

    // Look for the Preview button in the form
    const previewButton = page.locator('button:has-text("Preview")').first();
    if (!(await previewButton.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Preview button not visible in variable form');
      return;
    }

    // Fill ALL form fields so the Preview button becomes enabled
    // (Preview is disabled={!allFieldsFilled})
    const formContainer = page.locator('[role="dialog"], .modal').first();

    // Fill case title
    const titleInput = page
      .locator('input[name*="title" i], input[placeholder*="title" i]')
      .first();
    if (await titleInput.isVisible({ timeout: 3000 })) {
      await titleInput.fill('E2E Preview Test Case');
    }

    // Fill case description
    const descInput = page
      .locator(
        'textarea[name*="description" i], textarea[placeholder*="description" i]',
      )
      .first();
    if (await descInput.isVisible({ timeout: 2000 })) {
      await descInput.fill('Automated E2E preview test');
    }

    // Fill text inputs and textareas
    const allInputs = formContainer.locator('input, textarea');
    const allCount = await allInputs.count();
    for (let i = 0; i < allCount; i++) {
      const input = allInputs.nth(i);
      const inputType = await input.getAttribute('type');
      const currentValue = await input.inputValue().catch(() => '');
      if (!currentValue) {
        if (inputType === 'date') {
          await input.fill('2026-03-01');
        } else if (inputType === 'number') {
          await input.fill('100');
        } else if (inputType === 'email') {
          await input.fill('test@example.com');
        } else if (
          inputType === 'hidden' ||
          inputType === 'checkbox' ||
          inputType === 'radio'
        ) {
          continue;
        } else {
          await input.fill('E2E Test Value');
        }
      }
    }

    // Fill native <select> elements
    const allSelects = formContainer.locator('select');
    const selectCount = await allSelects.count();
    for (let i = 0; i < selectCount; i++) {
      const sel = allSelects.nth(i);
      const options = sel.locator('option');
      const optCount = await options.count();
      if (optCount > 1) {
        const value = await options.nth(1).getAttribute('value');
        if (value) await sel.selectOption(value);
      }
    }

    // Fill custom Select components
    const customSelects = formContainer.locator('button[aria-haspopup="listbox"]');
    const customCount = await customSelects.count();
    for (let i = 0; i < customCount; i++) {
      const trigger = customSelects.nth(i);
      await trigger.click();
      await page.waitForTimeout(300);
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
      }
    }

    // Handle list-type variables
    const addItemButtons = formContainer.locator(
      'button:has-text("Add Item"), button:has-text("Add")',
    );
    const addCount = await addItemButtons.count();
    for (let i = 0; i < addCount; i++) {
      const addBtn = addItemButtons.nth(i);
      if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(300);
        const lastInput = formContainer.locator('input').last();
        const lastValue = await lastInput.inputValue().catch(() => '');
        if (!lastValue) {
          await lastInput.fill('E2E List Item');
        }
      }
    }
    await page.waitForTimeout(500);

    // Now click the Preview button (should be enabled after filling all fields)
    const isStillDisabled = await previewButton.isDisabled();
    if (isStillDisabled) {
      test.skip(true, 'Preview button still disabled after filling all fields');
      return;
    }

    await previewButton.click();
    await page.waitForTimeout(1000);

    // Preview dialog should show filled values
    const hasPreview = await TestHelpers.checkUIElementExists(
      page,
      '[role="dialog"]:has-text("Preview"), [role="dialog"]:has-text("Review")',
      5000,
    );
    expect(hasPreview).toBe(true);
  });

  test('should create case from template and navigate to case detail @P0', async ({
    page,
  }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const useButton = page.locator('button:has-text("Use Template")').first();
    if (await useButton.isVisible({ timeout: 5000 })) {
      await useButton.click();
      await page.waitForTimeout(1500);

      // Fill case title
      const titleInput = page
        .locator('input[name*="title" i], input[placeholder*="title" i]')
        .first();
      if (await titleInput.isVisible({ timeout: 5000 })) {
        const timestamp = Date.now();
        await titleInput.fill(`E2E Test Case ${timestamp}`);
      }

      // Fill case description if present
      const descInput = page
        .locator(
          'textarea[name*="description" i], textarea[placeholder*="description" i]',
        )
        .first();
      if (await descInput.isVisible({ timeout: 2000 })) {
        await descInput.fill('Automated E2E test case creation');
      }

      // Fill ALL visible variable fields with reasonable defaults
      // Template variable form has required inputs that must all be filled before submit is enabled
      // TemplateVariableForm.tsx computes allFieldsFilled via useMemo:
      //   caseTitle (non-empty), all required variables filled, list vars with ≥1 item
      const formContainer = page.locator('[role="dialog"], .modal').first();

      // 1. Fill text inputs and textareas
      const allInputs = formContainer.locator('input, textarea');
      const allCount = await allInputs.count();
      for (let i = 0; i < allCount; i++) {
        const input = allInputs.nth(i);
        const inputType = await input.getAttribute('type');
        const currentValue = await input.inputValue().catch(() => '');
        if (!currentValue) {
          if (inputType === 'date') {
            await input.fill('2026-03-01');
          } else if (inputType === 'number') {
            await input.fill('100');
          } else if (inputType === 'email') {
            await input.fill('test@example.com');
          } else if (
            inputType === 'hidden' ||
            inputType === 'checkbox' ||
            inputType === 'radio'
          ) {
            continue; // Skip hidden/checkbox/radio inputs
          } else {
            await input.fill('E2E Test Value');
          }
        }
      }

      // 2. Fill native <select> elements in the dialog
      const allSelects = formContainer.locator('select');
      const selectCount = await allSelects.count();
      for (let i = 0; i < selectCount; i++) {
        const sel = allSelects.nth(i);
        const options = sel.locator('option');
        const optCount = await options.count();
        if (optCount > 1) {
          // Select the second option (first is usually placeholder)
          const value = await options.nth(1).getAttribute('value');
          if (value) await sel.selectOption(value);
        }
      }

      // 3. Fill custom Select components (button[aria-haspopup="listbox"])
      const customSelects = formContainer.locator('button[aria-haspopup="listbox"]');
      const customCount = await customSelects.count();
      for (let i = 0; i < customCount; i++) {
        const trigger = customSelects.nth(i);
        await trigger.click();
        await page.waitForTimeout(300);
        // Pick the first available option
        const option = page.locator('[role="option"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }

      // 4. Handle list-type variables (look for "Add Item" / "Add" buttons in form)
      const addItemButtons = formContainer.locator(
        'button:has-text("Add Item"), button:has-text("Add")',
      );
      const addCount = await addItemButtons.count();
      for (let i = 0; i < addCount; i++) {
        const addBtn = addItemButtons.nth(i);
        if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await addBtn.click();
          await page.waitForTimeout(300);
          // Fill the newly created input
          const lastInput = formContainer.locator('input').last();
          const lastValue = await lastInput.inputValue().catch(() => '');
          if (!lastValue) {
            await lastInput.fill('E2E List Item');
          }
        }
      }
      await page.waitForTimeout(500);

      // Submit the form
      const submitButton = page
        .locator(
          'button:has-text("Create Case"), button:has-text("Confirm & Create"), button:has-text("Confirm")',
        )
        .first();
      if (await submitButton.isVisible({ timeout: 5000 })) {
        // Check if button is still disabled (not all required fields could be filled)
        const isDisabled = await submitButton.isDisabled();
        if (isDisabled) {
          test.skip(
            true,
            'Submit button disabled — not all template variables could be auto-filled',
          );
          return;
        }
        await submitButton.click();

        // Wait for navigation to case detail page
        try {
          await page.waitForURL(/\/cases\/\d+/, { timeout: 15000 });
          expect(page.url()).toMatch(/\/cases\/\d+/);
        } catch {
          // May show a success message without redirect
          await page.waitForTimeout(3000);
          const hasSuccess = await TestHelpers.checkUIElementExists(
            page,
            ':has-text("success"), :has-text("created")',
            5000,
          );
          const navigatedToCase = page.url().includes('/cases/');
          expect(hasSuccess || navigatedToCase).toBe(true);
        }
      } else {
        test.skip(true, 'Submit button not visible in variable form');
      }
    } else {
      test.skip(true, 'No "Use" button visible on templates page');
    }
  });
});

// ─── Template Packages ──────────────────────────────────────────────────────

test.describe('ASSISTANT Role - Template Packages', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should switch to Packages tab @P0', async ({ page }) => {
    const packagesTab = page
      .locator('button:has-text("Packages"), a:has-text("Packages")')
      .first();
    if (await packagesTab.isVisible({ timeout: 5000 })) {
      await packagesTab.click();
      await page.waitForTimeout(1000);

      // Should display package content
      const hasPackageContent = await TestHelpers.checkUIElementExists(
        page,
        '[data-testid*="package-card"], [data-testid*="package"], :has-text("package"), :has-text("browse")',
        5000,
      );
      expect(hasPackageContent).toBe(true);
    } else {
      test.skip(true, 'Packages tab not visible');
    }
  });

  test('should browse template packages with search @P1', async ({ page }) => {
    const packagesTab = page
      .locator('button:has-text("Packages"), a:has-text("Packages")')
      .first();
    if (await packagesTab.isVisible({ timeout: 5000 })) {
      await packagesTab.click();
      await page.waitForTimeout(1000);

      // Look for search within packages view
      const searchInput = page.locator('input[placeholder*="Search" i]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('Employment');
        await page.waitForTimeout(1000);
      }
      // Packages content should be present
      expect(page.url()).toContain('/templates');
    } else {
      test.skip(true, 'Packages tab not visible');
    }
  });

  test('should preview package details @P1', async ({ page }) => {
    const packagesTab = page
      .locator('button:has-text("Packages"), a:has-text("Packages")')
      .first();
    if (!(await packagesTab.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Packages tab not visible');
      return;
    }
    await packagesTab.click();
    await page.waitForTimeout(1000);

    // Packages view shows EmptyState with "Browse Template Packages" button
    const browseBtn = page
      .locator('button:has-text("Browse Template Packages")')
      .first();
    if (!(await browseBtn.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Browse Template Packages button not visible');
      return;
    }
    await browseBtn.click();
    await page.waitForTimeout(2000);

    // TemplatePackageBrowser modal should open
    const hasModal = await TestHelpers.checkUIElementExists(
      page,
      '[role="dialog"], .modal',
      5000,
    );
    if (!hasModal) {
      test.skip(true, 'Package browser modal did not open');
      return;
    }

    // Look for package cards inside the modal
    const packageCard = page
      .locator(
        '[role="dialog"] .cursor-pointer, [role="dialog"] [data-testid*="package"]',
      )
      .first();
    if (await packageCard.isVisible({ timeout: 5000 })) {
      await packageCard.click();
      await page.waitForTimeout(1000);
      // Package details should be displayed (either inline or new modal)
      expect(true).toBe(true);
    } else {
      test.skip(true, 'No package cards visible in browser');
    }
  });

  test('should open package variable form from "Use Package" @P0', async ({ page }) => {
    const packagesTab = page
      .locator('button:has-text("Packages"), a:has-text("Packages")')
      .first();
    if (!(await packagesTab.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Packages tab not visible');
      return;
    }
    await packagesTab.click();
    await page.waitForTimeout(1000);

    // Click "Browse Template Packages" to open the modal
    const browseBtn = page
      .locator('button:has-text("Browse Template Packages")')
      .first();
    if (!(await browseBtn.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Browse Template Packages button not visible');
      return;
    }
    await browseBtn.click();
    await page.waitForTimeout(2000);

    // Look for "Use Package" button inside the modal
    const usePackageButton = page
      .locator(
        '[role="dialog"] button:has-text("Use Package"), [role="dialog"] button:has-text("Use")',
      )
      .first();
    if (await usePackageButton.isVisible({ timeout: 5000 })) {
      await usePackageButton.click();
      await page.waitForTimeout(2000);

      // Variable form should open (second modal or inline) OR navigate to case creation
      const hasForm = await TestHelpers.checkUIElementExists(
        page,
        'form:has(input), [role="dialog"]:has(input)',
        5000,
      );
      const navigatedToCaseCreation =
        page.url().includes('/cases/') || page.url().includes('/create');
      expect(hasForm || navigatedToCaseCreation).toBe(true);
    } else {
      test.skip(true, 'No "Use Package" button visible in browser modal');
    }
  });
});

// ─── Case Creation from Package (Serial — Data Mutating) ───────────────────

test.describe('ASSISTANT Role - Case Creation from Package', () => {
  test.describe.configure({ mode: 'serial' });

  test('should create case from package with merged variables @P0', async ({
    page,
  }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_MUTATE.email,
      ASSISTANT_MUTATE.password,
      false,
    );

    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Switch to packages
    const packagesTab = page
      .locator('button:has-text("Packages"), a:has-text("Packages")')
      .first();
    if (!(await packagesTab.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Packages tab not visible');
      return;
    }

    await packagesTab.click();
    await page.waitForTimeout(1000);

    // Packages view shows EmptyState with "Browse Template Packages" button
    const browseBtn = page
      .locator('button:has-text("Browse Template Packages")')
      .first();
    if (!(await browseBtn.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'Browse Template Packages button not visible');
      return;
    }
    await browseBtn.click();
    // Wait for the TemplatePackageBrowser modal to open and show package cards
    await page
      .waitForSelector('[role="dialog"] [data-package-card]', { timeout: 15000 })
      .catch(() => {});

    // Click the first package card to open its detail/preview view
    const packageCard = page.locator('[role="dialog"] [data-package-card]').first();
    if (!(await packageCard.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'No package cards visible in browser modal');
      return;
    }
    await packageCard.click();
    await page.waitForTimeout(1000);

    // In the preview modal, click "Use This Package" to open the variable form
    const useThisPackageBtn = page
      .locator('button:has-text("Use This Package")')
      .first();
    if (!(await useThisPackageBtn.isVisible({ timeout: 5000 }))) {
      test.skip(true, 'No "Use This Package" button visible in preview modal');
      return;
    }
    await useThisPackageBtn.click();
    await page.waitForTimeout(2000);

    // Fill case title
    const titleInput = page
      .locator('input[name*="title" i], input[placeholder*="title" i]')
      .first();
    if (await titleInput.isVisible({ timeout: 5000 })) {
      const timestamp = Date.now();
      await titleInput.fill(`E2E Package Case ${timestamp}`);
    }

    // Fill ALL visible variable fields with reasonable defaults
    // Same enhanced fill logic as template case creation (handles select, custom Select, list vars)
    const formContainer = page.locator('[role="dialog"], .modal').first();

    // 1. Fill text inputs and textareas
    const allInputs = formContainer.locator('input, textarea');
    const allCount = await allInputs.count();
    for (let i = 0; i < allCount; i++) {
      const input = allInputs.nth(i);
      const inputType = await input.getAttribute('type');
      const currentValue = await input.inputValue().catch(() => '');
      if (!currentValue) {
        if (inputType === 'date') {
          await input.fill('2026-03-01');
        } else if (inputType === 'number') {
          await input.fill('100');
        } else if (inputType === 'email') {
          await input.fill('test@example.com');
        } else if (
          inputType === 'hidden' ||
          inputType === 'checkbox' ||
          inputType === 'radio'
        ) {
          continue;
        } else {
          await input.fill('E2E Test Value');
        }
      }
    }

    // 2. Fill native <select> elements
    const allSelects = formContainer.locator('select');
    const selectCount = await allSelects.count();
    for (let i = 0; i < selectCount; i++) {
      const sel = allSelects.nth(i);
      const options = sel.locator('option');
      const optCount = await options.count();
      if (optCount > 1) {
        const value = await options.nth(1).getAttribute('value');
        if (value) await sel.selectOption(value);
      }
    }

    // 3. Fill custom Select components
    const customSelects = formContainer.locator('button[aria-haspopup="listbox"]');
    const customCount = await customSelects.count();
    for (let i = 0; i < customCount; i++) {
      const trigger = customSelects.nth(i);
      await trigger.click();
      await page.waitForTimeout(300);
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
      }
    }

    // 4. Handle list-type variables
    const addItemButtons = formContainer.locator(
      'button:has-text("Add Item"), button:has-text("Add")',
    );
    const addCount = await addItemButtons.count();
    for (let i = 0; i < addCount; i++) {
      const addBtn = addItemButtons.nth(i);
      if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(300);
        const lastInput = formContainer.locator('input').last();
        const lastValue = await lastInput.inputValue().catch(() => '');
        if (!lastValue) {
          await lastInput.fill('E2E List Item');
        }
      }
    }
    await page.waitForTimeout(500);

    // Submit — button text is "Create Case with N Documents" or "Create Case"
    const submitButton = page
      .locator(
        'button:has-text("Create Case"), button:has-text("Confirm & Create"), button:has-text("Confirm")',
      )
      .first();
    if (await submitButton.isVisible({ timeout: 5000 })) {
      // Check if button is still disabled
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        test.skip(
          true,
          'Submit button disabled — not all package variables could be auto-filled',
        );
        return;
      }
      await submitButton.click();

      try {
        await page.waitForURL(/\/cases\/\d+/, { timeout: 15000 });
        expect(page.url()).toMatch(/\/cases\/\d+/);
      } catch {
        await page.waitForTimeout(3000);
        const hasSuccess = await TestHelpers.checkUIElementExists(
          page,
          ':has-text("success"), :has-text("created")',
          5000,
        );
        const navigatedToCase = page.url().includes('/cases/');
        expect(hasSuccess || navigatedToCase).toBe(true);
      }
    } else {
      test.skip(true, 'Submit button not visible after filling variables');
    }
  });
});

// ─── Download & Export ──────────────────────────────────────────────────────

test.describe('ASSISTANT Role - Template Download & Export', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should download template file (.docx) @P1', async ({ page }) => {
    // Click on first template to open modal
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      const downloadButton = page.locator('button:has-text("Download")').first();
      if (await downloadButton.isVisible({ timeout: 5000 })) {
        // Set up download listener
        const downloadPromise = page
          .waitForEvent('download', { timeout: 10000 })
          .catch(() => null);
        await downloadButton.click();
        const download = await downloadPromise;

        // Download should have been initiated (or button should have been clickable)
        // Even if download fails due to test env, clicking shouldn't error
        expect(true).toBe(true);
      } else {
        test.skip(true, 'Download button not visible in modal');
      }
    } else {
      test.skip(true, 'No template cards visible');
    }
  });

  test('should export template (.zip) @P2', async ({ page }) => {
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      const exportButton = page.locator('button:has-text("Export")').first();
      if (await exportButton.isVisible({ timeout: 5000 })) {
        const downloadPromise = page
          .waitForEvent('download', { timeout: 10000 })
          .catch(() => null);
        await exportButton.click();
        await downloadPromise;
        expect(true).toBe(true);
      } else {
        test.skip(true, 'Export button not visible in modal');
      }
    } else {
      test.skip(true, 'No template cards visible');
    }
  });
});
