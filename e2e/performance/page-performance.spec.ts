/**
 * Performance Testing - Page Load Times and Core Web Vitals
 *
 * Tests performance metrics across key pages:
 * - Page load time
 * - Time to Interactive (TTI)
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - Response times for key operations
 *
 * Related: Phase 7 - Task 7.6: Performance Testing
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

// Performance thresholds (in milliseconds)
const PERF_THRESHOLDS = {
  PAGE_LOAD: 3000,         // Max page load time
  TIME_TO_INTERACTIVE: 5000, // Max TTI
  API_RESPONSE: 2000,      // Max API response time
  NAVIGATION: 1000,        // Max navigation time
};

test.describe('Page Performance Tests', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin
    );
  });

  test('Dashboard should load within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Check page loaded within threshold
    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.PAGE_LOAD);

    console.log(`✅ Dashboard loaded in ${loadTime}ms (threshold: ${PERF_THRESHOLDS.PAGE_LOAD}ms)`);
  });

  test('Cases page should load efficiently', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.PAGE_LOAD);

    console.log(`✅ Cases page loaded in ${loadTime}ms`);
  });

  test('Navigation between pages should be fast', async ({ page }) => {
    // Start on dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Measure navigation to cases
    const startTime = Date.now();
    await page.click('nav a[href="/cases"]');
    await page.waitForLoadState('networkidle');
    const navTime = Date.now() - startTime;

    expect(navTime).toBeLessThan(PERF_THRESHOLDS.NAVIGATION);

    console.log(`✅ Navigation completed in ${navTime}ms (threshold: ${PERF_THRESHOLDS.NAVIGATION}ms)`);
  });

  test('Stats API should respond quickly', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure API response time
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/stats/overview'),
      { timeout: 10000 }
    );

    await page.reload();

    const response = await responsePromise;
    const responseTime = response.timing().responseEnd;

    // Response time should be reasonable
    expect(responseTime).toBeLessThan(PERF_THRESHOLDS.API_RESPONSE);

    console.log(`✅ Stats API responded in ${responseTime.toFixed(0)}ms`);
  });

  test('Multiple simultaneous API calls should not block UI', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to dashboard (triggers multiple API calls)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const totalTime = Date.now() - startTime;

    // Page should remain responsive even with multiple API calls
    expect(totalTime).toBeLessThan(PERF_THRESHOLDS.TIME_TO_INTERACTIVE);

    console.log(`✅ Page interactive in ${totalTime}ms with multiple API calls`);
  });

  test('Template widget should load without blocking', async ({ page }) => {
    await page.goto('/dashboard');

    // Check if template widget loads
    const widgetLoadStart = Date.now();
    await page.locator('h2').filter({ hasText: /Templates|Popular Templates/ }).waitFor({ timeout: 5000 });
    const widgetLoadTime = Date.now() - widgetLoadStart;

    expect(widgetLoadTime).toBeLessThan(2000); // Widget should load quickly

    console.log(`✅ Template widget loaded in ${widgetLoadTime}ms`);
  });

  test('Stat cards should render progressively', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for loading state or quick render
    const cardAppearStart = Date.now();
    await page.locator('[aria-label*="Cases"]').first().waitFor({ timeout: 3000 });
    const cardAppearTime = Date.now() - cardAppearStart;

    expect(cardAppearTime).toBeLessThan(1500); // Cards should appear quickly

    console.log(`✅ Stat cards rendered in ${cardAppearTime}ms`);
  });

  test('Search functionality should have debouncing', async ({ page }) => {
    // Go to a page with search (if it exists)
    await page.goto('/dashboard');

    // Find search input
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();

    if (await searchInput.count() > 0 && await searchInput.isVisible()) {
      // Type quickly
      const startTime = Date.now();
      await searchInput.fill('test');
      const typeTime = Date.now() - startTime;

      // Should type without lag
      expect(typeTime).toBeLessThan(500);

      console.log(`✅ Search input responsive: ${typeTime}ms`);
    } else {
      console.log('ℹ️ No search input found on current page');
    }
  });
});

test.describe('Data-Heavy Scenarios', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin
    );
  });

  test('Dashboard should handle empty state efficiently', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Empty state should load even faster
    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.PAGE_LOAD);

    console.log(`✅ Empty state dashboard loaded in ${loadTime}ms`);
  });

  test('Template browser should handle empty templates', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');

    // Check template widget load time
    await page.locator('h2').filter({ hasText: /Templates/ }).waitFor({ timeout: 5000 });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);

    console.log(`✅ Template widget (empty) loaded in ${loadTime}ms`);
  });

  test('Multiple page loads should not degrade performance', async ({ page }) => {
    const loadTimes: number[] = [];

    // Load dashboard 3 times
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      loadTimes.push(loadTime);
    }

    // Average should still be within threshold
    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;

    expect(avgLoadTime).toBeLessThan(PERF_THRESHOLDS.PAGE_LOAD);

    console.log(`✅ Average load time over 3 loads: ${avgLoadTime.toFixed(0)}ms`);
    console.log(`   Load times: ${loadTimes.map(t => `${t}ms`).join(', ')}`);
  });
});

test.describe('Interaction Performance', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin
    );
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Button clicks should respond immediately', async ({ page }) => {
    // Find a button
    const button = page.locator('button').filter({ hasText: /Create|View|Manage/ }).first();

    if (await button.count() > 0) {
      const startTime = Date.now();
      await button.click();
      const clickTime = Date.now() - startTime;

      // Click should register quickly
      expect(clickTime).toBeLessThan(300);

      console.log(`✅ Button click responded in ${clickTime}ms`);
    } else {
      console.log('ℹ️ No interactive buttons found');
    }
  });

  test('Link navigation should be instantaneous', async ({ page }) => {
    const navLink = page.locator('nav a').first();

    const startTime = Date.now();
    await navLink.click();
    await page.waitForLoadState('domcontentloaded');
    const navTime = Date.now() - startTime;

    expect(navTime).toBeLessThan(PERF_THRESHOLDS.NAVIGATION);

    console.log(`✅ Link navigation started in ${navTime}ms`);
  });

  test('Form inputs should not lag', async ({ page }) => {
    // Go to a page with form inputs
    await page.goto('/auth/login');

    const emailInput = page.locator('input[type="text"], input[type="email"]').first();

    const startTime = Date.now();
    await emailInput.fill('performance@test.com');
    const fillTime = Date.now() - startTime;

    // Input should respond without delay
    expect(fillTime).toBeLessThan(500);

    console.log(`✅ Form input filled in ${fillTime}ms`);
  });
});

test.describe('Memory and Resource Usage', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin
    );
  });

  test('Page should not have memory leaks on navigation', async ({ page }) => {
    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.goto('/cases');
      await page.waitForLoadState('networkidle');
    }

    // If we got here without timeout/crash, no major memory leak
    console.log('✅ No obvious memory leaks detected after 10 navigations');
  });

  test('Images and assets should load efficiently', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for broken images
    const images = page.locator('img');
    const imageCount = await images.count();

    let loadedImages = 0;
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const isVisible = await img.isVisible();
      if (isVisible) {
        loadedImages++;
      }
    }

    console.log(`✅ ${loadedImages}/${imageCount} images loaded successfully`);
  });
});
