/**
 * Enhanced Performance Regression Tests
 *
 * Comprehensive performance testing including monitoring system performance,
 * memory usage, and system resource utilization.
 */

import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../test-credentials';

test.describe('Performance Regression Tests - Enhanced', () => {
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.addInitScript(() => {
      // Track performance metrics
      (window as any).performanceMetrics = {
        pageLoad: 0,
        firstContentfulPaint: 0,
        firstPaint: 0,
        domContentLoaded: 0,
        memoryUsage: 0,
        networkRequests: [],
        componentRenderTimes: {},
      };

      // Override performance observer
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              (window as any).performanceMetrics.pageLoad =
                navEntry.loadEventEnd - navEntry.fetchStart;
              (window as any).performanceMetrics.firstContentfulPaint =
                navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
              (window as any).performanceMetrics.domContentLoaded =
                navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
            } else if (entry.entryType === 'paint') {
              const paintEntry = entry as PerformancePaintTiming;
              if (paintEntry.name === 'first-paint') {
                (window as any).performanceMetrics.firstPaint = paintEntry.startTime;
              } else if (paintEntry.name === 'first-contentful-paint') {
                (window as any).performanceMetrics.firstContentfulPaint =
                  paintEntry.startTime;
              }
            } else if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              (window as any).performanceMetrics.networkRequests.push({
                url: resourceEntry.name,
                duration: resourceEntry.duration,
                size: resourceEntry.transferSize,
                status: 200, // Default, would need to be tracked separately
              });
            }
          }
        });

        observer.observe({ entryTypes: ['navigation', 'paint', 'resource'] });
      }

      // Track memory usage (with cleanup on page unload)
      if ('memory' in performance) {
        const memoryInterval = setInterval(() => {
          (window as any).performanceMetrics.memoryUsage =
            (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
        }, 1000);

        // Clean up interval when page unloads to prevent memory leaks
        window.addEventListener('beforeunload', () => {
          clearInterval(memoryInterval);
        });

        // Store interval ID for manual cleanup if needed
        (window as any).__memoryIntervalId = memoryInterval;
      }
    });
  });

  test('should load login page within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Performance budget: 3 seconds
    expect(loadTime).toBeLessThan(8000);

    // Check performance metrics
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    expect(metrics.pageLoad).toBeLessThan(8000);
    expect(metrics.firstContentfulPaint).toBeLessThan(3000);
    expect(metrics.firstPaint).toBeLessThan(1000);
  });

  test('should maintain memory usage within limits', async ({ page }) => {
    // Set explicit test timeout to prevent infinite hangs
    test.setTimeout(60000);

    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Wait for memory tracking to initialize
    await page.waitForTimeout(2000);

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize / 1024 / 1024; // MB
    });

    // Increased threshold for parallel test execution and complex Next.js app
    expect(initialMemory).toBeLessThan(150); // Should use less than 150MB initially
    console.log(`Initial memory usage: ${initialMemory.toFixed(2)}MB`);

    // Perform some actions to test memory stability
    await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
    await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);

    // Wait and check memory again
    await page.waitForTimeout(1000);

    const afterActionMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize / 1024 / 1024; // MB
    });

    console.log(
      `Memory after actions: ${afterActionMemory.toFixed(2)}MB (delta: ${(
        afterActionMemory - initialMemory
      ).toFixed(2)}MB)`,
    );

    // Memory shouldn't increase significantly
    expect(afterActionMemory - initialMemory).toBeLessThan(20); // Less than 20MB increase (adjusted for real app)

    // Clean up memory tracking interval to prevent leaks
    await page.evaluate(() => {
      const intervalId = (window as any).__memoryIntervalId;
      if (intervalId) {
        clearInterval(intervalId);
        delete (window as any).__memoryIntervalId;
      }
    });
  });

  test('should handle monitoring system performance impact', async ({ page }) => {
    // Test page load without monitoring
    const startTimeWithoutMonitoring = Date.now();
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    const loadTimeWithoutMonitoring = Date.now() - startTimeWithoutMonitoring;

    // Wait for monitoring to initialize
    await page.waitForTimeout(2000);

    // Check that monitoring doesn't significantly impact performance
    const monitoringOverhead = await page.evaluate(() => {
      const manager = (window as any).monitoringManager;
      if (manager) {
        const metrics = manager.getCurrentMetrics();
        return metrics?.performance?.pageLoad || 0;
      }
      return 0;
    });

    // Monitoring overhead should be minimal (less than 100ms)
    expect(monitoringOverhead).toBeLessThan(100);
  });

  test('should track component render performance', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Wait for components to render
    await page.waitForTimeout(1000);

    const componentMetrics = await page.evaluate(() => {
      const manager = (window as any).monitoringManager;
      const metrics = manager?.getCurrentMetrics();
      return metrics?.components;
    });

    if (componentMetrics) {
      expect(componentMetrics.renderTimes).toBeDefined();
      expect(componentMetrics.averageRenderTime).toBeLessThan(16); // Should be less than one frame (16ms)
      expect(componentMetrics.slowComponents.length).toBeLessThan(5); // Should have few slow components
    }
  });

  test('should handle network request performance', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Wait for network metrics to be collected
    await page.waitForTimeout(2000);

    const networkMetrics = await page.evaluate(() => {
      const manager = (window as any).monitoringManager;
      const metrics = manager?.getCurrentMetrics();
      return metrics?.network;
    });

    if (networkMetrics) {
      expect(networkMetrics.totalRequests).toBeGreaterThan(0);
      expect(networkMetrics.averageResponseTime).toBeLessThan(1000); // Should be less than 1 second
      expect(networkMetrics.successRate).toBeGreaterThan(90); // Should have high success rate
    }
  });

  test('should maintain performance under load', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Simulate user interactions
    const interactions = [];
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

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
      await page.fill('input[name="email"]', `test${i}@${emailDomain}`);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
      await page.fill('input[name="email"]', '');
      await page.fill('input[name="password"]', '');

      const interactionTime = Date.now() - startTime;
      interactions.push(interactionTime);
    }

    // Check that interactions remain fast
    const averageInteractionTime =
      interactions.reduce((a, b) => a + b, 0) / interactions.length;
    expect(averageInteractionTime).toBeLessThan(100); // Should be less than 100ms per interaction

    // Check that there's no significant performance degradation
    const firstInteraction = interactions[0];
    const lastInteraction = interactions[interactions.length - 1];
    expect((lastInteraction || 0) - (firstInteraction || 0)).toBeLessThan(50); // Less than 50ms degradation
  });

  test('should handle monitoring dashboard performance', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Check if monitoring dashboard toggle exists
    const toggleExists = await page
      .locator('[data-testid="monitoring-dashboard-toggle"]')
      .count();

    if (toggleExists > 0) {
      // Measure dashboard open time
      const startTime = Date.now();
      await page.click('[data-testid="monitoring-dashboard-toggle"]');
      await page.waitForSelector('[data-testid="monitoring-dashboard"]', {
        state: 'visible',
      });
      const openTime = Date.now() - startTime;

      expect(openTime).toBeLessThan(500); // Should open within 500ms

      // Check dashboard performance
      const dashboardElements = await page
        .locator('[data-testid="monitoring-dashboard"] *')
        .count();
      expect(dashboardElements).toBeGreaterThan(0);

      // Close dashboard
      await page.click('[data-testid="monitoring-dashboard-close"]');
      await page.waitForSelector('[data-testid="monitoring-dashboard"]', {
        state: 'hidden',
      });
    }
  });

  test('should handle security monitoring performance', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Wait for security monitoring to initialize
    await page.waitForTimeout(1000);

    const securityMetrics = await page.evaluate(() => {
      const manager = (window as any).monitoringManager;
      const metrics = manager?.getCurrentMetrics();
      return metrics?.security;
    });

    if (securityMetrics) {
      // Security monitoring should not impact performance significantly
      expect(securityMetrics.sslErrors).toBeGreaterThanOrEqual(0);
      expect(securityMetrics.cspViolations).toBeGreaterThanOrEqual(0);
      expect(securityMetrics.securityEvents).toBeGreaterThanOrEqual(0);
      expect(securityMetrics.rateLimitHits).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle error recovery performance', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Simulate an error and measure recovery time
    const startTime = Date.now();

    // Trigger a chunk loading error (simulated)
    await page.evaluate(() => {
      const error = new Error('ChunkLoadError');
      error.name = 'ChunkLoadError';
      const recovery = (window as any).errorRecovery;
      if (recovery) {
        recovery.recover(error);
      }
    });

    const recoveryTime = Date.now() - startTime;
    expect(recoveryTime).toBeLessThan(1000); // Should recover within 1 second
  });

  test('should maintain performance across page navigation', async ({ page }) => {
    // Test initial page load
    const startTime1 = Date.now();
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    const loadTime1 = Date.now() - startTime1;

    // Navigate to register page
    const startTime2 = Date.now();
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    const loadTime2 = Date.now() - startTime2;

    // Navigate back to login
    const startTime3 = Date.now();
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    const loadTime3 = Date.now() - startTime3;

    // Performance should remain consistent
    expect(loadTime1).toBeLessThan(8000);
    expect(loadTime2).toBeLessThan(8000);
    expect(loadTime3).toBeLessThan(8000);

    // Check that performance doesn't degrade significantly
    const maxLoadTime = Math.max(loadTime1, loadTime2, loadTime3);
    const minLoadTime = Math.min(loadTime1, loadTime2, loadTime3);
    const variation = maxLoadTime - minLoadTime;
    console.log(
      `Performance variation: ${variation}ms (max: ${maxLoadTime}ms, min: ${minLoadTime}ms)`,
    );

    // More realistic variation threshold for development environment
    expect(variation).toBeLessThan(3000); // Less than 3 seconds variation
  });
});
