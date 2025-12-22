/**
 * @fileoverview Comprehensive unit tests for SWR configuration module
 *
 * Tests cover:
 * - Base SWR configuration
 * - Environment-specific configurations (admin, real-time, static, user, document)
 * - Streaming-aware configuration
 * - SWR key generators
 * - Optimistic update helpers
 * - Authenticated fetcher hooks
 *
 * @module tests/swr-config.test
 * @since 0.2.0
 */

import { renderHook } from '@testing-library/react';

// ==============================================================================
// Test Setup & Mocks
// ==============================================================================

// Mock logger to prevent console output
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the API fetcher
jest.mock('../api', () => ({
  fetcher: jest.fn(),
}));

// Mock swrErrorConfig
jest.mock('../errors', () => ({
  swrErrorConfig: {
    shouldRetryOnError: true,
    onError: jest.fn(),
  },
}));

// Mock useAuth hook
const mockGetValidAccessToken = jest.fn();
jest.mock('../context/ConsolidatedAuthContext', () => ({
  useAuth: () => ({
    getValidAccessToken: mockGetValidAccessToken,
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// ==============================================================================
// Module-level mock response factories (extracted to reduce nesting depth - fixes S2004)
// ==============================================================================

// JSON response factory for mock fetch - extracted from inline arrow functions
const createJsonResponse = <T>(data: T): () => Promise<T> => {
  return () => Promise.resolve(data);
};

// Pre-defined response factories for common test scenarios
const jsonResolveTestData = createJsonResponse({ data: 'test' });
const jsonResolveSuccess = createJsonResponse({ success: true });
const jsonResolveDeleted = createJsonResponse({ deleted: true });
const jsonResolveDeletedWithId = createJsonResponse({ deleted: true, id: 1 });

// Mock response object factories
const createOkResponse = (jsonFn: () => Promise<unknown>) => ({
  ok: true,
  json: jsonFn,
});

const createErrorResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
});

const createOkResponseWithHeaders = (
  jsonFn: () => Promise<unknown>,
  contentType: string
) => ({
  ok: true,
  headers: new Headers({ 'content-type': contentType }),
  json: jsonFn,
});

const createOkResponseNoJson = (contentType: string) => ({
  ok: true,
  headers: new Headers({ 'content-type': contentType }),
});

// Predicate factory for finding users by ID (extracted to reduce nesting - fixes S2004)
const createUserIdPredicate = (id: number) => (u: { id: number }) => u.id === id;

describe('SWR Config Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetValidAccessToken.mockReset();
  });

  // ==========================================================================
  // Base Configuration Tests
  // ==========================================================================
  describe('baseSWRConfig', () => {
    it('should have revalidateOnFocus disabled', async () => {
      const { baseSWRConfig } = await import('../swr-config');
      expect(baseSWRConfig.revalidateOnFocus).toBe(false);
    });

    it('should have shouldRetryOnError from swrErrorConfig', async () => {
      const { baseSWRConfig } = await import('../swr-config');
      expect(baseSWRConfig.shouldRetryOnError).toBe(true);
    });

    it('should have errorRetryCount of 3', async () => {
      const { baseSWRConfig } = await import('../swr-config');
      expect(baseSWRConfig.errorRetryCount).toBe(3);
    });

    it('should have errorRetryInterval of 1000ms', async () => {
      const { baseSWRConfig } = await import('../swr-config');
      expect(baseSWRConfig.errorRetryInterval).toBe(1000);
    });

    it('should have dedupingInterval of 5000ms', async () => {
      const { baseSWRConfig } = await import('../swr-config');
      expect(baseSWRConfig.dedupingInterval).toBe(5000);
    });
  });

  // ==========================================================================
  // Admin Configuration Tests
  // ==========================================================================
  describe('adminSWRConfig', () => {
    it('should have refreshInterval of 30 seconds', async () => {
      const { adminSWRConfig } = await import('../swr-config');
      expect(adminSWRConfig.refreshInterval).toBe(30000);
    });

    it('should have revalidateOnReconnect enabled', async () => {
      const { adminSWRConfig } = await import('../swr-config');
      expect(adminSWRConfig.revalidateOnReconnect).toBe(true);
    });

    it('should have dedupingInterval of 10 seconds', async () => {
      const { adminSWRConfig } = await import('../swr-config');
      expect(adminSWRConfig.dedupingInterval).toBe(10000);
    });

    it('should inherit from baseSWRConfig', async () => {
      const { adminSWRConfig, baseSWRConfig } = await import('../swr-config');
      expect(adminSWRConfig.errorRetryCount).toBe(baseSWRConfig.errorRetryCount);
      expect(adminSWRConfig.errorRetryInterval).toBe(baseSWRConfig.errorRetryInterval);
    });
  });

  // ==========================================================================
  // Real-time Configuration Tests
  // ==========================================================================
  describe('realTimeSWRConfig', () => {
    it('should have refreshInterval of 5 seconds', async () => {
      const { realTimeSWRConfig } = await import('../swr-config');
      expect(realTimeSWRConfig.refreshInterval).toBe(5000);
    });

    it('should have revalidateOnReconnect enabled', async () => {
      const { realTimeSWRConfig } = await import('../swr-config');
      expect(realTimeSWRConfig.revalidateOnReconnect).toBe(true);
    });

    it('should have revalidateOnFocus enabled', async () => {
      const { realTimeSWRConfig } = await import('../swr-config');
      expect(realTimeSWRConfig.revalidateOnFocus).toBe(true);
    });

    it('should have dedupingInterval of 2 seconds', async () => {
      const { realTimeSWRConfig } = await import('../swr-config');
      expect(realTimeSWRConfig.dedupingInterval).toBe(2000);
    });
  });

  // ==========================================================================
  // Streaming Configuration Tests
  // ==========================================================================
  describe('streamingSWRConfig', () => {
    it('should return config with polling enabled when not streaming', async () => {
      const { streamingSWRConfig } = await import('../swr-config');
      const config = streamingSWRConfig(false);

      expect(config.refreshInterval).toBe(5000);
      expect(config.revalidateOnReconnect).toBe(true);
      expect(config.revalidateOnFocus).toBe(true);
    });

    it('should return config with polling disabled when streaming', async () => {
      const { streamingSWRConfig } = await import('../swr-config');
      const config = streamingSWRConfig(true);

      expect(config.refreshInterval).toBe(0);
      expect(config.revalidateOnReconnect).toBe(false);
      expect(config.revalidateOnFocus).toBe(false);
    });

    it('should default to not streaming when no argument provided', async () => {
      const { streamingSWRConfig } = await import('../swr-config');
      const config = streamingSWRConfig();

      expect(config.refreshInterval).toBe(5000);
      expect(config.revalidateOnReconnect).toBe(true);
      expect(config.revalidateOnFocus).toBe(true);
    });

    it('should always have dedupingInterval of 2 seconds', async () => {
      const { streamingSWRConfig } = await import('../swr-config');

      expect(streamingSWRConfig(true).dedupingInterval).toBe(2000);
      expect(streamingSWRConfig(false).dedupingInterval).toBe(2000);
    });
  });

  // ==========================================================================
  // Static Configuration Tests
  // ==========================================================================
  describe('staticSWRConfig', () => {
    it('should have refreshInterval of 5 minutes', async () => {
      const { staticSWRConfig } = await import('../swr-config');
      expect(staticSWRConfig.refreshInterval).toBe(300000);
    });

    it('should have revalidateOnReconnect disabled', async () => {
      const { staticSWRConfig } = await import('../swr-config');
      expect(staticSWRConfig.revalidateOnReconnect).toBe(false);
    });

    it('should have dedupingInterval of 1 minute', async () => {
      const { staticSWRConfig } = await import('../swr-config');
      expect(staticSWRConfig.dedupingInterval).toBe(60000);
    });
  });

  // ==========================================================================
  // User Configuration Tests
  // ==========================================================================
  describe('userSWRConfig', () => {
    it('should have refreshInterval of 1 minute', async () => {
      const { userSWRConfig } = await import('../swr-config');
      expect(userSWRConfig.refreshInterval).toBe(60000);
    });

    it('should have revalidateOnReconnect enabled', async () => {
      const { userSWRConfig } = await import('../swr-config');
      expect(userSWRConfig.revalidateOnReconnect).toBe(true);
    });

    it('should have revalidateOnFocus enabled', async () => {
      const { userSWRConfig } = await import('../swr-config');
      expect(userSWRConfig.revalidateOnFocus).toBe(true);
    });
  });

  // ==========================================================================
  // Document Configuration Tests
  // ==========================================================================
  describe('documentSWRConfig', () => {
    it('should have refreshInterval of 15 seconds', async () => {
      const { documentSWRConfig } = await import('../swr-config');
      expect(documentSWRConfig.refreshInterval).toBe(15000);
    });

    it('should have revalidateOnReconnect enabled', async () => {
      const { documentSWRConfig } = await import('../swr-config');
      expect(documentSWRConfig.revalidateOnReconnect).toBe(true);
    });

    it('should have revalidateOnFocus enabled', async () => {
      const { documentSWRConfig } = await import('../swr-config');
      expect(documentSWRConfig.revalidateOnFocus).toBe(true);
    });
  });

  // ==========================================================================
  // SWR Keys Tests
  // ==========================================================================
  describe('swrKeys', () => {
    describe('user keys', () => {
      it('should generate user key with id', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.user(123)).toEqual(['assistant', 123]);
      });

      it('should generate user key without id', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.user()).toEqual(['assistant']);
      });

      it('should generate userProfile key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.userProfile()).toEqual(['assistant', 'profile']);
      });

      it('should generate userSettings key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.userSettings()).toEqual(['assistant', 'settings']);
      });
    });

    describe('admin keys', () => {
      it('should generate adminUsers key without params', async () => {
        const { swrKeys } = await import('../swr-config');
        const key = swrKeys.adminUsers();
        expect(key).toEqual(['/api/v1/admin/users', 'manager', 'users']);
      });

      it('should generate adminUsers key with page', async () => {
        const { swrKeys } = await import('../swr-config');
        const key = swrKeys.adminUsers(2);
        expect(key[0]).toBe('/api/v1/admin/users?page=2');
      });

      it('should generate adminUsers key with page and limit', async () => {
        const { swrKeys } = await import('../swr-config');
        const key = swrKeys.adminUsers(1, 20);
        expect(key[0]).toBe('/api/v1/admin/users?page=1&limit=20');
      });

      it('should generate adminUsers key with all params', async () => {
        const { swrKeys } = await import('../swr-config');
        const key = swrKeys.adminUsers(1, 20, 'john');
        expect(key[0]).toBe('/api/v1/admin/users?page=1&limit=20&search=john');
      });

      it('should generate adminStats key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.adminStats()).toEqual(['/api/v1/admin/stats', 'manager', 'stats']);
      });

      it('should generate systemStatus key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.systemStatus()).toEqual([
          '/api/v1/admin/system/status',
          'manager',
          'system',
          'status',
        ]);
      });

      it('should generate systemMetrics key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.systemMetrics()).toEqual([
          '/api/v1/admin/system/metrics',
          'manager',
          'system',
          'metrics',
        ]);
      });
    });

    describe('activity keys', () => {
      it('should generate recentActivity key without filters', async () => {
        const { swrKeys } = await import('../swr-config');
        const key = swrKeys.recentActivity();
        expect(key).toEqual(['/api/v1/admin/activity/recent', 'manager', 'activity']);
      });

      it('should generate recentActivity key with filters', async () => {
        const { swrKeys } = await import('../swr-config');
        const key = swrKeys.recentActivity({ hours: 24, type: 'login' });
        expect(key[0]).toContain('/api/v1/admin/activity/recent?');
        expect(key[0]).toContain('hours=24');
        expect(key[0]).toContain('type=login');
      });

      it('should generate activitySummary key with default hours', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.activitySummary()).toEqual([
          '/api/v1/admin/activity/summary?hours=24',
          'manager',
          'activity',
          'summary',
        ]);
      });

      it('should generate activitySummary key with custom hours', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.activitySummary(48)[0]).toBe('/api/v1/admin/activity/summary?hours=48');
      });

      it('should generate activityTypes key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.activityTypes()).toEqual([
          '/api/v1/admin/activity/types',
          'manager',
          'activity',
          'types',
        ]);
      });

      it('should generate activityAnalytics key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.activityAnalytics()).toEqual([
          '/api/v1/admin/activity/analytics',
          'manager',
          'activity',
          'analytics',
        ]);
      });
    });

    describe('health keys', () => {
      it('should generate healthCheck key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.healthCheck()).toEqual([
          '/api/v1/admin/system/health-check',
          'manager',
          'health',
        ]);
      });

      it('should generate healthHistory key without period', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.healthHistory()).toEqual([
          '/api/v1/health-check/history',
          'manager',
          'health',
          'history',
        ]);
      });

      it('should generate healthHistory key with period', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.healthHistory('24h')[0]).toBe('/api/v1/health-check/history?period=24h');
      });

      it('should generate healthTrends key with default days', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.healthTrends()[0]).toBe('/api/v1/health-check/trends?days=7');
      });

      it('should generate healthTrends key with custom days', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.healthTrends(30)[0]).toBe('/api/v1/health-check/trends?days=30');
      });
    });

    describe('document keys', () => {
      it('should generate documents key without params', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.documents()).toEqual(['/api/v1/documents/', 'documents']);
      });

      it('should generate documents key with page', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.documents(1)[0]).toBe('/api/v1/documents/?page=1');
      });

      it('should generate documents key with page and limit', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.documents(2, 25)[0]).toBe('/api/v1/documents/?page=2&limit=25');
      });

      it('should generate document key with number id', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.document(123)).toEqual(['/api/v1/documents/123', 'document', 123]);
      });

      it('should generate document key with string id', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.document('abc-123')).toEqual(['/api/v1/documents/abc-123', 'document', 'abc-123']);
      });
    });

    describe('dashboard and websocket keys', () => {
      it('should generate dashboardStats key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.dashboardStats()).toEqual(['/api/v1/stats/overview', 'dashboard', 'stats']);
      });

      it('should generate wsStatus key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.wsStatus()).toEqual(['/api/v1/ws/status', 'websocket', 'status']);
      });

      it('should generate userAnalytics key', async () => {
        const { swrKeys } = await import('../swr-config');
        expect(swrKeys.userAnalytics()).toEqual([
          '/api/v1/admin/users/analytics',
          'manager',
          'users',
          'analytics',
        ]);
      });
    });
  });

  // ==========================================================================
  // Optimistic Updates Tests
  // ==========================================================================
  describe('optimisticUpdates', () => {
    describe('updateUserInList', () => {
      it('should update matching user in list', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const users = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ];
        const updatedUser = { id: 2, name: 'Bob Updated', email: 'bob@example.com' };

        const result = optimisticUpdates.updateUserInList(users, updatedUser);

        expect(result).toHaveLength(3);
        expect(result[1]).toEqual({ id: 2, name: 'Bob Updated', email: 'bob@example.com' });
      });

      it('should not modify other users', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const users = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ];
        const updatedUser = { id: 2, name: 'Bob Updated' };

        const result = optimisticUpdates.updateUserInList(users, updatedUser);

        expect(result[0]).toEqual({ id: 1, name: 'Alice' });
      });

      it('should handle user not in list', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const users = [{ id: 1, name: 'Alice' }];
        const updatedUser = { id: 999, name: 'Unknown' };

        const result = optimisticUpdates.updateUserInList(users, updatedUser);

        expect(result).toEqual([{ id: 1, name: 'Alice' }]);
      });
    });

    describe('removeUserFromList', () => {
      it('should remove user from list', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const users = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ];

        const result = optimisticUpdates.removeUserFromList(users, 2);

        expect(result).toHaveLength(2);
        expect(result.find(createUserIdPredicate(2))).toBeUndefined();
      });

      it('should handle removing non-existent user', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const users = [{ id: 1, name: 'Alice' }];

        const result = optimisticUpdates.removeUserFromList(users, 999);

        expect(result).toEqual(users);
      });
    });

    describe('addUserToList', () => {
      it('should add user to beginning of list', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const users = [{ id: 1, name: 'Alice' }];
        const newUser = { id: 2, name: 'Bob' };

        const result = optimisticUpdates.addUserToList(users, newUser);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(newUser);
      });

      it('should handle empty list', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const newUser = { id: 1, name: 'Alice' };

        const result = optimisticUpdates.addUserToList([], newUser);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newUser);
      });
    });

    describe('updateDocumentInList', () => {
      it('should update matching document', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const documents = [
          { id: 1, title: 'Doc 1' },
          { id: 2, title: 'Doc 2' },
        ];
        const updatedDoc = { id: 2, title: 'Doc 2 Updated', status: 'processed' };

        const result = optimisticUpdates.updateDocumentInList(documents, updatedDoc);

        expect(result[1]).toEqual({ id: 2, title: 'Doc 2 Updated', status: 'processed' });
      });
    });

    describe('removeDocumentFromList', () => {
      it('should remove document from list', async () => {
        const { optimisticUpdates } = await import('../swr-config');
        const documents = [
          { id: 1, title: 'Doc 1' },
          { id: 2, title: 'Doc 2' },
        ];

        const result = optimisticUpdates.removeDocumentFromList(documents, 1);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Authenticated Fetcher Hook Tests (flattened to reduce nesting - fixes S2004)
  // ==========================================================================
  describe('useAuthenticatedFetcher', () => {
    it('should return fetcher functions', async () => {
      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      expect(typeof result.current.fetcher).toBe('function');
      expect(typeof result.current.postFetcher).toBe('function');
      expect(typeof result.current.putFetcher).toBe('function');
      expect(typeof result.current.deleteFetcher).toBe('function');
    });

    it('authenticatedFetcher - should throw error when no token available', async () => {
      mockGetValidAccessToken.mockResolvedValue(null);

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      await expect(result.current.fetcher('/api/test')).rejects.toThrow('Authentication required');
    });

    it('authenticatedFetcher - should make authenticated GET request with token', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(createOkResponse(jsonResolveTestData));

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      await result.current.fetcher('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
    });

    it('authenticatedFetcher - should throw error on non-ok response', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(createErrorResponse(404, 'Not Found'));

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      await expect(result.current.fetcher('/api/test')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('postFetcher - should make POST request with body', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(createOkResponse(jsonResolveSuccess));

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      await result.current.postFetcher('/api/users', { name: 'Test User' });

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });
    });

    it('putFetcher - should make PUT request with body', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(createOkResponse(jsonResolveSuccess));

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      await result.current.putFetcher('/api/users/1', { name: 'Updated Name' });

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
    });

    it('deleteFetcher - should make DELETE request', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(
        createOkResponseWithHeaders(jsonResolveDeleted, 'application/json')
      );

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      await result.current.deleteFetcher('/api/users/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
    });

    it('deleteFetcher - should return success object for non-JSON response', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(createOkResponseNoJson('text/plain'));

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      const response = await result.current.deleteFetcher('/api/users/1');

      expect(response).toEqual({ success: true });
    });

    it('deleteFetcher - should parse JSON response when content-type is JSON', async () => {
      mockGetValidAccessToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(
        createOkResponseWithHeaders(jsonResolveDeletedWithId, 'application/json')
      );

      const { useAuthenticatedFetcher } = await import('../swr-config');
      const { result } = renderHook(() => useAuthenticatedFetcher());

      const response = await result.current.deleteFetcher('/api/users/1');

      expect(response).toEqual({ deleted: true, id: 1 });
    });
  });

  // ==========================================================================
  // Default Export Tests
  // ==========================================================================
  describe('default export', () => {
    it('should export baseSWRConfig as default', async () => {
      const defaultExport = (await import('../swr-config')).default;
      const { baseSWRConfig } = await import('../swr-config');

      expect(defaultExport).toBe(baseSWRConfig);
    });
  });
});
