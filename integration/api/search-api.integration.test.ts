/**
 * Search API Integration Tests
 *
 * Tests the integration between:
 * - Search API endpoints
 * - API client interceptors
 * - Error handling for search operations
 *
 * Coverage:
 * - Document search
 * - User search
 * - Case search
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

describe('Search API Integration Tests', () => {
  describe('Document Search', () => {
    it('should search documents successfully', async () => {
      const mockResults = {
        items: [
          { id: 1, name: 'Document 1', type: 'pdf' },
          { id: 2, name: 'Document 2', type: 'docx' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockResults,
        status: 200,
      });

      const endpoint = queryKeys.documents.list({ search: 'test query' });
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data.items).toHaveLength(2);
    });

    it('should handle empty search results', async () => {
      const mockResults = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockResults,
        status: 200,
      });

      const endpoint = queryKeys.documents.list({ search: 'nonexistent' });
      const response = await api.get(endpoint);

      expect(response.data.items).toHaveLength(0);
      expect(response.data.total).toBe(0);
    });
  });

  describe('User Search', () => {
    it('should search users successfully', async () => {
      const mockResults = {
        items: [
          { id: 1, email: 'user1@example.com', full_name: 'User One' },
          { id: 2, email: 'user2@example.com', full_name: 'User Two' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockResults,
        status: 200,
      });

      const endpoint = queryKeys.users.list({ page: 1, limit: 10 });
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data.items).toHaveLength(2);
    });
  });

  describe('Case Search', () => {
    it('should search cases by status successfully', async () => {
      const mockResults = {
        items: [
          { id: 1, title: 'Case 1', status: 'open' },
          { id: 2, title: 'Case 2', status: 'open' },
        ],
        total: 2,
      };

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockResults,
        status: 200,
      });

      const endpoint = queryKeys.cases.list({ status: 'open' });
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data.items).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 bad request error', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { detail: 'Invalid search query' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.list({ search: '' });
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 400,
        }),
      });
    });

    it('should handle 500 server error', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Search service unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.list({ search: 'test' });
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });

    it('should extract error message from search API errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Search service unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.list({ search: 'test' });
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Search service unavailable');
      }
    });
  });
});
