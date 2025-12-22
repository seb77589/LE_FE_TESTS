import { test as base, TestInfo } from '@playwright/test';
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
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures/api-fixture';
 *
 *   test('my test', async ({ page, workerCredentials }) => {
 *     // workerCredentials automatically assigned based on worker index
 *     await page.fill('input[type="email"]', workerCredentials.email);
 *   });
 */

// Prevent accidental mock mode usage - mock infrastructure has been removed
if (process.env.PLAYWRIGHT_MOCK === 'true') {
  throw new Error(
    'Mock mode has been removed in Phase 2. All E2E tests must run against the real Docker backend. ' +
      'Please ensure Docker services are running: docker compose up -d',
  );
}

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
  // Default worker credentials (uses TEST_USER for worker 0, rotates for others)
  workerCredentials: async ({}, use, testInfo: TestInfo) => {
    // Use TEST_USER for first worker, or rotate through available test users
    const credentials =
      testInfo.parallelIndex === 0
        ? TEST_CREDENTIALS.USER
        : {
            email: `test_user_${testInfo.parallelIndex}@example.com`,
            password: TEST_CREDENTIALS.USER.password,
          };
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
