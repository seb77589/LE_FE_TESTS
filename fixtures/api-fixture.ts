import { test as base, TestInfo, expect as baseExpect } from '@playwright/test';
import { TEST_CREDENTIALS, PROFILE_TEST_CREDENTIALS } from '../test-credentials';

/**
 * Universal Playwright fixture for E2E testing against real backend.
 *
 * All tests run against the real backend at NEXT_PUBLIC_API_URL.
 * Mock mode has been removed to ensure tests validate real integration.
 *
 * Features:
 * - Per-worker credential isolation for parallel test execution
 * - Automatic credential assignment based on worker index
 * - Prevents credential conflicts between parallel workers
 * - Service health check utilities for reliable test startup
 * - Retry utilities for network resilience
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures/api-fixture';
 *
 *   test('my test', async ({ page, workerCredentials }) => {
 *     // workerCredentials automatically assigned based on worker index
 *     await page.fill('input[type="email"]', workerCredentials.email);
 *   });
 */

/**
 * Wait for backend service to be healthy before running tests.
 * Uses Playwright's toPass() for automatic retry with exponential backoff.
 *
 * @param request - Playwright APIRequestContext
 * @param timeout - Maximum time to wait for health check (default: 30s)
 */
export async function waitForBackendHealth(
  request: { get: (url: string) => Promise<{ ok: () => boolean; status: () => number }> },
  timeout = 30000,
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  await baseExpect(async () => {
    const response = await request.get(`${apiUrl}/api/v1/health`);
    baseExpect(response.ok()).toBeTruthy();
  }).toPass({
    timeout,
    intervals: [1000, 2000, 5000], // Retry at 1s, 2s, 5s intervals
  });
}

/**
 * Navigate to a page with retry logic for network issues.
 * Handles ERR_SOCKET_NOT_CONNECTED and similar transient errors.
 *
 * @param page - Playwright Page object
 * @param url - URL to navigate to
 * @param options - Navigation options
 * @param retries - Number of retry attempts (default: 3)
 */
export async function gotoWithRetry(
  page: { goto: (url: string, options?: object) => Promise<unknown>; waitForTimeout: (ms: number) => Promise<void> },
  url: string,
  options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {},
  retries = 3,
): Promise<void> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        timeout: options.timeout || 30000,
        waitUntil: options.waitUntil || 'networkidle',
      });
      return;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || '';

      // Retry only for network-related errors
      if (
        errorMessage.includes('ERR_SOCKET_NOT_CONNECTED') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('net::')
      ) {
        console.log(`[Retry ${i + 1}/${retries}] Navigation failed: ${errorMessage.slice(0, 100)}`);
        // Exponential backoff: 1s, 2s, 4s
        await page.waitForTimeout(1000 * Math.pow(2, i));
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw lastError;
}

// Prevent accidental mock mode usage - mock infrastructure has been removed
if (process.env.PLAYWRIGHT_MOCK === 'true') {
  throw new Error(
    'Mock mode has been removed in Phase 2. All E2E tests must run against the real Docker backend. ' +
      'Please ensure Docker services are running: docker compose up -d',
  );
}

// Worker credential pool for parallel test execution
// All credentials are validated from environment at import time
const WORKER_CREDENTIAL_POOL = [
  TEST_CREDENTIALS.USER, // Worker 0
  PROFILE_TEST_CREDENTIALS.USER_1, // Worker 1
  PROFILE_TEST_CREDENTIALS.USER_2, // Worker 2
  PROFILE_TEST_CREDENTIALS.USER_3, // Worker 3
  PROFILE_TEST_CREDENTIALS.USER_4, // Worker 4
  PROFILE_TEST_CREDENTIALS.USER_5, // Worker 5
  PROFILE_TEST_CREDENTIALS.USER_6, // Worker 6
  PROFILE_TEST_CREDENTIALS.USER_7, // Worker 7
];

// Profile test credentials map for worker isolation
const PROFILE_TEST_USER_MAP = [
  PROFILE_TEST_CREDENTIALS.USER_1,
  PROFILE_TEST_CREDENTIALS.USER_2,
  PROFILE_TEST_CREDENTIALS.USER_3,
  PROFILE_TEST_CREDENTIALS.USER_4,
  PROFILE_TEST_CREDENTIALS.USER_5,
  PROFILE_TEST_CREDENTIALS.USER_6,
  PROFILE_TEST_CREDENTIALS.USER_7,
  PROFILE_TEST_CREDENTIALS.USER_8,
  PROFILE_TEST_CREDENTIALS.USER_9,
  PROFILE_TEST_CREDENTIALS.USER_10,
  PROFILE_TEST_CREDENTIALS.USER_11,
  PROFILE_TEST_CREDENTIALS.USER_12,
  PROFILE_TEST_CREDENTIALS.USER_13,
  PROFILE_TEST_CREDENTIALS.USER_14,
];

export const test = base.extend<{
  workerCredentials: { email: string; password: string };
  profileWorkerCredentials: { email: string; password: string };
}>({
  // Default worker credentials using validated credential pool
  workerCredentials: async ({}, use, testInfo: TestInfo) => {
    // Assign unique credentials per worker using modulo rotation
    // All credentials are validated at import - fails fast if env vars missing
    const credentials =
      WORKER_CREDENTIAL_POOL[testInfo.parallelIndex % WORKER_CREDENTIAL_POOL.length];
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture 'use', not React's use hook
    await use(credentials);
  },

  // Profile-specific worker credentials (uses PROFILE_TEST_CREDENTIALS)
  profileWorkerCredentials: async ({}, use, testInfo: TestInfo) => {
    // Assign unique user per worker to prevent concurrent session invalidation
    const credentials =
      PROFILE_TEST_USER_MAP[testInfo.parallelIndex % PROFILE_TEST_USER_MAP.length];
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture 'use', not React's use hook
    await use(credentials);
  },

  page: async ({ page }, use) => {
    // Log API requests for easier debugging
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`[Test] API Request: ${request.method()} ${request.url()}`);
      }
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture 'use', not React's use hook
    await use(page);
  },
});

export { expect } from '@playwright/test';
