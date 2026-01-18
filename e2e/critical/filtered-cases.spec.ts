/**
 * E2E Tests for Filtered Cases Pages
 * Tests /cases/closed, /cases/in-progress, and /cases/to-review pages
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Filtered Cases Pages', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login before each test using worker-scoped credentials
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test.describe('Closed Cases Page', () => {
    test('should display closed cases page', async ({ page }) => {
      await page.goto('/cases/closed');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Check page title
      await expect(page.locator('h1')).toContainText('Closed Cases');

      // Check description
      const description = page.locator('text=Cases that have been successfully completed and closed.');
      await expect(description).toBeVisible();
    });

    test('should display closed cases or empty state', async ({ page }) => {
      await page.goto('/cases/closed');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for either table or empty state
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyState = await page
        .locator('text=No closed cases yet')
        .isVisible()
        .catch(() => false);

      // At least one should be visible
      expect(hasTable || hasEmptyState).toBeTruthy();
    });

    test('should navigate back to cases from breadcrumb', async ({ page }) => {
      await page.goto('/cases/closed');
      await page.waitForLoadState('domcontentloaded');

      // Click breadcrumb to go back
      const casesLink = page.locator('a[href="/cases"]').first();
      await casesLink.click();

      // Should navigate back to main cases page
      await page.waitForURL(/\/cases$/);
      await expect(page.locator('h1')).toContainText('Cases');
    });
  });

  test.describe('In Progress Cases Page', () => {
    test('should display in progress cases page', async ({ page }) => {
      await page.goto('/cases/in-progress');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Check page title
      await expect(page.locator('h1')).toContainText('In Progress Cases');

      // Check description
      const description = page.locator(
        'text=Cases currently being worked on, including new, active, and processing cases.',
      );
      await expect(description).toBeVisible();
    });

    test('should display in progress cases or empty state', async ({ page }) => {
      await page.goto('/cases/in-progress');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for either table or empty state
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyState = await page
        .locator('text=No cases in progress')
        .isVisible()
        .catch(() => false);

      // At least one should be visible
      expect(hasTable || hasEmptyState).toBeTruthy();
    });

    test('should navigate to case detail from in-progress list', async ({ page }) => {
      await page.goto('/cases/in-progress');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if there are any cases
      const firstCaseRow = page.locator('[data-testid^="case-row-"]').first();
      const hasCases = await firstCaseRow.isVisible().catch(() => false);

      if (hasCases) {
        // Click on the first case
        await firstCaseRow.click();

        // Should navigate to detail page
        await page.waitForURL(/\/cases\/\d+/);

        // Check detail page is loaded
        const detailPage = page.locator('[data-testid="case-detail-page"]');
        await expect(detailPage).toBeVisible();
      } else {
        test.skip(true, 'No in-progress cases available to test detail navigation');
      }
    });
  });

  test.describe('To Review Cases Page', () => {
    test('should display to review cases page', async ({ page }) => {
      await page.goto('/cases/to-review');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Check page title
      await expect(page.locator('h1')).toContainText('Cases To Review');

      // Check description
      const description = page.locator(
        'text=Cases with processed documents that need your review and attention.',
      );
      await expect(description).toBeVisible();
    });

    test('should display to review cases or empty state', async ({ page }) => {
      await page.goto('/cases/to-review');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for either table or empty state
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyState = await page
        .locator('text=No cases to review')
        .isVisible()
        .catch(() => false);

      // At least one should be visible
      expect(hasTable || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Navigation Between Filtered Pages', () => {
    test('should navigate from main cases to filtered pages via stat cards', async ({ page }) => {
      // Start on main cases page
      await page.goto('/cases');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Find and click "Closed Cases" stat card
      const closedCard = page.locator('[href="/cases/closed"]').first();
      const hasClosedCard = await closedCard.isVisible().catch(() => false);

      if (hasClosedCard) {
        await closedCard.click();
        await page.waitForURL(/\/cases\/closed/);
        await expect(page.locator('h1')).toContainText('Closed Cases');
      }

      // Go back to main cases page
      await page.goto('/cases');
      await page.waitForTimeout(1500);

      // Find and click "In Progress" stat card
      const inProgressCard = page.locator('[href="/cases/in-progress"]').first();
      const hasProgressCard = await inProgressCard.isVisible().catch(() => false);

      if (hasProgressCard) {
        await inProgressCard.click();
        await page.waitForURL(/\/cases\/in-progress/);
        await expect(page.locator('h1')).toContainText('In Progress');
      }

      // Go back to main cases page
      await page.goto('/cases');
      await page.waitForTimeout(1500);

      // Find and click "To Review" stat card
      const toReviewCard = page.locator('[href="/cases/to-review"]').first();
      const hasReviewCard = await toReviewCard.isVisible().catch(() => false);

      if (hasReviewCard) {
        await toReviewCard.click();
        await page.waitForURL(/\/cases\/to-review/);
        await expect(page.locator('h1')).toContainText('To Review');
      }

      // At least one navigation should have worked
      expect(hasClosedCard || hasProgressCard || hasReviewCard).toBeTruthy();
    });
  });
});
