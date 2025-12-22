/**
 * Auth Interceptor Tests
 *
 * Comprehensive test suite for automatic token refresh interceptor.
 *
 * Test Coverage:
 * - Token refresh coordination (single refresh for multiple 401s)
 * - Request queue management
 * - Fetch wrapper with automatic retry
 * - State machine integration
 * - Error handling and propagation
 * - Request queuing during refresh
 * - HttpOnly cookie credential forwarding
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

jest.mock('@/lib/api/auth', () => ({
  refreshAuthToken: jest.fn(),
}));

// authStateMachine removed - ConsolidatedAuthContext manages state directly

// Now import after mocks
import {
  attemptTokenRefresh,
  fetchWithAuth,
  fetchWithAuthQueue,
  resetAuthInterceptorState,
} from '@/lib/api/authInterceptor';
import { refreshAuthToken } from '@/lib/api/auth';
import logger from '@/lib/logging';

const mockRefreshAuthToken = refreshAuthToken as jest.MockedFunction<
  typeof refreshAuthToken
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Auth Interceptor', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthInterceptorState();

    // Default mock for refreshAuthToken
    // Note: refreshAuthToken returns { access_token: string } only
    mockRefreshAuthToken.mockResolvedValue({
      access_token: 'new-token',
    });

    // Default mock for fetch
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'success' }),
    } as Response);
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe('attemptTokenRefresh()', () => {
    it('should successfully refresh token', async () => {
      const result = await attemptTokenRefresh();

      expect(result).toBe(true);
      expect(mockRefreshAuthToken).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Token refreshed successfully'),
      );
    });

    it('should return false on refresh failure', async () => {
      const error = new Error('Refresh failed');
      mockRefreshAuthToken.mockRejectedValueOnce(error);

      const result = await attemptTokenRefresh();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Token refresh failed'),
        expect.any(Object),
      );
    });

    it('should coordinate multiple simultaneous refresh attempts', async () => {
      // Delay the first refresh to allow second call to happen
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      mockRefreshAuthToken.mockImplementation(() => refreshPromise as any);

      // Start first refresh (won't complete immediately)
      const refresh1 = attemptTokenRefresh();

      // Wait for first refresh to actually start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Start second refresh while first is in progress
      const refresh2 = attemptTokenRefresh();

      // Complete the refresh
      resolveRefresh!({ access_token: 'new-token', token_type: 'Bearer' });

      const [result1, result2] = await Promise.all([refresh1, refresh2]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      // Should only call refresh API once (deduplication)
      expect(mockRefreshAuthToken).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('already in progress'),
      );
    });

    it('should wait for in-flight refresh before starting new one', async () => {
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      mockRefreshAuthToken.mockImplementationOnce(() => refreshPromise as any);

      // Start first refresh
      const refresh1 = attemptTokenRefresh();

      // Wait a bit to ensure refresh is in progress
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Start second refresh
      const refresh2 = attemptTokenRefresh();

      // Complete the refresh
      resolveRefresh!({ access_token: 'new-token', token_type: 'Bearer' });

      await Promise.all([refresh1, refresh2]);

      // Only one API call should be made
      expect(mockRefreshAuthToken).toHaveBeenCalledTimes(1);
    });

    it('should handle refresh promise rejection when waiting', async () => {
      const error = new Error('Refresh failed');
      mockRefreshAuthToken.mockRejectedValue(error); // Reject all calls

      // Start first refresh (will fail)
      const refresh1 = attemptTokenRefresh();

      // Wait for refresh to be in progress
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Start second refresh (should wait for first to complete and also fail)
      const refresh2 = attemptTokenRefresh();

      const results = await Promise.all([refresh1, refresh2]);

      expect(results[0]).toBe(false);
      expect(results[1]).toBe(false);
    });
  });

  describe('fetchWithAuth()', () => {
    it('should include credentials in request', async () => {
      await fetchWithAuth('/api/v1/users/me', { method: 'GET' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/users/me',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
    });

    it('should return response for successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ user: 'data' }),
      } as Response;

      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const response = await fetchWithAuth('/api/v1/users/me');

      expect(response).toBe(mockResponse);
      expect(response.status).toBe(200);
    });

    it('should retry request after successful token refresh on 401', async () => {
      // First call returns 401
      const mock401Response = {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response;

      // Second call (after refresh) returns 200
      const mock200Response = {
        ok: true,
        status: 200,
        json: async () => ({ user: 'data' }),
      } as Response;

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(mock401Response)
        .mockResolvedValueOnce(mock200Response);

      const response = await fetchWithAuth('/api/v1/users/me');

      expect(response).toBe(mock200Response);
      expect(response.status).toBe(200);
      expect(mockRefreshAuthToken).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('401 Unauthorized'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('retrying original request'),
      );
    });

    it('should return 401 response if token refresh fails', async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response;

      globalThis.fetch = jest.fn().mockResolvedValue(mock401Response);
      mockRefreshAuthToken.mockRejectedValueOnce(new Error('Refresh failed'));

      const response = await fetchWithAuth('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Token refresh failed'),
      );
    });

    it('should not retry on second 401 (retry count limit)', async () => {
      const mock401Response = {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response;

      globalThis.fetch = jest.fn().mockResolvedValue(mock401Response);

      const response = await fetchWithAuth('/api/v1/users/me');

      // Should only call fetch twice (initial + 1 retry), not infinite loop
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(401);
    });

    it('should pass through non-401 responses without retry', async () => {
      const mock403Response = {
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      } as Response;

      globalThis.fetch = jest.fn().mockResolvedValue(mock403Response);

      const response = await fetchWithAuth('/api/v1/admin/users');

      expect(response.status).toBe(403);
      expect(mockRefreshAuthToken).not.toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      globalThis.fetch = jest.fn().mockRejectedValue(networkError);

      await expect(fetchWithAuth('/api/v1/users/me')).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Fetch error'),
        expect.objectContaining({
          error: networkError,
          url: '/api/v1/users/me',
        }),
      );
    });

    it('should preserve request options during retry', async () => {
      const mock401Response = {
        ok: false,
        status: 401,
      } as Response;

      const mock200Response = {
        ok: true,
        status: 200,
      } as Response;

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(mock401Response)
        .mockResolvedValueOnce(mock200Response);

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      };

      await fetchWithAuth('/api/v1/users', requestOptions);

      // Second fetch call should have same options
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/v1/users',
        expect.objectContaining({
          method: 'POST',
          headers: requestOptions.headers,
          body: requestOptions.body,
          credentials: 'include',
        }),
      );
    });
  });

  describe('fetchWithAuthQueue()', () => {
    it('should include credentials in request', async () => {
      await fetchWithAuthQueue('/api/v1/users/me');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/users/me',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should return response for successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ user: 'data' }),
      } as Response;

      globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

      const response = await fetchWithAuthQueue('/api/v1/users/me');

      expect(response.status).toBe(200);
    });

    it('should queue request if refresh is in progress', async () => {
      // Setup: Start a refresh that won't complete immediately
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshAuthToken.mockImplementation(() => refreshPromise as any);

      // First request triggers 401 and starts refresh
      const mock401Response = { ok: false, status: 401 } as Response;
      const mock200Response = { ok: true, status: 200 } as Response;

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(mock401Response) // First request gets 401
        .mockResolvedValueOnce(mock401Response) // Second request gets 401 (triggers queue)
        .mockResolvedValue(mock200Response); // All retries succeed

      // Start first request (triggers refresh)
      const request1 = fetchWithAuthQueue('/api/v1/users/me');

      // Wait for refresh to actually start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second request should be queued because refresh is in progress
      const request2 = fetchWithAuthQueue('/api/v1/users/me');

      // Complete the refresh
      resolveRefresh!({ access_token: 'new-token', token_type: 'Bearer' });

      const [response1, response2] = await Promise.all([request1, request2]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('queuing request'),
      );
    });

    it('should handle refresh failure for queued requests', async () => {
      // Setup refresh to fail
      const refreshError = new Error('Refresh failed');
      mockRefreshAuthToken.mockRejectedValueOnce(refreshError);

      const mock401Response = { ok: false, status: 401 } as Response;
      globalThis.fetch = jest.fn().mockResolvedValue(mock401Response);

      // Start first request (triggers refresh)
      const request1 = fetchWithAuthQueue('/api/v1/users/me');

      // Wait for refresh to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second request should be queued
      const request2 = fetchWithAuthQueue('/api/v1/users/me');

      // Wait for both to complete
      const [response1] = await Promise.all([
        request1.catch(() => mock401Response),
        request2.catch((err) => err),
      ]);

      expect(response1.status).toBe(401);
    });

    it('should retry request after successful refresh', async () => {
      const mock401Response = { ok: false, status: 401 } as Response;
      const mock200Response = { ok: true, status: 200 } as Response;

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(mock401Response)
        .mockResolvedValueOnce(mock200Response);

      const response = await fetchWithAuthQueue('/api/v1/users/me');

      expect(response.status).toBe(200);
      expect(mockRefreshAuthToken).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('retrying request'),
      );
    });

    it('should return 401 if refresh fails', async () => {
      const mock401Response = { ok: false, status: 401 } as Response;
      globalThis.fetch = jest.fn().mockResolvedValue(mock401Response);
      mockRefreshAuthToken.mockRejectedValueOnce(new Error('Refresh failed'));

      const response = await fetchWithAuthQueue('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Token refresh failed'),
      );
    });

    it('should pass through non-401 responses', async () => {
      const mock200Response = { ok: true, status: 200 } as Response;
      globalThis.fetch = jest.fn().mockResolvedValue(mock200Response);

      const response = await fetchWithAuthQueue('/api/v1/users/me');

      expect(response.status).toBe(200);
      expect(mockRefreshAuthToken).not.toHaveBeenCalled();
    });
  });

  describe('resetAuthInterceptorState()', () => {
    it('should reset all interceptor state', async () => {
      // Trigger a refresh to set state
      const mock401Response = { ok: false, status: 401 } as Response;
      globalThis.fetch = jest.fn().mockResolvedValue(mock401Response);

      // Start a refresh
      const refreshPromise = attemptTokenRefresh();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Reset state
      resetAuthInterceptorState();

      // Complete the original refresh
      await refreshPromise.catch(() => {});

      // Verify state is reset by attempting new refresh
      mockRefreshAuthToken.mockResolvedValueOnce({
        access_token: 'new-token',
      });

      const result = await attemptTokenRefresh();

      expect(result).toBe(true);
      // Should call refresh API (state was reset)
      expect(mockRefreshAuthToken).toHaveBeenCalled();
    });

    it('should clear request queue', () => {
      // This test verifies that resetAuthInterceptorState() clears the queue
      // We can't easily test queue behavior without triggering actual refreshes,
      // so we verify the function exists and doesn't throw
      expect(() => resetAuthInterceptorState()).not.toThrow();

      // Verify we can successfully refresh after reset
      mockRefreshAuthToken.mockResolvedValueOnce({
        access_token: 'new-token',
      });

      return expect(attemptTokenRefresh()).resolves.toBe(true);
    });
  });

  // REMOVED: Tests for State Machine Integration
  // authStateMachine was removed - ConsolidatedAuthContext manages state directly
});
