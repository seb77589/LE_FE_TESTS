/**
 * Tests for useDocumentAnalytics hook
 *
 * @description Comprehensive tests for the document analytics hook including
 * data fetching, time range filtering, error handling, and refetch.
 *
 * @module __tests__/unit/hooks/useDocumentAnalytics
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDocumentAnalytics,
  AnalyticsData,
} from '@/hooks/documents/useDocumentAnalytics';

// Mock dependencies
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    getValidAccessToken: jest.fn().mockResolvedValue('test-token'),
  })),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err, defaultMsg) => defaultMsg),
}));

// Import mocked modules
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import logger from '@/lib/logging';
import { extractErrorMessage } from '@/lib/errors';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockExtractErrorMessage = extractErrorMessage as jest.MockedFunction<
  typeof extractErrorMessage
>;

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('useDocumentAnalytics', () => {
  const mockAnalyticsData: AnalyticsData = {
    total_documents: 150,
    total_size: 1024 * 1024 * 500, // 500 MB
    documents_by_type: [
      { type: 'pdf', count: 80, size: 1024 * 1024 * 300 },
      { type: 'docx', count: 50, size: 1024 * 1024 * 150 },
      { type: 'txt', count: 20, size: 1024 * 1024 * 50 },
    ],
    documents_by_status: [
      { status: 'processed', count: 120 },
      { status: 'pending', count: 20 },
      { status: 'failed', count: 10 },
    ],
    upload_trend: [
      { date: '2024-01-01', count: 10, size: 1024 * 1024 * 30 },
      { date: '2024-01-02', count: 15, size: 1024 * 1024 * 45 },
      { date: '2024-01-03', count: 12, size: 1024 * 1024 * 36 },
    ],
    recent_activity: [
      {
        action: 'upload',
        document_name: 'contract.pdf',
        timestamp: '2024-01-03T10:00:00Z',
        user: 'user@example.com',
      },
      {
        action: 'download',
        document_name: 'report.docx',
        timestamp: '2024-01-03T09:30:00Z',
        user: 'admin@example.com',
      },
    ],
    storage_usage: {
      used: 1024 * 1024 * 500,
      available: 1024 * 1024 * 1500,
      percentage: 25,
    },
    sharing_stats: {
      total_shares: 50,
      active_shares: 30,
      expired_shares: 20,
    },
  };

  const mockGetValidAccessToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset and restore mock implementations
    mockGetValidAccessToken.mockReset();
    mockGetValidAccessToken.mockResolvedValue('test-token');
    mockUseAuth.mockReturnValue({
      getValidAccessToken: mockGetValidAccessToken,
    } as any);
    mockExtractErrorMessage.mockImplementation((err, defaultMsg) => defaultMsg);
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    });
  });

  describe('Initial state', () => {
    it('should return null analytics initially', () => {
      const { result } = renderHook(() => useDocumentAnalytics());
      expect(result.current.analytics).toBeNull();
    });

    it('should start with isLoading as true', () => {
      const { result } = renderHook(() => useDocumentAnalytics());
      expect(result.current.isLoading).toBe(true);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useDocumentAnalytics());
      expect(result.current.error).toBeNull();
    });

    it('should start with default timeRange of 30d', () => {
      const { result } = renderHook(() => useDocumentAnalytics());
      expect(result.current.timeRange).toBe('30d');
    });

    it('should expose setTimeRange function', () => {
      const { result } = renderHook(() => useDocumentAnalytics());
      expect(typeof result.current.setTimeRange).toBe('function');
    });

    it('should expose refetch function', () => {
      const { result } = renderHook(() => useDocumentAnalytics());
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Data fetching', () => {
    it('should fetch analytics data on mount', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(mockGetValidAccessToken).toHaveBeenCalled();
    });

    it('should include authorization header', async () => {
      renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/documents/analytics'),
          expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
          }),
        );
      });
    });

    it('should include time_range in request', async () => {
      renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('time_range=30d'),
          expect.any(Object),
        );
      });
    });

    it('should update analytics when fetch succeeds', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.total_documents).toBe(150);
      expect(result.current.analytics?.total_size).toBe(1024 * 1024 * 500);
    });

    it('should accept userId option', async () => {
      const { result } = renderHook(() => useDocumentAnalytics({ userId: 123 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook should work with userId (used in deps)
      expect(result.current.analytics).not.toBeNull();
    });
  });

  describe('Time range changes', () => {
    it('should allow changing time range to 7d', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      act(() => {
        result.current.setTimeRange('7d');
      });

      expect(result.current.timeRange).toBe('7d');
    });

    it('should allow changing time range to 90d', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      act(() => {
        result.current.setTimeRange('90d');
      });

      expect(result.current.timeRange).toBe('90d');
    });

    it('should allow changing time range to 1y', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      act(() => {
        result.current.setTimeRange('1y');
      });

      expect(result.current.timeRange).toBe('1y');
    });

    it('should refetch when time range changes', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      act(() => {
        result.current.setTimeRange('7d');
      });

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Error handling', () => {
    it('should set error when authentication fails', async () => {
      // Reset token mock to return null
      mockGetValidAccessToken.mockReset();
      mockGetValidAccessToken.mockResolvedValue(null);

      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should set error when API returns error response', async () => {
      // Reset fetch mock and set error response as default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Server error' }),
      });

      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });

    it('should log errors for monitoring', async () => {
      // Reset fetch mock and set error response as default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Server error' }),
      });

      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should use extractErrorMessage for error messages', async () => {
      // Reset fetch mock and set error response as default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'API Error' }),
      });

      renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(mockExtractErrorMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Analytics data structure', () => {
    it('should include documents by type', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.documents_by_type).toHaveLength(3);
      expect(result.current.analytics?.documents_by_type[0]).toHaveProperty('type');
      expect(result.current.analytics?.documents_by_type[0]).toHaveProperty('count');
      expect(result.current.analytics?.documents_by_type[0]).toHaveProperty('size');
    });

    it('should include documents by status', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.documents_by_status).toHaveLength(3);
      expect(result.current.analytics?.documents_by_status[0]).toHaveProperty('status');
      expect(result.current.analytics?.documents_by_status[0]).toHaveProperty('count');
    });

    it('should include upload trend', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.upload_trend).toBeDefined();
      expect(result.current.analytics?.upload_trend[0]).toHaveProperty('date');
      expect(result.current.analytics?.upload_trend[0]).toHaveProperty('count');
    });

    it('should include recent activity', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.recent_activity).toBeDefined();
      expect(result.current.analytics?.recent_activity[0]).toHaveProperty('action');
      expect(result.current.analytics?.recent_activity[0]).toHaveProperty(
        'document_name',
      );
      expect(result.current.analytics?.recent_activity[0]).toHaveProperty('timestamp');
      expect(result.current.analytics?.recent_activity[0]).toHaveProperty('user');
    });

    it('should include storage usage', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.storage_usage).toBeDefined();
      expect(result.current.analytics?.storage_usage.used).toBe(1024 * 1024 * 500);
      expect(result.current.analytics?.storage_usage.available).toBe(
        1024 * 1024 * 1500,
      );
      expect(result.current.analytics?.storage_usage.percentage).toBe(25);
    });

    it('should include sharing stats', async () => {
      const { result } = renderHook(() => useDocumentAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      expect(result.current.analytics?.sharing_stats).toBeDefined();
      expect(result.current.analytics?.sharing_stats.total_shares).toBe(50);
      expect(result.current.analytics?.sharing_stats.active_shares).toBe(30);
      expect(result.current.analytics?.sharing_stats.expired_shares).toBe(20);
    });
  });
});
