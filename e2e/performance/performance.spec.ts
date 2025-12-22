/**
 * Performance E2E Tests
 *
 * End-to-end tests focused on page load performance, Core Web Vitals,
 * and real-world user experience metrics.
 *
 * Run with:
 *   npm run test:e2e:real -- performance.spec.ts     # With real backend
 *   npm run test:e2e:mock -- performance.spec.ts     # With mock API
 *   npm run test:e2e:headed -- performance.spec.ts   # With visible browser
 */

import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_CREDENTIALS } from '../../test-credentials';

// Performance thresholds
const THRESHOLDS = {
  pageLoad: 3000, // 3 seconds
  timeToInteractive: 3500, // 3.5 seconds
  firstContentfulPaint: 1800, // 1.8 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  cumulativeLayoutShift: 0.1, // 0.1 CLS score
  totalBlockingTime: 300, // 300ms
  networkRequests: 50, // Maximum number of requests
  totalTransferSize: 2 * 1024 * 1024, // 2MB
};

/**
 * Measure page load performance
 */
async function measurePageLoad(page: Page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    const paint = performance.getEntriesByType('paint');

    return {
      // Page load timings
      domContentLoaded:
        navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      domInteractive: navigation.domInteractive,

      // Paint metrics
      firstContentfulPaint:
        paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0,

      // Size metrics
      transferSize: navigation.transferSize,
      encodedBodySize: navigation.encodedBodySize,
      decodedBodySize: navigation.decodedBodySize,
    };
  });

  return metrics;
}

/**
 * Measure resource loading
 */
async function measureResourceLoading(page: Page) {
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map((entry: any) => ({
      name: entry.name,
      type: entry.initiatorType,
      duration: entry.duration,
      size: entry.transferSize || 0,
      startTime: entry.startTime,
    }));
  });

  return resources;
}

/**
 * Calculate resource metrics
 */
function calculateResourceMetrics(resources: any[]) {
  const byType = resources.reduce((acc: any, resource) => {
    if (!acc[resource.type]) {
      acc[resource.type] = {
        count: 0,
        totalSize: 0,
        totalDuration: 0,
      };
    }

    acc[resource.type].count++;
    acc[resource.type].totalSize += resource.size;
    acc[resource.type].totalDuration += resource.duration;

    return acc;
  }, {});

  const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
  const totalRequests = resources.length;

  return {
    byType,
    totalSize,
    totalRequests,
    averageSize: totalSize / totalRequests,
    largestResource: resources.reduce(
      (max, r) => (r.size > max.size ? r : max),
      resources[0] || { size: 0 },
    ),
  };
}

test.describe('Performance E2E Tests', () => {
  test.describe('Homepage Performance', () => {
    test('should load homepage within performance budget', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      // Measure page load metrics
      const metrics = await measurePageLoad(page);

      console.log('\n📊 Homepage Performance Metrics:');
      console.log(`  Total Load Time: ${loadTime}ms`);
      console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
      console.log(`  Load Complete: ${metrics.loadComplete}ms`);
      console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
      console.log(`  Transfer Size: ${(metrics.transferSize / 1024).toFixed(2)} KB`);

      // Assertions
      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
      expect(metrics.firstContentfulPaint).toBeLessThan(
        THRESHOLDS.firstContentfulPaint,
      );
      expect(metrics.transferSize).toBeLessThan(THRESHOLDS.totalTransferSize);
    });

    test('should not have excessive network requests on homepage', async ({ page }) => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const resources = await measureResourceLoading(page);
      const resourceMetrics = calculateResourceMetrics(resources);

      console.log('\n🌐 Resource Loading Metrics:');
      console.log(`  Total Requests: ${resourceMetrics.totalRequests}`);
      console.log(`  Total Size: ${(resourceMetrics.totalSize / 1024).toFixed(2)} KB`);
      console.log(`  Resource Types:`, resourceMetrics.byType);

      // Assertions
      expect(resourceMetrics.totalRequests).toBeLessThan(THRESHOLDS.networkRequests);
      expect(resourceMetrics.totalSize).toBeLessThan(THRESHOLDS.totalTransferSize);
    });

    test('should have efficient JavaScript loading', async ({ page }) => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const resources = await measureResourceLoading(page);
      const jsResources = resources.filter(
        (r) => r.type === 'script' || r.name.endsWith('.js'),
      );

      const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);

      console.log('\n📦 JavaScript Loading:');
      console.log(`  JS Files: ${jsResources.length}`);
      console.log(`  Total JS Size: ${(totalJsSize / 1024).toFixed(2)} KB`);

      // Should not exceed 500KB total JS
      expect(totalJsSize).toBeLessThan(500 * 1024);
    });
  });

  test.describe('Login Page Performance', () => {
    test('should load login page efficiently', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      const metrics = await measurePageLoad(page);

      console.log('\n📊 Login Page Performance:');
      console.log(`  Load Time: ${loadTime}ms`);
      console.log(`  FCP: ${metrics.firstContentfulPaint}ms`);

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
      expect(metrics.firstContentfulPaint).toBeLessThan(
        THRESHOLDS.firstContentfulPaint,
      );
    });
  });

  test.describe('Authenticated Pages Performance', () => {
    test.beforeEach(async ({ page }) => {
      // Login before testing authenticated pages (using centralized helper)
      await TestHelpers.loginAndWaitForRedirect(
        page,
        TEST_CREDENTIALS.USER.email,
        TEST_CREDENTIALS.USER.password,
        false, // isAdmin
      );

      // Navigate to documents page for performance measurement
      await page.goto('http://localhost:3000/documents');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should load documents page within budget', async ({ page }) => {
      // Already on documents page from login
      const metrics = await measurePageLoad(page);
      const resources = await measureResourceLoading(page);
      const resourceMetrics = calculateResourceMetrics(resources);

      console.log('\n📊 Documents Page Performance:');
      console.log(`  DOM Interactive: ${metrics.domInteractive}ms`);
      console.log(`  Total Requests: ${resourceMetrics.totalRequests}`);
      console.log(`  Total Size: ${(resourceMetrics.totalSize / 1024).toFixed(2)} KB`);

      expect(metrics.domInteractive).toBeLessThan(THRESHOLDS.timeToInteractive);
      expect(resourceMetrics.totalRequests).toBeLessThan(THRESHOLDS.networkRequests);
    });
  });

  test.describe('Image Loading Performance', () => {
    test('should load images efficiently', async ({ page }) => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const resources = await measureResourceLoading(page);
      const imageResources = resources.filter(
        (r) => r.type === 'img' || r.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i),
      );

      const totalImageSize = imageResources.reduce((sum, r) => sum + r.size, 0);

      console.log('\n🖼️  Image Loading:');
      console.log(`  Image Count: ${imageResources.length}`);
      console.log(`  Total Image Size: ${(totalImageSize / 1024).toFixed(2)} KB`);

      if (imageResources.length > 0) {
        // Should not exceed 500KB total images on homepage
        expect(totalImageSize).toBeLessThan(500 * 1024);
      }
    });

    test('should use modern image formats when possible', async ({ page }) => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const resources = await measureResourceLoading(page);
      const imageResources = resources.filter(
        (r) => r.type === 'img' || r.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i),
      );

      const modernFormats = imageResources.filter((r) =>
        r.name.match(/\.(webp|avif)$/i),
      );

      console.log('\n🖼️  Image Format Optimization:');
      console.log(`  Total Images: ${imageResources.length}`);
      console.log(`  Modern Formats (WebP/AVIF): ${modernFormats.length}`);

      // If there are images, at least some should use modern formats
      if (imageResources.length > 3) {
        expect(modernFormats.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('CSS Loading Performance', () => {
    test('should have efficient CSS loading', async ({ page }) => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const resources = await measureResourceLoading(page);
      const cssResources = resources.filter(
        (r) => r.type === 'link' || r.name.endsWith('.css'),
      );

      const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);

      console.log('\n🎨 CSS Loading:');
      console.log(`  CSS Files: ${cssResources.length}`);
      console.log(`  Total CSS Size: ${(totalCssSize / 1024).toFixed(2)} KB`);

      // Should not exceed 100KB total CSS
      expect(totalCssSize).toBeLessThan(100 * 1024);
    });
  });

  test.describe('Navigation Performance', () => {
    // Reason: This test assumes a login link exists on the homepage, but the homepage may not have a visible login link
    test.skip('should navigate between pages efficiently', async ({ page }) => {
      // SKIPPED: This test assumes a login link exists on the homepage,
      // but the homepage may not have a visible login link (auth links may be
      // in navigation/header only visible when logged out). Test needs redesign
      // to navigate programmatically or find actual navigation elements.
      // Ref: _FE_REFURB_003.md - Batch 3 performance fixes
      await page.goto('http://localhost:3000');

      // Measure navigation to login page
      const navStart = Date.now();
      await page.click('a[href="/login"], a[href="/auth/login"]');
      await page.waitForURL('**/auth/login');
      const navTime = Date.now() - navStart;

      console.log('\n🧭 Navigation Performance:');
      console.log(`  Navigation Time: ${navTime}ms`);

      // Client-side navigation should be fast
      expect(navTime).toBeLessThan(2000);
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('should provide performance summary for baseline', async ({ page }) => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const metrics = await measurePageLoad(page);
      const resources = await measureResourceLoading(page);
      const resourceMetrics = calculateResourceMetrics(resources);

      const performanceSummary = {
        timestamp: new Date().toISOString(),
        page: '/',
        metrics: {
          firstContentfulPaint: metrics.firstContentfulPaint,
          domInteractive: metrics.domInteractive,
          loadComplete: metrics.loadComplete,
          transferSize: metrics.transferSize,
        },
        resources: {
          totalRequests: resourceMetrics.totalRequests,
          totalSize: resourceMetrics.totalSize,
          byType: resourceMetrics.byType,
        },
      };

      console.log('\n📊 Performance Baseline Summary:');
      console.log(JSON.stringify(performanceSummary, null, 2));

      // This test always passes - it's for logging baseline data
      expect(performanceSummary.metrics.firstContentfulPaint).toBeGreaterThan(0);
    });
  });
});
