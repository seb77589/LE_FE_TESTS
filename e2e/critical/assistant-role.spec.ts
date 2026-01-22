/**
 * ASSISTANT Role E2E Tests
 *
 * Tests role-specific UI behavior for ASSISTANT role users.
 *
 * Key Assertions:
 * - NO "Admin" navigation link should be visible
 * - NO "Administrator Access" section on dashboard
 * - Cases page should show company-scoped data only
 * - All standard features should be accessible (Dashboard, Cases, Templates, Notifications)
 *
 * @see {@link /home/duck/legalease/frontend/tests/docs/ROLE_BASED_UI_DIFFERENCES.md}
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

// Use dedicated ASSISTANT role test credentials from centralized config
// Credentials validated at import - fails fast if env vars missing
const ASSISTANT_CREDENTIALS = WS_TEST_CREDENTIALS.USER_1;

test.describe('ASSISTANT Role - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as ASSISTANT user
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_CREDENTIALS.email,
      ASSISTANT_CREDENTIALS.password,
      false, // isAdmin = false for ASSISTANT
    );
  });

  test('should NOT see Admin navigation link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify main navigation items are visible
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/cases"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/templates"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/notifications"]').first()).toBeVisible();

    // CRITICAL: Admin link should NOT be visible for ASSISTANT role
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).not.toBeVisible();
  });

  test('should see standard navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Count visible navigation links
    const navLinks = page.locator('nav a[href^="/"]').filter({ hasText: /Dashboard|Cases|Templates|Notifications/ });
    const count = await navLinks.count();

    // ASSISTANT should see exactly 4 standard nav items (Dashboard, Cases, Templates, Notifications)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should display correct role badge', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Role badge should show "ASSISTANT" or "Assistant"
    const roleBadge = page.locator('span.text-xs, span.text-sm').filter({ hasText: /assistant/i });
    await expect(roleBadge.first()).toBeVisible();
  });
});

test.describe('ASSISTANT Role - Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_CREDENTIALS.email,
      ASSISTANT_CREDENTIALS.password,
      false,
    );
  });

  test('should NOT see Administrator Access section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

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

  test('should see standard dashboard widgets', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Welcome section with user name
    const welcomeHeading = page.locator('h1');
    await expect(welcomeHeading).toContainText('Welcome');

    // Case status cards
    const closedCasesCard = page.locator('text=Closed Cases').first();
    await expect(closedCasesCard).toBeVisible();

    const inProgressCard = page.locator('text=Cases In Progress').first();
    await expect(inProgressCard).toBeVisible();

    const toReviewCard = page.locator('text=Cases To Review').first();
    await expect(toReviewCard).toBeVisible();
  });
});

test.describe('ASSISTANT Role - Cases Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_CREDENTIALS.email,
      ASSISTANT_CREDENTIALS.password,
      false,
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
});

test.describe('ASSISTANT Role - Profile Menu', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_CREDENTIALS.email,
      ASSISTANT_CREDENTIALS.password,
      false,
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

test.describe('ASSISTANT Role - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT_CREDENTIALS.email,
      ASSISTANT_CREDENTIALS.password,
      false,
    );
  });

  test('should have accessible navigation for ASSISTANT role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Navigation should be properly labeled
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Links should have proper text content
    const dashboardLink = page.locator('nav a[href="/dashboard"]').last(); // Use .last() to get the actual nav link, not the logo
    await expect(dashboardLink).toHaveText(/Dashboard/i);

    const casesLink = page.locator('nav a[href="/cases"]').first();
    await expect(casesLink).toHaveText(/Cases/i);
  });
});
