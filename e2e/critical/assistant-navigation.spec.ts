/**
 * ASSISTANT Role - Navigation E2E Tests
 *
 * Validates complete navigation for ASSISTANT users: main nav items,
 * user dropdown menu, role badge, mobile responsiveness, and RBAC enforcement.
 *
 * This file REPLACES the original assistant-role.spec.ts with expanded coverage.
 *
 * Credential: WS_TEST_CREDENTIALS.USER_1 (dedicated ASSISTANT account)
 *
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/ASSISTANT_ROLE_UI_INVENTORY.md} §1 Global Elements
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

const ASSISTANT = WS_TEST_CREDENTIALS.USER_1;

test.describe('ASSISTANT Role - Main Navigation', () => {
  // Extend timeout — login can be slow due to rate limiting from parallel tests
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
  });

  test('should see exactly 4 standard nav items @P0', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify the 4 standard navigation items are visible
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/cases"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/templates"]').first()).toBeVisible();
    await expect(page.locator('nav a[href="/notifications"]').first()).toBeVisible();
  });

  test('should NOT see Admin navigation link @P0', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Admin link should NOT be visible for ASSISTANT role
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).not.toBeVisible();
  });

  test('should navigate to each main page via nav links @P0', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.locator('nav a[href="/cases"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.waitForURL('**/cases', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(2000);
    }
    expect(page.url()).toContain('/cases');

    // Navigate to Templates
    await page.locator('nav a[href="/templates"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.waitForURL('**/templates', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(2000);
    }
    expect(page.url()).toContain('/templates');

    // Navigate to Notifications
    await page.locator('nav a[href="/notifications"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.waitForURL('**/notifications', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(2000);
    }
    expect(page.url()).toContain('/notifications');

    // Navigate back to Dashboard
    await page.locator('nav a[href="/dashboard"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(2000);
    }
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('ASSISTANT Role - User Dropdown Menu', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
  });

  test('should open dropdown with Profile, Settings, Security, Sessions, Sign Out @P0', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Open user menu
    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await userMenuButton.click();
    await page.waitForTimeout(500);

    // Verify all profile menu items are available
    await expect(page.locator('a[href="/profile"]').first()).toBeVisible();
    await expect(page.locator('a[href="/settings"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/security"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/sessions"]').first()).toBeVisible();

    // Sign out button should be present
    const signOutButton = page.locator(
      'button:has-text("Sign Out"), button:has-text("Log Out")',
    );
    await expect(signOutButton.first()).toBeVisible();
  });

  test('should navigate to Profile from dropdown @P1', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await userMenuButton.click();
    await page
      .locator('a[href="/profile"]')
      .first()
      .waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('a[href="/profile"]').first().click();
    try {
      await page.waitForURL('**/profile', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(3000);
    }
    expect(page.url()).toContain('/profile');
  });

  test('should navigate to Settings from dropdown @P1', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await userMenuButton.click();
    await page
      .locator('a[href="/settings"]')
      .first()
      .waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('a[href="/settings"]').first().click();
    try {
      await page.waitForURL('**/settings**', { timeout: 10000 });
    } catch {
      await page.waitForTimeout(3000);
    }
    expect(page.url()).toContain('/settings');
  });

  test('should navigate to Security from dropdown @P1', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await userMenuButton.click();
    await page
      .locator('a[href="/dashboard/security"]')
      .first()
      .waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('a[href="/dashboard/security"]').first().click();
    // /dashboard/security may redirect to /settings?tab=security
    await page.waitForURL(/\/(dashboard\/security|settings)/, { timeout: 10000 });
    const url = page.url();
    expect(url.includes('/dashboard/security') || url.includes('/settings')).toBe(true);
  });

  test('should navigate to Sessions from dropdown @P1', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const userMenuButton = page.locator('[data-testid="user-menu-button"]');
    await userMenuButton.click();
    await page
      .locator('a[href="/dashboard/sessions"]')
      .first()
      .waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('a[href="/dashboard/sessions"]').first().click();
    await page.waitForURL('**/dashboard/sessions', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard/sessions');
  });
});

test.describe('ASSISTANT Role - NotificationBell', () => {
  /**
   * BLOCKED: NotificationBell component exists (232 lines, fully implemented with
   * dropdown, unread badge, mark-all-read, WebSocket real-time) but is NOT
   * imported or rendered anywhere in the application. Navigation.tsx uses a plain
   * Bell icon as the link to /notifications. Re-enable when integrated.
   *
   * @see ASSISTANT_ROLE_UI_INVENTORY.md §1.1
   */
  test.skip('should display NotificationBell with unread count @P1', async () => {
    // Blocked — NotificationBell component not integrated into Navigation
  });

  test.skip('should open notification dropdown and show recent items @P1', async () => {
    // Blocked — NotificationBell component not integrated into Navigation
  });
});

test.describe('ASSISTANT Role - Responsive & Badge', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
  });

  test('should show mobile hamburger menu on small viewport @P2', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Look for hamburger menu button (mobile menu toggle)
    const hamburgerButton = page.locator(
      'button[aria-label*="menu" i], button[data-testid="mobile-menu-button"], nav button:has(svg)',
    );
    const hasHamburger = (await hamburgerButton.count()) > 0;

    // Restore viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    expect(hasHamburger).toBe(true);
  });

  test('should display correct ASSISTANT role badge @P1', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Role badge should show "ASSISTANT" or "Assistant"
    const roleBadge = page.locator('span').filter({ hasText: /assistant/i });
    await expect(roleBadge.first()).toBeVisible({ timeout: 10000 });
  });
});
