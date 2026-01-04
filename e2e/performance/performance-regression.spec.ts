/**
 * Performance Regression Testing
 *
 * Tests performance budgets and monitors for regressions
 * in page load times, component render times, and network requests.
 */

import { test, expect } from '../../fixtures/api-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_DATA } from '../../test-credentials';

// Performance budgets (in milliseconds) - Adjusted for development environment
const PERFORMANCE_BUDGETS = {
  pageLoad: 8000, // 8 seconds (more realistic for dev with monitoring)
  componentRender: 50, // 50ms (more realistic for dev)
  networkRequest: 5000, // 5 seconds (more realistic for dev)
  firstContentfulPaint: 3000, // 3 seconds (more realistic for dev)
  largestContentfulPaint: 6000, // 6 seconds (more realistic for dev)
};

test.describe('Performance Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearApplicationData(page);
  });

  test('should meet page load performance budget', async ({ page }) => {
    try {
      // Start performance monitoring
      const startTime = Date.now();

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Check if page load time is within budget
      expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);

      console.log(
        `Page load time: ${loadTime}ms (budget: ${PERFORMANCE_BUDGETS.pageLoad}ms)`,
      );

      // Verify page is functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'page-load-performance-failed');
      throw error;
    }
  });

  test('should meet first contentful paint budget', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        return {
          firstContentfulPaint: paint.find((p) => p.name === 'first-contentful-paint')
            ?.startTime,
          firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime,
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        };
      });

      // Check first contentful paint
      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(
          PERFORMANCE_BUDGETS.firstContentfulPaint,
        );
        console.log(
          `First Contentful Paint: ${metrics.firstContentfulPaint}ms (budget: ${PERFORMANCE_BUDGETS.firstContentfulPaint}ms)`,
        );
      }

      // Check first paint
      if (metrics.firstPaint) {
        console.log(`First Paint: ${metrics.firstPaint}ms`);
      }

      // Check DOM content loaded
      if (metrics.domContentLoaded) {
        expect(metrics.domContentLoaded).toBeLessThan(1000); // 1 second budget
        console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
      }
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'fcp-performance-failed');
      throw error;
    }
  });

  test('should meet network request performance budget', async ({ page }) => {
    try {
      const networkRequests: any[] = [];

      // Monitor network requests
      page.on('response', (response) => {
        const request = response.request();
        const url = request.url();

        // Only track API requests and static assets
        if (url.includes('/api/') || url.includes('/_next/static/')) {
          networkRequests.push({
            url,
            method: request.method(),
            status: response.status(),
            startTime: Date.now(),
          });
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check network request performance
      for (const request of networkRequests) {
        const endTime = Date.now();
        const duration = endTime - request.startTime;

        // Only check requests that took longer than 100ms (ignore very fast requests)
        if (duration > 100) {
          expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.networkRequest);
          console.log(
            `Network request ${request.method} ${request.url}: ${duration}ms (budget: ${PERFORMANCE_BUDGETS.networkRequest}ms)`,
          );
        }
      }
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'network-performance-failed');
      throw error;
    }
  });

  test('should handle large forms without performance degradation', async ({
    page,
  }) => {
    try {
      // Navigate to register page (which has a larger form)
      await page.goto('/auth/register');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Measure form interaction performance
      const startTime = Date.now();

      // Fill form fields
      await page.fill('input[name="full_name"]', 'Test User');
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
      await page.fill('input[name="confirmPassword"]', TEST_DATA.PASSWORD.VALID);

      const formFillTime = Date.now() - startTime;

      // Form filling should be fast (under 500ms)
      expect(formFillTime).toBeLessThan(500);

      console.log(`Form fill time: ${formFillTime}ms`);

      // Check if form is responsive
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'form-performance-failed');
      throw error;
    }
  });

  test('should handle multiple page navigations efficiently', async ({ page }) => {
    try {
      const navigationTimes: number[] = [];

      // Test navigation between auth pages
      const pages = ['/auth/login', '/auth/register'];

      for (const pagePath of pages) {
        const startTime = Date.now();

        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        const navigationTime = Date.now() - startTime;
        navigationTimes.push(navigationTime);

        console.log(`Navigation to ${pagePath}: ${navigationTime}ms`);

        // Each navigation should be fast
        expect(navigationTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
      }

      // Average navigation time should be reasonable
      const avgNavigationTime =
        navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(avgNavigationTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);

      console.log(`Average navigation time: ${avgNavigationTime}ms`);
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'navigation-performance-failed');
      throw error;
    }
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Get memory usage
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (memoryInfo) {
        console.log('Memory usage:', {
          usedJSHeapSize: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          totalJSHeapSize: `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(
            2,
          )} MB`,
          jsHeapSizeLimit: `${(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(
            2,
          )} MB`,
        });

        // Check if memory usage is reasonable (less than 50MB for a simple page)
        const usedMemoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        if (!isNaN(usedMemoryMB)) {
          expect(usedMemoryMB).toBeLessThan(50);
        } else {
          console.log('Memory info not available in this browser environment');
        }
      }

      // Perform some interactions to test memory stability
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      // Get memory usage after interactions
      const memoryInfoAfter = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (
        memoryInfoAfter &&
        memoryInfo &&
        memoryInfoAfter.usedJSHeapSize &&
        memoryInfo.usedJSHeapSize &&
        !isNaN(memoryInfoAfter.usedJSHeapSize) &&
        !isNaN(memoryInfo.usedJSHeapSize)
      ) {
        const memoryIncrease =
          (memoryInfoAfter.usedJSHeapSize - memoryInfo.usedJSHeapSize) / 1024 / 1024;
        console.log(
          `Memory increase after interactions: ${memoryIncrease.toFixed(2)} MB`,
        );

        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10);
      } else {
        console.log('Memory info not available in this browser environment');
        // Reason: Memory API not available in this browser environment
        test.skip(true, 'Memory API not available in this browser environment');
      }
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'memory-performance-failed');
      throw error;
    }
  });

  test('should handle concurrent user interactions efficiently', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Simulate rapid user interactions
      const startTime = Date.now();

      // Rapidly fill and clear form fields
      // Extract email domain from TEST_USER_EMAIL environment variable
      // Validated by test-credentials.ts import
      if (!process.env.TEST_USER_EMAIL) {
        throw new Error(
          'TEST_USER_EMAIL environment variable is required. Please configure it in config/.env',
        );
      }
      const testUserEmail = process.env.TEST_USER_EMAIL;
      const emailDomain = testUserEmail.split('@')[1];
      if (!emailDomain) {
        throw new Error(
          `Invalid TEST_USER_EMAIL format: ${testUserEmail}. Expected format: user@domain.com`,
        );
      }
      for (let i = 0; i < 10; i++) {
        await page.fill('input[name="email"]', `test${i}@${emailDomain}`);
        // Use TEST_DATA.PASSWORD.VALID with suffix for uniqueness
        await page.fill('input[name="password"]', `${TEST_DATA.PASSWORD.VALID}${i}`);
        await page.fill('input[name="email"]', '');
        await page.fill('input[name="password"]', '');
      }

      const interactionTime = Date.now() - startTime;

      // Interactions should be fast and responsive
      expect(interactionTime).toBeLessThan(2000); // 2 seconds for 10 interactions

      console.log(`Concurrent interactions time: ${interactionTime}ms`);

      // Page should still be responsive
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'concurrent-interactions-failed');
      throw error;
    }
  });

  test('should handle error recovery without performance impact', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Simulate network errors
      await page.route('**/api/**', (route) => route.abort('failed'));

      const startTime = Date.now();

      // Try to submit form (will fail)
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
      await page.click('button[type="submit"]');

      // Wait for error handling
      await page.waitForTimeout(2000);

      const errorHandlingTime = Date.now() - startTime;

      // Error handling should be fast
      expect(errorHandlingTime).toBeLessThan(3000);

      console.log(`Error handling time: ${errorHandlingTime}ms`);

      // Page should still be functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'error-recovery-performance-failed');
      throw error;
    }
  });
});
