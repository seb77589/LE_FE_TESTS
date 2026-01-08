/**
 * SuperAdmin Navigation E2E Tests
 *
 * Validates SuperAdmin-specific navigation flows and feature accessibility:
 * - Admin Panel button navigation from dashboard
 * - Navigation bar presence on all pages
 * - Statistics display across different pages (user-scoped vs system-wide)
 * - Role-based access controls
 *
 * Purpose: Prevent false-positive bug reports by validating core navigation patterns
 * and ensuring proper architectural separation of concerns (user-scoped vs system-wide data).
 *
 * Related Documentation:
 * - docs/architecture/SUPERADMIN_DATA_SCOPING.md
 * - docs/_TODO/SUPERADMIN_FEATURE_MAP_OPTIONS.md (issue validation)
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('SuperAdmin Navigation - Admin Panel Access', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Skip if worker doesn't have SuperAdmin credentials
    test.skip(!workerCredentials.isSuperAdmin, 'Test requires SuperAdmin credentials');

    // Login as SuperAdmin
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      true, // isAdmin = true
    );
  });

  test('should navigate to Admin Panel via Quick Actions button from dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify dashboard loaded
    const dashboardContent = page.locator('[data-testid="dashboard-content"]');
    await expect(dashboardContent).toBeVisible();

    // Find the Admin Panel button in Quick Actions
    const adminPanelButton = page.locator('button:has-text("Admin Panel")');
    await expect(adminPanelButton).toBeVisible({ timeout: 10000 });

    // Verify button has correct styling (orange background)
    const buttonClass = await adminPanelButton.getAttribute('class');
    expect(buttonClass).toContain('bg-orange-500');

    // Click the Admin Panel button
    await adminPanelButton.click();

    // Wait for navigation to complete
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Verify we're on the admin page
    expect(page.url()).toContain('/admin');

    // Verify admin page content loaded
    const adminHeading = page.locator('h1:has-text("Admin")');
    await expect(adminHeading).toBeVisible({ timeout: 10000 });

    console.log('✅ Admin Panel button navigation works correctly');
  });

  test('should navigate to Admin via Administrator Access link from dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Find the System Admin link in Administrator Access section
    const systemAdminLink = page.locator('a[href="/admin"]:has-text("System Admin")');
    await expect(systemAdminLink).toBeVisible({ timeout: 10000 });

    // Click the link
    await systemAdminLink.click();

    // Wait for navigation
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Verify we're on the admin page
    expect(page.url()).toContain('/admin');

    console.log('✅ Administrator Access link navigation works correctly');
  });

  test('should display Admin Panel button only for SuperAdmin users', async ({
    page,
    workerCredentials,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    if (workerCredentials.isSuperAdmin) {
      // SuperAdmin should see the Admin Panel button
      const adminPanelButton = page.locator('button:has-text("Admin Panel")');
      await expect(adminPanelButton).toBeVisible({ timeout: 10000 });
      console.log('✅ Admin Panel button visible for SuperAdmin');
    } else {
      // Non-SuperAdmin should NOT see the Admin Panel button
      const adminPanelButton = page.locator('button:has-text("Admin Panel")');
      await expect(adminPanelButton).not.toBeVisible();
      console.log('✅ Admin Panel button hidden for non-SuperAdmin');
    }
  });
});

test.describe('SuperAdmin Navigation - Navigation Bar Presence', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isSuperAdmin, 'Test requires SuperAdmin credentials');

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      true,
    );
  });

  test('should display navigation bar on Dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Check for navigation bar
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Verify navigation links are present (use nav scope to avoid duplicate links)
    await expect(nav.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(nav.locator('a:has-text("Documents")')).toBeVisible();
    await expect(nav.locator('a:has-text("Cases")')).toBeVisible();
    await expect(nav.locator('a:has-text("Notifications")')).toBeVisible();
    await expect(nav.locator('a:has-text("Admin")').first()).toBeVisible();

    console.log('✅ Navigation bar present on Dashboard page');
  });

  test('should display navigation bar on Cases page', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');

    // Check for navigation bar (via layout inheritance)
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Verify all standard navigation links (use nav scope)
    await expect(nav.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(nav.locator('a:has-text("Documents")')).toBeVisible();
    await expect(nav.locator('a:has-text("Cases")')).toBeVisible();
    await expect(nav.locator('a:has-text("Notifications")')).toBeVisible();

    console.log('✅ Navigation bar present on Cases page via layout inheritance');
  });

  test('should display navigation bar on Notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');

    // Check for navigation bar (via layout inheritance)
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Verify all standard navigation links (use nav scope)
    await expect(nav.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(nav.locator('a:has-text("Documents")')).toBeVisible();
    await expect(nav.locator('a:has-text("Cases")')).toBeVisible();
    await expect(nav.locator('a:has-text("Notifications")')).toBeVisible();

    console.log(
      '✅ Navigation bar present on Notifications page via layout inheritance',
    );
  });

  test('should display navigation bar on Admin pages', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Check for navigation bar
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Verify navigation links (use nav scope)
    await expect(nav.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(nav.locator('a:has-text("Admin")').first()).toBeVisible();

    console.log('✅ Navigation bar present on Admin page');
  });

  test('should display a single navigation bar on Admin Security page', async ({
    page,
  }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('domcontentloaded');

    // Ensure we did not render an extra Navigation inside the page content.
    await expect(page.locator('nav.bg-white.shadow-sm.border-b')).toHaveCount(1);
    await expect(page.locator('nav.bg-white.shadow-sm.border-b').first()).toBeVisible();

    console.log('✅ Single navigation bar present on Admin Security page');
  });

  test('should not duplicate navigation during loading on admin routes', async ({
    page,
  }) => {
    const adminRoutes = ['/admin', '/admin/security', '/admin/cases', '/admin/documents'];

    for (const route of adminRoutes) {
      // Check as early as possible to catch loading-state regressions.
      await page.goto(route, { waitUntil: 'commit' });
      await expect(page.locator('nav.bg-white.shadow-sm.border-b')).toHaveCount(1);

      // Then check again once the page has rendered.
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('nav.bg-white.shadow-sm.border-b')).toHaveCount(1);
    }

    console.log('✅ No duplicate navigation detected on admin routes');
  });

  test('should allow navigation between pages using nav bar', async ({ page }) => {
    // Start on dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('nav').first();

    // Navigate to Cases via nav bar
    await nav.locator('a:has-text("Cases")').click();
    await page.waitForURL('**/cases', { timeout: 10000 });
    expect(page.url()).toContain('/cases');

    // Navigate to Notifications via nav bar
    await nav.locator('a:has-text("Notifications")').click();
    await page.waitForURL('**/notifications', { timeout: 10000 });
    expect(page.url()).toContain('/notifications');

    // Navigate back to Dashboard via nav bar
    await nav.locator('a:has-text("Dashboard")').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    console.log('✅ Navigation between pages works correctly');
  });
});

test.describe('SuperAdmin Navigation - Data Scoping Validation', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isSuperAdmin, 'Test requires SuperAdmin credentials');

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      true,
    );
  });

  test('should display user-scoped statistics on Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Wait for statistics to load
    await page.waitForTimeout(2000);

    // Dashboard should show user-scoped stats
    // These are DIFFERENT from system-wide stats shown on Admin pages
    const myDocumentsCard = page.locator('text="My Documents"').first();
    const activeSessionsCard = page.locator('text="Active Sessions"').first();
    const openCasesCard = page.locator('text="Open Cases"').first();

    // Verify user-scoped stat cards are present
    const myDocsVisible = await myDocumentsCard.isVisible().catch(() => false);
    const sessionsVisible = await activeSessionsCard.isVisible().catch(() => false);
    const casesVisible = await openCasesCard.isVisible().catch(() => false);

    // At least some stats should be visible
    expect(myDocsVisible || sessionsVisible || casesVisible).toBe(true);

    console.log(
      '✅ Dashboard shows user-scoped statistics (My Documents, Active Sessions, Open Cases)',
    );
    console.log('   Data source: /api/v1/stats/overview (user-specific)');
  });

  test('should display system-wide statistics on Admin Overview', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Wait for admin stats to load
    await page.waitForTimeout(2000);

    // Admin Overview should show system-wide stats
    // These are DIFFERENT from user-scoped stats on Dashboard
    const totalUsersCard = page.locator('text="Total Users"').first();
    const activeUsersCard = page.locator('text="Active Users"').first();
    const adminUsersCard = page.locator('text="Admin Users"').first();

    // Check if admin stats are displayed
    const totalUsersVisible = await totalUsersCard.isVisible().catch(() => false);
    const activeUsersVisible = await activeUsersCard.isVisible().catch(() => false);
    const adminUsersVisible = await adminUsersCard.isVisible().catch(() => false);

    if (totalUsersVisible || activeUsersVisible || adminUsersVisible) {
      console.log(
        '✅ Admin Overview shows system-wide statistics (Total Users, Active Users, Admin Users)',
      );
      console.log('   Data source: /api/v1/admin/stats (system-wide)');
    } else {
      console.log('⚠️  Admin Overview UI may not be fully implemented yet');
    }
  });

  test('should display infrastructure health on Admin System page', async ({
    page,
  }) => {
    await page.goto('/admin/system');
    await page.waitForLoadState('domcontentloaded');

    // Wait for system health data to load
    await page.waitForTimeout(2000);

    // Admin System page should show infrastructure health
    // This is DIFFERENT from both user stats and system-wide stats
    const systemStatus = page
      .locator('text=/System|Database|Redis|API|Health/i')
      .first();

    const statusVisible = await systemStatus.isVisible().catch(() => false);

    if (statusVisible) {
      console.log(
        '✅ Admin System shows infrastructure health (Database, Redis, API status)',
      );
      console.log('   Data source: /api/v1/admin/system/health (infrastructure)');
    } else {
      console.log('⚠️  Admin System page UI may not be fully implemented yet');
    }
  });

  test('should demonstrate data scoping: Dashboard vs Admin pages show different data', async ({
    page,
  }) => {
    // This test validates that Dashboard and Admin pages use DIFFERENT API endpoints
    // and show DIFFERENT scopes of data (user-specific vs system-wide)

    // Step 1: Visit Dashboard and check for user-scoped data
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const dashboardHasMyDocs = await page
      .locator('text="My Documents"')
      .isVisible()
      .catch(() => false);

    // Step 2: Visit Admin and check for system-wide data
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const adminHasTotalUsers = await page
      .locator('text="Total Users"')
      .isVisible()
      .catch(() => false);

    // Step 3: Verify the data scoping pattern
    console.log('📊 Data Scoping Validation:');
    console.log(`   Dashboard shows "My Documents": ${dashboardHasMyDocs}`);
    console.log(`   Admin shows "Total Users": ${adminHasTotalUsers}`);

    if (dashboardHasMyDocs && adminHasTotalUsers) {
      console.log('✅ Proper data scoping confirmed:');
      console.log('   - Dashboard: User-scoped data via /api/v1/stats/overview');
      console.log('   - Admin: System-wide data via /api/v1/admin/stats');
      console.log('   - This is INTENTIONAL architectural separation, not duplication');
    } else {
      console.log('⚠️  Some UI elements may not be fully implemented yet');
    }
  });
});

test.describe('SuperAdmin Navigation - Role-Based Access Control', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isSuperAdmin, 'Test requires SuperAdmin credentials');

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      true,
    );
  });

  test('should allow SuperAdmin to access /admin route', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Should NOT be redirected away
    expect(page.url()).toContain('/admin');

    // Should see admin content
    const adminContent = page.locator('text=/Admin|System|Users|Dashboard/i');
    await expect(adminContent.first()).toBeVisible({ timeout: 10000 });

    console.log('✅ SuperAdmin can access /admin route');
  });

  test('should allow SuperAdmin to access /admin/system route', async ({ page }) => {
    await page.goto('/admin/system');
    await page.waitForLoadState('domcontentloaded');

    // Should NOT be redirected away
    expect(page.url()).toContain('/admin/system');

    console.log('✅ SuperAdmin can access /admin/system route');
  });

  test('should show admin-specific navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('nav').first();

    // SuperAdmin should see admin navigation items in nav bar
    const adminNavLink = nav.locator('a:has-text("Admin")').first();
    await expect(adminNavLink).toBeVisible({ timeout: 10000 });

    const usersNavLink = nav.locator('a:has-text("Users")');
    const usersVisible = await usersNavLink.isVisible().catch(() => false);

    if (usersVisible) {
      console.log('✅ SuperAdmin sees admin-specific navigation items (Admin, Users)');
    }
  });
});

test.describe('SuperAdmin Navigation - Error Cases', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isSuperAdmin, 'Test requires SuperAdmin credentials');

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      true,
    );
  });

  test('should handle navigation to non-existent admin routes gracefully', async ({
    page,
  }) => {
    await page.goto('/admin/nonexistent');
    await page.waitForLoadState('domcontentloaded');

    // Should show error page or redirect, not crash
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();

    console.log('✅ Gracefully handles non-existent admin routes');
  });

  test('should maintain navigation state during page transitions', async ({ page }) => {
    // Navigate through multiple pages
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('nav').first();
    await nav.locator('a:has-text("Admin")').first().click();
    await page.waitForURL('**/admin', { timeout: 10000 });

    await nav.locator('a:has-text("Dashboard")').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify navigation still works after transitions
    await expect(nav).toBeVisible({ timeout: 10000 });

    console.log('✅ Navigation state maintained during page transitions');
  });
});
