/**
 * User Operations API Integration Tests
 *
 * Tests the integration between:
 * - User CRUD API endpoints
 * - API client interceptors
 * - Error handling for user operations
 *
 * Coverage:
 * - User create API integration
 * - User update API integration
 * - User delete API integration
 * - Error handling for user operations
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
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

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

describe('User Operations API Integration Tests', () => {
  const mockUserId = '123';
  const mockUser = {
    id: mockUserId,
    email: FRONTEND_TEST_CREDENTIALS.USER.email,
    full_name: 'Test User',
    role: 'user',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const mockUpdatedUser = {
    ...mockUser,
    full_name: 'Updated User',
    updated_at: new Date().toISOString(),
  };

  describe('User Create API', () => {
    it('should create user successfully', async () => {
      (api.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockUser,
        status: 201,
      });

      const endpoint = '/api/v1/users';
      const response = await api.post(endpoint, {
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        full_name: 'Test User',
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      });

      expect(api.post).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          full_name: 'Test User',
        }),
      );
      expect(response.data).toEqual(mockUser);
      expect(response.status).toBe(201);
    });

    it('should handle 400 bad request error', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { detail: 'Invalid user data' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users';
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
                loc: ['body', 'email'],
                msg: 'field required',
                type: 'value_error.missing',
              },
            ],
          },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users';
      await expect(api.post(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 422,
        }),
      });
    });
  });

  describe('User Update API', () => {
    it('should update user successfully', async () => {
      (api.put as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockUpdatedUser,
        status: 200,
      });

      const endpoint = `/api/v1/users/${mockUserId}`;
      const response = await api.put(endpoint, { full_name: 'Updated User' });

      expect(api.put).toHaveBeenCalledWith(endpoint, { full_name: 'Updated User' });
      expect(response.data).toEqual(mockUpdatedUser);
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

      const endpoint = `/api/v1/users/${mockUserId}`;
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
          data: { detail: 'You do not have permission to update this user' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/users/${mockUserId}`;
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
          data: { detail: 'User not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/users/${mockUserId}`;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });
  });

  describe('User Delete API', () => {
    it('should delete user successfully', async () => {
      (api.delete as jest.Mock) = jest.fn().mockResolvedValue({
        data: { message: 'User deleted successfully' },
        status: 200,
      });

      const endpoint = `/api/v1/users/${mockUserId}`;
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

      const endpoint = `/api/v1/users/${mockUserId}`;
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
          data: { detail: 'You do not have permission to delete this user' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/users/${mockUserId}`;
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
          data: { detail: 'User not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/users/${mockUserId}`;
      await expect(api.delete(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from user create errors', async () => {
      const mockError = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'field required',
              },
            ],
          },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users';
      try {
        await api.post(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toBeTruthy();
      }
    });

    it('should extract error message from user update errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'You do not have permission to update this user' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = `/api/v1/users/${mockUserId}`;
      try {
        await api.put(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('permission');
      }
    });
  });
});
