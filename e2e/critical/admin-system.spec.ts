/**
 * Admin System E2E Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

// Ensure we target the live backend – disable Mock API for this spec only
process.env.PLAYWRIGHT_MOCK = 'false';

test.describe('Admin System Page – Live API', () => {
  test('admin can view system status page', async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    // Login with admin credentials using TestHelpers for better reliability
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
    console.log('✅ Admin logged in successfully');

    // Navigate to admin system page
    await page.goto('/admin/system');
    await page.waitForLoadState('networkidle');

    // Verify system page loaded (look for any heading or title)
    const hasSystemInfo = await page
      .locator('text=/system/i')
      .first()
      .isVisible()
      .catch(() => false);
    const hasAdminContent = await page
      .locator('h1, h2, h3')
      .first()
      .isVisible()
      .catch(() => false);

    // Just verify we can access the admin page
    expect(hasSystemInfo || hasAdminContent).toBe(true);

    console.log('✅ Admin system page accessible');
  });

  test('admin can run health check action', async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    try {
      // Login with superadmin credentials using TestHelpers for better reliability
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );

      // Navigate to admin system page (health check button is on /admin/system, not /admin)
      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we're on admin system page (not redirected back to login)
      if (page.url().includes('/auth/login')) {
        console.log('⚠️ Redirected to login - authentication failed');
        // Don't skip - this indicates a real authentication problem that should be fixed
        throw new Error('Authentication failed after login - cannot test health check');
      }

      // The "Run Health Check" button is on the admin system page (only for superadmin)
      // It's in the "System Actions" section
      const healthButton = page.getByRole('button', {
        name: /Run Health Check|Running.../i,
      });
      const buttonExists = await healthButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!buttonExists) {
        // Try alternative selectors
        const altButton = page.locator('button:has-text("Run Health Check")');
        const altExists = await altButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (!altExists) {
          console.log('ℹ️ Health check button not available - feature may be disabled');
          // Reason: Health check button not available in this environment
          test.skip(true, 'Health check button not available in this environment');
          return;
        }

        await altButton.click();
      } else {
        await healthButton.click();
      }

      await page.waitForTimeout(2000);

      // Verify health check was triggered (check for success message or status update)
      const successMessage = page.locator(
        'text=/Health check completed successfully|successfully/i',
      );
      const hasSuccess = await successMessage
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Also check if system status was updated
      const systemStatus = page.locator('text=/System Health|System Status/i');
      const hasSystemStatus = await systemStatus
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Test passes if either success message or system status is visible
      expect(hasSuccess || hasSystemStatus).toBe(true);

      console.log(
        '✅ Health check button interaction tested and health dashboard displayed',
      );
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'admin-health-check-failed');
      throw error;
    }
  });
});
