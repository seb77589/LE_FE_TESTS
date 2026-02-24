/**
 * ASSISTANT Role - Authentication Lifecycle E2E Tests
 *
 * Validates the complete authentication lifecycle for ASSISTANT users:
 * login, logout, session persistence, invalid credentials, and access control.
 *
 * Credential: WS_TEST_CREDENTIALS.USER_1 (dedicated ASSISTANT account)
 *
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/_Assistant_E2E_Playwright_TST_Evol.md}
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS, TEST_DATA } from '../../test-credentials';

const ASSISTANT = WS_TEST_CREDENTIALS.USER_1;

test.describe('ASSISTANT Role - Authentication Lifecycle', () => {
  // Extend timeout — logout involves multiple UI interactions + backend API call + redirect
  test.setTimeout(90000);
  test('should login with valid ASSISTANT credentials @P0', async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );

    // Should land on /dashboard
    expect(page.url()).toContain('/dashboard');

    // Should see welcome heading
    await expect(page.locator('h1')).toContainText(/welcome/i);
  });

  test('should reject invalid credentials @P0', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Wait for form
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

    // Fill with wrong password
    await page.fill('input[type="email"], input[name="email"]', ASSISTANT.email);
    await page.fill(
      'input[type="password"], input[name="password"]',
      'WrongP@ssword123!',
    );

    // Submit
    await page.click('button[type="submit"]');

    // Should stay on login page with error
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/auth/login');

    // Should show some error indication
    const hasError = await TestHelpers.checkUIElementExists(
      page,
      '[role="alert"], .text-red-500, .text-destructive, [data-testid="error-message"]',
      5000,
    );
    expect(hasError).toBe(true);
  });

  test('should display ASSISTANT role badge after login @P0', async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Role badge should show "ASSISTANT" or "Assistant"
    const roleBadge = page.locator('span').filter({ hasText: /assistant/i });
    await expect(roleBadge.first()).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully and redirect to login @P0', async ({ page }) => {
    // Login first
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Open user menu
    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });
    await userMenuButton.click();
    await page.waitForTimeout(1000);

    // Click sign out — use data-testid to avoid strict mode violation
    const signOutButton = page.locator('[data-testid="logout-button"]');
    await expect(signOutButton).toBeVisible({ timeout: 5000 });
    await signOutButton.click();
    await page.waitForTimeout(1000);

    // Handle logout confirmation dialog — use data-testid for precise targeting
    const logOutConfirm = page.locator('[data-testid="logout-confirm"]');
    const logOutButton = page.locator('[role="dialog"] button:has-text("Log Out")');

    if (await logOutConfirm.isVisible({ timeout: 5000 })) {
      await logOutConfirm.click({ force: true });
    } else if (await logOutButton.first().isVisible({ timeout: 3000 })) {
      await logOutButton.first().click({ force: true });
    }

    // Should redirect to login page — allow time for backend logout + redirect
    try {
      await page.waitForURL(/\/(auth\/login|login)/, { timeout: 30000 });
    } catch {
      await page.waitForTimeout(5000);
    }
    expect(page.url()).toMatch(/\/(auth\/login|login)/);
  });

  test('should redirect expired session to login @P1', async ({ page }) => {
    // Go to a protected page without being authenticated
    await page.goto('/dashboard');

    // Should redirect to login
    try {
      await page.waitForURL(/\/(auth\/login|login)/, { timeout: 15000 });
    } catch {
      await page.waitForTimeout(3000);
    }

    // Should be on login page or redirected
    const url = page.url();
    const isOnLoginOrRedirected = url.includes('/auth/login') || url.includes('/login');
    expect(isOnLoginOrRedirected).toBe(true);
  });

  test('should redirect /admin to /dashboard for ASSISTANT @P0', async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );

    // Try to access admin page
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should NOT be on /admin — either redirected to dashboard or login
    const url = page.url();
    expect(url).not.toMatch(/\/admin(\/|$)/);
  });

  test('should persist session across page reload @P1', async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );

    // Verify on dashboard
    expect(page.url()).toContain('/dashboard');

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should still be on dashboard (not redirected to login)
    const url = page.url();
    const isStillAuthenticated =
      url.includes('/dashboard') || !url.includes('/auth/login');
    expect(isStillAuthenticated).toBe(true);
  });
});
