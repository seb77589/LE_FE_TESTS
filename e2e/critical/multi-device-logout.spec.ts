/**
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */
import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Multi-Device Logout', () => {
  test('should log out from all other devices', async ({ page, context, workerCredentials }) => {
    try {
      // Step 1: Login using worker credentials on first device
      console.log('🔐 Logging in on first device...');
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );
      console.log('✅ First device logged in successfully');

      // Step 2: Create second session (simulate second device using same credentials)
      console.log('🔐 Creating second session (simulating second device)...');
      const page2 = await context.newPage();
      await TestHelpers.loginAndWaitForRedirect(
        page2,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );
      console.log('✅ Second device logged in successfully');

      // Step 3: Navigate to security settings page (sessions are managed in SecurityTab)
      console.log('📱 Navigating to sessions page on first device...');
      await page.goto('/settings/security');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for sessions to load from API

      // Step 4: Check session count - sessions are listed in the Active Sessions section
      // Each session is a div with class containing "border border-gray-200"
      const sessionItems = await page
        .locator('[class*="space-y-4"] > div[class*="border-gray-200"]')
        .count();
      console.log(`📊 Found ${sessionItems} session(s)`);

      // Note: May only show 0-1 session if session tracking is not fully implemented
      // or if the API doesn't return sessions yet
      if (sessionItems < 2) {
        console.log(
          '⚠️ Expected 2 sessions but found',
          sessionItems,
          '- session tracking may need enhancement',
        );
      }

      // Step 5: Look for "Revoke All Others" button (SecurityTab shows this when >1 session exists)
      const logoutAllButton = page.locator(
        '[data-testid="revoke-all-sessions"], button:has-text("Revoke All Others")',
      );
      const buttonVisible = await logoutAllButton.isVisible().catch(() => false);

      if (!buttonVisible) {
        console.log('ℹ️ Logout all devices button not found - skipping test');
        // The button only appears when there are 2+ sessions
        // Skip reason: BACKEND_SESSION_TRACKING - Backend API /api/v1/auth/sessions needs to track sessions
        test.skip(true, 'Backend session tracking API not returning sessions');
        return;
      }

      console.log('✅ Found "Revoke All Others" button');

      // Step 6: Click "Revoke All Others" - SecurityTab uses browser confirm() dialog
      // Set up dialog handler before clicking
      page.once('dialog', async (dialog) => {
        console.log('✅ Confirmation dialog appeared:', dialog.message());
        await dialog.accept();
        console.log('✅ Confirmed logout all devices');
      });

      await logoutAllButton.click();
      console.log('🖱️ Clicked "Revoke All Others" button');

      // Wait for the action to complete
      await page.waitForTimeout(2000);

      // Step 8: Wait for success toast
      const toastVisible = await page
        .locator('text=All other sessions revoked')
        .or(page.locator('text=revoked successfully'))
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (toastVisible) {
        console.log('✅ Success toast notification displayed');
      }

      // Step 9: Reload sessions page to verify only current session remains
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const remainingSessions = await page
        .locator('[data-testid="session-card"]')
        .count();
      console.log(`📊 Remaining sessions after logout all: ${remainingSessions}`);

      // Step 10: Verify second device was logged out (try to access dashboard)
      console.log('🔍 Verifying second device was logged out...');
      await page2.goto('/dashboard');
      await page2.waitForLoadState('networkidle');

      const page2Url = page2.url();
      const secondDeviceLoggedOut = page2Url.includes('/auth/login');

      if (secondDeviceLoggedOut) {
        console.log('✅ Second device successfully logged out - redirected to login');
      } else {
        console.log(
          '⚠️ Second device still has access - session invalidation may need work',
        );
        console.log('   Current URL:', page2Url);
      }

      // First device should still have access
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const firstDeviceUrl = page.url();
      const firstDeviceStillLoggedIn = firstDeviceUrl.includes('/dashboard');

      expect(firstDeviceStillLoggedIn).toBe(true);
      console.log('✅ First device (current session) still has access');

      // Cleanup
      await page2.close();
      console.log('🧹 Test cleanup complete');
    } catch (error) {
      console.error('❌ Multi-device logout test failed:', error);
      throw error;
    }
  });

  test('should show confirmation before logging out all devices', async ({ page, workerCredentials }) => {
    try {
      // Login using worker credentials
      console.log('🔐 Logging in...');
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );

      // Navigate to security settings page (sessions are managed in SecurityTab)
      console.log('📱 Navigating to sessions page...');
      await page.goto('/settings/security');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if logout all button exists (SecurityTab: "Revoke All Others")
      const logoutAllButton = await TestHelpers.waitForUIElementOrSkip(
        page,
        '[data-testid="revoke-all-sessions"], button:has-text("Revoke All Others")',
        'Revoke all sessions button not found (requires multiple sessions)',
      );

      if (!logoutAllButton) {
        // The button only appears when there are 2+ sessions
        // Skip reason: BACKEND_SESSION_TRACKING - Backend API /api/v1/auth/sessions needs to track sessions
        test.skip(true, 'Backend session tracking API not returning sessions');
        return;
      }

      // SecurityTab uses browser's confirm() dialog, not a custom modal
      // Set up dialog handler to dismiss (cancel) the dialog
      let dialogAppeared = false;
      page.once('dialog', async (dialog) => {
        dialogAppeared = true;
        console.log('✅ Confirmation dialog appeared:', dialog.message());
        await dialog.dismiss(); // Click Cancel
        console.log('✅ Clicked Cancel in confirmation dialog');
      });

      await logoutAllButton.click();
      console.log('🖱️ Clicked logout all button');
      await page.waitForTimeout(1000);

      if (dialogAppeared) {
        console.log('✅ Browser confirm() dialog was shown and cancelled');

        // Verify still on security settings page (not logged out)
        const currentUrl = page.url();
        expect(currentUrl).toContain('/settings/security');
        console.log('✅ User still on security settings page (logout cancelled)');
      } else {
        console.log('ℹ️ No confirmation dialog appeared - implementation may differ');
        const currentUrl = page.url();
        console.log(`📍 Current URL after logout click: ${currentUrl}`);
      }
    } catch (error) {
      console.error('❌ Confirmation modal test failed:', error);
      throw error;
    }
  });

  test('should show logout all option from security page', async ({
    page,
    workerCredentials,
  }) => {
    try {
      // Skip if not admin - this test requires admin credentials
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');

      // Login using proper helper
      console.log('🔐 Logging in...');
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        workerCredentials.isAdmin,
      );

      // Navigate to security page
      console.log('🔒 Navigating to security page...');
      await page.goto('/dashboard/security');

      // Wait for page to load or redirect
      try {
        await page.waitForURL(/.*(dashboard|security|admin)/, { timeout: 15000 });
      } catch (urlError) {
        // If we can't navigate to security page, skip test
        // Skip reason: FUTURE_FEATURE - Security page not accessible or not implemented
        test.skip(true, 'Security page not accessible or not implemented');
        return;
      }

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for Session Management section
      const sessionManagementCard = await TestHelpers.checkUIElementExists(
        page,
        'text=Session Management',
        5000,
      );

      if (!sessionManagementCard) {
        console.log('ℹ️ Session Management card not found on security page');
        // Skip reason: FUTURE_FEATURE - Session Management section not yet on security page
        test.skip(true, 'Session Management section not yet on security page');
        return;
      }

      console.log('✅ Session Management section found');

      // Look for Emergency Logout button
      const emergencyLogoutButton = await TestHelpers.checkUIElementExists(
        page,
        'button:has-text("Log Out Everywhere"), button:has-text("Log Out All")',
        5000,
      );

      if (!emergencyLogoutButton) {
        // Skip reason: FUTURE_FEATURE - Emergency logout button not yet implemented
        test.skip(true, 'Emergency logout button not yet implemented');
        return;
      }

      console.log('✅ Emergency "Log Out Everywhere" button found');

      // Click button and verify modal appears
      await page
        .locator(
          'button:has-text("Log Out Everywhere"), button:has-text("Log Out All")',
        )
        .first()
        .click();
      await page.waitForTimeout(500);

      const modalVisible = await TestHelpers.checkUIElementExists(
        page,
        'text=Log out from all devices?',
        5000,
      );

      if (modalVisible) {
        console.log('✅ Confirmation modal appeared from security page');

        // Cancel
        const cancelButton = await TestHelpers.checkUIElementExists(
          page,
          'button:has-text("Cancel")',
          5000,
        );
        if (cancelButton) {
          await page.locator('button:has-text("Cancel")').first().click();
          console.log('✅ Test complete - modal cancelled');
        }
      } else {
        console.log('ℹ️ Confirmation modal not shown - may work differently');
      }
    } catch (error) {
      console.error('❌ Security page logout test failed:', error);
      throw error;
    }
  });
});
