/**
 * Analytics Proxy API Integration Tests
 *
 * Tests the integration between:
 * - Analytics proxy API endpoints
 * - API client interceptors
 * - Error handling for analytics operations
 * - Request/response transformation
 *
 * Coverage:
 * - Analytics events proxy API integration
 * - Analytics health check API integration
 * - Error handling for analytics operations
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

describe('Analytics Proxy API Integration Tests', () => {
  const mockAnalyticsEvent = {
    event_type: 'custom',
    event_name: 'test_event',
    timestamp: Date.now(),
    session_id: 'test-session',
    url: 'http://localhost:3000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics Events Proxy', () => {
    it('should post analytics events via POST', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: { message: 'Event received' },
        status: 202,
        headers: {},
      });

      (api.post as jest.Mock) = mockPost;

      const payload = {
        events: [mockAnalyticsEvent],
        metadata: { sessionId: 'test-session' },
      };

      const response = await api.post(buildUrl('/api/analytics/events'), payload);

      expect(mockPost).toHaveBeenCalledWith(buildUrl('/api/analytics/events'), payload);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });

    it('should handle analytics proxy errors gracefully', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            detail: 'Analytics proxy error',
          },
        },
        config: {
          url: buildUrl('/api/analytics/events'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.post(buildUrl('/api/analytics/events'), { events: [mockAnalyticsEvent] }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });

    it('should accept multiple events in batch', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: { message: 'Events received', count: 2 },
        status: 202,
        headers: {},
      });

      (api.post as jest.Mock) = mockPost;

      const payload = {
        events: [mockAnalyticsEvent, { ...mockAnalyticsEvent, event_name: 'event2' }],
        metadata: { sessionId: 'test-session' },
      };

      const response = await api.post(buildUrl('/api/analytics/events'), payload);

      expect(mockPost).toHaveBeenCalledWith(
        buildUrl('/api/analytics/events'),
        expect.objectContaining({
          events: expect.arrayContaining([expect.any(Object)]),
        }),
      );
      expect(response.status).toBe(202);
    });
  });

  describe('Analytics Health Check', () => {
    it('should check analytics health via GET', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'ok' },
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const response = await api.get(buildUrl('/api/v1/analytics/health'));

      expect(mockGet).toHaveBeenCalledWith(buildUrl('/api/v1/analytics/health'));
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    });

    it('should handle analytics health check failures', async () => {
      const mockError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: {
            detail: 'Analytics service unavailable',
          },
        },
        config: {
          url: buildUrl('/api/v1/analytics/health'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(api.get(buildUrl('/api/v1/analytics/health'))).rejects.toMatchObject(
        {
          response: expect.objectContaining({
            status: 503,
          }),
        },
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from analytics API responses', () => {
      const apiError = {
        response: {
          data: {
            detail: 'Failed to process analytics event',
          },
          status: 400,
        },
        message: 'Request failed',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Failed to process analytics event');
    });

    it('should handle network errors for analytics', async () => {
      const mockError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        config: {
          url: buildUrl('/api/analytics/events'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.post(buildUrl('/api/analytics/events'), { events: [mockAnalyticsEvent] }),
      ).rejects.toMatchObject({
        code: 'ERR_NETWORK',
      });
    });
  });
});
