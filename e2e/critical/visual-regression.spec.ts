/**
 * Visual Regression Tests
 *
 * Captures screenshots of key pages to detect visual regressions.
 * Run with: npm run test:e2e -- visual-regression.spec.ts
 *
 * Note: Screenshots are stored in tests/e2e/visual-regression.spec.ts-snapshots/
 * Update snapshots with: npm run test:e2e -- visual-regression.spec.ts --update-snapshots
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('login page', async ({ page }) => {
    await page.goto('/auth/login');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('register page', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('register-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard (authenticated)', async ({ page, workerCredentials }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', workerCredentials.email);
    await page.fill('input[type="password"]', workerCredentials.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('profile page (authenticated)', async ({ page, workerCredentials }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', workerCredentials.email);
    await page.fill('input[type="password"]', workerCredentials.password);
    await page.click('button[type="submit"]');

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('profile-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('admin dashboard (admin user)', async ({ page, workerCredentials }) => {
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', workerCredentials.email);
    await page.fill('input[type="password"]', workerCredentials.password);
    await page.click('button[type="submit"]');

    // Navigate to admin dashboard
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('not found page', async ({ page }) => {
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('not-found-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
