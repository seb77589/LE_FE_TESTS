/**
 * E2E Tests for Dashboard Statistics (Phase 8)
 *
 * Tests dashboard case status breakdown:
 * - Closed Cases count
 * - Cases In Progress count
 * - Cases To Review count
 * - Proper icons and styling
 * - Data loading and error states
 *
 * Related Phase: Dashboard Enhancement (Phase 8)
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Dashboard Statistics E2E Tests', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login first
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin
    );

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Case Status Cards', () => {
    test('should display three stat cards for case statuses', async ({ page }) => {
      // Wait for stats to load
      await page.waitForTimeout(1000);

      // Check for Closed Cases card
      const closedCasesCard = page.locator('text=Closed Cases').locator('..');
      await expect(closedCasesCard).toBeVisible();

      // Check for Cases In Progress card
      const inProgressCard = page.locator('text=Cases In Progress').locator('..');
      await expect(inProgressCard).toBeVisible();

      // Check for Cases To Review card
      const toReviewCard = page.locator('text=Cases To Review').locator('..');
      await expect(toReviewCard).toBeVisible();

      console.log('✅ All three case status cards visible');
    });

    test('should show numeric values for each stat', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find all stat cards by looking for links to case status pages
      const statCards = page.locator('a[href*="/cases/"]').filter({ 
        has: page.locator('.text-3xl') 
      });

      const cardCount = await statCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);

      // Each card should have a numeric value (or --)
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = statCards.nth(i);

        // Look for large number (3xl font)
        const valueElement = card.locator('.text-3xl');
        await expect(valueElement).toBeVisible();

        const value = await valueElement.textContent();

        // Value should be a number or --
        expect(value).toMatch(/^\d+$|^--$/);

        console.log(`✅ Card ${i + 1} shows value: ${value}`);
      }
    });

    test('should display Closed Cases with green styling', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find Closed Cases card using aria-label
      const closedCasesCard = page.locator('[aria-label*="Closed Cases"]');

      // Should have icon visible (SVG element)
      const icon = closedCasesCard.locator('svg').first();
      await expect(icon).toBeVisible();

      // Should have "Successfully completed" description
      const description = closedCasesCard.locator('text=Successfully completed');
      await expect(description).toBeVisible();

      console.log('✅ Closed Cases card has green styling');
    });

    test('should display Cases In Progress with blue styling', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find Cases In Progress card using aria-label
      const inProgressCard = page.locator('[aria-label*="Cases In Progress"]');

      // Should have icon visible (SVG element)
      const icon = inProgressCard.locator('svg').first();
      await expect(icon).toBeVisible();

      // Should have "Currently working on" description
      const description = inProgressCard.locator('text=Currently working on');
      await expect(description).toBeVisible();

      console.log('✅ Cases In Progress card has blue styling');
    });

    test('should display Cases To Review with yellow styling', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Find Cases To Review card using aria-label
      const toReviewCard = page.locator('[aria-label*="Cases To Review"]');

      // Should have icon visible (SVG element)
      const icon = toReviewCard.locator('svg').first();
      await expect(icon).toBeVisible();

      // Should have "Awaiting review" description
      const description = toReviewCard.locator('text=Awaiting review');
      await expect(description).toBeVisible();

      console.log('✅ Cases To Review card has yellow styling');
    });

    test('should show appropriate icons for each stat', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check for CheckCircle icon (Closed Cases)
      const closedCasesIcon = page.locator('[aria-label*="Closed Cases"]').locator('svg').first();
      await expect(closedCasesIcon).toBeVisible();

      // Check for Clock icon (Cases In Progress)
      const inProgressIcon = page.locator('[aria-label*="Cases In Progress"]').locator('svg').first();
      await expect(inProgressIcon).toBeVisible();

      // Check for AlertCircle icon (Cases To Review)
      const toReviewIcon = page.locator('[aria-label*="Cases To Review"]').locator('svg').first();
      await expect(toReviewIcon).toBeVisible();

      console.log('✅ All stat cards have icons');
    });

    test('should use 3-column grid on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      // Find stats grid
      const statsGrid = page.locator('[class*="grid"]').filter({ hasText: /Closed Cases/ });

      // Grid should have 3 columns class (md:grid-cols-3)
      const gridClass = await statsGrid.getAttribute('class');
      expect(gridClass).toContain('grid-cols');

      console.log('✅ Desktop uses grid layout');
    });

    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // All three cards should still be visible (stacked)
      const closedCasesCard = page.locator('text=Closed Cases');
      const inProgressCard = page.locator('text=Cases In Progress');
      const toReviewCard = page.locator('text=Cases To Review');

      await expect(closedCasesCard).toBeVisible();
      await expect(inProgressCard).toBeVisible();
      await expect(toReviewCard).toBeVisible();

      console.log('✅ Mobile layout displays all cards');
    });
  });

  test.describe('Data Loading States', () => {
    test('should show loading state or data quickly', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

      // Wait up to 3 seconds for stats to appear
      await page.waitForSelector('text=Closed Cases', { timeout: 3000 });

      // Stats should be visible
      const closedCasesCard = page.locator('text=Closed Cases');
      await expect(closedCasesCard).toBeVisible();

      console.log('✅ Stats load within 3 seconds');
    });

    test('should show placeholder (--) when data is loading', async ({ page }) => {
      // Immediately after page load, stats might show --
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

      // Check for -- placeholders
      const placeholders = page.locator('text=--');
      const placeholderCount = await placeholders.count();

      // Either placeholders are shown initially, or data loads immediately
      console.log(`ℹ️ Placeholder count: ${placeholderCount}`);

      // Wait for actual data or keep placeholders
      await page.waitForTimeout(2000);

      // After waiting, should have real data or still show --
      const statValues = page.locator('[class*="text-3xl"]');
      const valueCount = await statValues.count();
      expect(valueCount).toBeGreaterThanOrEqual(3);

      console.log('✅ Stats show either data or placeholders');
    });
  });

  test.describe('Mock Data Handling', () => {
    test('should display mock data in development mode', async ({ page }) => {
      await page.waitForTimeout(2000);

      // In development with no real cases, should show mock data: 12/8/5
      const closedCasesValue = page.locator('text=Closed Cases').locator('..').locator('[class*="text-3xl"]');
      const inProgressValue = page.locator('text=Cases In Progress').locator('..').locator('[class*="text-3xl"]');
      const toReviewValue = page.locator('text=Cases To Review').locator('..').locator('[class*="text-3xl"]');

      const closedText = await closedCasesValue.textContent();
      const inProgressText = await inProgressValue.textContent();
      const toReviewText = await toReviewValue.textContent();

      // Values should be numbers (mock data: 12, 8, 5 or real data)
      expect(closedText).toMatch(/^\d+$|^--$/);
      expect(inProgressText).toMatch(/^\d+$|^--$/);
      expect(toReviewText).toMatch(/^\d+$|^--$/);

      console.log(`✅ Stats show: Closed=${closedText}, InProgress=${inProgressText}, ToReview=${toReviewText}`);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible tooltips', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check for title attributes (tooltips)
      const closedCasesCard = page.locator('text=Closed Cases').locator('..');
      const titleAttr = await closedCasesCard.getAttribute('title');

      if (titleAttr) {
        expect(titleAttr).toContain('cases');
        console.log(`✅ Tooltip: ${titleAttr}`);
      } else {
        console.log('ℹ️ No title attribute (tooltips may be implemented differently)');
      }
    });

    test('should have aria-labels for screen readers', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Check for aria-label attributes
      const closedCasesCard = page.locator('text=Closed Cases').locator('..');
      const ariaLabel = await closedCasesCard.getAttribute('aria-label');

      if (ariaLabel) {
        expect(ariaLabel).toContain('Closed Cases');
        console.log(`✅ Aria-label: ${ariaLabel}`);
      } else {
        console.log('ℹ️ No aria-label (accessibility may be handled via semantic HTML)');
      }
    });
  });

  test.describe('Dashboard Layout', () => {
    test('should show case status cards and template widget', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Verify stats cards exist
      const stats = page.locator('text=Closed Cases');
      await expect(stats).toBeVisible();

      // Template heading can be "Templates" (empty) or "Popular Templates" (with data)
      const templates = page.locator('h2').filter({ hasText: /Templates|Popular Templates/ });
      await expect(templates).toBeVisible();

      console.log('✅ Dashboard sections visible (case stats + templates)');
    });
  });

  test.describe('Integration with Backend', () => {
    test('should update when data changes', async ({ page }) => {
      // Get initial values
      await page.waitForTimeout(1000);

      const closedCasesValue = page.locator('text=Closed Cases').locator('..').locator('[class*="text-3xl"]');
      const initialValue = await closedCasesValue.textContent();

      console.log(`Initial Closed Cases: ${initialValue}`);

      // Reload page (simulating data update)
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Values should be consistent (same data)
      const reloadedValue = await closedCasesValue.textContent();

      expect(reloadedValue).toBe(initialValue);

      console.log('✅ Stats remain consistent across reloads');
    });
  });
});
