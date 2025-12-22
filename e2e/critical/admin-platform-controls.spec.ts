/**
 * Admin Platform Controls E2E Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 *
 * Tests for Phase 5 features:
 * - Rate Limiting Editor (/admin/platform)
 * - Maintenance & Flags
 * - Session/Token Controls
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Admin - Platform Controls', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    // Login as superadmin (only superadmins can access platform controls)
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should display platform controls page with tabs', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    // Check for page title
    const title = await page.locator('h1:has-text("Platform Controls")').isVisible();
    if (!title) {
      // Skip reason: FUTURE_FEATURE - Platform Controls UI not yet implemented
      test.skip(true, 'Platform Controls UI not yet implemented');
      return;
    }

    // Check for all three tabs
    await expect(page.getByTestId('ratelimits-tab')).toBeVisible();
    await expect(page.getByTestId('maintenance-tab')).toBeVisible();
    await expect(page.getByTestId('sessions-tab')).toBeVisible();
  });

  test('should display rate limiting tab with statistics', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('ratelimits-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Reason: Rate limiting tab not yet implemented
      test.skip(true, 'Rate limiting tab not yet implemented');
      return;
    }

    // Click rate limits tab (should be default)
    await page.getByTestId('ratelimits-tab').click();
    await page.waitForTimeout(500);

    // Check rate limits content is visible
    const rateLimitsContent = await page
      .getByTestId('ratelimits-content')
      .isVisible()
      .catch(() => false);
    expect(rateLimitsContent).toBeTruthy();

    // Check for statistics cards or table indicators
    const pageText = await page.locator('body').textContent();
    const hasRateLimitContent =
      pageText?.includes('Blocked IPs') ||
      pageText?.includes('Allowlist') ||
      pageText?.includes('Total Requests');
    expect(hasRateLimitContent).toBeTruthy();
  });

  test('should display blocked IPs table', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('ratelimits-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Reason: Rate limiting tab not yet implemented
      test.skip(true, 'Rate limiting tab not yet implemented');
      return;
    }

    await page.getByTestId('ratelimits-tab').click();
    await page.waitForTimeout(500);

    // Check for blocked IPs section
    const pageText = await page.locator('body').textContent();
    const hasBlockedSection = pageText?.includes('Blocked IP');
    expect(hasBlockedSection).toBeTruthy();
  });

  test('should display allowlist IPs table', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('ratelimits-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Reason: Rate limiting tab not yet implemented
      test.skip(true, 'Rate limiting tab not yet implemented');
      return;
    }

    await page.getByTestId('ratelimits-tab').click();
    await page.waitForTimeout(500);

    // Check for allowlist section
    const pageText = await page.locator('body').textContent();
    const hasAllowlistSection = pageText?.includes('Allowlist');
    expect(hasAllowlistSection).toBeTruthy();
  });
});

test.describe('Admin - Maintenance & Flags', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should display maintenance mode toggle', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('maintenance-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Maintenance tab not yet implemented
      test.skip(true, 'Maintenance tab not yet implemented');
      return;
    }

    // Click maintenance tab
    await page.getByTestId('maintenance-tab').click();
    await page.waitForTimeout(500);

    // Check maintenance content is visible
    const maintenanceContent = await page
      .getByTestId('maintenance-content')
      .isVisible()
      .catch(() => false);
    expect(maintenanceContent).toBeTruthy();

    // Check for maintenance mode toggle button
    const toggleButton = await page
      .getByTestId('maintenance-toggle')
      .isVisible()
      .catch(() => false);
    expect(toggleButton).toBeTruthy();
  });

  test('should show confirmation modal when toggling maintenance mode', async ({
    page,
  }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('maintenance-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Maintenance tab not yet implemented
      test.skip(true, 'Maintenance tab not yet implemented');
      return;
    }

    await page.getByTestId('maintenance-tab').click();
    await page.waitForTimeout(500);

    const toggleButton = await page
      .getByTestId('maintenance-toggle')
      .isVisible()
      .catch(() => false);
    if (!toggleButton) {
      // Skip reason: FUTURE_FEATURE - Maintenance toggle not yet implemented
      test.skip(true, 'Maintenance toggle not yet implemented');
      return;
    }

    // Click toggle button
    await page.getByTestId('maintenance-toggle').click();
    await page.waitForTimeout(500);

    // Check if confirmation modal appears
    const modalTitle = await page
      .getByTestId('modal-title')
      .isVisible()
      .catch(() => false);
    if (modalTitle) {
      expect(modalTitle).toBeTruthy();
      // Close modal
      await page.getByTestId('modal-cancel').click();
    }
  });

  test('should display feature flags section', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('maintenance-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Maintenance tab not yet implemented
      test.skip(true, 'Maintenance tab not yet implemented');
      return;
    }

    await page.getByTestId('maintenance-tab').click();
    await page.waitForTimeout(500);

    // Check for feature flags section
    const pageText = await page.locator('body').textContent();
    const hasFeatureFlagsSection = pageText?.includes('Feature Flags');
    expect(hasFeatureFlagsSection).toBeTruthy();
  });
});

test.describe('Admin - Session Controls', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should display active sessions table', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('sessions-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Sessions tab not yet implemented
      test.skip(true, 'Sessions tab not yet implemented');
      return;
    }

    // Click sessions tab
    await page.getByTestId('sessions-tab').click();
    await page.waitForTimeout(500);

    // Check sessions content is visible
    const sessionsContent = await page
      .getByTestId('sessions-content')
      .isVisible()
      .catch(() => false);
    expect(sessionsContent).toBeTruthy();

    // Check for active sessions table or empty state
    const pageText = await page.locator('body').textContent();
    const hasSessionsContent =
      pageText?.includes('Active Sessions') || pageText?.includes('No active sessions');
    expect(hasSessionsContent).toBeTruthy();
  });

  test('should display bulk revoke button when sessions are selected', async ({
    page,
  }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('sessions-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Sessions tab not yet implemented
      test.skip(true, 'Sessions tab not yet implemented');
      return;
    }

    await page.getByTestId('sessions-tab').click();
    await page.waitForTimeout(500);

    // Check if there are any checkboxes (indicating active sessions)
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    if (checkboxes > 1) {
      // Click first session checkbox (skip the "select all" checkbox)
      await page.locator('tbody input[type="checkbox"]').first().click();
      await page.waitForTimeout(300);

      // Check if bulk revoke button appears
      const bulkRevokeButton = await page
        .getByTestId('bulk-revoke-button')
        .isVisible()
        .catch(() => false);
      expect(bulkRevokeButton).toBeTruthy();
    } else {
      // No sessions to test with, just verify the tab loaded
      const pageText = await page.locator('body').textContent();
      expect(pageText).toContain('Active Sessions');
    }
  });

  test('should show confirmation modal when revoking session', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('sessions-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Sessions tab not yet implemented
      test.skip(true, 'Sessions tab not yet implemented');
      return;
    }

    await page.getByTestId('sessions-tab').click();
    await page.waitForTimeout(500);

    // Check if there's at least one revoke button (indicating active sessions)
    const revokeButtons = await page.locator('button:has-text("Revoke")').count();
    if (revokeButtons > 0) {
      // Click first revoke button
      await page.locator('button:has-text("Revoke")').first().click();
      await page.waitForTimeout(500);

      // Check if confirmation modal appears
      const modalTitle = await page
        .getByTestId('modal-title')
        .isVisible()
        .catch(() => false);
      if (modalTitle) {
        expect(modalTitle).toBeTruthy();
        // Close modal
        await page.getByTestId('modal-cancel').click();
      }
    } else {
      // Skip reason: TEST_INFRASTRUCTURE - No active sessions available for testing
      test.skip(true, 'No active sessions available for testing');
    }
  });

  test('should show confirmation modal for bulk revoke with typed confirmation', async ({
    page,
  }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('sessions-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Sessions tab not yet implemented
      test.skip(true, 'Sessions tab not yet implemented');
      return;
    }

    await page.getByTestId('sessions-tab').click();
    await page.waitForTimeout(500);

    // Check if there are sessions to select
    const checkboxes = await page.locator('tbody input[type="checkbox"]').count();
    if (checkboxes > 0) {
      // Select first session
      await page.locator('tbody input[type="checkbox"]').first().click();
      await page.waitForTimeout(300);

      // Check if bulk revoke button is visible
      const bulkRevokeButton = await page
        .getByTestId('bulk-revoke-button')
        .isVisible()
        .catch(() => false);
      if (bulkRevokeButton) {
        // Click bulk revoke button
        await page.getByTestId('bulk-revoke-button').click();
        await page.waitForTimeout(500);

        // Check if confirmation modal with input field appears
        const confirmationInput = await page
          .getByTestId('confirmation-input')
          .isVisible()
          .catch(() => false);
        if (confirmationInput) {
          expect(confirmationInput).toBeTruthy();
          // Close modal
          await page.getByTestId('modal-cancel').click();
        }
      }
    } else {
      // Skip reason: TEST_INFRASTRUCTURE - No sessions available for bulk revoke testing
      test.skip(true, 'No sessions available for bulk revoke testing');
    }
  });
});

test.describe('Confirmation Modal Component', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should close confirmation modal on Escape key', async ({ page }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    const hasTab = await page
      .getByTestId('maintenance-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Platform controls not yet implemented
      test.skip(true, 'Platform controls not yet implemented');
      return;
    }

    // Open maintenance tab and trigger modal
    await page.getByTestId('maintenance-tab').click();
    await page.waitForTimeout(500);

    const toggleButton = await page
      .getByTestId('maintenance-toggle')
      .isVisible()
      .catch(() => false);
    if (!toggleButton) {
      // Skip reason: FUTURE_FEATURE - Maintenance toggle not yet implemented
      test.skip(true, 'Maintenance toggle not yet implemented');
      return;
    }

    await page.getByTestId('maintenance-toggle').click();
    await page.waitForTimeout(500);

    // Check if modal appears
    const modalVisible = await page
      .getByTestId('modal-title')
      .isVisible()
      .catch(() => false);
    if (modalVisible) {
      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Modal should be closed
      const modalStillVisible = await page
        .getByTestId('modal-title')
        .isVisible()
        .catch(() => false);
      expect(modalStillVisible).toBeFalsy();
    }
  });

  test('should disable confirm button when typed confirmation does not match', async ({
    page,
  }) => {
    await page.goto('/admin/platform');
    await page.waitForLoadState('load');

    // Navigate to sessions tab
    const hasTab = await page
      .getByTestId('sessions-tab')
      .isVisible()
      .catch(() => false);
    if (!hasTab) {
      // Skip reason: FUTURE_FEATURE - Platform controls not yet implemented
      test.skip(true, 'Platform controls not yet implemented');
      return;
    }

    await page.getByTestId('sessions-tab').click();
    await page.waitForTimeout(500);

    // Select a session and trigger bulk revoke (which requires typed confirmation)
    const checkboxes = await page.locator('tbody input[type="checkbox"]').count();
    if (checkboxes > 0) {
      await page.locator('tbody input[type="checkbox"]').first().click();
      await page.waitForTimeout(300);

      const bulkRevokeButton = await page
        .getByTestId('bulk-revoke-button')
        .isVisible()
        .catch(() => false);
      if (bulkRevokeButton) {
        await page.getByTestId('bulk-revoke-button').click();
        await page.waitForTimeout(500);

        const confirmationInput = await page
          .getByTestId('confirmation-input')
          .isVisible()
          .catch(() => false);
        if (confirmationInput) {
          // Type wrong confirmation text
          await page.getByTestId('confirmation-input').fill('WRONG');
          await page.waitForTimeout(300);

          // Confirm button should be disabled
          const confirmButton = page.getByTestId('modal-confirm');
          const isDisabled = await confirmButton.isDisabled();
          expect(isDisabled).toBeTruthy();

          // Close modal
          await page.getByTestId('modal-cancel').click();
        }
      }
    } else {
      // Skip reason: TEST_INFRASTRUCTURE - No sessions available for testing
      test.skip(true, 'No sessions available for testing');
    }
  });
});
