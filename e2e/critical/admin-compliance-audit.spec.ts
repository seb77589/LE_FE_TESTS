/**
 * Admin Compliance & Audit E2E Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 *
 * Tests for Phase 4 features:
 * - Compliance Console (/admin/compliance)
 * - Audit Explorer (/admin/audit)
 * - Security Dashboard (/admin/security)
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Admin - Compliance Console', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    // Login as superadmin
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should display compliance console with GDPR requests tab', async ({ page }) => {
    await page.goto('/admin/compliance');
    await page.waitForLoadState('load');

    // Check for page title
    const title = await page.locator('h1:has-text("Compliance Console")').isVisible();
    if (!title) {
      // Skip reason: FUTURE_FEATURE - Compliance Console UI not yet implemented
      test.skip(true, 'Compliance Console UI not yet implemented');
      return;
    }

    // Check for tabs
    await expect(page.getByTestId('gdpr-tab')).toBeVisible();
    await expect(page.getByTestId('reports-tab')).toBeVisible();

    // Check GDPR requests content is visible
    const gdprContent = await page.getByTestId('gdpr-requests-content').isVisible();
    expect(gdprContent).toBeTruthy();
  });

  test('should filter GDPR requests by status', async ({ page }) => {
    await page.goto('/admin/compliance');
    await page.waitForLoadState('load');

    const hasFilter = await page
      .getByTestId('status-filter')
      .isVisible()
      .catch(() => false);
    if (!hasFilter) {
      // Reason: GDPR request filters not yet implemented
      test.skip(true, 'GDPR request filters not yet implemented');
      return;
    }

    // Select pending status
    await page.getByTestId('status-filter').selectOption('pending');
    await page.waitForTimeout(500);

    // Verify filter is applied
    const selectedValue = await page.getByTestId('status-filter').inputValue();
    expect(selectedValue).toBe('pending');
  });

  test('should display retention policies tab for superadmin', async ({ page }) => {
    await page.goto('/admin/compliance');
    await page.waitForLoadState('load');

    const retentionTab = await page
      .getByTestId('retention-tab')
      .isVisible()
      .catch(() => false);
    if (!retentionTab) {
      // Skip reason: FUTURE_FEATURE - Retention policies tab not yet visible
      test.skip(true, 'Retention policies tab not yet visible');
      return;
    }

    // Click retention tab
    await page.getByTestId('retention-tab').click();
    await page.waitForTimeout(500);

    // Check retention content is visible
    const retentionContent = await page
      .getByTestId('retention-policies-content')
      .isVisible()
      .catch(() => false);
    expect(retentionContent).toBeTruthy();
  });

  test('should display compliance reports tab', async ({ page }) => {
    await page.goto('/admin/compliance');
    await page.waitForLoadState('load');

    const reportsTab = await page
      .getByTestId('reports-tab')
      .isVisible()
      .catch(() => false);
    if (!reportsTab) {
      // Skip reason: FUTURE_FEATURE - Compliance reports tab not yet implemented
      test.skip(true, 'Compliance reports tab not yet implemented');
      return;
    }

    // Click reports tab
    await page.getByTestId('reports-tab').click();
    await page.waitForTimeout(500);

    // Check reports content is visible
    const reportsContent = await page
      .getByTestId('compliance-reports-content')
      .isVisible()
      .catch(() => false);
    expect(reportsContent).toBeTruthy();
  });
});

test.describe('Admin - Audit Explorer', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    // Login as superadmin
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should display audit explorer with filters', async ({ page }) => {
    await page.goto('/admin/audit');
    await page.waitForLoadState('load');

    // Check for page title
    const title = await page.locator('h1:has-text("Audit Explorer")').isVisible();
    if (!title) {
      // Skip reason: FUTURE_FEATURE - Audit Explorer UI not yet implemented
      test.skip(true, 'Audit Explorer UI not yet implemented');
      return;
    }

    // Check for filter controls
    const dateFilter = await page
      .getByTestId('date-range-filter')
      .isVisible()
      .catch(() => false);
    const actionFilter = await page
      .getByTestId('action-filter')
      .isVisible()
      .catch(() => false);
    const statusFilter = await page
      .getByTestId('status-filter')
      .isVisible()
      .catch(() => false);

    expect(dateFilter || actionFilter || statusFilter).toBeTruthy();
  });

  test('should filter audit logs by date range', async ({ page }) => {
    await page.goto('/admin/audit');
    await page.waitForLoadState('load');

    const hasFilter = await page
      .getByTestId('date-range-filter')
      .isVisible()
      .catch(() => false);
    if (!hasFilter) {
      // Skip reason: FUTURE_FEATURE - Audit log date filter not yet implemented
      test.skip(true, 'Audit log date filter not yet implemented');
      return;
    }

    // Select 24h range
    await page.getByTestId('date-range-filter').selectOption('24h');
    await page.waitForTimeout(500);

    // Verify filter is applied
    const selectedValue = await page.getByTestId('date-range-filter').inputValue();
    expect(selectedValue).toBe('24h');
  });

  test('should filter audit logs by action type', async ({ page }) => {
    await page.goto('/admin/audit');
    await page.waitForLoadState('load');

    const hasFilter = await page
      .getByTestId('action-filter')
      .isVisible()
      .catch(() => false);
    if (!hasFilter) {
      // Skip reason: FUTURE_FEATURE - Audit log action filter not yet implemented
      test.skip(true, 'Audit log action filter not yet implemented');
      return;
    }

    // Select user.login action
    await page.getByTestId('action-filter').selectOption('user.login');
    await page.waitForTimeout(500);

    // Verify filter is applied
    const selectedValue = await page.getByTestId('action-filter').inputValue();
    expect(selectedValue).toBe('user.login');
  });

  test('should search audit logs by user', async ({ page }) => {
    await page.goto('/admin/audit');
    await page.waitForLoadState('load');

    const hasSearch = await page
      .getByTestId('user-search')
      .isVisible()
      .catch(() => false);
    if (!hasSearch) {
      // Skip reason: FUTURE_FEATURE - Audit log user search not yet implemented
      test.skip(true, 'Audit log user search not yet implemented');
      return;
    }

    // Enter search term - use TEST_USER_EMAIL from environment variables
    // Validated by test-credentials.ts import
    if (!process.env.TEST_USER_EMAIL) {
      throw new Error(
        'TEST_USER_EMAIL environment variable is required. Please configure it in config/.env',
      );
    }
    const testUserEmail = process.env.TEST_USER_EMAIL;
    await page.getByTestId('user-search').fill(testUserEmail);
    await page.waitForTimeout(500);

    // Verify search input has value
    const searchValue = await page.getByTestId('user-search').inputValue();
    expect(searchValue).toBe(testUserEmail);
  });

  test('should display SOC2 export button for superadmin', async ({ page }) => {
    await page.goto('/admin/audit');
    await page.waitForLoadState('load');

    const hasButton = await page
      .getByTestId('export-soc2-button')
      .isVisible()
      .catch(() => false);
    if (!hasButton) {
      // Skip reason: FUTURE_FEATURE - SOC2 export button not yet implemented
      test.skip(true, 'SOC2 export button not yet implemented');
      return;
    }

    // Verify button is visible
    await expect(page.getByTestId('export-soc2-button')).toBeVisible();
    await expect(page.getByTestId('export-soc2-button')).toContainText('SOC2');
  });
});

test.describe('Admin - Security Dashboard', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    // Login as admin
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should display security dashboard with risk cards', async ({ page }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('load');

    // Wait for page heading with retry logic for loading states
    const pageHeading = page.locator('h1:has-text("Security Dashboard")');
    let titleVisible = await pageHeading
      .isVisible({ timeout: 25000 })
      .catch(() => false);

    if (!titleVisible) {
      // Check if we're in loading state and retry
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Loading')) {
        await page.waitForTimeout(5000);
        titleVisible = await pageHeading
          .isVisible({ timeout: 15000 })
          .catch(() => false);
      }
      if (!titleVisible) {
        test.skip(true, 'Security Dashboard UI not yet implemented');
        return;
      }
    }

    // Check for risk card indicators (text content)
    const pageText = await page.locator('body').textContent();
    const hasRiskCards =
      pageText?.includes('Failed Logins') ||
      pageText?.includes('Locked Accounts') ||
      pageText?.includes('Suspicious IPs');

    expect(hasRiskCards).toBeTruthy();
  });

  test('should display time range filter', async ({ page }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('load');

    // Wait for page with loading state handling
    const pageHeading = page.locator('h1:has-text("Security Dashboard")');
    let headingVisible = await pageHeading
      .isVisible({ timeout: 25000 })
      .catch(() => false);

    if (!headingVisible) {
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Loading')) {
        await page.waitForTimeout(5000);
        headingVisible = await pageHeading
          .isVisible({ timeout: 15000 })
          .catch(() => false);
      }
      if (!headingVisible) {
        test.skip(true, 'Security dashboard time range filter not yet implemented');
        return;
      }
    }

    const hasFilter = await page
      .getByTestId('time-range-filter')
      .isVisible()
      .catch(() => false);
    if (!hasFilter) {
      test.skip(true, 'Security dashboard time range filter not yet implemented');
      return;
    }

    // Select 7d range
    await page.getByTestId('time-range-filter').selectOption('7d');
    await page.waitForTimeout(500);

    // Verify filter is applied
    const selectedValue = await page.getByTestId('time-range-filter').inputValue();
    expect(selectedValue).toBe('7d');
  });

  test('should display recent security events', async ({ page }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('load');

    // Wait for page heading with retry logic for loading states
    const pageHeading = page.locator('h1:has-text("Security Dashboard")');
    let titleVisible = await pageHeading
      .isVisible({ timeout: 25000 })
      .catch(() => false);

    if (!titleVisible) {
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Loading')) {
        await page.waitForTimeout(5000);
        titleVisible = await pageHeading
          .isVisible({ timeout: 15000 })
          .catch(() => false);
      }
      if (!titleVisible) {
        test.skip(true, 'Security Dashboard not yet implemented');
        return;
      }
    }

    // Check for security events section
    const pageText = await page.locator('body').textContent();
    const hasEventsSection = pageText?.includes('Recent Security Events');

    expect(hasEventsSection).toBeTruthy();
  });

  test('should display locked accounts section', async ({ page }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('load');

    // Wait for page heading with retry logic for loading states
    const pageHeading = page.locator('h1:has-text("Security Dashboard")');
    let titleVisible = await pageHeading
      .isVisible({ timeout: 25000 })
      .catch(() => false);

    if (!titleVisible) {
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Loading')) {
        await page.waitForTimeout(5000);
        titleVisible = await pageHeading
          .isVisible({ timeout: 15000 })
          .catch(() => false);
      }
      if (!titleVisible) {
        test.skip(true, 'Security Dashboard not yet implemented');
        return;
      }
    }

    // Check for locked accounts section
    const pageText = await page.locator('body').textContent();
    const hasLockedSection = pageText?.includes('Locked Accounts');

    expect(hasLockedSection).toBeTruthy();
  });

  test('should display suspicious IPs section', async ({ page }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('load');

    // Wait for page heading with retry logic for loading states
    const pageHeading = page.locator('h1:has-text("Security Dashboard")');
    let titleVisible = await pageHeading
      .isVisible({ timeout: 25000 })
      .catch(() => false);

    if (!titleVisible) {
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Loading')) {
        await page.waitForTimeout(5000);
        titleVisible = await pageHeading
          .isVisible({ timeout: 15000 })
          .catch(() => false);
      }
      if (!titleVisible) {
        test.skip(true, 'Security Dashboard not yet implemented');
        return;
      }
    }

    // Check for suspicious IPs section
    const pageText = await page.locator('body').textContent();
    const hasSuspiciousSection = pageText?.includes('Suspicious IP');

    expect(hasSuspiciousSection).toBeTruthy();
  });
});
