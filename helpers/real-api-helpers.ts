/**
 * Real Backend API Test Helpers
 *
 * Utilities for running integration tests against the real backend.
 * These helpers provide authenticated API clients and cleanup utilities.
 *
 * @module real-api-helpers
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { FRONTEND_TEST_CREDENTIALS, FRONTEND_TEST_CONFIG } from '../test-credentials';

// Types for authentication
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  session_id?: string;
}

interface AuthenticatedClient {
  client: AxiosInstance;
  token: string;
  cleanup: () => Promise<void>;
}

type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

// Cache for authenticated clients to avoid re-authentication
const clientCache: Map<UserRole, AuthenticatedClient> = new Map();

/**
 * Get the base URL for the real backend API
 */
export function getBackendUrl(): string {
  return FRONTEND_TEST_CONFIG.API_URL || 'http://localhost:8000';
}

/**
 * Create a raw axios instance without authentication
 * Use this for testing unauthenticated endpoints like /health
 */
export function createRawApiClient(): AxiosInstance {
  return axios.create({
    baseURL: getBackendUrl(),
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Login to the backend and return tokens
 */
async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const client = createRawApiClient();

  // Backend expects OAuth2 form-data format
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await client.post<LoginResponse>('/api/v1/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

/**
 * Create an authenticated API client for a specific user role
 *
 * @param role - The user role to authenticate as
 * @returns Authenticated axios client with cleanup function
 *
 * @example
 * ```typescript
 * const { client, cleanup } = await authenticateAs('USER');
 * try {
 *   const response = await client.get('/api/v1/users/me');
 *   expect(response.status).toBe(200);
 * } finally {
 *   await cleanup();
 * }
 * ```
 */
export async function authenticateAs(role: UserRole): Promise<AuthenticatedClient> {
  // Check cache first
  const cached = clientCache.get(role);
  if (cached) {
    return cached;
  }

  const credentials = FRONTEND_TEST_CREDENTIALS[role];
  if (!credentials) {
    throw new Error(`Unknown user role: ${role}`);
  }

  const loginResponse = await loginUser(credentials.email, credentials.password);

  const client = axios.create({
    baseURL: getBackendUrl(),
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginResponse.access_token}`,
    },
  });

  const authenticatedClient: AuthenticatedClient = {
    client,
    token: loginResponse.access_token,
    cleanup: async () => {
      // Logout to invalidate the token
      try {
        await client.post('/api/v1/auth/logout');
      } catch {
        // Ignore logout errors - token may already be expired
      }
      clientCache.delete(role);
    },
  };

  // Cache for reuse within the same test file
  clientCache.set(role, authenticatedClient);

  return authenticatedClient;
}

/**
 * Get a pre-authenticated client for the default test user
 * Convenience wrapper around authenticateAs('USER')
 */
export async function getAuthenticatedClient(): Promise<AuthenticatedClient> {
  return authenticateAs('USER');
}

/**
 * Get a pre-authenticated client for an admin user
 * Convenience wrapper around authenticateAs('ADMIN')
 */
export async function getAdminClient(): Promise<AuthenticatedClient> {
  return authenticateAs('ADMIN');
}

/**
 * Get a pre-authenticated client for a superadmin user
 * Convenience wrapper around authenticateAs('SUPERADMIN')
 */
export async function getSuperadminClient(): Promise<AuthenticatedClient> {
  return authenticateAs('SUPERADMIN');
}

/**
 * Clear all cached authenticated clients
 * Call this in afterAll() or afterEach() to clean up
 */
export async function clearAuthCache(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  for (const [, client] of clientCache) {
    cleanupPromises.push(client.cleanup());
  }

  await Promise.allSettled(cleanupPromises);
  clientCache.clear();
}

/**
 * Delete a test-created resource
 * Use this to clean up after tests that create data
 */
export async function deleteTestResource(
  client: AxiosInstance,
  resourcePath: string,
): Promise<void> {
  try {
    await client.delete(resourcePath);
  } catch (error) {
    // 404 is fine - resource may already be deleted
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      throw error;
    }
  }
}

/**
 * Wait for backend to be healthy
 * Use this at the start of test suites that require the backend
 */
export async function waitForBackend(maxWaitMs: number = 30000): Promise<boolean> {
  const client = createRawApiClient();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await client.get('/health');
      if (response.status === 200) {
        return true;
      }
    } catch {
      // Backend not ready yet, wait and retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Check if the backend is available
 * Non-blocking health check
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const client = createRawApiClient();
    const response = await client.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Skip test if backend is not available
 * Use this as the first line in describe() blocks for real backend tests
 *
 * @example
 * ```typescript
 * describe('Real Backend Tests', () => {
 *   beforeAll(async () => {
 *     await skipIfBackendUnavailable();
 *   });
 *
 *   it('should work with real backend', async () => {
 *     // ...
 *   });
 * });
 * ```
 */
export async function skipIfBackendUnavailable(): Promise<void> {
  const available = await isBackendAvailable();
  if (!available) {
    console.warn('Backend not available - skipping real backend tests');
    // Using Jest's skip mechanism - this will throw if backend not available
    throw new Error('Backend not available');
  }
}

/**
 * Extract error message from API error response
 * Handles various error response formats from the backend
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string | object[] }>;
    const detail = axiosError.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d === 'object' ? JSON.stringify(d) : d))
        .join(', ');
    }

    return axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

/**
 * Test helper to verify rate limiting headers are present
 */
export function hasRateLimitHeaders(headers: Record<string, string>): boolean {
  return (
    'x-ratelimit-limit' in headers ||
    'x-ratelimit-remaining' in headers ||
    'retry-after' in headers
  );
}

/**
 * Get test credentials for a specific role
 * Useful when you need just the credentials, not a client
 */
export function getCredentials(role: UserRole): { email: string; password: string } {
  const credentials = FRONTEND_TEST_CREDENTIALS[role];
  if (!credentials) {
    throw new Error(`Unknown user role: ${role}`);
  }
  return credentials;
}
