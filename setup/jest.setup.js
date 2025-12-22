import '@testing-library/jest-dom';
// Polyfill fetch/Request/Response for jsdom unit tests
import 'whatwg-fetch';

// Load environment variables from main config/.env file
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', 'config', '.env') });

// Configure jsdom location for real backend testing
// This ensures API client uses the correct backend URL (http://localhost:8000)
// instead of the default jsdom location (http://localhost)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL(backendUrl),
    });
  } catch (error) {
    console.warn('[jest.setup] Failed to configure window.location:', error);
  }
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt || ''} {...props} />;
  },
}));

// Mock window.matchMedia (only in browser/jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock window.crypto for DOM ID generation in tests
  // Note: This mock is only for non-cryptographic DOM element IDs
  // For actual cryptographic operations, use a proper crypto mock
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: jest.fn().mockImplementation((arr) => {
        // Use a seeded approach for test determinism while avoiding Math.random()
        // This is safe for DOM ID generation but should NOT be used for cryptographic purposes
        for (let i = 0; i < arr.length; i++) {
          // Use a simple counter-based approach for test predictability
          arr[i] = (Date.now() + i) % 256;
        }
        return arr;
      }),
    },
  });

  // Mock performance API with full API surface for jsdom
  Object.defineProperty(window, 'performance', {
    writable: true,
    configurable: true,
    value: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
      getEntries: jest.fn(() => []),
      timing: {},
      navigation: {},
      timeOrigin: Date.now(),
    },
  });
}

/*
 * Share authentication token produced in jest.global-setup
 * -------------------------------------------------------
 * The global setup script stores the access_token returned by the backend
 * login endpoint in `<repo>/frontend/.jest-token`. During the jsdom phase we
 * read that file (if present) and seed `document.cookie` so that client-side
 * code – including SWR fetchers and the AuthContext – can forward the JWT on
 * subsequent API calls without needing explicit mocks.
 */

(() => {
  if (typeof window === 'undefined') return; // not in jsdom – nothing to do

  try {
    const fs = require('fs');
    const path = require('path');
    const tokenPath = path.join(__dirname, '.jest-token');

    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, 'utf-8').trim();
      if (token) {
        // Set a session cookie accessible to all paths
        document.cookie = `access_token=${token}; path=/; samesite=lax`;
      }
    }
  } catch (err) {
    console.warn('[jest.setup] Unable to seed access_token cookie:', err);
  }
})();

// Polyfill IntersectionObserver for jsdom environment (only in browser/jsdom environment)
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class IntersectionObserverMock {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  });

  // Only define on global if in jsdom environment
  if (typeof global !== 'undefined') {
    Object.defineProperty(global, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: IntersectionObserverMock,
    });
  }
}

// Mock next-intl's useTranslations to avoid missing provider errors
jest.mock('next-intl', () => ({
  useTranslations: () => (key) => key,
}));

/**
 * Worker Credential Pool for Parallel Jest Execution
 * ===================================================
 * Prevents session conflicts when multiple test workers run simultaneously.
 * Pattern matches E2E Playwright worker isolation for consistency.
 *
 * Each Jest worker gets a unique set of credentials to avoid concurrent
 * session conflicts with the real Docker backend.
 */

/**
 * Get credentials for a specific worker index
 * @param {number} workerIndex - Worker index (0-based)
 * @returns {{email: string, password: string, role: string}}
 */
export function getWorkerCredentials(workerIndex = 0) {
  const WORKER_POOL = [
    // Worker 0: Regular user
    {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
      role: 'user',
    },
    // Worker 1: Admin user
    {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
      role: 'admin',
    },
    // Worker 2: Additional user1
    {
      email: process.env.TEST_USER1_EMAIL,
      password: process.env.TEST_USER1_PASSWORD,
      role: 'user',
    },
    // Worker 3: Additional user2
    {
      email: process.env.TEST_USER2_EMAIL,
      password: process.env.TEST_USER2_PASSWORD,
      role: 'user',
    },
    // Worker 4: John user
    {
      email: process.env.TEST_JOHN_EMAIL,
      password: process.env.TEST_JOHN_PASSWORD,
      role: 'user',
    },
    // Worker 5: Current user
    {
      email: process.env.TEST_CURRENT_EMAIL,
      password: process.env.TEST_CURRENT_PASSWORD,
      role: 'user',
    },
  ];

  return WORKER_POOL[workerIndex % WORKER_POOL.length];
}

/**
 * Get credentials for the current Jest worker
 * Uses JEST_WORKER_ID environment variable (set by Jest)
 * @returns {{email: string, password: string, role: string}}
 */
export function getTestCredentials() {
  const workerId = Number.parseInt(process.env.JEST_WORKER_ID || '1', 10) - 1;
  return getWorkerCredentials(workerId);
}

/**
 * Get credentials for a specific role
 * Useful for tests that specifically need admin or superadmin access
 * @param {string} role - Role: 'user', 'admin', or 'superadmin'
 * @returns {{email: string, password: string}}
 */
export function getRoleCredentials(role = 'user') {
  const roleMap = {
    user: {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    },
    superadmin: {
      email: process.env.TEST_SUPERADMIN_EMAIL,
      password: process.env.TEST_SUPERADMIN_PASSWORD,
    },
  };

  return roleMap[role.toLowerCase()] || roleMap.user;
}
