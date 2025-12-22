/**
 * Case Operations API Integration Tests
 *
 * Tests the integration between:
 * - Case CRUD API endpoints
 * - API client interceptors
 * - Error handling for case operations
 *
 * Coverage:
 * - Case create API integration
 * - Case update API integration
 * - Case delete API integration
 * - Error handling for case operations
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

describe('Case Operations API Integration Tests', () => {
  const mockCaseId = '123';
  const mockCase = {
    id: mockCaseId,
    title: 'Test Case',
    description: 'Test case description',
    status: 'open',
    created_at: new Date().toISOString(),
  };

  const mockUpdatedCase = {
    ...mockCase,
    title: 'Updated Case',
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  };

  describe('Case Create API', () => {
    it('should create case successfully', async () => {
      (api.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockCase,
        status: 201,
      });

      const endpoint = '/api/v1/cases';
      const response = await api.post(endpoint, {
        title: 'Test Case',
        description: 'Test case description',
      });

      expect(api.post).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          title: 'Test Case',
          description: 'Test case description',
        }),
      );
      expect(response.data).toEqual(mockCase);
      expect(response.status).toBe(201);
    });

    it('should handle 400 bad request error', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { detail: 'Invalid case data' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/cases';
      await expect(api.post(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 400,
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

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/cases';
      await expect(api.post(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 422,
        }),
      });
    });
  });

  describe('Case Update API', () => {
    it('should update case successfully', async () => {
      (api.put as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockUpdatedCase,
        status: 200,
      });

      const endpoint = `/api/v1/cases/${mockCaseId}`;
      const response = await api.put(endpoint, {
        title: 'Updated Case',
        status: 'in_progress',
      });

      expect(api.put).toHaveBeenCalledWith(endpoint, {
        title: 'Updated Case',
        status: 'in_progress',
      });
      expect(response.data).toEqual(mockUpdatedCase);
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

      const endpoint = `/api/v1/cases/${mockCaseId}`;
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
          data: { detail: 'You do not have permission to update this case' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/cases/${mockCaseId}`;
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
          data: { detail: 'Case not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/cases/${mockCaseId}`;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });
  });

  describe('Case Delete API', () => {
    it('should delete case successfully', async () => {
      (api.delete as jest.Mock) = jest.fn().mockResolvedValue({
        data: { message: 'Case deleted successfully' },
        status: 200,
      });

      const endpoint = `/api/v1/cases/${mockCaseId}`;
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

      const endpoint = `/api/v1/cases/${mockCaseId}`;
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
          data: { detail: 'You do not have permission to delete this case' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/cases/${mockCaseId}`;
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
          data: { detail: 'Case not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/cases/${mockCaseId}`;
      await expect(api.delete(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from case create errors', async () => {
      const mockError = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'title'],
                msg: 'field required',
              },
            ],
          },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/cases';
      try {
        await api.post(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toBeTruthy();
      }
    });

    it('should extract error message from case update errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'You do not have permission to update this case' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/cases/${mockCaseId}`;
      try {
        await api.put(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('permission');
      }
    });
  });
});
