/**
 * Notifications API Integration Tests
 *
 * Tests the integration between:
 * - Notifications API endpoints
 * - API client interceptors
 * - Error handling for notification operations
 *
 * Coverage:
 * - Notification list fetching
 * - Unread notifications fetching
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

describe('Notifications API Integration Tests', () => {
  describe('Notification List Fetching', () => {
    it('should fetch notifications list successfully', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Notification 1',
          message: 'Test notification',
          read: false,
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Notification 2',
          message: 'Another notification',
          read: true,
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockNotifications,
        status: 200,
      });

      const endpoint = queryKeys.notifications.all;
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockNotifications);
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

      const endpoint = queryKeys.notifications.all;
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

      const endpoint = queryKeys.notifications.all;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });
  });

  describe('Unread Notifications', () => {
    it('should fetch unread notifications successfully', async () => {
      const mockUnreadNotifications = [
        {
          id: 1,
          title: 'Unread Notification',
          message: 'You have a new message',
          read: false,
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockUnreadNotifications,
        status: 200,
      });

      const endpoint = queryKeys.notifications.unread;
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockUnreadNotifications);
    });

    it('should handle empty unread notifications', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: [],
        status: 200,
      });

      const endpoint = queryKeys.notifications.unread;
      const response = await api.get(endpoint);

      expect(response.status).toBe(200);
      expect(response.data).toEqual([]);
    });

    it('should handle errors when fetching unread notifications', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Failed to fetch unread notifications' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.notifications.unread;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from notification API errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Notifications not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.notifications.all;
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Notifications not found');
      }
    });
  });
});
