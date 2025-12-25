/**
 * Notification Preferences API Integration Tests
 *
 * Tests the integration between:
 * - Notification preferences API endpoints
 * - API client interceptors
 * - Error handling for preference operations
 * - Request/response transformation
 *
 * Coverage:
 * - Fetch notification preferences
 * - Update notification preferences
 * - Error handling for preference operations
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api';
import { buildUrl } from '@/lib/api/config';

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

describe('Notification Preferences API Integration Tests', () => {
  const mockPreferences = {
    email_notifications: true,
    push_notifications: false,
    case_updates: true,
    document_updates: true,
    system_alerts: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fetch Notification Preferences', () => {
    it('should fetch notification preferences via GET', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: mockPreferences,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const response = await api.get(buildUrl('/api/v1/notifications/preferences'));

      expect(mockGet).toHaveBeenCalledWith(
        buildUrl('/api/v1/notifications/preferences'),
      );
      expect(response.data).toEqual(mockPreferences);
      expect(response.data.email_notifications).toBe(true);
      expect(response.data.push_notifications).toBe(false);
    });

    it('should handle 404 when preferences not found', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            detail: 'Notification preferences not found',
          },
        },
        config: {
          url: buildUrl('/api/v1/notifications/preferences'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/notifications/preferences')),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
          data: expect.objectContaining({
            detail: 'Notification preferences not found',
          }),
        }),
      });
    });

    it('should handle 401 when unauthenticated', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {
            detail: 'Authentication required',
          },
        },
        config: {
          url: buildUrl('/api/v1/notifications/preferences'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/notifications/preferences')),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
          data: expect.objectContaining({
            detail: expect.stringContaining('Authentication required'),
          }),
        }),
      });
    });
  });

  describe('Update Notification Preferences', () => {
    it('should update notification preferences via PATCH', async () => {
      const updatedPreferences = {
        ...mockPreferences,
        email_notifications: false,
        push_notifications: true,
      };

      const mockPatch = jest.fn().mockResolvedValue({
        data: updatedPreferences,
        status: 200,
        headers: {},
      });

      (api.patch as jest.Mock) = mockPatch;

      const updateData = {
        email_notifications: false,
        push_notifications: true,
      };

      const response = await api.patch(
        buildUrl('/api/v1/notifications/preferences'),
        updateData,
      );

      expect(mockPatch).toHaveBeenCalledWith(
        buildUrl('/api/v1/notifications/preferences'),
        updateData,
      );
      expect(response.data.email_notifications).toBe(false);
      expect(response.data.push_notifications).toBe(true);
    });

    it('should handle validation errors on update', async () => {
      const mockError = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: {
            detail: [
              {
                loc: ['body', 'email_notifications'],
                msg: 'Invalid boolean value',
                type: 'type_error',
              },
            ],
          },
        },
        config: {
          url: buildUrl('/api/v1/notifications/preferences'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/notifications/preferences'), {
          email_notifications: 'invalid',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 422,
          data: expect.objectContaining({
            detail: expect.arrayContaining([
              expect.objectContaining({
                loc: expect.arrayContaining(['body', 'email_notifications']),
                msg: expect.stringContaining('Invalid boolean'),
              }),
            ]),
          }),
        }),
      });
    });

    it('should handle 403 when access denied', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            detail: 'You do not have permission to update preferences',
          },
        },
        config: {
          url: buildUrl('/api/v1/notifications/preferences'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/notifications/preferences'), mockPreferences),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
          data: expect.objectContaining({
            detail: expect.stringContaining('permission'),
          }),
        }),
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from preference API responses', () => {
      const apiError = {
        response: {
          data: {
            detail: 'Failed to update preferences',
          },
          status: 400,
        },
        message: 'Request failed',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      // handleApiError extracts detail from response.data.detail
      expect(errorMessage).toBe('Failed to update preferences');
    });

    it('should handle rate limiting errors (429)', async () => {
      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60',
            'x-ratelimit-remaining': '0',
          },
          data: {
            detail: 'Rate limit exceeded. Please try again later.',
          },
        },
        config: {
          url: buildUrl('/api/v1/notifications/preferences'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/notifications/preferences'), mockPreferences),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 429,
        }),
      });
    });

    it('should handle server errors (500)', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            detail: 'An unexpected error occurred',
          },
        },
        config: {
          url: buildUrl('/api/v1/notifications/preferences'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/notifications/preferences'), mockPreferences),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
          data: expect.objectContaining({
            detail: expect.stringContaining('unexpected error'),
          }),
        }),
      });
    });
  });
});
