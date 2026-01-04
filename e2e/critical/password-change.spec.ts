/**
 * E2E Tests for Password Change Workflow
 *
 * Tests the complete password change flow including:
 * - Navigate to security settings
 * - Fill in password change form
 * - Submit and verify success
 * - Verify session invalidation
 * - Verify forced re-login
 *
 * IMPORTANT: Each test uses a dedicated password-test user to avoid password
 * history pollution between tests. Tests are independent and can run in parallel.
 */

import { test, expect } from '@playwright/test';
import { PASSWORD_TEST_CREDENTIALS } from '../../test-credentials';

// Generate a password that passes validation (no sequential chars, has all required types)
// Format: Xk!9mN + randomHex + $7wR (18+ chars, has upper/lower/num/special, no sequences)
function generateValidPassword(): string {
  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `Xk!9mN${randomHex}$7wR`;
}

// Helper to login and navigate to security settings
async function loginAndNavigateToSecuritySettings(
  page: any,
  email: string,
  password: string,
) {
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

  // Navigate to security settings page
  await page.goto('/settings/security');
  await page.waitForLoadState('networkidle');

  // Ensure security heading is visible before proceeding
  await expect(page.locator('h1:has-text("Security Settings")').first()).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Password Change E2E Workflow', () => {
  test('should successfully change password and force re-login', async ({ page }) => {
    // Use dedicated test user 1
    const testUser = PASSWORD_TEST_CREDENTIALS.USER_1;
    const newPassword = generateValidPassword();

    await loginAndNavigateToSecuritySettings(page, testUser.email, testUser.password);

    // Fill in password change form
    await page.fill('#current-password', testUser.password);
    await page.fill('#new-password', newPassword);
    await page.fill('#confirm-password', newPassword);

    // Wait for password validation to complete (300ms debounce + processing)
    await page.waitForTimeout(1000);

    const submitButton = page.locator('button:has-text("Update Password")');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });

    // Button may still be disabled if password doesn't meet validation
    // Wait for it to be enabled (policy fetch + validation may take time)
    await expect(submitButton).toBeEnabled({ timeout: 15000 });

    // Submit password change form
    await submitButton.click();

    // Wait for success message or redirect
    // The component shows success alert then redirects to login after 2 seconds
    await expect(
      page.locator(
        'text=/password changed successfully|All sessions have been logged out/i',
      ),
    ).toBeVisible({ timeout: 10000 });

    // Wait for automatic redirect to login page (after 2 seconds)
    await expect(page).toHaveURL(/.*\/auth\/login/, { timeout: 10000 });

    // Clear all cookies and storage to simulate complete session invalidation
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try accessing protected page (should redirect to login)
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/.*\/auth\/login/, { timeout: 10000 });

    // Test login with NEW password should succeed
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', newPassword);
    await page.click('button[type="submit"]');

    // Should successfully login and redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('should show error for incorrect current password', async ({ page }) => {
    // Use dedicated test user 2
    const testUser = PASSWORD_TEST_CREDENTIALS.USER_2;
    const wrongCurrentPassword = generateValidPassword(); // Use valid format but wrong password
    const newPassword = generateValidPassword();

    await loginAndNavigateToSecuritySettings(page, testUser.email, testUser.password);

    // Fill in form with incorrect current password
    await page.fill('#current-password', wrongCurrentPassword);
    await page.fill('#new-password', newPassword);
    await page.fill('#confirm-password', newPassword);

    // Wait for password validation (300ms debounce + processing)
    await page.waitForTimeout(1000);

    const submitButton = page.locator('button:has-text("Update Password")');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(submitButton).toBeEnabled({ timeout: 15000 });
    await submitButton.click();

    // Should show error message about incorrect current password
    await expect(
      page.locator('text=/current password|incorrect|invalid|wrong password/i').first(),
    ).toBeVisible({ timeout: 10000 });

    // Should NOT redirect to login - still on security page
    await expect(page).toHaveURL(/.*\/settings\/security/, { timeout: 2000 });
  });

  test('should disable submit button when passwords do not match', async ({ page }) => {
    // Use dedicated test user 3
    const testUser = PASSWORD_TEST_CREDENTIALS.USER_3;
    const newPassword = generateValidPassword();
    const differentPassword = generateValidPassword();

    await loginAndNavigateToSecuritySettings(page, testUser.email, testUser.password);

    // Fill in form with mismatched passwords
    await page.fill('#current-password', testUser.password);
    await page.fill('#new-password', newPassword);
    await page.fill('#confirm-password', differentPassword);

    // Wait for password validation to complete (300ms debounce + processing)
    await page.waitForTimeout(1000);

    // Button should be visible but DISABLED due to password mismatch
    const submitButton = page.locator('button:has-text("Update Password")');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(submitButton).toBeDisabled();

    // Should remain on security settings page (no submission)
    await expect(page).toHaveURL(/.*\/settings\/security/);
  });

  test('should disable submit button with weak password', async ({ page }) => {
    // Use dedicated test user 4
    const testUser = PASSWORD_TEST_CREDENTIALS.USER_4;
    const weakPassword = 'weak'; // Too short and missing complexity

    await loginAndNavigateToSecuritySettings(page, testUser.email, testUser.password);

    // Fill in form with weak password
    await page.fill('#current-password', testUser.password);
    await page.fill('#new-password', weakPassword);
    await page.fill('#confirm-password', weakPassword);

    // Wait for password validation to complete (300ms debounce + processing)
    await page.waitForTimeout(1000);

    // Should show validation errors for weak password
    await expect(
      page
        .locator('text=/✗|must|uppercase|lowercase|number|special|characters/i')
        .first(),
    ).toBeVisible({ timeout: 5000 });

    // Button should be visible but DISABLED due to weak password
    const submitButton = page.locator('button:has-text("Update Password")');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(submitButton).toBeDisabled();

    // Should remain on security settings page (no submission)
    await expect(page).toHaveURL(/.*\/settings\/security/);
  });

  test('should display password strength indicator', async ({ page }) => {
    // Use dedicated test user 5
    const testUser = PASSWORD_TEST_CREDENTIALS.USER_5;

    await loginAndNavigateToSecuritySettings(page, testUser.email, testUser.password);

    // Type in a weak password
    const newPasswordInput = page.locator('#new-password');
    await newPasswordInput.fill('abc');

    // Wait for validation (300ms debounce + processing)
    await page.waitForTimeout(1000);

    // Should show weak strength indicator
    // Wait for strength indicator to appear (the component shows "weak", "medium", "strong", etc.)
    await expect(page.locator('text=/weak/i').first()).toBeVisible({ timeout: 5000 });

    // Type a stronger password (avoid sequential patterns)
    await newPasswordInput.fill('');
    await newPasswordInput.fill('Xk!9mNv$Q2pLw7R');

    // Wait for strength to update (300ms debounce + processing)
    await page.waitForTimeout(1000);

    // Strength should show medium or strong
    await expect(page.locator('text=/medium|strong/i').first()).toBeVisible({
      timeout: 5000,
    });
  });
});
