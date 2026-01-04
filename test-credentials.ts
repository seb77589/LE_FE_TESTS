/**
 * Test Credentials Configuration
 * Centralized configuration for all test credentials used in E2E tests (Playwright)
 *
 * CREDENTIAL SECURITY POLICY:
 * All test credentials MUST be loaded from environment variables in config/.env.
 * This file provides fail-fast validation - tests will exit immediately with
 * clear error messages if any required credentials are missing.
 *
 * WORKER ISOLATION:
 * - 12-worker credential pool prevents session conflicts in parallel execution
 * - Each worker gets unique credentials via modulo rotation
 * - Credentials include role metadata (isAdmin, isSuperAdmin) for test gating
 *
 * CREDENTIAL POOLS:
 * - TEST_CREDENTIALS: Basic roles (USER, ADMIN, SUPERADMIN)
 * - WS_TEST_CREDENTIALS: WebSocket parallel testing (7 unique users)
 * - PROFILE_TEST_CREDENTIALS: Profile change tests (14 unique users)
 * - PASSWORD_TEST_CREDENTIALS: Password change tests (5 unique users)
 *
 * See also:
 * - CLAUDE.md#test-credential-management-critical (Backend credential management)
 * - frontend/tests/jest-test-credentials.ts (Jest unit/integration tests)
 * - docs/testing/FRONTEND_TESTING_GUIDE.md (Complete testing guide)
 */

import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables (handles worker processes)
dotenv.config({
  path: path.resolve(__dirname, '..', '..', 'config', '.env'),
  override: false, // Don't override if already loaded by playwright.config
});

// Environment validation function
function validateTestEnvironment(): void {
  const requiredVars = [
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
    'SUPERADMIN_EMAIL', // Use actual database credentials
    'SUPERADMIN_PASSWORD',
    // WebSocket test credentials
    'WS_TEST_USER_1_EMAIL',
    'WS_TEST_USER_2_EMAIL',
    'WS_TEST_USER_3_EMAIL',
    'WS_TEST_ADMIN_1_EMAIL',
    'WS_TEST_ADMIN_2_EMAIL',
    'WS_TEST_ADMIN_3_EMAIL',
    'WS_TEST_SUPERADMIN_1_EMAIL',
    // Profile test credentials
    'PROFILE_TEST_USER_1_EMAIL',
    'PROFILE_TEST_USER_2_EMAIL',
    'PROFILE_TEST_USER_3_EMAIL',
    'PROFILE_TEST_USER_4_EMAIL',
    'PROFILE_TEST_USER_5_EMAIL',
    'PROFILE_TEST_USER_6_EMAIL',
    'PROFILE_TEST_USER_7_EMAIL',
    'PROFILE_TEST_USER_8_EMAIL',
    'PROFILE_TEST_USER_9_EMAIL',
    'PROFILE_TEST_USER_10_EMAIL',
    'PROFILE_TEST_USER_11_EMAIL',
    'PROFILE_TEST_USER_12_EMAIL',
    'PROFILE_TEST_USER_13_EMAIL',
    'PROFILE_TEST_USER_14_EMAIL',
    // Password change test credentials
    'PASSWORD_TEST_USER_1_EMAIL',
    'PASSWORD_TEST_USER_2_EMAIL',
    'PASSWORD_TEST_USER_3_EMAIL',
    'PASSWORD_TEST_USER_4_EMAIL',
    'PASSWORD_TEST_USER_5_EMAIL',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('ERROR: Missing required test environment variables:');
    missingVars.forEach((varName) => console.error(`  - ${varName}`));
    console.error('\nPlease ensure all test credentials are configured in config/.env');
    console.error(
      'See config/.env.example for the complete list of required variables.',
    );
    process.exit(1);
  }
}

// Validate environment on import
validateTestEnvironment();

// Test user credentials
export const TEST_CREDENTIALS = {
  // Regular test user
  USER: {
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  // Admin test user
  ADMIN: {
    email: process.env.TEST_ADMIN_EMAIL!,
    password: process.env.TEST_ADMIN_PASSWORD!,
  },

  // Superadmin user (uses actual database credentials seeded by backend)
  // NOTE: Backend creates this user on startup using SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD
  SUPERADMIN: {
    email: process.env.SUPERADMIN_EMAIL!,
    password: process.env.SUPERADMIN_PASSWORD!,
  },
};

// Test data for form validation
export const TEST_DATA = {
  EMAIL: {
    VALID: process.env.TEST_EMAIL_VALID!,
    INVALID: process.env.TEST_EMAIL_INVALID!,
    NONEXISTENT: process.env.TEST_EMAIL_NONEXISTENT!,
  },

  PASSWORD: {
    VALID: process.env.TEST_PASSWORD_VALID!,
    WEAK: process.env.TEST_PASSWORD_WEAK!,
    SHORT: process.env.TEST_PASSWORD_SHORT!,
    DIFFERENT: process.env.TEST_PASSWORD_DIFFERENT!,
    WRONG: process.env.TEST_PASSWORD_WRONG || process.env.TEST_PASSWORD_DIFFERENT!,
    SECURE: process.env.TEST_PASSWORD_SECURE || process.env.TEST_PASSWORD_VALID!,
    NEW: process.env.TEST_PASSWORD_NEW || process.env.TEST_PASSWORD_VALID!,
    INVALID: process.env.TEST_PASSWORD_WEAK!,
  },
};

// Mock API test data
export const MOCK_TEST_DATA = {
  USER: {
    email: process.env.MOCK_USER_EMAIL!,
    password: process.env.MOCK_USER_PASSWORD!,
  },

  ADMIN: {
    email: process.env.MOCK_ADMIN_EMAIL!,
    password: process.env.MOCK_ADMIN_PASSWORD!,
  },

  DUPLICATE: {
    email: process.env.MOCK_DUPLICATE_EMAIL!,
    password: process.env.MOCK_USER_PASSWORD!,
  },

  INVALID: {
    email: process.env.MOCK_INVALID_EMAIL!,
    password: process.env.MOCK_USER_PASSWORD!,
  },
};

// WebSocket test credentials (unique users for parallel E2E tests)
// All users share TEST_USER_PASSWORD for consistency
export const WS_TEST_CREDENTIALS = {
  USER_1: {
    email: process.env.WS_TEST_USER_1_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  USER_2: {
    email: process.env.WS_TEST_USER_2_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  USER_3: {
    email: process.env.WS_TEST_USER_3_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  ADMIN_1: {
    email: process.env.WS_TEST_ADMIN_1_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  ADMIN_2: {
    email: process.env.WS_TEST_ADMIN_2_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  ADMIN_3: {
    email: process.env.WS_TEST_ADMIN_3_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },

  SUPERADMIN_1: {
    email: process.env.WS_TEST_SUPERADMIN_1_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
};

// Profile test credentials (unique users for parallel E2E tests)
// All users share TEST_USER_PASSWORD for consistency
export const PROFILE_TEST_CREDENTIALS = {
  USER_1: {
    email: process.env.PROFILE_TEST_USER_1_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_2: {
    email: process.env.PROFILE_TEST_USER_2_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_3: {
    email: process.env.PROFILE_TEST_USER_3_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_4: {
    email: process.env.PROFILE_TEST_USER_4_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_5: {
    email: process.env.PROFILE_TEST_USER_5_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_6: {
    email: process.env.PROFILE_TEST_USER_6_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_7: {
    email: process.env.PROFILE_TEST_USER_7_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_8: {
    email: process.env.PROFILE_TEST_USER_8_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_9: {
    email: process.env.PROFILE_TEST_USER_9_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_10: {
    email: process.env.PROFILE_TEST_USER_10_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_11: {
    email: process.env.PROFILE_TEST_USER_11_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_12: {
    email: process.env.PROFILE_TEST_USER_12_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_13: {
    email: process.env.PROFILE_TEST_USER_13_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_14: {
    email: process.env.PROFILE_TEST_USER_14_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
};

// Password change test credentials (unique users for password change E2E tests)
// Each test gets a dedicated user to avoid password history pollution
export const PASSWORD_TEST_CREDENTIALS = {
  USER_1: {
    email: process.env.PASSWORD_TEST_USER_1_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_2: {
    email: process.env.PASSWORD_TEST_USER_2_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_3: {
    email: process.env.PASSWORD_TEST_USER_3_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_4: {
    email: process.env.PASSWORD_TEST_USER_4_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
  USER_5: {
    email: process.env.PASSWORD_TEST_USER_5_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  },
};

// Test configuration
export const TEST_CONFIG = {
  PLAYWRIGHT_TEST: process.env.PLAYWRIGHT_TEST === 'true',
  NODE_ENV: process.env.NODE_ENV!,
  API_URL: process.env.NEXT_PUBLIC_API_URL!,
  FRONTEND_URL: process.env.FRONTEND_URL!,
  BACKEND_URL: process.env.BACKEND_URL!,
};
