/**
 * E2E Tests for Settings Page Workflows
 *
 * Tests the complete settings page functionality including:
 * - General settings (preferences)
 * - Security settings (password change, session management)
 * - Privacy settings (GDPR data export, consent management)
 * - Danger zone (account deletion)
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 *
 * @see docs/_TODO/Unfinished/_FE_UNFinished_001.md for implementation plan
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Settings Page Workflows', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login using proper helper with form hydration wait
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );

    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test.describe('General Settings Tab', () => {
    test('should display general settings tab', async ({ page }) => {
      // Use more specific locators within the main content area
      const main = page.locator('main, [role="main"], .settings-content').first();
      await expect(main.locator('text=/appearance/i').first()).toBeVisible();
      await expect(main.getByRole('heading', { name: /notifications/i })).toBeVisible();
    });

    test('should change theme preference', async ({ page }) => {
      // Click dark theme button
      const darkButton = page.locator('button:has-text("dark")');
      await darkButton.click();
      await expect(darkButton).toHaveAttribute('aria-pressed', 'true');

      // Save changes
      const saveButton = page.locator('button:has-text("Save Changes")');
      await saveButton.click();

      // Should show success message
      await expect(page.locator('text=/settings saved successfully/i')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should update notification preferences', async ({ page }) => {
      // Toggle document updates checkbox
      const documentUpdatesCheckbox = page.locator('input[id="documentUpdates"]');
      await documentUpdatesCheckbox.click();

      // Save changes
      const saveButton = page.locator('button:has-text("Save Changes")');
      await saveButton.click();

      // Should show success message
      await expect(page.locator('text=/settings saved successfully/i')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Security Settings Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to security tab
      await page.goto('/settings?tab=security');
      await page.waitForLoadState('networkidle');
    });

    test('should display security settings', async ({ page }) => {
      const main = page.locator('main, [role="main"], .settings-content').first();
      await expect(
        main.getByRole('heading', { name: /change password/i }),
      ).toBeVisible();
      await expect(
        main.getByRole('heading', { name: /active sessions/i }),
      ).toBeVisible();
    });

    test('should display active sessions list', async ({ page }) => {
      // Wait for sessions to load
      await page.waitForTimeout(2000);

      // Should show sessions section (may be empty)
      const main = page.locator('main, [role="main"], .settings-content').first();
      await expect(
        main.getByRole('heading', { name: /active sessions/i }),
      ).toBeVisible();
    });

    test('should show error for incorrect current password', async ({ page }) => {
      // Fill password change form with incorrect current password
      await page.fill('input[id="currentPassword"]', 'wrongpassword');
      await page.fill('input[id="newPassword"]', 'NewPassword123!');
      await page.fill('input[id="confirmPassword"]', 'NewPassword123!');

      // Submit form
      const submitButton = page.locator(
        'button[type="submit"]:has-text("Change Password")',
      );
      await submitButton.click();

      // Should show error message
      await expect(
        page.locator('text=/current password is incorrect|invalid/i').first(),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should validate password mismatch', async ({ page, workerCredentials }) => {
      // Fill form with mismatched passwords
      await page.fill('input[id="currentPassword"]', workerCredentials.password);
      await page.fill('input[id="newPassword"]', 'NewPassword123!');
      await page.fill('input[id="confirmPassword"]', 'DifferentPassword123!');

      // Submit form
      const submitButton = page.locator(
        'button[type="submit"]:has-text("Change Password")',
      );
      await submitButton.click();

      // Should show validation error
      await expect(page.locator('text=/passwords do not match/i')).toBeVisible({
        timeout: 2000,
      });
    });

    test('should validate password length', async ({ page, workerCredentials }) => {
      // Fill form with short password
      await page.fill('input[id="currentPassword"]', workerCredentials.password);
      await page.fill('input[id="newPassword"]', 'short');
      await page.fill('input[id="confirmPassword"]', 'short');

      // Submit form
      const submitButton = page.locator(
        'button[type="submit"]:has-text("Change Password")',
      );
      await submitButton.click();

      // Should show validation error
      await expect(page.locator('text=/at least 8 characters/i')).toBeVisible({
        timeout: 2000,
      });
    });

    test('should revoke individual session', async ({ page }) => {
      // Wait for sessions to load
      await page.waitForTimeout(2000);

      // Find revoke button for non-current session
      const revokeButtons = page.locator('button:has-text("Revoke")');
      const count = await revokeButtons.count();

      if (count > 0) {
        // Mock confirm dialog
        page.on('dialog', (dialog) => dialog.accept());

        // Click first revoke button
        await revokeButtons.first().click();

        // Should show success message
        await expect(page.locator('text=/session revoked successfully/i')).toBeVisible({
          timeout: 5000,
        });
      } else {
        // Skip if no sessions to revoke
        test.skip();
      }
    });

    test('should revoke all sessions', async ({ page }) => {
      // Wait for sessions to load
      await page.waitForTimeout(2000);

      // Check if "Revoke All Others" button exists
      const revokeAllButton = page.locator('button:has-text("Revoke All Others")');
      const isVisible = await revokeAllButton.isVisible().catch(() => false);

      if (isVisible) {
        // Mock confirm dialog
        page.on('dialog', (dialog) => dialog.accept());

        // Click revoke all button
        await revokeAllButton.click();

        // Should show success message
        await expect(
          page.locator('text=/all other sessions revoked successfully/i'),
        ).toBeVisible({ timeout: 5000 });
      } else {
        // Skip if only one session
        test.skip();
      }
    });
  });

  test.describe('Privacy Settings Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to privacy tab
      await page.goto('/settings?tab=privacy');
      await page.waitForLoadState('networkidle');
    });

    test('should display privacy settings', async ({ page }) => {
      const main = page.locator('main, [role="main"], .settings-content').first();
      await expect(main.locator('text=/export your data/i').first()).toBeVisible();
      await expect(main.locator('text=/privacy preferences/i').first()).toBeVisible();
    });

    test('should request data export', async ({ page }) => {
      // Click data export button using stable test ID
      const exportButton = page.getByTestId('request-data-export-button');
      await exportButton.click();

      // Wait for button to be disabled (loading state) or success message
      // Note: The endpoint returns a file download, so we check for button state change
      await Promise.race([
        expect(exportButton).toBeDisabled({ timeout: 3000 }),
        expect(page.locator('text=/data export.*success/i').first()).toBeVisible({
          timeout: 3000,
        }),
      ]).catch(async () => {
        // If neither happens, check for any status message
        await expect(page.locator('text=/data export/i').first()).toBeVisible({
          timeout: 2000,
        });
      });
    });

    test('should toggle consent preferences', async ({ page }) => {
      // Wait for consents to load
      await page.waitForTimeout(2000);

      // Find consent checkboxes
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 0) {
        // Toggle first consent checkbox
        const firstCheckbox = checkboxes.first();
        const initialState = await firstCheckbox.isChecked();
        await firstCheckbox.click();

        // Should show success message
        await expect(page.locator('text=/consent updated successfully/i')).toBeVisible({
          timeout: 5000,
        });

        // Verify checkbox state changed
        await expect(firstCheckbox).toHaveProperty('checked', !initialState);
      } else {
        // Skip if no consents available
        test.skip();
      }
    });

    test('should display data retention information', async ({ page }) => {
      const main = page.locator('main, [role="main"], .settings-content').first();
      await expect(main.locator('text=/data retention/i').first()).toBeVisible();
      await expect(main.locator('text=/profile data/i').first()).toBeVisible();
      await expect(main.locator('text=/documents/i').first()).toBeVisible();
    });
  });

  test.describe('Danger Zone Tab', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to danger tab
      await page.goto('/settings?tab=danger');
      await page.waitForLoadState('networkidle');
    });

    test('should display danger zone warning', async ({ page }) => {
      const main = page.locator('main, [role="main"], .settings-content').first();
      await expect(main.getByRole('heading', { name: /danger zone/i })).toBeVisible();
      await expect(main.locator('text=/delete account/i').first()).toBeVisible();
    });

    test('should show confirmation form when delete button clicked', async ({
      page,
    }) => {
      // Click delete account button
      const deleteButton = page.locator('button:has-text("Delete My Account")');
      await deleteButton.click();

      // Should show confirmation form
      await expect(page.locator('text=/are you absolutely sure/i')).toBeVisible();
      await expect(page.locator('input[placeholder="DELETE"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should validate confirmation text', async ({ page, workerCredentials }) => {
      // Click delete account button
      const deleteButton = page.locator('button:has-text("Delete My Account")');
      await deleteButton.click();

      // Fill form with wrong confirmation text
      await page.fill('input[placeholder="DELETE"]', 'WRONG');
      await page.fill('input[type="password"]', workerCredentials.password);

      // Click delete button
      const confirmDeleteButton = page.locator('button:has-text("Delete My Account")');
      await confirmDeleteButton.click();

      // Should show error
      await expect(page.locator('text=/type DELETE to confirm/i').first()).toBeVisible({
        timeout: 2000,
      });
    });

    test('should validate password requirement', async ({ page }) => {
      // Click delete account button
      const deleteButton = page.locator('button:has-text("Delete My Account")');
      await deleteButton.click();

      // Fill form without password
      await page.fill('input[placeholder="DELETE"]', 'DELETE');

      // Click delete button
      const confirmDeleteButton = page.locator('button:has-text("Delete My Account")');
      await confirmDeleteButton.click();

      // Should show error
      await expect(page.locator('text=/enter your password/i').first()).toBeVisible({
        timeout: 2000,
      });
    });

    test('should cancel account deletion', async ({ page }) => {
      // Click delete account button
      const deleteButton = page.locator('button:has-text("Delete My Account")');
      await deleteButton.click();

      // Click cancel button
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();

      // Should hide confirmation form
      await expect(page.locator('text=/are you absolutely sure/i')).not.toBeVisible();
    });
  });

  test.describe('Navigation Between Tabs', () => {
    test('should navigate between settings tabs', async ({ page }) => {
      const main = page.locator('main, [role="main"], .settings-content').first();

      // Start on general tab
      await expect(main.locator('text=/appearance/i').first()).toBeVisible();

      // Navigate to security tab
      await page.goto('/settings?tab=security');
      await expect(
        main.getByRole('heading', { name: /change password/i }),
      ).toBeVisible();

      // Navigate to privacy tab
      await page.goto('/settings?tab=privacy');
      await expect(main.locator('text=/export your data/i').first()).toBeVisible();

      // Navigate to danger tab
      await page.goto('/settings?tab=danger');
      await expect(main.getByRole('heading', { name: /danger zone/i })).toBeVisible();
    });
  });
});
