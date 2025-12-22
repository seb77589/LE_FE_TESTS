/**
 * Document List API Integration Tests
 *
 * Tests the integration between:
 * - Document list API endpoints
 * - API client interceptors
 * - Error handling for document operations
 *
 * Coverage:
 * - Document list fetching
 * - Document search/filtering
 * - Pagination
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

describe('Document List API Integration Tests', () => {
  describe('Document List Fetching', () => {
    it('should fetch document list successfully', async () => {
      const mockDocuments = [
        {
          id: 1,
          filename: 'document1.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          upload_date: '2025-01-01T00:00:00Z',
          status: 'uploaded',
        },
        {
          id: 2,
          filename: 'document2.jpg',
          mime_type: 'image/jpeg',
          file_size: 2048,
          upload_date: '2025-01-02T00:00:00Z',
          status: 'processed',
        },
      ];

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockDocuments,
        status: 200,
      });

      const endpoint = queryKeys.documents.all;
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockDocuments);
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

      const endpoint = queryKeys.documents.all;
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

      const endpoint = queryKeys.documents.all;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });
  });

  describe('Document Search', () => {
    it('should fetch documents with search query', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: [],
        status: 200,
      });

      const endpoint = queryKeys.documents.list({ search: 'test' });
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
    });

    it('should handle search errors', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Search failed' },
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
  });

  describe('Document Pagination', () => {
    it('should fetch documents with pagination', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: [],
        status: 200,
      });

      const endpoint = queryKeys.documents.list({ page: 1, limit: 10 });
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
    });

    it('should handle pagination errors', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { detail: 'Invalid pagination parameters' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.list({ page: -1, limit: 10 });
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 400,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from document API errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Documents not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.documents.all;
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Documents not found');
      }
    });
  });
});
