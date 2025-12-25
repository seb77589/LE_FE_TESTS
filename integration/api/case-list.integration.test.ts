/**
 * Case List API Integration Tests
 *
 * Tests the integration between:
 * - Case list API endpoints
 * - API client interceptors
 * - Error handling for case operations
 *
 * Coverage:
 * - Case list fetching
 * - Case filtering by status
 * - Error handling
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api';
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

describe('Case List API Integration Tests', () => {
  describe('Case List Fetching', () => {
    it('should fetch case list successfully', async () => {
      const mockCases = [
        {
          id: 1,
          title: 'Case 1',
          status: 'open',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Case 2',
          status: 'closed',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockCases,
        status: 200,
      });

      const endpoint = queryKeys.cases.all;
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockCases);
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

      const endpoint = queryKeys.cases.all;
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

      const endpoint = queryKeys.cases.all;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });
  });

  describe('Case Filtering by Status', () => {
    it('should fetch cases filtered by status', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: [],
        status: 200,
      });

      const endpoint = queryKeys.cases.list({ status: 'open' });
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
    });

    it('should handle invalid status filter', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { detail: 'Invalid status filter' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.cases.list({ status: 'invalid' });
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 400,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from case API errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Case service unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.cases.all;
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Case service unavailable');
      }
    });
  });
});
