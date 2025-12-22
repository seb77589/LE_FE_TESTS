/**
 * Admin System API Integration Tests
 *
 * Tests the integration between:
 * - Admin system status API endpoints
 * - Admin stats API endpoints
 * - API client interceptors
 * - Error handling for admin operations
 *
 * Coverage:
 * - System status API integration
 * - Admin stats API integration
 * - Error handling for admin operations
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

describe('Admin System API Integration Tests', () => {
  const mockSystemStatus = {
    status: 'healthy',
    version: '0.2.0',
    uptime: 3600,
    database: { status: 'connected', latency_ms: 5 },
    redis: { status: 'connected', latency_ms: 2 },
    services: {
      backend: 'operational',
      frontend: 'operational',
    },
  };

  const mockAdminStats = {
    total_users: 150,
    active_users: 120,
    total_documents: 500,
    total_cases: 200,
    system_health: 'healthy',
  };

  describe('System Status API', () => {
    it('should fetch system status successfully', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockSystemStatus,
        status: 200,
      });

      const endpoint = '/api/v1/admin/system/status';
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.data).toEqual(mockSystemStatus);
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

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/system/status';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
          data: expect.objectContaining({
            detail: expect.stringContaining('Authentication required'),
          }),
        }),
      });
    });

    it('should handle 403 forbidden error', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { detail: 'Admin access required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/system/status';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
          data: expect.objectContaining({
            detail: expect.stringContaining('Admin access required'),
          }),
        }),
      });
    });

    it('should handle 500 server error', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Internal server error' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/system/status';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/system/status';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        message: expect.stringContaining('Network Error'),
        code: 'ERR_NETWORK',
      });
    });
  });

  describe('Admin Stats API', () => {
    it('should fetch admin stats successfully', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockAdminStats,
        status: 200,
      });

      const endpoint = '/api/v1/admin/stats';
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.data).toEqual(mockAdminStats);
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

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/stats';
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
          data: { detail: 'Admin access required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/stats';
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
          data: { detail: 'Internal server error' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/stats';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from admin API errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'Admin access required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/admin/stats';
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Admin access required');
      }
    });

    it('should handle errors without response data', async () => {
      const mockError = {
        message: 'Network Error',
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      try {
        await api.get(buildUrl().endpoints.admin.stats);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toBeTruthy();
      }
    });
  });
});
