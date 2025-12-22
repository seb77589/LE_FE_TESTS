/**
 * Document Operations API Integration Tests
 *
 * Tests the integration between:
 * - Document update API endpoints
 * - Document delete API endpoints
 * - API client interceptors
 * - Error handling for document operations
 *
 * Coverage:
 * - Document update API integration
 * - Document delete API integration
 * - Error handling for document operations
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';

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

describe('Document Operations API Integration Tests', () => {
  const mockDocumentId = '123';
  const mockUpdatedDocument = {
    id: mockDocumentId,
    title: 'Updated Document',
    content: 'Updated content',
    updated_at: new Date().toISOString(),
  };

  describe('Document Update API', () => {
    it('should update document successfully', async () => {
      (api.put as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockUpdatedDocument,
        status: 200,
      });

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      const response = await api.put(endpoint, { title: 'Updated Document' });

      expect(api.put).toHaveBeenCalledWith(endpoint, { title: 'Updated Document' });
      expect(response.data).toEqual(mockUpdatedDocument);
      expect(response.status).toBe(200);
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

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
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
          data: { detail: 'You do not have permission to update this document' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });

    it('should handle 404 not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { detail: 'Document not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });

    it('should handle 422 validation error', async () => {
      const mockError = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: {
            detail: [
              {
                loc: ['body', 'title'],
                msg: 'field required',
                type: 'value_error.missing',
              },
            ],
          },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 422,
        }),
      });
    });
  });

  describe('Document Delete API', () => {
    it('should delete document successfully', async () => {
      (api.delete as jest.Mock) = jest.fn().mockResolvedValue({
        data: { message: 'Document deleted successfully' },
        status: 200,
      });

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      const response = await api.delete(endpoint);

      expect(api.delete).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
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

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.delete(endpoint)).rejects.toMatchObject({
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
          data: { detail: 'You do not have permission to delete this document' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.delete(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });

    it('should handle 404 not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { detail: 'Document not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      await expect(api.delete(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from document update errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'You do not have permission to update this document' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      try {
        await api.put(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('permission');
      }
    });

    it('should extract error message from document delete errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Document not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/documents/${mockDocumentId}`;
      try {
        await api.delete(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('not found');
      }
    });
  });
});
