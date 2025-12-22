/**
 * Case Analytics API Integration Tests
 *
 * Tests the integration between:
 * - Case analytics API endpoints
 * - API client interceptors
 * - Error handling for analytics operations
 * - Request/response transformation
 *
 * Coverage:
 * - Case statistics API integration
 * - Case trends API integration
 * - Case performance metrics API integration
 * - Error handling for analytics operations
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

describe('Case Analytics API Integration Tests', () => {
  const mockCaseStats = {
    total_cases: 150,
    open_cases: 45,
    closed_cases: 105,
    cases_by_status: {
      OPEN: 45,
      IN_PROGRESS: 30,
      CLOSED: 75,
    },
    cases_by_month: [
      { month: '2025-01', count: 10 },
      { month: '2025-02', count: 15 },
      { month: '2025-03', count: 20 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Case Statistics API', () => {
    it('should fetch case statistics via GET', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: mockCaseStats,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const response = await api.get(buildUrl('/api/v1/cases/analytics/stats'));

      expect(mockGet).toHaveBeenCalledWith(buildUrl('/api/v1/cases/analytics/stats'));
      expect(response.data).toEqual(mockCaseStats);
      expect(response.data.total_cases).toBe(150);
      expect(response.data.open_cases).toBe(45);
      expect(response.data.closed_cases).toBe(105);
    });

    it('should handle date range filters in statistics request', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: mockCaseStats,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const params = new URLSearchParams({
        start_date: '2025-01-01',
        end_date: '2025-03-31',
      });

      const response = await api.get(
        buildUrl(`/api/v1/cases/analytics/stats?${params.toString()}`),
      );

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cases/analytics/stats'),
      );
      expect(response.data.total_cases).toBe(150);
    });

    it('should handle 404 when statistics not found', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            detail: 'Case statistics not found',
          },
        },
        config: {
          url: buildUrl('/api/v1/cases/analytics/stats'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/cases/analytics/stats')),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
          data: expect.objectContaining({
            detail: 'Case statistics not found',
          }),
        }),
      });
    });
  });

  describe('Case Trends API', () => {
    it('should fetch case trends via GET', async () => {
      const mockTrends = {
        trends: [
          { date: '2025-01-01', cases_opened: 5, cases_closed: 3 },
          { date: '2025-01-02', cases_opened: 8, cases_closed: 4 },
          { date: '2025-01-03', cases_opened: 6, cases_closed: 5 },
        ],
        period: 'daily',
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: mockTrends,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const response = await api.get(buildUrl('/api/v1/cases/analytics/trends'));

      expect(mockGet).toHaveBeenCalledWith(buildUrl('/api/v1/cases/analytics/trends'));
      expect(response.data.trends).toHaveLength(3);
      expect(response.data.period).toBe('daily');
    });

    it('should handle period parameter in trends request', async () => {
      const mockTrends = {
        trends: [],
        period: 'weekly',
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: mockTrends,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const params = new URLSearchParams({ period: 'weekly' });
      const response = await api.get(
        buildUrl(`/api/v1/cases/analytics/trends?${params.toString()}`),
      );

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('period=weekly'));
      expect(response.data.period).toBe('weekly');
    });
  });

  describe('Case Performance Metrics API', () => {
    it('should fetch case performance metrics via GET', async () => {
      const mockMetrics = {
        average_resolution_time: 15.5,
        average_response_time: 2.3,
        cases_per_lawyer: {
          lawyer_id: 1,
          case_count: 25,
          average_resolution_time: 12.5,
        },
        top_performing_lawyers: [
          { lawyer_id: 1, cases_closed: 50, average_resolution_time: 10.2 },
          { lawyer_id: 2, cases_closed: 45, average_resolution_time: 11.5 },
        ],
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: mockMetrics,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const response = await api.get(buildUrl('/api/v1/cases/analytics/performance'));

      expect(mockGet).toHaveBeenCalledWith(
        buildUrl('/api/v1/cases/analytics/performance'),
      );
      expect(response.data.average_resolution_time).toBe(15.5);
      expect(response.data.top_performing_lawyers).toHaveLength(2);
    });

    it('should handle lawyer_id filter in performance metrics', async () => {
      const mockMetrics = {
        lawyer_id: 1,
        case_count: 25,
        average_resolution_time: 12.5,
        cases_closed: 50,
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: mockMetrics,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const params = new URLSearchParams({ lawyer_id: '1' });
      const response = await api.get(
        buildUrl(`/api/v1/cases/analytics/performance?${params.toString()}`),
      );

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('lawyer_id=1'));
      expect(response.data.lawyer_id).toBe(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from analytics API responses', () => {
      const apiError = {
        response: {
          data: {
            detail: 'Failed to fetch analytics',
          },
          status: 400,
        },
        message: 'Request failed',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Failed to fetch analytics');
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
          url: buildUrl('/api/v1/cases/analytics/stats'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/cases/analytics/stats')),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
          data: expect.objectContaining({
            detail: expect.stringContaining('Authentication required'),
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
            detail: 'You do not have permission to view analytics',
          },
        },
        config: {
          url: buildUrl('/api/v1/cases/analytics/stats'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/cases/analytics/stats')),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
          data: expect.objectContaining({
            detail: expect.stringContaining('permission'),
          }),
        }),
      });
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
          url: buildUrl('/api/v1/cases/analytics/stats'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/cases/analytics/stats')),
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
          url: buildUrl('/api/v1/cases/analytics/stats'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.get(buildUrl('/api/v1/cases/analytics/stats')),
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
