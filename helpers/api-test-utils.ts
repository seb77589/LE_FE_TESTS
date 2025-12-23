/**
 * API Test Utilities for Jest Real Backend Integration
 * ======================================================
 * Reusable helper functions for authenticating and managing test sessions
 * when running Jest tests against the real Docker backend.
 *
 * These utilities ensure:
 * - Proper authentication with worker-specific credentials
 * - Session cleanup to prevent test pollution
 * - Consistent API interaction patterns across tests
 */

import { getTestCredentials, getRoleCredentials } from '../../../jest.setup';
import api from '@/lib/api';

/**
 * Authentication response interface
 */
interface LoginResponse {
  token: string;
  credentials: {
    email: string;
    password: string;
    role?: string;
  };
  user?: any;
}

/**
 * Login a test user and return authentication token
 *
 * @param role - Optional role ('user', 'admin', 'superadmin'). If not provided, uses worker-specific credentials
 * @returns Promise with token, credentials, and user info
 *
 * @example
 * ```typescript
 * // Login with worker-specific credentials (parallel-safe)
 * const { token, user } = await loginTestUser();
 *
 * // Login as specific role
 * const { token } = await loginTestUser('admin');
 * ```
 */
export async function loginTestUser(role?: string): Promise<LoginResponse> {
  const credentials = role ? getRoleCredentials(role) : getTestCredentials();

  // Backend expects form-urlencoded login
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);

  const response = await api.post('/api/v1/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return {
    token: response.data.access_token,
    credentials,
    user: response.data.user,
  };
}

/**
 * Logout current test user
 * Ignores errors (user may not be logged in)
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await logoutTestUser();
 * });
 * ```
 */
export async function logoutTestUser(): Promise<void> {
  try {
    await api.post('/api/v1/auth/logout');
  } catch (error) {
    // Ignore logout errors (user may not be logged in)
    console.debug('Logout error (ignored):', error);
  }
}

/**
 * Create an authenticated API client instance
 *
 * @param token - JWT access token
 * @returns Axios instance configured with Authorization header
 *
 * @example
 * ```typescript
 * const { token } = await loginTestUser('admin');
 * const authenticatedApi = createAuthenticatedClient(token);
 * const response = await authenticatedApi.get('/api/v1/admin/users');
 * ```
 */
export function createAuthenticatedClient(token: string) {
  const authenticatedApi = api.create();
  authenticatedApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return authenticatedApi;
}

/**
 * Clean up test session
 * Call this in afterEach to prevent session pollution between tests
 *
 * @example
 * ```typescript
 * describe('My API tests', () => {
 *   afterEach(async () => {
 *     await cleanupTestSession();
 *   });
 *
 *   it('should test something', async () => {
 *     const { token } = await loginTestUser();
 *     // ... test code
 *   });
 * });
 * ```
 */
export async function cleanupTestSession(): Promise<void> {
  // Logout from backend
  await logoutTestUser();

  // Clear cookies if in browser environment
  if (typeof document !== 'undefined') {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // Clear localStorage if available
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

/**
 * Wait for API response with retry logic
 * Useful for handling timing issues with real backend
 *
 * @param apiCall - Function that returns a Promise with the API call
 * @param options - Retry options
 * @returns Promise with the API response
 *
 * @example
 * ```typescript
 * const response = await waitForAPI(
 *   () => api.get('/api/v1/users/me'),
 *   { maxRetries: 3, retryDelay: 1000 }
 * );
 * ```
 */
export async function waitForAPI<T>(
  apiCall: () => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number } = {},
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('waitForAPI: Should not reach here');
}

/**
 * Setup authenticated test context
 * Convenience function that logs in and returns authenticated client
 *
 * @param role - Optional role to login as
 * @returns Promise with authenticated API client and user info
 *
 * @example
 * ```typescript
 * describe('Admin tests', () => {
 *   let authenticatedApi: any;
 *   let user: any;
 *
 *   beforeEach(async () => {
 *     ({ authenticatedApi, user } = await setupAuthenticatedTest('admin'));
 *   });
 *
 *   afterEach(async () => {
 *     await cleanupTestSession();
 *   });
 *
 *   it('should access admin endpoints', async () => {
 *     const response = await authenticatedApi.get('/api/v1/admin/stats');
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */
export async function setupAuthenticatedTest(role?: string) {
  const { token, user, credentials } = await loginTestUser(role);
  const authenticatedApi = createAuthenticatedClient(token);

  return {
    authenticatedApi,
    user,
    token,
    credentials,
  };
}
