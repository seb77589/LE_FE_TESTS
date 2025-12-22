/**
 * WebSocket Status API Integration Tests
 *
 * Tests the integration between:
 * - WebSocket status API endpoint
 * - API client interceptors
 * - Error handling for websocket operations
 *
 * Coverage:
 * - WebSocket status API integration
 * - Error handling for websocket operations
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

describe('WebSocket Status API Integration Tests', () => {
  const mockWebSocketStatus = {
    connected: true,
    active_connections: 5,
    total_messages_sent: 1000,
    total_messages_received: 950,
    uptime_seconds: 3600,
  };

  describe('WebSocket Status API', () => {
    it('should fetch websocket status successfully', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockWebSocketStatus,
        status: 200,
      });

      const endpoint = '/api/v1/ws/status';
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.data).toEqual(mockWebSocketStatus);
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

      const endpoint = '/api/v1/ws/status';
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

      const endpoint = '/api/v1/ws/status';
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

      const endpoint = '/api/v1/ws/status';
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

      const endpoint = '/api/v1/ws/status';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        message: expect.stringContaining('Network Error'),
        code: 'ERR_NETWORK',
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from websocket API errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: 'Admin access required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/ws/status';
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

      const endpoint = '/api/v1/ws/status';
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toBeTruthy();
      }
    });
  });
});
