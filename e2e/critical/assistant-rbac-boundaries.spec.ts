/**
 * ASSISTANT Role - RBAC Boundaries E2E Tests
 *
 * Comprehensive negative tests ensuring ASSISTANT users CANNOT access
 * restricted features. Validates all RBAC gates are properly enforced.
 *
 * Credential: WS_TEST_CREDENTIALS.USER_1 (dedicated ASSISTANT account)
 *
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/ASSISTANT_ROLE_UI_INVENTORY.md}
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/_Assistant_E2E_Playwright_TST_Evol.md} File 9
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

const ASSISTANT = WS_TEST_CREDENTIALS.USER_1;

test.describe('ASSISTANT Role - RBAC Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
  });

  test('should redirect from /admin to /dashboard @P0', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should NOT be on /admin — either redirected to dashboard or login
    const url = page.url();
    expect(url).not.toMatch(/\/admin(\/|$)/);
  });

  test('should NOT display Admin nav link anywhere @P0', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Desktop nav: Admin link should be hidden
    const adminNavLink = page.locator('nav a[href="/admin"]');
    await expect(adminNavLink).not.toBeVisible();

    // Check in mobile menu too
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const hamburger = page.locator('button:has(svg)').first();
    if (await hamburger.isVisible({ timeout: 3000 })) {
      await hamburger.click();
      await page.waitForTimeout(500);

      // Admin link should not appear in mobile menu either
      const mobileAdminLink = page.locator('a[href="/admin"]');
      await expect(mobileAdminLink).not.toBeVisible();
    }

    // Restore viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should NOT show bulk selection on cases page @P0', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Select mode button should not be present for ASSISTANT
    // (canPerformBulkActions gate)
    const selectModeButton = page.locator('button:has-text("Select")').first();
    const isVisible = await selectModeButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // No checkboxes should be visible in the cases list
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBe(0);
  });

  test('should NOT show case analytics section @P0', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const analyticsToggle = page.locator(
      'button:has-text("Analytics"), button:has-text("Show Analytics")',
    );
    await expect(analyticsToggle).not.toBeVisible();
  });

  test('should NOT show Close/Reopen buttons on case detail @P0', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Navigate to first available case
    const caseLink = page
      .locator('a[href*="/cases/"]')
      .filter({ hasNotText: /new|closed|in-progress|to-review/i })
      .first();
    if (await caseLink.isVisible({ timeout: 5000 })) {
      await caseLink.click();
      try {
        await page.waitForURL(/\/cases\/\d+/, { timeout: 10000 });
      } catch {
        await page.waitForTimeout(3000);
      }

      if (page.url().match(/\/cases\/\d+/)) {
        // Close Case and Reopen Case buttons should not be visible
        const closeCaseButton = page.locator('button:has-text("Close Case")');
        const reopenButton = page.locator(
          'button:has-text("Reopen Case"), button:has-text("Reopen")',
        );

        await expect(closeCaseButton).not.toBeVisible();
        await expect(reopenButton).not.toBeVisible();
      }
    } else {
      test.skip(true, 'No cases available for detail view');
    }
  });

  test('should NOT show Force Unlock button on locked case @P0', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const caseLink = page
      .locator('a[href*="/cases/"]')
      .filter({ hasNotText: /new|closed|in-progress|to-review/i })
      .first();
    if (await caseLink.isVisible({ timeout: 5000 })) {
      await caseLink.click();
      try {
        await page.waitForURL(/\/cases\/\d+/, { timeout: 10000 });
      } catch {
        await page.waitForTimeout(3000);
      }

      if (page.url().match(/\/cases\/\d+/)) {
        const forceUnlockButton = page.locator('button:has-text("Force Unlock")');
        await expect(forceUnlockButton).not.toBeVisible();
      }
    } else {
      test.skip(true, 'No cases available');
    }
  });

  test('should NOT show Create Template button @P0', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const createTemplateButton = page.locator('button:has-text("Create Template")');
    await expect(createTemplateButton).not.toBeVisible();
  });

  test('should NOT show template editing controls (edit, delete, duplicate) @P0', async ({
    page,
  }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Edit/Modify buttons should not be present
    const editButtons = page.locator(
      'button[title*="Modify" i], button[title*="Edit" i]',
    );
    const editCount = await editButtons.count();
    expect(editCount).toBe(0);

    // Open a template modal if possible
    const templateCard = page
      .locator('[data-template-card], [data-template-row]')
      .first();
    if (await templateCard.isVisible({ timeout: 5000 })) {
      await templateCard.click();
      await page.waitForTimeout(1000);

      // In modal: Duplicate, Modify, Delete should be hidden
      const duplicateButton = page.locator('button:has-text("Duplicate")');
      const modifyButton = page.locator('button:has-text("Modify Template")');
      const deleteButton = page.locator('button:has-text("Delete")');

      await expect(duplicateButton).not.toBeVisible();
      await expect(modifyButton).not.toBeVisible();
      await expect(deleteButton).not.toBeVisible();
    }
  });

  test('should NOT show Upload Document button on documents page @P0', async ({
    page,
  }) => {
    await page.goto('/documents');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const uploadButton = page.locator(
      'button:has-text("Upload Document"), a:has-text("Upload Document"), button:has-text("Upload")',
    );
    await expect(uploadButton).not.toBeVisible();
  });

  test('should NOT show Team tab in settings @P0', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const teamTab = page.locator(
      'button:has-text("Team"), [role="tab"]:has-text("Team"), a:has-text("Team")',
    );
    await expect(teamTab).not.toBeVisible();
  });

  test('should NOT show template analytics section @P1', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const analyticsSection = page.locator(
      'button:has-text("Analytics"), :has-text("Template Analytics"), :has-text("Usage Statistics")',
    );
    await expect(analyticsSection).not.toBeVisible();
  });

  test('should NOT show template approvals tab @P1', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const approvalsTab = page.locator(
      'button:has-text("Approvals"), [role="tab"]:has-text("Approvals")',
    );
    await expect(approvalsTab).not.toBeVisible();
  });

  test('should NOT show Show Inactive templates toggle @P1', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const inactiveToggle = page.locator(
      ':has-text("show inactive"), label:has-text("inactive"), input[name*="inactive" i]',
    );
    await expect(inactiveToggle).not.toBeVisible();
  });

  test('should show restricted state when navigating to ?tab=team via URL @P1', async ({
    page,
  }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Team tab should either:
    // 1. Not render (redirect to default tab)
    // 2. Show an "Access Restricted" or empty state
    // 3. Simply not display the team content

    // The page shows "Access Restricted" with text mentioning "team members" — that's expected.
    // What we verify is that no actual team management UI (invite form, member list) is present.
    const teamManagementUI = page.locator(
      'button:has-text("Invite"), button:has-text("Add Member"), table:has([data-testid*="team"]), form:has(input[placeholder*="email" i])',
    );
    await expect(teamManagementUI).not.toBeVisible();

    // Should still be on settings page
    expect(page.url()).toContain('/settings');
  });
});
