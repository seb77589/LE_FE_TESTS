/**
 * Frontend Test Credentials Configuration
 * Centralized configuration for all test credentials used in frontend unit and integration tests (Jest)
 *
 * NOTE: This file is specifically for Jest unit/integration tests.
 * For E2E tests (Playwright), use tests/test-credentials.ts instead.
 * Both files load from the same environment variables but export different structures
 * optimized for their respective test frameworks.
 */

// Environment validation function
function validateFrontendTestEnvironment(): void {
  const requiredVars = [
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
    'TEST_SUPERADMIN_EMAIL',
    'TEST_SUPERADMIN_PASSWORD',
    'TEST_USER1_EMAIL',
    'TEST_USER1_PASSWORD',
    'TEST_USER2_EMAIL',
    'TEST_USER2_PASSWORD',
    'TEST_INACTIVE_EMAIL',
    'TEST_INACTIVE_PASSWORD',
    'TEST_UNVERIFIED_EMAIL',
    'TEST_UNVERIFIED_PASSWORD',
    'TEST_CURRENT_EMAIL',
    'TEST_CURRENT_PASSWORD',
    'TEST_NEW_EMAIL',
    'TEST_NEW_PASSWORD',
    'TEST_EXISTING_EMAIL',
    'TEST_EXISTING_PASSWORD',
    'TEST_DIFFERENT_EMAIL',
    'TEST_DIFFERENT_PASSWORD',
    'TEST_JOHN_EMAIL',
    'TEST_JOHN_PASSWORD',
    'TEST_EMAIL_JANE',
    'TEST_EMAIL_UPDATED_USER',
    'TEST_LOCKED_USER_1_EMAIL',
    'TEST_LOCKED_USER_2_EMAIL',
    'TEST_EMAIL_VALID',
    'TEST_EMAIL_INVALID',
    'TEST_EMAIL_NONEXISTENT',
    'TEST_EMAIL_USER1',
    'TEST_EMAIL_ADMIN',
    'TEST_EMAIL_INACTIVE',
    'TEST_EMAIL_UNVERIFIED',
    'TEST_EMAIL_CURRENT',
    'TEST_EMAIL_NEW',
    'TEST_EMAIL_EXISTING',
    'TEST_EMAIL_DIFFERENT',
    'TEST_EMAIL_JOHN',
    'TEST_PASSWORD_VALID',
    'TEST_PASSWORD_NEW',
    'TEST_PASSWORD_SECURE',
    'TEST_PASSWORD_CURRENT',
    'TEST_PASSWORD_WRONG',
    'TEST_PASSWORD_WEAK',
    'TEST_PASSWORD_SHORT',
    'TEST_PASSWORD_DIFFERENT',
    'TEST_PASSWORD_VALID_NEW',
    'NODE_ENV',
    'NEXT_PUBLIC_API_URL',
    'FRONTEND_URL',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('ERROR: Missing required frontend test environment variables:');
    for (const varName of missingVars) {
      console.error(`  - ${varName}`);
    }
    console.error('\nPlease ensure all test credentials are configured in config/.env');
    console.error(
      'See config/.env.example for the complete list of required variables.',
    );
    process.exit(1);
  }
}

// Helper function to get required env var (type-safe)
function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Only validate in Jest context, not when accidentally imported by Playwright
// JEST_WORKER_ID is set by Jest when running tests
if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
  validateFrontendTestEnvironment();
}

// Test user credentials for frontend tests
export const FRONTEND_TEST_CREDENTIALS = {
  // Regular test user
  USER: {
    email: getRequiredEnvVar('TEST_USER_EMAIL'),
    password: getRequiredEnvVar('TEST_USER_PASSWORD'),
  },

  // Admin test user
  ADMIN: {
    email: getRequiredEnvVar('TEST_ADMIN_EMAIL'),
    password: getRequiredEnvVar('TEST_ADMIN_PASSWORD'),
  },

  // Superadmin test user
  SUPERADMIN: {
    email: getRequiredEnvVar('TEST_SUPERADMIN_EMAIL'),
    password: getRequiredEnvVar('TEST_SUPERADMIN_PASSWORD'),
  },

  // Additional test users
  USER1: {
    email: getRequiredEnvVar('TEST_USER1_EMAIL'),
    password: getRequiredEnvVar('TEST_USER1_PASSWORD'),
  },

  USER2: {
    email: getRequiredEnvVar('TEST_USER2_EMAIL'),
    password: getRequiredEnvVar('TEST_USER2_PASSWORD'),
  },

  INACTIVE: {
    email: getRequiredEnvVar('TEST_INACTIVE_EMAIL'),
    password: getRequiredEnvVar('TEST_INACTIVE_PASSWORD'),
  },

  UNVERIFIED: {
    email: getRequiredEnvVar('TEST_UNVERIFIED_EMAIL'),
    password: getRequiredEnvVar('TEST_UNVERIFIED_PASSWORD'),
  },

  CURRENT: {
    email: getRequiredEnvVar('TEST_CURRENT_EMAIL'),
    password: getRequiredEnvVar('TEST_CURRENT_PASSWORD'),
  },

  NEW: {
    email: getRequiredEnvVar('TEST_NEW_EMAIL'),
    password: getRequiredEnvVar('TEST_NEW_PASSWORD'),
  },

  EXISTING: {
    email: getRequiredEnvVar('TEST_EXISTING_EMAIL'),
    password: getRequiredEnvVar('TEST_EXISTING_PASSWORD'),
  },

  DIFFERENT: {
    email: getRequiredEnvVar('TEST_DIFFERENT_EMAIL'),
    password: getRequiredEnvVar('TEST_DIFFERENT_PASSWORD'),
  },

  JOHN: {
    email: getRequiredEnvVar('TEST_JOHN_EMAIL'),
    password: getRequiredEnvVar('TEST_JOHN_PASSWORD'),
    username: process.env.TEST_USERNAME_JOHN,
  },

  JANE: {
    email: getRequiredEnvVar('TEST_EMAIL_JANE'),
    password: getRequiredEnvVar('TEST_USER_PASSWORD'), // Shares common test password
    username: process.env.TEST_USERNAME_JANE,
  },

  LOCKED_USER_1: {
    email: getRequiredEnvVar('TEST_LOCKED_USER_1_EMAIL'),
    password: getRequiredEnvVar('TEST_USER_PASSWORD'),
  },

  LOCKED_USER_2: {
    email: getRequiredEnvVar('TEST_LOCKED_USER_2_EMAIL'),
    password: getRequiredEnvVar('TEST_USER_PASSWORD'),
  },

  UPDATED: {
    email: getRequiredEnvVar('TEST_EMAIL_UPDATED_USER'),
    password: getRequiredEnvVar('TEST_USER_PASSWORD'),
  },
};

// Test data for form validation and testing
export const FRONTEND_TEST_DATA = {
  EMAIL: {
    VALID: getRequiredEnvVar('TEST_EMAIL_VALID'),
    INVALID: getRequiredEnvVar('TEST_EMAIL_INVALID'),
    NONEXISTENT: getRequiredEnvVar('TEST_EMAIL_NONEXISTENT'),
    USER1: getRequiredEnvVar('TEST_EMAIL_USER1'),
    ADMIN: getRequiredEnvVar('TEST_EMAIL_ADMIN'),
    INACTIVE: getRequiredEnvVar('TEST_EMAIL_INACTIVE'),
    UNVERIFIED: getRequiredEnvVar('TEST_EMAIL_UNVERIFIED'),
    CURRENT: getRequiredEnvVar('TEST_EMAIL_CURRENT'),
    NEW: getRequiredEnvVar('TEST_EMAIL_NEW'),
    EXISTING: getRequiredEnvVar('TEST_EMAIL_EXISTING'),
    DIFFERENT: getRequiredEnvVar('TEST_EMAIL_DIFFERENT'),
    JOHN: getRequiredEnvVar('TEST_EMAIL_JOHN'),
    JANE: getRequiredEnvVar('TEST_EMAIL_JANE'),
    UPDATED: getRequiredEnvVar('TEST_EMAIL_UPDATED_USER'),
    LOCKED_1: getRequiredEnvVar('TEST_LOCKED_USER_1_EMAIL'),
    LOCKED_2: getRequiredEnvVar('TEST_LOCKED_USER_2_EMAIL'),
  },

  PASSWORD: {
    VALID: getRequiredEnvVar('TEST_PASSWORD_VALID'),
    NEW: getRequiredEnvVar('TEST_PASSWORD_NEW'),
    SECURE: getRequiredEnvVar('TEST_PASSWORD_SECURE'),
    CURRENT: getRequiredEnvVar('TEST_PASSWORD_CURRENT'),
    WRONG: getRequiredEnvVar('TEST_PASSWORD_WRONG'),
    WEAK: getRequiredEnvVar('TEST_PASSWORD_WEAK'),
    SHORT: getRequiredEnvVar('TEST_PASSWORD_SHORT'),
    DIFFERENT: getRequiredEnvVar('TEST_PASSWORD_DIFFERENT'),
    VALID_NEW: getRequiredEnvVar('TEST_PASSWORD_VALID_NEW'),
  },
};

// Test configuration for frontend tests
export const FRONTEND_TEST_CONFIG = {
  NODE_ENV: getRequiredEnvVar('NODE_ENV'),
  API_URL: getRequiredEnvVar('NEXT_PUBLIC_API_URL'),
  FRONTEND_URL: getRequiredEnvVar('FRONTEND_URL'),
};
