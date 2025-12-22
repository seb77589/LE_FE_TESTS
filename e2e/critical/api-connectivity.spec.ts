/**
 * API Connectivity Regression Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 *
 * These tests ensure that the frontend can successfully connect to the backend API
 * and prevent regressions in API endpoint resolution, CORS, and TLS configuration.
 */

import { test, expect } from '../../fixtures/auth-fixture';

test.describe('API Connectivity', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Store console errors for later assertions
    (page as any).consoleErrors = consoleErrors;
  });

  test('should resolve API base URL correctly', async ({ page }) => {
    await page.goto('/');

    // Check that the API configuration is resolved correctly
    const apiConfig = await page.evaluate(() => {
      // Access the API config from the global scope if available
      return (window as any).__API_CONFIG__ || null;
    });

    // At minimum, verify no obvious misconfigurations
    const currentOrigin = await page.evaluate(() => window.location.origin);

    // If API config is available, verify it's not pointing to localhost when accessed remotely
    if (apiConfig?.baseURL) {
      const apiUrl = new URL(apiConfig.baseURL);
      const currentUrl = new URL(currentOrigin);

      // If accessing from a non-localhost origin, API should not point to localhost
      if (!['localhost', '127.0.0.1'].includes(currentUrl.hostname)) {
        expect(['localhost', '127.0.0.1']).not.toContain(apiUrl.hostname);
      }
    }
  });

  test('should successfully connect to backend health endpoint', async ({ page }) => {
    // Navigate to a page that triggers health checks
    await page.goto('/');

    // Wait for any initial API calls to complete
    await page.waitForTimeout(2000);

    // Check for network errors in console
    const consoleErrors = (page as any).consoleErrors as string[];
    const networkErrors = consoleErrors.filter(
      (error) =>
        error.includes('ERR_NETWORK') ||
        error.includes('ECONNREFUSED') ||
        error.includes('CORS') ||
        error.includes('MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT'),
    );

    // Log any network errors for debugging
    if (networkErrors.length > 0) {
      console.log('Network errors detected:', networkErrors);
    }

    // In a properly configured environment, there should be no network connectivity errors
    // Note: We allow some errors in development but not the critical ones that block login
    const criticalErrors = networkErrors.filter(
      (error) => error.includes('ERR_NETWORK') || error.includes('ECONNREFUSED'),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle login API call without network errors', async ({ page, workerCredentials }) => {
    // Monitor network requests
    const apiRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });

    const apiResponses: any[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Navigate to login page
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Fill and submit login form using environment credentials
    await page.fill('input[name="email"]', workerCredentials.email);
    await page.fill('input[name="password"]', workerCredentials.password);
    await page.click('button[type="submit"]');

    // Wait for API response
    await page.waitForTimeout(3000);

    // Check that we made API requests
    expect(apiRequests.length).toBeGreaterThan(0);

    // Check that we got responses (successful or failed, but no network errors)
    expect(apiResponses.length).toBeGreaterThan(0);

    console.log(
      `✅ Login API call completed - ${apiRequests.length} requests, ${apiResponses.length} responses`,
    );
  });

  test('should not have CORS errors for API calls', async ({ page }) => {
    await page.goto('/auth/login');

    // Wait for page to load and any initial API calls
    await page.waitForTimeout(2000);

    // Check for CORS-related console errors
    const consoleErrors = (page as any).consoleErrors as string[];
    const corsErrors = consoleErrors.filter(
      (error) =>
        error.toLowerCase().includes('cors') ||
        error.includes('Cross-Origin Request Blocked') ||
        error.includes('Access-Control-Allow-Origin'),
    );

    if (corsErrors.length > 0) {
      console.log('CORS errors detected:', corsErrors);
    }

    // In a properly configured environment, there should be no CORS errors
    expect(corsErrors).toHaveLength(0);
  });
});
