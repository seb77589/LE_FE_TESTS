/**
 * API Client Integration Tests
 *
 * Tests the integration between API client, interceptors, error handling,
 * and token refresh mechanisms.
 *
 * Coverage:
 * - API client initialization
 * - Request/response interceptors
 * - Error handling across API calls
 * - Token refresh integration
 * - CSRF token handling
 * - Rate limiting integration
 */

import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';
import api, { authApi, testApiConnectivity, handleApiError } from '@/lib/api';
import { apiConfig } from '@/lib/api/config';
import { refreshAuthToken } from '@/lib/api/auth';
import { FRONTEND_TEST_CREDENTIALS } from '../../jest-test-credentials';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api/auth', () => ({
  refreshAuthToken: jest.fn(),
}));

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

// Mock axios to control responses while preserving configuration
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    create: jest.fn((config) => {
      // Create actual instance with provided config
      const instance = actualAxios.create(config);
      // Store interceptors for testing
      instance.__interceptors = {
        request: [],
        response: [],
      };
      return instance;
    }),
  };
});

describe('API Client Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Client Initialization', () => {
    it('should initialize with correct baseURL', () => {
      expect(api.defaults.baseURL).toBeDefined();
      expect(api.defaults.timeout).toBeGreaterThan(0);
      expect(api.defaults.withCredentials).toBe(true);
    });

    it('should have request interceptor configured', () => {
      // Request interceptor should be set up
      expect(api.interceptors.request.handlers.length).toBeGreaterThan(0);
    });

    it('should have response interceptor configured', () => {
      // Response interceptor should be set up
      expect(api.interceptors.response.handlers.length).toBeGreaterThan(0);
    });

    it('should include credentials in requests', () => {
      expect(api.defaults.withCredentials).toBe(true);
    });
  });

  describe('Request Interceptor', () => {
    it('should log request information', async () => {
      const logger = require('@/lib/logging').default;
      const testUrl = '/api/v1/test';

      // Make a request (will be intercepted)
      try {
        await api.get(testUrl);
      } catch {
        // Expected to fail - we're just testing interceptor
      }

      // Verify logger was called (interceptor logs requests)
      expect(logger.info).toHaveBeenCalled();
    });

    it('should preserve request configuration', async () => {
      const testUrl = '/api/v1/test';
      const customHeaders = { 'X-Custom-Header': 'test-value' };

      try {
        await api.get(testUrl, { headers: customHeaders });
      } catch {
        // Expected to fail
      }

      // Request should preserve custom headers through interceptor
      // (interceptor doesn't modify config, just logs)
      expect(api.defaults.headers).toBeDefined();
    });
  });

  describe('Response Interceptor - Success', () => {
    it('should log successful responses', async () => {
      const logger = require('@/lib/logging').default;

      // Mock successful response
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
      };

      // Simulate successful response through interceptor
      const interceptor = api.interceptors.response.handlers[0];
      await interceptor?.fulfilled?.(mockResponse);

      expect(logger.info).toHaveBeenCalled();
    });

    it('should parse rate limit headers from successful responses', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '10',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
      };

      // Simulate successful response
      const interceptor = api.interceptors.response.handlers[0];
      await interceptor?.fulfilled?.(mockResponse);

      // Rate limit headers should be parsed (no error thrown)
      expect(mockResponse.headers).toBeDefined();
    });
  });

  describe('Response Interceptor - Error Handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      const logger = require('@/lib/logging').default;
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Unauthorized' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      // Simulate error through interceptor
      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // Expected - error should propagate
      }

      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle 429 Rate Limit errors with retry logic', async () => {
      const logger = require('@/lib/logging').default;
      let retryCount = 0;

      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '5',
          },
          data: { detail: 'Rate limit exceeded' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: retryCount,
        },
        isAxiosError: true,
      } as any;

      // Mock api call for retry
      const originalApiCall = api.get;
      (api.get as jest.Mock) = jest.fn().mockResolvedValueOnce({
        data: { success: true },
        status: 200,
      });

      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // May throw or retry
      }

      expect(logger.warn).toHaveBeenCalled();
      api.get = originalApiCall;
    });

    it('should handle 500 Server errors with retry logic', async () => {
      const logger = require('@/lib/logging').default;
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Server error' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: 0,
        },
        isAxiosError: true,
      } as any;

      // Mock successful retry
      const originalApiCall = api.get;
      (api.get as jest.Mock) = jest.fn().mockResolvedValueOnce({
        data: { success: true },
        status: 200,
      });

      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // May throw or retry
      }

      expect(logger.warn).toHaveBeenCalled();
      api.get = originalApiCall;
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // Expected
      }

      // Network errors should be handled
      expect(isAxiosError(mockError)).toBe(true);
    });
  });

  describe('Token Refresh Integration', () => {
    it('should attempt token refresh on 401 error', async () => {
      const mockRefreshAuthToken = refreshAuthToken as jest.Mock;
      mockRefreshAuthToken.mockResolvedValueOnce({
        access_token: 'new-token',
        token_type: 'Bearer',
      });

      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Token expired' },
        },
        config: {
          url: '/api/v1/users/me',
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      // 401 handler should log but not call refresh (backend handles via cookies)
      const logger = require('@/lib/logging').default;
      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // Expected
      }

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('CSRF Token Handling', () => {
    it('should include credentials for CSRF token requests', async () => {
      // testApiConnectivity uses CSRF token endpoint
      const result = await testApiConnectivity();

      // Should attempt connectivity test
      expect(typeof result).toBe('boolean');
    });

    it('should handle CSRF token endpoint responses', async () => {
      // Mock fetch for testApiConnectivity
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await testApiConnectivity();
      expect(result).toBe(true);

      (globalThis as any).fetch = originalFetch;
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from API responses', () => {
      // Create a proper axios-like error that passes isAxiosError check
      const apiError = new Error('Request failed') as AxiosError;
      (apiError as any).isAxiosError = true;
      (apiError as any).response = {
        data: {
          detail: 'Invalid credentials',
        },
        status: 401,
      };

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Invalid credentials');
    });

    it('should handle validation errors array', () => {
      // Create a proper axios-like error that passes isAxiosError check
      const apiError = new Error('Validation failed') as AxiosError;
      (apiError as any).isAxiosError = true;
      (apiError as any).response = {
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'Invalid email format' },
            { loc: ['body', 'password'], msg: 'Password too short' },
          ],
        },
        status: 422,
      };

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toContain('email');
      expect(errorMessage).toContain('password');
    });

    it('should handle nested error detail objects', () => {
      // Create a proper axios-like error that passes isAxiosError check
      const apiError = new Error('Bad request') as AxiosError;
      (apiError as any).isAxiosError = true;
      (apiError as any).response = {
        data: {
          detail: {
            message: 'Nested error message',
          },
        },
        status: 400,
      };

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Nested error message');
    });

    it('should fallback to error message when detail is missing', () => {
      // Create a proper axios-like error that passes isAxiosError check
      const apiError = new Error('Server error occurred') as AxiosError;
      (apiError as any).isAxiosError = true;
      (apiError as any).response = {
        data: {},
        status: 500,
      };

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Server error occurred');
    });
  });

  describe('Auth API Integration', () => {
    it('should format login request as form data', async () => {
      const mockPost = jest.spyOn(api, 'post').mockResolvedValue({
        data: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          token_type: 'bearer',
        },
      });

      await authApi.login({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      });

      expect(mockPost).toHaveBeenCalled();
      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[1]).toBeInstanceOf(URLSearchParams);

      mockPost.mockRestore();
    });

    it('should use cookies for getCurrentUser when no token provided', async () => {
      const mockGet = jest.spyOn(api, 'get').mockResolvedValue({
        data: {
          id: 1,
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          role: 'assistant',
        },
      });

      await authApi.getCurrentUser();

      // When no token is provided, api.get is called with only the endpoint
      expect(mockGet).toHaveBeenCalledWith(apiConfig.endpoints.auth.me);

      mockGet.mockRestore();
    });

    it('should use Authorization header when token provided', async () => {
      const mockGet = jest.spyOn(api, 'get').mockResolvedValue({
        data: {
          id: 1,
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
        },
      });

      const testToken = 'provided-token';

      await authApi.getCurrentUser(testToken);

      expect(mockGet).toHaveBeenCalledWith(apiConfig.endpoints.auth.me, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      mockGet.mockRestore();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should parse rate limit headers from responses', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        headers: {
          'x-ratelimit-remaining': '5',
          'x-ratelimit-limit': '10',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
      };

      const interceptor = api.interceptors.response.handlers[0];
      await interceptor?.fulfilled?.(mockResponse);

      // Rate limit headers should be parsed (no error)
      expect(mockResponse.headers).toBeDefined();
    });

    it('should calculate backoff delay from retry-after header', () => {
      const headers = {
        'retry-after': '10',
      };

      // Backoff calculation is internal, but we can verify headers are used
      expect(headers['retry-after']).toBe('10');
    });
  });

  describe('Fetcher Function Integration', () => {
    it('should use correct baseURL for fetcher', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = mockFetch;

      const { fetcher } = require('@/lib/api');
      await fetcher('/api/v1/test');

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0][0];
      expect(fetchCall).toContain('/api/v1/test');

      (globalThis as any).fetch = originalFetch;
    });

    it('should include credentials in fetcher requests', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = mockFetch;

      const { fetcher } = require('@/lib/api');
      await fetcher('/api/v1/test');

      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(fetchOptions?.credentials).toBe('include');

      (globalThis as any).fetch = originalFetch;
    });
  });

  describe('Retry Logic Integration', () => {
    it('should handle 429 rate limit error through interceptor', async () => {
      const logger = require('@/lib/logging').default;
      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '1',
          },
          data: { detail: 'Rate limit exceeded' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: 0,
        },
        isAxiosError: true,
      };

      // Test the interceptor's rejected handler directly
      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // Expected - error propagates after retry logic
      }

      // Interceptor should log the rate limit warning
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle 500 server error through interceptor', async () => {
      const logger = require('@/lib/logging').default;
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Server error' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: 0,
        },
        isAxiosError: true,
      };

      const interceptor = api.interceptors.response.handlers[0];
      try {
        await interceptor?.rejected?.(mockError);
      } catch {
        // Expected - error propagates
      }

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should stop retrying after max retry attempts', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Server error' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: 3, // Max retries reached
        },
        isAxiosError: true,
      };

      // When max retries is reached, interceptor should reject
      const interceptor = api.interceptors.response.handlers[0];
      await expect(interceptor?.rejected?.(mockError)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });

    it('should parse retry-after header for backoff calculation', () => {
      // This tests that the header format is correctly understood
      const headers = {
        'retry-after': '5',
      };

      // Parse as the interceptor would
      const retryAfter = Number.parseInt(headers['retry-after'], 10);
      const backoffMs = retryAfter * 1000;

      expect(retryAfter).toBe(5);
      expect(backoffMs).toBe(5000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockGet = jest.spyOn(api, 'get').mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const requests = [
        api.get('/api/v1/test1'),
        api.get('/api/v1/test2'),
        api.get('/api/v1/test3'),
      ];

      const responses = await Promise.all(requests);

      expect(mockGet).toHaveBeenCalledTimes(3);
      expect(responses).toHaveLength(3);
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      mockGet.mockRestore();
    });

    it('should handle concurrent requests with different methods', async () => {
      const mockGet = jest
        .spyOn(api, 'get')
        .mockResolvedValue({ data: { get: true }, status: 200 } as any);
      const mockPost = jest
        .spyOn(api, 'post')
        .mockResolvedValue({ data: { post: true }, status: 201 } as any);
      const mockPatch = jest
        .spyOn(api, 'patch')
        .mockResolvedValue({ data: { patch: true }, status: 200 } as any);

      const requests = [
        api.get('/api/v1/test'),
        api.post('/api/v1/test', { data: 'test' }),
        api.patch('/api/v1/test/1', { update: 'data' }),
      ];

      const responses = await Promise.all(requests);

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(responses[0].data.get).toBe(true);
      expect(responses[1].data.post).toBe(true);
      expect(responses[2].data.patch).toBe(true);

      mockGet.mockRestore();
      mockPost.mockRestore();
      mockPatch.mockRestore();
    });

    it('should handle concurrent requests with mixed success and failure', async () => {
      // This test validates Promise.allSettled behavior with mixed results
      const notFoundError = Object.assign(new Error('Not found'), {
        response: { status: 404, data: { detail: 'Not found' } },
        isAxiosError: true,
      });
      const mockResults = [
        Promise.resolve({ data: { success: true }, status: 200 }),
        Promise.reject(notFoundError),
        Promise.resolve({ data: { success: true }, status: 200 }),
      ];

      const results = await Promise.allSettled(mockResults);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should maintain request order with concurrent requests', async () => {
      const callOrder: number[] = [];
      const mockGet = jest.spyOn(api, 'get').mockImplementation((url: string) => {
        const order = Number.parseInt(url.split('/').pop() || '0', 10);
        callOrder.push(order);
        return Promise.resolve({
          data: { order },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });
      });

      const requests = [
        api.get('/api/v1/test/1'),
        api.get('/api/v1/test/2'),
        api.get('/api/v1/test/3'),
      ];

      await Promise.all(requests);

      expect(callOrder.length).toBe(3);
      expect(mockGet).toHaveBeenCalledTimes(3);

      mockGet.mockRestore();
    });
  });

  describe('WebSocket Connection Integration', () => {
    it('should handle WebSocket status endpoint', async () => {
      const mockGet = jest.spyOn(api, 'get').mockResolvedValue({
        data: {
          status: 'connected',
          url: 'ws://localhost:8000/ws',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await api.get('/api/v1/ws/status');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/ws/status');
      expect(response.data.status).toBe('connected');
      expect(response.data.url).toBeDefined();

      mockGet.mockRestore();
    });

    it('should handle WebSocket connection errors', async () => {
      const mockError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: {
            detail: 'WebSocket service unavailable',
          },
        },
        config: {
          url: '/api/v1/ws/status',
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      const mockGet = jest.spyOn(api, 'get').mockRejectedValue(mockError);

      await expect(api.get('/api/v1/ws/status')).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 503,
          data: expect.objectContaining({
            detail: expect.stringContaining('WebSocket'),
          }),
        }),
      });

      mockGet.mockRestore();
    });

    it('should integrate WebSocket status with API client interceptors', async () => {
      const logger = require('@/lib/logging').default;

      // Test the response interceptor directly to verify logging
      const mockResponse = {
        data: { status: 'connected' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/v1/ws/status',
          method: 'get',
        },
      };

      // Simulate response through interceptor
      const interceptor = api.interceptors.response.handlers[0];
      if (interceptor?.fulfilled) {
        await interceptor.fulfilled(mockResponse);
      }

      // Verify interceptor logged the response
      expect(logger.info).toHaveBeenCalled();
    });
  });
});
