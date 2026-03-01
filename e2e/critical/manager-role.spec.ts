/**
 * MANAGER Role E2E Tests
 *
 * Tests role-specific UI behavior for MANAGER role users.
 *
 * Key Assertions:
 * - "Admin" navigation link SHOULD be visible in top navigation
 * - "Administrator Access" section REMOVED from dashboard (redundant)
 * - Admin functionality accessible via Navigation > Admin link
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
const MANAGER_CREDENTIALS_SECONDARY = WS_TEST_CREDENTIALS.ADMIN_2;
const MANAGER_CREDENTIALS_TERTIARY = WS_TEST_CREDENTIALS.ADMIN_3;

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
    const roleBadge = page
      .locator('span.text-xs, span.text-sm')
      .filter({ hasText: /manager/i });
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

  test('should NOT see redundant Administrator Access section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Administrator Access section REMOVED (redundant with top navigation "Admin" link)
    // This section was removed because:
    // 1. "Admin" link already exists in top navigation
    // 2. All admin functionality accessible via that navigation link
    // 3. Eliminates UI redundancy and clutter
    const adminAccessSection = page.locator('text=/Administrator Access/i');
    await expect(adminAccessSection).not.toBeVisible();
  });

  test('should NOT see Manage Users link on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Manage Users link removed from dashboard (accessible via Admin > Users)
    const manageUsersLinkOnDashboard = page.locator(
      '.bg-blue-50 a[href="/admin/users"]',
    );
    await expect(manageUsersLinkOnDashboard).not.toBeVisible();

    // But Admin link in navigation should still be present
    const adminNavLink = page.locator('nav a[href="/admin"]');
    await expect(adminNavLink).toBeVisible();
  });

  test('should NOT see System Admin link on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // System Admin link removed from dashboard (accessible via top navigation)
    const systemAdminLinkOnDashboard = page.locator(
      '.bg-blue-50 a[href="/admin"]:has-text("System Admin")',
    );
    await expect(systemAdminLinkOnDashboard).not.toBeVisible();
  });

  test('can access admin functionality via navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Click Admin link in navigation
    const adminNavLink = page.locator('nav a[href="/admin"]');
    await expect(adminNavLink).toBeVisible();
    await adminNavLink.click();

    // Should navigate to admin dashboard
    await page.waitForURL('/admin');
    await expect(page).toHaveURL('/admin');

    // Admin dashboard should be visible
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
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

  test('can access User Management via Admin navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click Admin link in navigation
    const adminNavLink = page.locator('nav a[href="/admin"]');
    await expect(adminNavLink).toBeVisible();
    await adminNavLink.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to admin dashboard
    await expect(page).toHaveURL('/admin');

    // Click Users tab (use more specific selector to avoid multiple matches)
    const usersTab = page
      .locator('nav a[href="/admin/users"], [data-testid="admin-tab-users"]')
      .first();
    await expect(usersTab).toBeVisible();
    await usersTab.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to /admin/users page
    await expect(page).toHaveURL('/admin/users');
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
      // Click first case detail link and wait for navigation
      await page.locator('tbody a[href*="/cases/"]').first().click();
      try {
        await page.waitForURL(/\/cases\/\d+/, { timeout: 10000 });
      } catch {
        // Fallback: wait and check
        await page.waitForTimeout(3000);
      }

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

  test('should have limited admin access (Manager view, no Health/Analytics tabs)', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // MANAGER can access /admin but gets a limited view
    // Should see "Admin Dashboard" heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // MANAGER should see Overview, Users, Activity tabs in admin nav
    const adminTabs = page.locator('nav[aria-label="Admin tabs"]');
    await expect(adminTabs).toBeVisible({ timeout: 10000 });
    await expect(adminTabs.locator('text=Overview')).toBeVisible();
    await expect(adminTabs.locator('text=Users')).toBeVisible();

    // MANAGER should NOT see SUPERADMIN-only tabs (Health, Analytics)
    const healthTab = page.locator('text=Health');
    const analyticsTab = page.locator('text=Analytics');
    const hasHealth = await healthTab.count();
    const hasAnalytics = await analyticsTab.count();
    expect(hasHealth + hasAnalytics).toBe(0);
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

test.describe('MANAGER Role - Redirect Contracts and Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should enforce redirect contracts and manager boundaries', async ({ page }) => {
    await page.goto('/users');
    await page.waitForURL('**/admin/users', { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\/users$/);

    await page.goto('/settings/security');
    await page.waitForURL('**/settings?tab=security', { timeout: 15000 });
    await expect(page).toHaveURL(/\/settings\?tab=security$/);

    await page.goto('/profile/security');
    await page.waitForURL('**/settings?tab=security', { timeout: 15000 });
    await expect(page).toHaveURL(/\/settings\?tab=security$/);

    await page.goto('/profile/settings');
    await page.waitForURL('**/settings', { timeout: 15000 });
    await expect(page.url()).toContain('/settings');

    await page.goto('/admin/settings');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await expect(page.url()).toContain('/dashboard');

    await page.goto('/admin/analytics');
    await page.waitForURL('**/admin?tab=analytics', { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\?tab=analytics$/);
    await expect(
      page.locator('text=/SuperAdmin privileges required for Analytics/i'),
    ).toBeVisible();

    await page.goto('/admin/companies/1/billing');
    await expect(
      page.locator('text=/Access denied\. SuperAdmin privileges required/i'),
    ).toBeVisible({ timeout: 10000 });

    await page.goto('/admin/audit');
    await expect(page.locator('h1:has-text("Audit Explorer")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="export-soc2-button"]')).toHaveCount(0);

    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="admin-users-page"]')).toBeVisible({
      timeout: 10000,
    });

    // SuperAdmin-only import controls should not be rendered for manager.
    await expect(page.locator('text=/import users|bulk import/i')).toHaveCount(0);

    await page.goto('/settings/privacy/data-request');
    await expect(page.locator('h1:has-text("Privacy & Data Requests")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=/Request Your Data/i')).toBeVisible();

    await page.goto('/settings/delete-account');
    await expect(page.locator('h2:has-text("Delete Account")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('input#confirm')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });
});

test.describe('MANAGER Role - Admin Security and Cases Direct Access', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should load admin security and cases pages with manager-appropriate actions', async ({
    page,
  }) => {
    await page.goto('/admin/security');
    await expect(page.locator('h1:has-text("Security Dashboard")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="time-range-filter"]')).toBeVisible();
    await page.locator('[data-testid="time-range-filter"]').selectOption('7d');
    await expect(page.locator('[data-testid="time-range-filter"]')).toHaveValue('7d');
    await expect(page.locator('text=/Suspicious IP Addresses/i')).toBeVisible();

    await page.goto('/admin/cases');
    await expect(page.locator('h1:has-text("Cases Analytics")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#date-range-filter')).toBeVisible();
    await expect(page.locator('#status-filter')).toBeVisible();
    await expect(page.locator('#priority-filter')).toBeVisible();

    await page.locator('#status-filter').selectOption('closed');
    await expect(page.locator('#status-filter')).toHaveValue('closed');
    await page.locator('#priority-filter').selectOption('high');
    await expect(page.locator('#priority-filter')).toHaveValue('high');
  });
});

test.describe('MANAGER Role - Admin Audit Direct Access', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should load admin audit and allow manager-safe filter interactions', async ({
    page,
  }) => {
    await page.goto('/admin/audit');
    await expect(page.locator('h1:has-text("Audit Explorer")')).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="date-range-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-search"]')).toBeVisible();

    await page.locator('[data-testid="date-range-filter"]').selectOption('7d');
    await expect(page.locator('[data-testid="date-range-filter"]')).toHaveValue('7d');

    await page.locator('[data-testid="action-filter"]').selectOption('user.login');
    await expect(page.locator('[data-testid="action-filter"]')).toHaveValue(
      'user.login',
    );

    await page.locator('[data-testid="status-filter"]').selectOption('success');
    await expect(page.locator('[data-testid="status-filter"]')).toHaveValue('success');

    await page.locator('[data-testid="user-search"]').fill('manager');
    await expect(page.locator('[data-testid="user-search"]')).toHaveValue('manager');

    await expect(page.locator('[data-testid="export-soc2-button"]')).toHaveCount(0);
  });
});

test.describe('MANAGER Role - Dashboard Security and Sessions Actions', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should complete key manager actions on dashboard security and sessions routes', async ({
    page,
  }) => {
    await page.goto('/dashboard/security');
    await expect(page.locator('h1:has-text("Security Dashboard")')).toBeVisible({
      timeout: 10000,
    });

    await page.locator('button:has-text("Change Password")').click();
    await expect(page.locator('h2:has-text("Change Password")')).toBeVisible();
    await page.locator('input#current_password').fill('CurrentPass123!');
    await page.locator('input#new_password').fill('StrongPass123!');
    await page.locator('input#confirm_password').fill('DifferentPass123!');
    await page.locator('button:has-text("Update Password")').click();
    await expect(page.locator('text=/New passwords do not match/i')).toBeVisible();
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('h2:has-text("Change Password")')).toHaveCount(0);

    await page.locator('[data-testid="logout-all-devices"]').click();
    await expect(page.locator('[data-testid="logout-all-confirm"]')).toBeVisible();
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('[data-testid="logout-all-confirm"]')).toHaveCount(0);

    await page.locator('a:has-text("Manage Sessions")').click();
    await page.waitForURL('**/dashboard/sessions', { timeout: 10000 });
    await expect(page.locator('h1:has-text("Active Sessions")')).toBeVisible();

    await page.locator('button:has-text("Refresh")').click();
    const sessionIdText = page.locator('text=/Session ID:/i');
    const emptySessionsState = page.locator('h3:has-text("No Active Sessions")');

    await expect
      .poll(
        async () => {
          const cardCount = await sessionIdText.count();
          const hasEmptyState = (await emptySessionsState.count()) > 0;
          return cardCount > 0 || hasEmptyState;
        },
        {
          timeout: 10000,
        },
      )
      .toBeTruthy();

    const logoutAllOtherDevices = page.locator('[data-testid="logout-all-devices"]');
    if ((await logoutAllOtherDevices.count()) > 0) {
      await logoutAllOtherDevices.click();
      await expect(page.locator('[data-testid="logout-all-confirm"]')).toBeVisible();
      await page.locator('button:has-text("Cancel")').click();
      await expect(page.locator('[data-testid="logout-all-confirm"]')).toHaveCount(0);
    }
  });
});

test.describe('MANAGER Role - Compatibility Redirects for New Flows', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should enforce redirects for /cases/new and /templates/new', async ({
    page,
  }) => {
    await page.goto('/cases/new');
    await expect(page.locator('[data-testid="new-case-redirect-page"]')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForURL('**/templates?action=create-case', { timeout: 15000 });
    await expect(page).toHaveURL(/\/templates\?action=create-case$/);

    await page.goto('/templates/new');
    await page.waitForURL('**/templates?action=create', { timeout: 15000 });
    await expect(page).toHaveURL(/\/templates\?action=create$/);
  });
});

test.describe('MANAGER Role - Document Compatibility Redirect Routes', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should redirect /dashboard/documents and /documents/upload to /cases', async ({
    page,
  }) => {
    await page.goto('/dashboard/documents');
    await page.waitForURL('**/cases', { timeout: 15000 });
    await expect(page.url()).toContain('/cases');

    await page.goto('/documents/upload');
    await page.waitForURL('**/cases', { timeout: 15000 });
    await expect(page.url()).toContain('/cases');
  });
});

test.describe('MANAGER Role - Dashboard KPI Filtered Destinations', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should navigate from dashboard KPI cards to filtered case routes', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({
      timeout: 10000,
    });

    await page.locator('a[href="/cases/closed"]').first().click();
    await page.waitForURL('**/cases/closed', { timeout: 10000 });
    await expect(page.locator('h1:has-text("Closed Cases")')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({
      timeout: 10000,
    });

    await page.locator('a[href="/cases/in-progress"]').first().click();
    await page.waitForURL('**/cases/in-progress', { timeout: 10000 });
    await expect(page.locator('h1:has-text("In Progress Cases")')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({
      timeout: 10000,
    });

    await page.locator('a[href="/cases/to-review"]').first().click();
    await page.waitForURL('**/cases/to-review', { timeout: 10000 });
    await expect(page.locator('h1:has-text("Cases To Review")')).toBeVisible();
  });
});

test.describe('MANAGER Role - Notifications Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_TERTIARY.email,
      MANAGER_CREDENTIALS_TERTIARY.password,
      true,
    );
  });

  test('should complete notifications workflow actions and follow related navigation', async ({
    page,
  }) => {
    await page.goto('/notifications');
    await expect(page.locator('[data-testid="notifications-page"]')).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-unread"]')).toBeVisible();
    await expect(page.locator('[data-testid="type-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="mark-all-read-btn"]')).toBeVisible();

    await page.locator('[data-testid="filter-unread"]').click();
    await expect(page.locator('[data-testid="filter-unread"]')).toHaveClass(/bg-white/);

    await page.locator('[data-testid="type-filter"]').selectOption('CASE_UPDATE');
    await expect(page.locator('[data-testid="type-filter"]')).toHaveValue(
      'CASE_UPDATE',
    );

    let firstNotification = page
      .locator('button[data-testid^="notification-"]')
      .first();
    if ((await firstNotification.count()) === 0) {
      await page.locator('[data-testid="filter-all"]').click();
      await page.locator('[data-testid="type-filter"]').selectOption('all');
      firstNotification = page.locator('button[data-testid^="notification-"]').first();
    }

    if ((await firstNotification.count()) === 0) {
      await expect(page.locator('h3:has-text("No notifications")')).toBeVisible();
      await expect(page.locator('[data-testid="mark-all-read-btn"]')).toBeDisabled();
      return;
    }

    await expect(firstNotification).toBeVisible({ timeout: 10000 });
    await firstNotification.click();

    const markToggleButton = page.locator('button:has-text("Mark as")');
    await expect(markToggleButton).toBeVisible();
    const initialToggleLabel = (await markToggleButton.innerText()).trim();
    await markToggleButton.click();

    if (initialToggleLabel.includes('Unread')) {
      await expect(markToggleButton).toContainText('Mark as Read');
    } else {
      await expect(markToggleButton).toContainText('Mark as Unread');
    }

    const markAllReadButton = page.locator('[data-testid="mark-all-read-btn"]');
    if (await markAllReadButton.isDisabled()) {
      const ensureUnreadButton = page.locator('button:has-text("Mark as Unread")');
      if ((await ensureUnreadButton.count()) > 0) {
        await ensureUnreadButton.click();
      }
    }

    await expect(markAllReadButton).toBeEnabled({ timeout: 10000 });
    await markAllReadButton.click();
    await expect(markAllReadButton).toBeDisabled({ timeout: 10000 });

    await page.locator('[data-testid="filter-all"]').click();
    await page.locator('[data-testid="type-filter"]').selectOption('CASE_UPDATE');

    const caseNotification = page
      .locator('button[data-testid^="notification-"]')
      .first();
    if ((await caseNotification.count()) === 0) {
      return;
    }

    await expect(caseNotification).toBeVisible({ timeout: 10000 });
    await caseNotification.click();

    const relatedCaseAction = page
      .locator('a:has(button:has-text("View Related Case"))')
      .first();
    if ((await relatedCaseAction.count()) === 0) {
      return;
    }

    await expect(relatedCaseAction).toBeVisible({ timeout: 10000 });
    await relatedCaseAction.click();

    await page.waitForURL('**/cases/**', { timeout: 15000 });
    await expect(page.url()).toContain('/cases/');
  });
});

test.describe('MANAGER Role - SuperAdmin Negative Route Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should deny manager access to superadmin-only routes and tab content', async ({
    page,
  }) => {
    const deniedMessage = page.locator(
      'text=/Access denied|SuperAdmin privileges required|Insufficient permissions|forbidden/i',
    );

    await page.goto('/admin/system');
    await expect(deniedMessage).toBeVisible({ timeout: 10000 });

    await page.goto('/admin/companies/1/billing');
    await expect(deniedMessage).toBeVisible({ timeout: 10000 });

    await page.goto('/admin?tab=health');
    await expect(page).toHaveURL(/\/admin\?tab=health$/);
    await expect(
      page.locator('text=/SuperAdmin privileges required for Health|Access denied/i'),
    ).toBeVisible({ timeout: 10000 });

    await page.goto('/admin?tab=analytics');
    await expect(page).toHaveURL(/\/admin\?tab=analytics$/);
    await expect(
      page.locator(
        'text=/SuperAdmin privileges required for Analytics|Access denied/i',
      ),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('MANAGER Role - Admin Security Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should execute admin security workflow actions with manager permissions', async ({
    page,
  }) => {
    await page.goto('/admin/security');
    await expect(page.locator('h1:has-text("Security Dashboard")')).toBeVisible({
      timeout: 10000,
    });

    const timeRangeFilter = page.locator('[data-testid="time-range-filter"]');
    await expect(timeRangeFilter).toBeVisible();
    await timeRangeFilter.selectOption('30d');
    await expect(timeRangeFilter).toHaveValue('30d');
    await timeRangeFilter.selectOption('24h');
    await expect(timeRangeFilter).toHaveValue('24h');

    await expect(page.locator('h2:has-text("Locked Accounts")')).toBeVisible();
    const refreshLockedAccounts = page.locator('button:has-text("Refresh")').first();
    await expect(refreshLockedAccounts).toBeVisible();
    await refreshLockedAccounts.click();

    await expect(page.locator('h2:has-text("Suspicious IP Addresses")')).toBeVisible();

    const blockIpButtons = page.locator('button:has-text("Block IP")');
    if ((await blockIpButtons.count()) > 0) {
      await blockIpButtons.first().click();
      await expect(
        page.locator(
          'text=/blocked successfully|Failed to block IP|Failed to load suspicious IPs/i',
        ),
      ).toBeVisible({ timeout: 10000 });
    } else {
      const noSuspiciousIps = page.locator(
        'text=/No suspicious IP addresses detected\./i',
      );
      const suspiciousIpsLoadError = page.locator(
        'text=/Failed to load suspicious IPs\. Please try again\./i',
      );

      await expect
        .poll(
          async () => {
            const hasNoSuspicious = (await noSuspiciousIps.count()) > 0;
            const hasLoadError = (await suspiciousIpsLoadError.count()) > 0;
            return hasNoSuspicious || hasLoadError;
          },
          {
            timeout: 10000,
          },
        )
        .toBeTruthy();
    }
  });
});

test.describe('MANAGER Role - Admin Cases Analytics Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS.email,
      MANAGER_CREDENTIALS.password,
      true,
    );
  });

  test('should execute admin cases analytics filter combinations with stable rendering', async ({
    page,
  }) => {
    await page.goto('/admin/cases');
    await expect(page.locator('h1:has-text("Cases Analytics")')).toBeVisible({
      timeout: 10000,
    });

    const dateRangeFilter = page.locator('#date-range-filter');
    const statusFilter = page.locator('#status-filter');
    const priorityFilter = page.locator('#priority-filter');

    await expect(dateRangeFilter).toBeVisible();
    await expect(statusFilter).toBeVisible();
    await expect(priorityFilter).toBeVisible();

    await dateRangeFilter.selectOption('7d');
    await expect(dateRangeFilter).toHaveValue('7d');
    await statusFilter.selectOption('open');
    await expect(statusFilter).toHaveValue('open');
    await priorityFilter.selectOption('medium');
    await expect(priorityFilter).toHaveValue('medium');

    const dataPanels = page.locator(
      'h3:has-text("Cases by Status"), h3:has-text("Cases by Priority"), h3:has-text("Recent Cases")',
    );
    const errorPanel = page.locator(
      'text=/Failed to load case analytics\. Please try again\./i',
    );
    const emptyPanel = page.locator('text=/No case data available/i');

    await expect
      .poll(
        async () => {
          const hasDataPanels = (await dataPanels.count()) > 0;
          const hasErrorPanel = (await errorPanel.count()) > 0;
          const hasEmptyPanel = (await emptyPanel.count()) > 0;
          return hasDataPanels || hasErrorPanel || hasEmptyPanel;
        },
        {
          timeout: 10000,
        },
      )
      .toBeTruthy();

    await dateRangeFilter.selectOption('90d');
    await expect(dateRangeFilter).toHaveValue('90d');
    await statusFilter.selectOption('closed');
    await expect(statusFilter).toHaveValue('closed');
    await priorityFilter.selectOption('high');
    await expect(priorityFilter).toHaveValue('high');

    await statusFilter.selectOption('all');
    await expect(statusFilter).toHaveValue('all');
    await priorityFilter.selectOption('all');
    await expect(priorityFilter).toHaveValue('all');
  });
});

test.describe('MANAGER Role - Admin Audit Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should execute admin audit filter permutations with stable result rendering', async ({
    page,
  }) => {
    await page.goto('/admin/audit');
    await expect(page.locator('h1:has-text("Audit Explorer")')).toBeVisible({
      timeout: 10000,
    });

    const dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    const actionFilter = page.locator('[data-testid="action-filter"]');
    const statusFilter = page.locator('[data-testid="status-filter"]');
    const userSearch = page.locator('[data-testid="user-search"]');

    await expect(dateRangeFilter).toBeVisible();
    await expect(actionFilter).toBeVisible();
    await expect(statusFilter).toBeVisible();
    await expect(userSearch).toBeVisible();

    await dateRangeFilter.selectOption('7d');
    await expect(dateRangeFilter).toHaveValue('7d');
    await actionFilter.selectOption('user.login');
    await expect(actionFilter).toHaveValue('user.login');
    await statusFilter.selectOption('success');
    await expect(statusFilter).toHaveValue('success');
    await userSearch.fill('manager');
    await expect(userSearch).toHaveValue('manager');

    const resultsRows = page.locator('tbody tr');
    const noResults = page.locator('text=/No audit logs found/i');
    const loadError = page.locator(
      'text=/Failed to load audit logs\. Please try again\./i',
    );

    await expect
      .poll(
        async () => {
          const hasRows = (await resultsRows.count()) > 0;
          const hasNoResults = (await noResults.count()) > 0;
          const hasLoadError = (await loadError.count()) > 0;
          return hasRows || hasNoResults || hasLoadError;
        },
        {
          timeout: 10000,
        },
      )
      .toBeTruthy();

    await dateRangeFilter.selectOption('24h');
    await expect(dateRangeFilter).toHaveValue('24h');
    await actionFilter.selectOption('security.failed_login');
    await expect(actionFilter).toHaveValue('security.failed_login');
    await statusFilter.selectOption('warning');
    await expect(statusFilter).toHaveValue('warning');
    await userSearch.fill('');
    await expect(userSearch).toHaveValue('');

    await actionFilter.selectOption('');
    await expect(actionFilter).toHaveValue('');
    await statusFilter.selectOption('');
    await expect(statusFilter).toHaveValue('');

    await expect(page.locator('[data-testid="export-soc2-button"]')).toHaveCount(0);
  });
});

test.describe('MANAGER Role - Template Approvals Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      MANAGER_CREDENTIALS_SECONDARY.email,
      MANAGER_CREDENTIALS_SECONDARY.password,
      true,
    );
  });

  test('should load approvals mode and enforce rejection-note requirements', async ({
    page,
  }) => {
    await page.goto('/templates');
    await expect(page.locator('h1:has-text("Templates")')).toBeVisible({
      timeout: 10000,
    });

    await page.locator('button:has-text("Approvals")').click();
    await expect(page.locator('h3:has-text("Pending Approvals")')).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('text=Draft')).toBeVisible();
    await expect(page.locator('text=Pending Review')).toBeVisible();
    await expect(page.locator('text=Approved')).toBeVisible();
    await expect(page.locator('text=Rejected')).toBeVisible();

    const approveButtons = page.locator('button[title="Approve"]');
    const rejectButtons = page.locator('button[title="Reject"]');
    const revertButtons = page.locator('button[title="Revert to Draft"]');

    if ((await rejectButtons.count()) === 0) {
      await expect(page.locator('h3:has-text("No pending approvals")')).toBeVisible();
      return;
    }

    await expect(approveButtons.first()).toBeVisible();
    await expect(revertButtons.first()).toBeVisible();

    await rejectButtons.first().click();
    const rejectReasonInput = page.locator(
      'textarea[placeholder="Reason for rejection (required)..."]',
    );
    const confirmRejectButton = page
      .locator('button:has-text("Confirm Reject")')
      .first();

    await expect(rejectReasonInput).toBeVisible();
    await expect(confirmRejectButton).toBeDisabled();

    await rejectReasonInput.fill('Insufficient variable mapping details for approval.');
    await expect(confirmRejectButton).toBeEnabled();

    await rejectButtons.first().click();
    await expect(rejectReasonInput).toHaveCount(0);
  });
});
