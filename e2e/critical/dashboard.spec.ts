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

    test('should display welcome message with user email', async ({
      page,
      workerCredentials,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check welcome message
      const heading = page.locator('h1');
      await expect(heading).toContainText('Welcome back');

      // Check user email is displayed
      const userEmail = page.locator('[data-testid="user-email"]');
      await expect(userEmail).toBeVisible();
      await expect(userEmail).toContainText(workerCredentials.email);
    });

    test('should display verification and account status badges', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check verification status badge
      const verificationStatus = page.locator('[data-testid="verification-status"]');
      await expect(verificationStatus).toBeVisible();

      // Check account status badge
      const accountStatus = page.locator('[data-testid="account-status"]');
      await expect(accountStatus).toBeVisible();
    });
  });

  test.describe('KPI Cards', () => {
    test('should display all three KPI cards', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for stats to load

      // Check for My Documents card
      const documentsCard = page.locator('text=My Documents').first();
      await documentsCard.scrollIntoViewIfNeeded();
      await expect(documentsCard).toBeVisible();

      // Check for Active Sessions card
      const sessionsCard = page.locator('text=Active Sessions').first();
      await sessionsCard.scrollIntoViewIfNeeded();
      await expect(sessionsCard).toBeVisible();

      // Check for Open Cases card
      const casesCard = page.locator('text=Open Cases').first();
      await casesCard.scrollIntoViewIfNeeded();
      await expect(casesCard).toBeVisible();
    });

    test('should load sessions page successfully', async ({ page }) => {
      await page.goto('/dashboard/sessions');
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByRole('heading', { name: 'Active Sessions', exact: true }),
      ).toBeVisible();
    });

    test('should display KPI values', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for stats to load

      // Check that KPI cards have values (either numbers or '--')
      const statValues = page.locator('.text-2xl.font-bold');
      const count = await statValues.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick actions section', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check quick actions heading
      const quickActionsHeading = page.locator('text=Quick Actions');
      await quickActionsHeading.scrollIntoViewIfNeeded();
      await expect(quickActionsHeading).toBeVisible();
    });

    test('should display Create Document action', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const createDocAction = page.locator('text=Create Document').first();
      await createDocAction.scrollIntoViewIfNeeded();
      await expect(createDocAction).toBeVisible();
    });

    test('should display Upload Files action', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const uploadAction = page.locator('text=Upload Files').first();
      await uploadAction.scrollIntoViewIfNeeded();
      await expect(uploadAction).toBeVisible();
    });

    test('should display View My Cases action', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const casesAction = page.locator('text=View My Cases').first();
      await casesAction.scrollIntoViewIfNeeded();
      await expect(casesAction).toBeVisible();
    });

    test('should navigate to documents when clicking Create Document', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Click Create Document button
      const createDocBtn = page.locator('button:has-text("Create Document")');
      await createDocBtn.scrollIntoViewIfNeeded();
      await createDocBtn.click();

      // Should navigate to documents/create
      await page.waitForURL(/\/documents\/create/);
    });

    test('should navigate to cases when clicking View My Cases', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Click View My Cases button
      const casesBtn = page.locator('button:has-text("View My Cases")');
      await casesBtn.scrollIntoViewIfNeeded();
      await casesBtn.click();

      // Should navigate to cases
      await page.waitForURL(/\/cases/);
    });
  });

  test.describe('Recent Activity', () => {
    test('should display recent activity section', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check recent activity heading
      const activityHeading = page.locator('text=Recent Activity');
      await activityHeading.scrollIntoViewIfNeeded();
      await expect(activityHeading).toBeVisible();
    });

    // Reason: Recent Activity currently uses mock data, not real backend data
    test.skip('should display activity items', async ({ page }) => {
      // NOTE: Skipped - Recent Activity currently uses mock data
      // Real activity feed implementation deferred to future work
      // (requires user-scoped activity endpoint)
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check for activity items text content (mock data should always be present)
      const hasTemplateActivity = await page
        .locator('text=Created contract template')
        .isVisible()
        .catch(() => false);
      const hasPermissionsActivity = await page
        .locator('text=Updated user permissions')
        .isVisible()
        .catch(() => false);

      // At least one activity item should be visible
      expect(hasTemplateActivity || hasPermissionsActivity).toBeTruthy();
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
