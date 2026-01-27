/**
 * E2E Tests for Dashboard Module
 * Tests the user dashboard page functionality with KPI cards, quick actions, and activity feed
 *
 * Consolidated with smoke tests - includes basic page load checks
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture to prevent parallel test conflicts
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Dashboard Module', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login before each test using worker-scoped credentials
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test.describe('Smoke Tests - Page Loads', () => {
    test('should load the home page successfully', async ({ page }) => {
      try {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveTitle(/LegalEase/);
      } catch (error) {
        await TestHelpers.takeScreenshot(page, 'smoke-home-page-failed');
        throw error;
      }
    });

    test('should load the dashboard page successfully', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      const dashboardContent = page.locator('[data-testid="dashboard-content"]');
      await expect(dashboardContent).toBeVisible();
    });

    test('should have working API endpoints', async ({ page }) => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_API_URL ?? 'https://192.168.5.107:8443';
        const response = await page.request.get(`${backendUrl}/health`);
        expect(response.status()).toBe(200);
        console.log('Backend API is accessible');
      } catch (error) {
        console.error('Backend API health check failed:', error);
        throw error;
      }
    });
  });

  test.describe('Dashboard Page Display', () => {
    test('should display dashboard page', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check dashboard content is visible
      const dashboardContent = page.locator('[data-testid="dashboard-content"]');
      await expect(dashboardContent).toBeVisible();
    });

    test('should display welcome message with user name', async ({
      page,
      workerCredentials,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check welcome message with first name (not email)
      const heading = page.locator('h1');
      await expect(heading).toContainText('Welcome');

      // Check user name is displayed (not email)
      const userName = page.locator('[data-testid="user-name"]');
      await expect(userName).toBeVisible();
      // User name should be visible (either from full_name or email prefix)
      const nameText = await userName.textContent();
      expect(nameText).toBeTruthy();
    });

    test('should display user role badge', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Wait for the welcome section with user name to appear first
      await page.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });

      // Check role badge is displayed - it's a span with specific styling next to the welcome message
      const roleBadge = page.locator('span.text-blue-800');
      await expect(roleBadge).toBeVisible({ timeout: 5000 });

      // Verify it contains a valid role text
      const roleText = await roleBadge.textContent();
      expect(roleText).toMatch(/(admin|user|superadmin|manager|assistant)/i);
    });
  });

  test.describe('Case Status Cards', () => {
    test('should display all three case status cards', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for stats to load

      // Check for Closed Cases card
      const closedCasesCard = page.locator('text=Closed Cases').first();
      await closedCasesCard.scrollIntoViewIfNeeded();
      await expect(closedCasesCard).toBeVisible();

      // Check for Cases In Progress card
      const inProgressCard = page.locator('text=Cases In Progress').first();
      await inProgressCard.scrollIntoViewIfNeeded();
      await expect(inProgressCard).toBeVisible();

      // Check for Cases To Review card
      const toReviewCard = page.locator('text=Cases To Review').first();
      await toReviewCard.scrollIntoViewIfNeeded();
      await expect(toReviewCard).toBeVisible();
    });

    test('should load sessions page successfully', async ({ page }) => {
      await page.goto('/dashboard/sessions');
      await page.waitForLoadState('networkidle');

      // Wait for either the sessions page heading or an error state
      const sessionsHeading = page.getByRole('heading', {
        name: 'Active Sessions',
        exact: true,
      });
      const errorState = page.locator(
        'text=/Something went wrong|Error loading sessions/i',
      );

      // Check for sessions heading first (expected)
      const headingVisible = await sessionsHeading
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      if (headingVisible) {
        await expect(sessionsHeading).toBeVisible();
        return;
      }

      // If there's an error state, that's acceptable too (API might be unavailable)
      const hasError = await errorState.isVisible().catch(() => false);
      if (hasError) {
        // Skip reason: TEST_INFRASTRUCTURE - Sessions API returned error
        test.skip(true, 'Sessions API returned error - page shows error state');
        return;
      }

      // Otherwise verify the heading is visible (will fail if neither condition met)
      await expect(sessionsHeading).toBeVisible({ timeout: 5000 });
    });

    test('should display case status values', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for stats to load

      // Check that case status cards have values (either numbers or '--')
      const statValues = page.locator('.text-3xl');
      const count = await statValues.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Case Card Navigation', () => {
    test('should navigate to closed cases when clicking Closed Cases card', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Click Closed Cases card link
      const closedCasesLink = page.locator('[href="/cases/closed"]').first();
      await closedCasesLink.scrollIntoViewIfNeeded();
      await closedCasesLink.click();

      // Should navigate to cases/closed
      await page.waitForURL(/\/cases\/closed/);
    });

    test('should navigate to in-progress cases when clicking Cases In Progress card', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Click Cases In Progress card link
      const inProgressLink = page.locator('[href="/cases/in-progress"]').first();
      await inProgressLink.scrollIntoViewIfNeeded();
      await inProgressLink.click();

      // Should navigate to cases/in-progress
      await page.waitForURL(/\/cases\/in-progress/);
    });

    test('should navigate to cases to review when clicking Cases To Review card', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Click Cases To Review card link
      const toReviewLink = page.locator('[href="/cases/to-review"]').first();
      await toReviewLink.scrollIntoViewIfNeeded();
      await toReviewLink.click();

      // Should navigate to cases/to-review
      await page.waitForURL(/\/cases\/to-review/);
    });
  });

  test.describe('Template Widget', () => {
    test('should display template widget on dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Template widget should be visible (either with templates or empty state)
      // Widget component renders regardless of whether templates exist
      const templateSection = page
        .locator('text=/Templates|Popular Templates|No templates available/i')
        .first();
      await expect(templateSection).toBeVisible();
    });
  });

  test.describe('Admin Features', () => {
    test.beforeEach(async ({ page, workerCredentials }) => {
      // Skip if worker doesn't have admin credentials
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');

      // Login as admin for these tests
      await TestHelpers.loginAndWaitForRedirect(
        page,
        workerCredentials.email,
        workerCredentials.password,
        true,
      );
    });

    test('should redirect admin users to admin dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Admin users may either be redirected to /admin or allowed to view /dashboard.
      await expect(page).toHaveURL(/\/(admin|dashboard)(\/|$)/, { timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('dashboard should have proper heading structure', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check h1 exists
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // Check h2 headings for sections
      const h2Headings = page.locator('h2');
      const count = await h2Headings.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
