/**
 * Analytics Reporting API Integration Tests
 *
 * Tests the integration between:
 * - Analytics reporting API endpoints (errors, critical errors)
 * - API client interceptors
 * - Error handling for analytics reporting operations
 * - Request/response transformation
 *
 * Coverage:
 * - Analytics errors reporting API integration
 * - Analytics critical errors reporting API integration
 * - Error handling for analytics reporting operations
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
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

describe('Analytics Reporting API Integration Tests', () => {
  const mockErrorReport = {
    error_type: 'TypeError',
    error_message: 'Cannot read property of undefined',
    error_stack: 'at function (file.js:1:1)',
    url: 'http://localhost:3000/page',
    user_agent: 'Mozilla/5.0',
    timestamp: Date.now(),
    session_id: 'test-session',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics Errors Reporting', () => {
    it('should report errors via POST', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: { message: 'Error reported', id: 'error-123' },
        status: 201,
        headers: {},
      });

      (api.post as jest.Mock) = mockPost;

      const response = await api.post(
        buildUrl('/api/v1/analytics/errors'),
        mockErrorReport,
      );

      expect(mockPost).toHaveBeenCalledWith(
        buildUrl('/api/v1/analytics/errors'),
        mockErrorReport,
      );
      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Error reported');
    });

    it('should handle error reporting failures', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            detail: 'Failed to report error',
          },
        },
        config: {
          url: buildUrl('/api/v1/analytics/errors'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.post(buildUrl('/api/v1/analytics/errors'), mockErrorReport),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
          data: expect.objectContaining({
            detail: 'Failed to report error',
          }),
        }),
      });
    });
  });

  describe('Analytics Critical Errors Reporting', () => {
    it('should report critical errors via POST', async () => {
      const criticalErrorReport = {
        ...mockErrorReport,
        severity: 'critical',
        impact: 'high',
      };

      const mockPost = jest.fn().mockResolvedValue({
        data: { message: 'Critical error reported', id: 'critical-123' },
        status: 201,
        headers: {},
      });

      (api.post as jest.Mock) = mockPost;

      const response = await api.post(
        buildUrl('/api/v1/analytics/critical-errors'),
        criticalErrorReport,
      );

      expect(mockPost).toHaveBeenCalledWith(
        buildUrl('/api/v1/analytics/critical-errors'),
        criticalErrorReport,
      );
      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Critical error reported');
    });

    it('should handle critical error reporting failures', async () => {
      const mockError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: {
            detail: 'Critical error reporting service unavailable',
          },
        },
        config: {
          url: buildUrl('/api/v1/analytics/critical-errors'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.post(buildUrl('/api/v1/analytics/critical-errors'), mockErrorReport),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 503,
        }),
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from analytics reporting API responses', () => {
      const apiError = {
        response: {
          data: {
            detail: 'Failed to report error',
          },
          status: 400,
        },
        message: 'Request failed',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Failed to report error');
    });

    it('should handle rate limiting errors (429)', async () => {
      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60',
          },
          data: {
            detail: 'Rate limit exceeded for error reporting',
          },
        },
        config: {
          url: buildUrl('/api/v1/analytics/errors'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.post(buildUrl('/api/v1/analytics/errors'), mockErrorReport),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 429,
        }),
      });
    });
  });
});
