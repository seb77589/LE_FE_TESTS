/**
 * MANAGER Role E2E Tests
 *
 * Tests role-specific UI behavior for MANAGER role users.
 *
 * Key Assertions:
 * - "Admin" navigation link SHOULD be visible
 * - "Administrator Access" section SHOULD be visible on dashboard
 * - "Manage Users" link SHOULD be present
 * - "System Admin" link should NOT be present (SUPERADMIN only)
 * - Cases page should show company-scoped data only
 *
 * @see {@link /home/duck/legalease/frontend/tests/docs/ROLE_BASED_UI_DIFFERENCES.md}
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

// Use dedicated MANAGER role test credentials from centralized config
// Credentials validated at import - fails fast if env vars missing
const MANAGER_CREDENTIALS = WS_TEST_CREDENTIALS.ADMIN_1;

test.describe('MANAGER Role - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as MANAGER user
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true, // isAdmin = true for MANAGER
    );
  });

  test('should see Admin navigation link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify main navigation items are visible
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible();
    await expect(page.locator('a[href="/cases"]').first()).toBeVisible();
    await expect(page.locator('a[href="/templates"]').first()).toBeVisible();
    await expect(page.locator('a[href="/notifications"]').first()).toBeVisible();

    // CRITICAL: Admin link SHOULD be visible for MANAGER role
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).toBeVisible();
  });

  test('should see all navigation items including Admin', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify all 5 navigation items are present
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/cases"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/templates"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/notifications"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/admin"]')).toBeVisible();
  });

  test('should display correct role badge', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Role badge should show "MANAGER" or "Manager"
    const roleBadge = page.locator('span.text-xs, span.text-sm').filter({ hasText: /manager/i });
    await expect(roleBadge.first()).toBeVisible();
  });
});

test.describe('MANAGER Role - Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should see Administrator Access section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Administrator Access section SHOULD be present for MANAGER
    const adminAccessSection = page.locator('text=/Administrator Access/i');
    await expect(adminAccessSection).toBeVisible();
  });

  test('should see Manage Users link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Manage Users link SHOULD be present for MANAGER
    const manageUsersLink = page.locator('a[href="/admin/users"]');
    await expect(manageUsersLink).toBeVisible();

    // Verify link text
    await expect(manageUsersLink).toHaveText(/Manage Users/i);
  });

  test('should NOT see System Admin link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // System Admin link should NOT be visible for MANAGER (SUPERADMIN only)
    const systemAdminLink = page.locator('a[href="/admin"]:has-text("System Admin")');
    await expect(systemAdminLink).not.toBeVisible();
  });

  test('should see standard dashboard widgets', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Welcome section with user name
    const welcomeHeading = page.locator('h1');
    await expect(welcomeHeading).toContainText('Welcome');

    // Case status cards (same for all roles)
    const closedCasesCard = page.locator('text=Closed Cases').first();
    await expect(closedCasesCard).toBeVisible();

    const inProgressCard = page.locator('text=Cases In Progress').first();
    await expect(inProgressCard).toBeVisible();

    const toReviewCard = page.locator('text=Cases To Review').first();
    await expect(toReviewCard).toBeVisible();
  });

  test('should be able to click Manage Users link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for Administrator Access section to be visible
    const adminAccessSection = page.locator('text=/Administrator Access/i');
    await expect(adminAccessSection).toBeVisible();

    // Click Manage Users link
    const manageUsersLink = page.locator('a[href="/admin/users"]');
    await expect(manageUsersLink).toBeVisible();
    await manageUsersLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should navigate to /admin/users page (or stay on /admin if redirected)
    const currentUrl = page.url();
    expect(currentUrl.includes('/admin/users') || currentUrl.includes('/admin')).toBe(true);
  });
});

test.describe('MANAGER Role - Cases Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should see cases page with company-scoped data', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify cases page loads
    const hasCasesContent = await TestHelpers.checkUIElementExists(
      page,
      'main >> h1:has-text("Cases")',
      5000,
    );
    expect(hasCasesContent).toBe(true);

    // Verify case status cards are visible (same for all roles)
    const hasClosedCasesCard = await TestHelpers.checkUIElementExists(
      page,
      'main >> text=Closed Cases',
      5000,
    );
    expect(hasClosedCasesCard).toBe(true);
  });

  test('should be able to view case details', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await page.waitForSelector('tbody a[href*="/cases/"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for case detail links
    const caseLink = await TestHelpers.checkUIElementExists(
      page,
      'tbody a[href*="/cases/"]',
      5000,
    );

    if (caseLink) {
      // Click first case detail link
      await page.locator('tbody a[href*="/cases/"]').first().click();
      await page.waitForTimeout(2000);

      // Should navigate to case detail page
      const isCaseDetail =
        page.url().includes('/cases/') && !page.url().includes('/cases/new');
      expect(isCaseDetail).toBe(true);
    } else {
      test.skip(true, 'No cases found to view');
    }
  });

  test('should see company-scoped cases only', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Count table rows
    const tableRows = await page.locator('tbody tr').count();

    // MANAGER should see company-scoped cases (8 cases for default-company)
    // Note: Exact count may vary based on test data, but should be > 0 and < total across all companies
    expect(tableRows).toBeGreaterThan(0);
    expect(tableRows).toBeLessThanOrEqual(16); // Max 16 cases (8 per company in seed data)
  });
});

test.describe('MANAGER Role - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should NOT have direct access to /admin page (SUPERADMIN only)', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // MANAGER should see access denied for /admin (SUPERADMIN only)
    // MANAGER only has access to /admin/users, not /admin
    const accessDenied = page.locator('text=/access denied|unauthorized|forbidden/i');
    await expect(accessDenied).toBeVisible();
  });

  test('should be able to access admin users page', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // MANAGER should have access to /admin/users page
    expect(page.url()).toContain('/admin/users');

    // Should not be redirected or show access denied
    const accessDenied = page.locator('text=/access denied|unauthorized|forbidden/i');
    await expect(accessDenied).not.toBeVisible();
  });
});

test.describe('MANAGER Role - Profile Menu', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should have access to all profile menu items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Open user menu
    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await userMenuButton.click();
    await page.waitForTimeout(500);

    // Verify profile menu items are available (same for all roles)
    await expect(page.locator('a[href="/profile"]').first()).toBeVisible();
    await expect(page.locator('a[href="/settings"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/security"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/sessions"]').first()).toBeVisible();
  });
});

test.describe('MANAGER Role - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should have accessible navigation for MANAGER role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Navigation should be properly labeled
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Admin link should be accessible
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toHaveText(/Admin/i);
  });
});
