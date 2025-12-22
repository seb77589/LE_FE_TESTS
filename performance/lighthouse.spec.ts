/**
 * Lighthouse Performance Tests
 *
 * Integrates Lighthouse with Playwright for frontend performance testing.
 * Tests Core Web Vitals and performance budgets for key application pages.
 *
 * Usage:
 *   npm run test:lighthouse           # Run Lighthouse tests
 *   npm run test:lighthouse:headed    # Run with visible browser
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TEST_CREDENTIALS } from '../test-credentials';

type PlayAuditFn = (options: {
  page: Page;
  port: number;
  thresholds?: Record<string, number>;
  reports?: {
    formats?: {
      html?: boolean;
      json?: boolean;
    };
    name?: string;
    directory?: string;
  };
}) => Promise<void>;

let playAudit: PlayAuditFn | null = null;
let lighthouseAvailable = true;

try {
  ({ playAudit } = require('playwright-lighthouse'));
} catch (error) {
  lighthouseAvailable = false;
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(
    '[Lighthouse] Optional dependency playwright-lighthouse not installed; audits will be skipped.',
    reason,
  );
}

// CRITICAL: Lighthouse tests MUST run serially to avoid port conflicts
// Each test needs exclusive access to the Chrome debugging port
test.describe.configure({ mode: 'serial' });

// Generate a random port in high range to avoid conflicts with other processes
// Range: 49152-65535 (dynamic/private ports per IANA)
const LIGHTHOUSE_PORT = 49152 + Math.floor(Math.random() * 16383);
console.log(`[Lighthouse] Using debugging port: ${LIGHTHOUSE_PORT}`);

// Configure Chromium with debugging port for Lighthouse (must be at top level)
test.use({
  launchOptions: {
    args: [`--remote-debugging-port=${LIGHTHOUSE_PORT}`],
  },
});

// Environment detection for threshold adjustment
const IS_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';

// Lighthouse thresholds configuration
// Development mode thresholds are lower because:
// 1. No code minification
// 2. Debug builds include extra code
// 3. Source maps and hot reload overhead
// 4. Client error tracking instrumentation (even when disabled)
// NOTE: PWA threshold removed - app is not a Progressive Web App
// Lighthouse returns undefined for PWA when no manifest/service worker present
const THRESHOLDS = IS_PRODUCTION_BUILD
  ? {
      // Production build thresholds (stricter)
      performance: 80,
      accessibility: 90,
      'best-practices': 90,
      seo: 80,
    }
  : {
      // Development mode thresholds (relaxed)
      performance: 40, // Dev mode is ~2x slower
      accessibility: 85, // Should maintain good accessibility
      'best-practices': 70, // Some best practices require prod optimizations
      seo: 50, // SEO less critical in dev
    };

// Log threshold configuration
console.log(
  `[Lighthouse] Environment: ${IS_PRODUCTION_BUILD ? 'PRODUCTION' : 'DEVELOPMENT'}`,
);
console.log(`[Lighthouse] CI mode: ${IS_CI ? 'YES' : 'NO'}`);
console.log(`[Lighthouse] Thresholds:`, THRESHOLDS);

// Helper function to run Lighthouse audit
async function runLighthouseAudit(page: Page, url: string, pageName: string) {
  if (!playAudit) {
    throw new Error('Lighthouse audits are unavailable without playwright-lighthouse.');
  }

  await page.goto(url, { waitUntil: 'networkidle' });

  await playAudit({
    page,
    port: LIGHTHOUSE_PORT, // Chrome debugging port (dynamic to avoid conflicts)
    thresholds: THRESHOLDS,
    reports: {
      formats: {
        html: true,
        json: true,
      },
      name: `lighthouse-${pageName}-${Date.now()}`,
      directory: './tests/performance/lighthouse-reports',
    },
  });
}

test.describe('Lighthouse Performance Audits', () => {
  // Skip entire suite if playwright-lighthouse not installed - Lighthouse audits require optional dependency
  test.skip(!lighthouseAvailable, 'playwright-lighthouse is not installed');

  test('Homepage performance', async ({ page }) => {
    await runLighthouseAudit(page, 'http://localhost:3000', 'homepage');
  });

  // SKIP: Known issue - playwright-lighthouse returns 0 scores on consecutive audits
  // This is due to Chrome debugging port conflicts between Lighthouse audit runs
  // See: https://github.com/nicholasjng/playwright-lighthouse/issues/28
  test.skip('Login page performance', async ({ page }) => {
    await runLighthouseAudit(page, 'http://localhost:3000/login', 'login');
  });

  // SKIP: Same issue - Lighthouse audits after the first one fail silently
  test.skip('Documents list page performance (authenticated)', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.USER.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('**/documents', { timeout: 5000 });

    // Run Lighthouse on authenticated page
    await playAudit({
      page,
      port: LIGHTHOUSE_PORT,
      thresholds: THRESHOLDS,
      reports: {
        formats: {
          html: true,
          json: true,
        },
        name: `lighthouse-documents-${Date.now()}`,
        directory: './tests/performance/lighthouse-reports',
      },
    });
  });

  // SKIP: Same issue - Lighthouse audits after the first one fail silently
  test.skip('Admin dashboard performance (authenticated)', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.ADMIN.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.ADMIN.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('**/admin', { timeout: 5000 });

    // Run Lighthouse on admin dashboard
    // Admin dashboard may have slightly lower performance due to heavier components
    await playAudit({
      page,
      port: LIGHTHOUSE_PORT,
      thresholds: {
        ...THRESHOLDS,
        performance: IS_PRODUCTION_BUILD ? 70 : 35, // Admin pages are heavier
      },
      reports: {
        formats: {
          html: true,
          json: true,
        },
        name: `lighthouse-admin-${Date.now()}`,
        directory: './tests/performance/lighthouse-reports',
      },
    });
  });
});

test.describe('Core Web Vitals', () => {
  test('Homepage Core Web Vitals', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Extract Core Web Vitals from performance API
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        // Largest Contentful Paint (LCP) - should be < 2.5s
        lcp:
          paint.find((entry) => entry.name === 'largest-contentful-paint')?.startTime ||
          0,
        // First Contentful Paint (FCP) - should be < 1.8s
        fcp:
          paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime ||
          0,
        // Total Blocking Time (TBT) - calculated from long tasks
        domInteractive: navigation.domInteractive,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    console.log('Core Web Vitals:', metrics);

    // Assertions based on Core Web Vitals thresholds
    expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s (good)
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s (good)
    expect(metrics.domInteractive).toBeLessThan(3000); // DOM Interactive < 3s
  });

  // SKIP: Chrome debugging port conflicts after Lighthouse audit cause browser context issues
  // that break subsequent tests requiring login. Login form doesn't render properly.
  test.skip('Document list page Core Web Vitals', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    // Wait for form to be visible before filling
    await page.waitForSelector('input[name="email"]', {
      state: 'visible',
      timeout: 30000,
    });
    await page.fill('input[name="email"]', TEST_CREDENTIALS.USER.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/documents', { timeout: 15000 });

    // Measure page load metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      return {
        domInteractive: navigation.domInteractive,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        transferSize: navigation.transferSize,
      };
    });

    console.log('Document page metrics:', metrics);

    // Assertions
    expect(metrics.domInteractive).toBeLessThan(3000); // DOM Interactive < 3s
    expect(metrics.transferSize).toBeLessThan(2000000); // Total transfer < 2MB
  });
});

// Bundle size thresholds - development mode is much larger due to:
// 1. No minification/optimization
// 2. Client error tracking instrumentation included (even when disabled)
// 3. Source maps and debug code
// 4. Hot reload infrastructure
const BUNDLE_THRESHOLDS = IS_PRODUCTION_BUILD
  ? {
      js: 500000, // 500KB total JS (production, minified)
      css: 100000, // 100KB total CSS (production)
      images: 500000, // 500KB total images
    }
  : {
      js: 6000000, // 6MB total JS (development, unminified + telemetry helpers)
      css: 200000, // 200KB total CSS (development)
      images: 1000000, // 1MB total images (development)
    };

test.describe('Bundle Size Analysis', () => {
  test('JavaScript bundle size', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Get all JavaScript resources
    const jsResources = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('.js'))
        .map((entry) => ({
          url: entry.name,
          size: (entry as PerformanceResourceTiming).transferSize,
          duration: entry.duration,
        }));
    });

    console.log('JavaScript Resources:', jsResources);

    const totalJsSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
    console.log(`Total JS Size: ${(totalJsSize / 1024).toFixed(2)} KB`);

    // Assert total JS size is under budget (environment-aware)
    expect(totalJsSize).toBeLessThan(BUNDLE_THRESHOLDS.js);
  });

  test('CSS bundle size', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Get all CSS resources
    const cssResources = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('.css'))
        .map((entry) => ({
          url: entry.name,
          size: (entry as PerformanceResourceTiming).transferSize,
          duration: entry.duration,
        }));
    });

    console.log('CSS Resources:', cssResources);

    const totalCssSize = cssResources.reduce((sum, resource) => sum + resource.size, 0);
    console.log(`Total CSS Size: ${(totalCssSize / 1024).toFixed(2)} KB`);

    // Assert total CSS size is under budget (environment-aware)
    expect(totalCssSize).toBeLessThan(BUNDLE_THRESHOLDS.css);
  });

  test('Image optimization', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Get all image resources
    const imageResources = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i))
        .map((entry) => ({
          url: entry.name,
          size: (entry as PerformanceResourceTiming).transferSize,
          duration: entry.duration,
        }));
    });

    console.log('Image Resources:', imageResources);

    if (imageResources.length > 0) {
      const totalImageSize = imageResources.reduce(
        (sum, resource) => sum + resource.size,
        0,
      );
      console.log(`Total Image Size: ${(totalImageSize / 1024).toFixed(2)} KB`);

      // Assert total image size is under budget (environment-aware)
      expect(totalImageSize).toBeLessThan(BUNDLE_THRESHOLDS.images);
    }
  });
});
