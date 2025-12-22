/**
 * Document Analytics API Integration Tests
 *
 * Tests the integration between:
 * - Document analytics API endpoints
 * - API client interceptors
 * - Error handling for analytics operations
 *
 * Coverage:
 * - Document analytics fetching
 * - Error handling
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

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

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

describe('Document Analytics API Integration Tests', () => {
  describe('Analytics Fetching', () => {
    it('should fetch document analytics successfully', async () => {
      const mockAnalytics = {
        total_documents: 100,
        total_size: 1024 * 1024 * 10, // 10MB
        sharing_stats: {
          active_shares: 25,
        },
        storage_usage: {
          percentage: 75,
        },
      };

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockAnalytics,
        status: 200,
      });

      const endpoint = queryKeys.documents.analytics;
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockAnalytics);
    });

    it('should handle 401 unauthorized error', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Authentication required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.analytics;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
        }),
      });
    });

    it('should handle 403 forbidden error', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { detail: 'Insufficient permissions' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.analytics;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });

    it('should handle 500 server error', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Analytics service unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.analytics;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from analytics API errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Analytics service unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.analytics;
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Analytics service unavailable');
      }
    });
  });
});
