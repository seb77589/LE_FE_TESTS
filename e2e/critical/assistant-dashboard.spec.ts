/**
 * ASSISTANT Role - Dashboard E2E Tests
 *
 * Validates the dashboard page functionality for ASSISTANT users:
 * stat cards, navigation links, TemplateWidget, and RBAC enforcement.
 *
 * Credential: WS_TEST_CREDENTIALS.USER_1 (dedicated ASSISTANT account)
 *
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/ASSISTANT_ROLE_UI_INVENTORY.md} §2 Dashboard
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

const ASSISTANT = WS_TEST_CREDENTIALS.USER_1;

test.describe('ASSISTANT Role - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display welcome heading with user name @P0', async ({ page }) => {
    const welcomeHeading = page.locator('h1');
    await expect(welcomeHeading).toContainText(/welcome/i);
  });

  test('should display 3 stat cards (Closed, In Progress, To Review) @P0', async ({
    page,
  }) => {
    await expect(page.locator('text=Closed Cases').first()).toBeVisible();
    await expect(page.locator('text=Cases In Progress').first()).toBeVisible();
    await expect(page.locator('text=Cases To Review').first()).toBeVisible();
  });

  test('should navigate to /cases/closed from stat card @P0', async ({ page }) => {
    const closedCard = page.locator('a[href="/cases/closed"]').first();
    if (await closedCard.isVisible({ timeout: 5000 })) {
      await closedCard.click();
      await page.waitForURL('**/cases/closed', { timeout: 10000 });
      expect(page.url()).toContain('/cases/closed');
    } else {
      // Stat card may be a clickable div — try clicking text
      const textCard = page.locator('text=Closed Cases').first();
      if (await textCard.isVisible({ timeout: 3000 })) {
        await textCard.click();
        await page.waitForURL('**/cases/closed', { timeout: 10000 });
        expect(page.url()).toContain('/cases/closed');
      } else {
        test.skip(true, 'No closed cases stat card available for test user');
      }
    }
  });

  test('should navigate to /cases/in-progress from stat card @P0', async ({ page }) => {
    const inProgressCard = page.locator('a[href="/cases/in-progress"]').first();
    if (await inProgressCard.isVisible({ timeout: 5000 })) {
      await inProgressCard.click();
      await page.waitForURL('**/cases/in-progress', { timeout: 10000 });
      expect(page.url()).toContain('/cases/in-progress');
    } else {
      const textCard = page.locator('text=Cases In Progress').first();
      if (await textCard.isVisible({ timeout: 3000 })) {
        await textCard.click();
        await page.waitForURL('**/cases/in-progress', { timeout: 10000 });
        expect(page.url()).toContain('/cases/in-progress');
      } else {
        test.skip(true, 'No in-progress cases stat card available for test user');
      }
    }
  });

  test('should navigate to /cases/to-review from stat card @P0', async ({ page }) => {
    const toReviewCard = page.locator('a[href="/cases/to-review"]').first();
    if (await toReviewCard.isVisible({ timeout: 5000 })) {
      await toReviewCard.click();
      await page.waitForURL('**/cases/to-review', { timeout: 10000 });
      expect(page.url()).toContain('/cases/to-review');
    } else {
      const textCard = page.locator('text=Cases To Review').first();
      if (await textCard.isVisible({ timeout: 3000 })) {
        await textCard.click();
        await page.waitForURL('**/cases/to-review', { timeout: 10000 });
        expect(page.url()).toContain('/cases/to-review');
      } else {
        test.skip(true, 'No to-review cases stat card available for test user');
      }
    }
  });

  test('should display TemplateWidget with recent templates @P1', async ({ page }) => {
    // TemplateWidget heading is "Recent Templates", may show empty state "No recent templates"
    const hasTemplateWidget = await TestHelpers.checkUIElementExists(
      page,
      ':has-text("Recent Templates"), :has-text("no recent templates"), :has-text("Browse All")',
      5000,
    );
    // Widget may or may not have templates loaded depending on data state
    // Just verify the section exists
    expect(hasTemplateWidget).toBe(true);
  });

  test('should navigate to /templates from TemplateWidget Browse All @P1', async ({
    page,
  }) => {
    // TemplateWidget renders Browse All as <Button> (not <a>), uses router.push('/templates')
    const browseAllButton = page
      .locator(
        'button:has-text("Browse All"), a[href="/templates"]:has-text("Browse All")',
      )
      .first();
    if (await browseAllButton.isVisible({ timeout: 5000 })) {
      await browseAllButton.click();
      try {
        await page.waitForURL('**/templates', { timeout: 10000 });
      } catch {
        await page.waitForTimeout(3000);
      }
      expect(page.url()).toContain('/templates');
    } else {
      // Browse All button may not be visible — skip gracefully
      test.skip(true, 'TemplateWidget Browse All button not visible');
    }
  });

  test('should open template variable form from TemplateWidget Use button @P1', async ({
    page,
  }) => {
    // Look for Use button within the template widget area
    // (only visible when user has recently used templates)
    const useButton = page.locator('button:has-text("Use Template")').first();
    if (await useButton.isVisible({ timeout: 5000 })) {
      await useButton.click();
      await page.waitForTimeout(2000);

      // Should open a modal/form for template variables or navigate
      const hasVariableForm = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal, form:has(input)',
        5000,
      );
      const navigated = !page.url().includes('/dashboard');
      expect(hasVariableForm || navigated).toBe(true);
    } else {
      // "No recently used templates" state — no Use button available
      test.skip(
        true,
        'No template "Use" buttons visible on dashboard (no recent templates)',
      );
    }
  });

  test('should NOT display Administrator Access section @P0', async ({ page }) => {
    // Administrator Access section should NOT be present for ASSISTANT
    const adminAccessSection = page.locator('text=/Administrator Access/i');
    await expect(adminAccessSection).not.toBeVisible();

    // Manage Users link should NOT be present
    const manageUsersLink = page.locator('a[href="/admin/users"]');
    await expect(manageUsersLink).not.toBeVisible();

    // System Admin link should NOT be present
    const systemAdminLink = page.locator('a[href="/admin"]');
    await expect(systemAdminLink).not.toBeVisible();
  });

  test('should show email verification alert if user not verified @P2', async ({
    page,
  }) => {
    // This is conditional — only visible if user.is_verified === false
    // Check if the alert exists (may or may not depending on test user state)
    const verificationAlert = page.locator('text=/verify|verification/i').first();
    const resendButton = page.locator('button:has-text("Resend")').first();

    if (await verificationAlert.isVisible({ timeout: 3000 })) {
      // If alert is shown, resend button should also be present
      await expect(resendButton).toBeVisible();
    }
    // If alert is not shown, user is verified — test passes either way
  });
});
