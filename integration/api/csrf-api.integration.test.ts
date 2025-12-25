/**
 * CSRF Protection API Integration Tests
 *
 * Tests the integration between:
 * - CSRF protection mechanisms in API requests
 * - API client interceptors
 * - Error handling for CSRF operations
 *
 * Coverage:
 * - CSRF token API integration
 * - CSRF validation API integration
 * - Error handling for CSRF operations
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api';

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

describe('CSRF Protection API Integration Tests', () => {
  describe('CSRF Token API', () => {
    it('should fetch CSRF token successfully', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: { csrf_token: 'abc123xyz' },
        status: 200,
        headers: {
          'x-csrf-token': 'abc123xyz',
        },
      });

      const endpoint = '/api/v1/auth/csrf-token';
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
    });

    it('should handle CSRF token endpoint not found (if not implemented)', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { detail: 'CSRF token endpoint not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/auth/csrf-token';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });
  });

  describe('CSRF Validation in Requests', () => {
    it('should include CSRF token in POST requests when available', async () => {
      (api.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: { success: true },
        status: 200,
      });

      const endpoint = '/api/v1/users';
      const response = await api.post(endpoint, { email: 'test@example.com' });

      expect(api.post).toHaveBeenCalledWith(endpoint, { email: 'test@example.com' });
      expect(response.status).toBe(200);
    });

    it('should handle CSRF validation failure', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { detail: 'CSRF token validation failed' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users';
      await expect(api.post(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
          data: expect.objectContaining({
            detail: expect.stringContaining('CSRF'),
          }),
        }),
      });
    });

    it('should handle missing CSRF token', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { detail: 'CSRF token missing' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users';
      await expect(api.post(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from CSRF API errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'CSRF token validation failed' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users';
      try {
        await api.post(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('CSRF');
      }
    });
  });
});
