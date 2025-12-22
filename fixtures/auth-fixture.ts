/**
 * Auth Fixture - Worker-Specific Credentials with Role Information
 *
 * Extends api-fixture with enhanced credentials that include role information
 * (isAdmin, isSuperAdmin) for role-based test gating.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth-fixture';
 *
 *   test('my test', async ({ page, authCredentials }) => {
 *     // Use authCredentials instead of hardcoded TEST_CREDENTIALS
 *     await TestHelpers.loginAndWaitForRedirect(
 *       page,
 *       authCredentials.email,
 *       authCredentials.password,
 *       authCredentials.isAdmin
 *     );
 *   });
 *
 *   // For admin-only tests:
 *   test('admin test', async ({ page, authCredentials }) => {
 *     test.skip(!authCredentials.isAdmin, 'Test requires admin credentials');
 *     // ... test code
 *   });
 */

import { test as base } from '@playwright/test';
import {
  TEST_CREDENTIALS,
  WS_TEST_CREDENTIALS,
  PROFILE_TEST_CREDENTIALS,
} from '../test-credentials';

export type WorkerCredentials = {
  email: string;
  password: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  description: string;
};

type AuthFixtures = {
  workerCredentials: WorkerCredentials;
};

// Pool of unique credentials for parallel workers
// Each worker gets a dedicated user account to prevent session conflicts
const CREDENTIAL_POOL: WorkerCredentials[] = [
  // Worker 0: SuperAdmin (most common test user)
  {
    email: TEST_CREDENTIALS.SUPERADMIN.email,
    password: TEST_CREDENTIALS.SUPERADMIN.password,
    isAdmin: true,
    isSuperAdmin: true,
    description: 'SuperAdmin - Worker 0',
  },
  // Worker 1: Regular Admin
  {
    email: TEST_CREDENTIALS.ADMIN.email,
    password: TEST_CREDENTIALS.ADMIN.password,
    isAdmin: true,
    isSuperAdmin: false,
    description: 'Admin - Worker 1',
  },
  // Worker 2: Regular User
  {
    email: TEST_CREDENTIALS.USER.email,
    password: TEST_CREDENTIALS.USER.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'User - Worker 2',
  },
  // Worker 3: WebSocket User 1
  {
    email: WS_TEST_CREDENTIALS.USER_1.email,
    password: WS_TEST_CREDENTIALS.USER_1.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'WS User 1 - Worker 3',
  },
  // Worker 4: WebSocket User 2
  {
    email: WS_TEST_CREDENTIALS.USER_2.email,
    password: WS_TEST_CREDENTIALS.USER_2.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'WS User 2 - Worker 4',
  },
  // Worker 5: WebSocket User 3
  {
    email: WS_TEST_CREDENTIALS.USER_3.email,
    password: WS_TEST_CREDENTIALS.USER_3.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'WS User 3 - Worker 5',
  },
  // Worker 6: WebSocket Admin 1
  {
    email: WS_TEST_CREDENTIALS.ADMIN_1.email,
    password: WS_TEST_CREDENTIALS.ADMIN_1.password,
    isAdmin: true,
    isSuperAdmin: false,
    description: 'WS Admin 1 - Worker 6',
  },
  // Worker 7: WebSocket Admin 2
  {
    email: WS_TEST_CREDENTIALS.ADMIN_2.email,
    password: WS_TEST_CREDENTIALS.ADMIN_2.password,
    isAdmin: true,
    isSuperAdmin: false,
    description: 'WS Admin 2 - Worker 7',
  },
  // Worker 8: Profile User 1
  {
    email: PROFILE_TEST_CREDENTIALS.USER_1.email,
    password: PROFILE_TEST_CREDENTIALS.USER_1.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'Profile User 1 - Worker 8',
  },
  // Worker 9: Profile User 2
  {
    email: PROFILE_TEST_CREDENTIALS.USER_2.email,
    password: PROFILE_TEST_CREDENTIALS.USER_2.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'Profile User 2 - Worker 9',
  },
  // Worker 10: Profile User 3
  {
    email: PROFILE_TEST_CREDENTIALS.USER_3.email,
    password: PROFILE_TEST_CREDENTIALS.USER_3.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'Profile User 3 - Worker 10',
  },
  // Worker 11: Profile User 4
  {
    email: PROFILE_TEST_CREDENTIALS.USER_4.email,
    password: PROFILE_TEST_CREDENTIALS.USER_4.password,
    isAdmin: false,
    isSuperAdmin: false,
    description: 'Profile User 4 - Worker 11',
  },
];

export const test = base.extend<AuthFixtures>({
  /**
   * Provides unique credentials for each worker based on workerIndex
   * Rotates through credential pool if more workers than credentials
   */
  workerCredentials: [
    async ({}, use, workerInfo) => {
      // Assign credentials based on worker index (modulo pool size for rotation)
      const credentials =
        CREDENTIAL_POOL[workerInfo.workerIndex % CREDENTIAL_POOL.length];

      console.log(
        `[Worker ${workerInfo.workerIndex}] Using credentials: ${credentials.description}`,
      );

      await use(credentials);
    },
    { scope: 'worker' }, // Worker-scoped: each worker gets same credentials for all its tests
  ],
});

export { expect } from '@playwright/test';
