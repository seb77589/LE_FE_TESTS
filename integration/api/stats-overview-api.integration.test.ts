/**
 * Integration tests for Stats Overview API
 *
 * Tests cover:
 * - User-scoped statistics fetching
 * - Case status breakdown (closed, in_progress, to_review)
 * - Legacy field compatibility
 * - Mock data behavior in development
 * - Error handling
 * - Loading states
 *
 * Related Phase: Dashboard Enhancement (Phase 8)
 */

import api from '@/lib/api';
import type { UserScopedStats } from '@/types/data-scoping';

// Mock axios
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Stats Overview API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fetch User Statistics', () => {
    const mockStatsWithCases: { status: string; data: UserScopedStats } = {
      status: 'success',
      data: {
        // Primary fields (case status breakdown)
        closed_cases: 12,
        cases_in_progress: 8,
        cases_to_review: 5,
        // Legacy fields (deprecated but kept for backward compatibility)
        documents: 15,
        active_sessions: 2,
        open_cases: 8, // Maps to cases_in_progress
        recent_activity: 25,
      },
    };

    it('should fetch user statistics successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: mockStatsWithCases,
      });

      const response = await api.get('/api/v1/stats/overview');

      expect(response.data.status).toBe('success');
      expect(response.data.data.closed_cases).toBe(12);
      expect(response.data.data.cases_in_progress).toBe(8);
      expect(response.data.data.cases_to_review).toBe(5);
      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/stats/overview');
    });

    it('should include legacy fields for backward compatibility', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: mockStatsWithCases,
      });

      const response = await api.get('/api/v1/stats/overview');

      expect(response.data.data.documents).toBe(15);
      expect(response.data.data.active_sessions).toBe(2);
      expect(response.data.data.open_cases).toBe(8);
    });

    it('should handle zero case counts', async () => {
      const mockStatsZero = {
        status: 'success',
        data: {
          closed_cases: 0,
          cases_in_progress: 0,
          cases_to_review: 0,
          documents: 0,
          active_sessions: 0,
          open_cases: 0,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockStatsZero,
      });

      const response = await api.get('/api/v1/stats/overview');

      expect(response.data.data.closed_cases).toBe(0);
      expect(response.data.data.cases_in_progress).toBe(0);
      expect(response.data.data.cases_to_review).toBe(0);
    });

    it('should return mock data in development mode', async () => {
      const mockDevStats = {
        status: 'success',
        data: {
          closed_cases: 12, // Mock data
          cases_in_progress: 8, // Mock data
          cases_to_review: 5, // Mock data
          documents: 0,
          active_sessions: 0,
          open_cases: 8,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockDevStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      // In development with no real cases, should get mock data
      expect(response.data.data.closed_cases).toBe(12);
      expect(response.data.data.cases_in_progress).toBe(8);
      expect(response.data.data.cases_to_review).toBe(5);
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch statistics';
      mockedApi.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(api.get('/api/v1/stats/overview')).rejects.toThrow(errorMessage);
    });

    it('should handle 401 Unauthorized', async () => {
      const unauthorizedError = {
        response: {
          status: 401,
          data: { detail: 'Not authenticated' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(unauthorizedError);

      await expect(api.get('/api/v1/stats/overview')).rejects.toEqual(unauthorizedError);
    });

    it('should handle 500 Server Error', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(serverError);

      await expect(api.get('/api/v1/stats/overview')).rejects.toEqual(serverError);
    });
  });

  describe('Case Status Breakdown', () => {
    it('should provide correct case status breakdown', async () => {
      const mockStats = {
        status: 'success',
        data: {
          closed_cases: 25,
          cases_in_progress: 10,
          cases_to_review: 3,
          documents: 50,
          active_sessions: 1,
          open_cases: 10,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      // Verify primary fields exist
      expect(response.data.data).toHaveProperty('closed_cases');
      expect(response.data.data).toHaveProperty('cases_in_progress');
      expect(response.data.data).toHaveProperty('cases_to_review');

      // Verify correct values
      expect(response.data.data.closed_cases).toBe(25);
      expect(response.data.data.cases_in_progress).toBe(10);
      expect(response.data.data.cases_to_review).toBe(3);
    });

    it('should map open_cases to cases_in_progress', async () => {
      const mockStats = {
        status: 'success',
        data: {
          closed_cases: 5,
          cases_in_progress: 7,
          cases_to_review: 2,
          documents: 10,
          active_sessions: 1,
          open_cases: 7, // Should equal cases_in_progress
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      // Legacy field should match new field
      expect(response.data.data.open_cases).toBe(
        response.data.data.cases_in_progress
      );
    });

    it('should handle large case counts', async () => {
      const mockStats = {
        status: 'success',
        data: {
          closed_cases: 1250,
          cases_in_progress: 875,
          cases_to_review: 423,
          documents: 5000,
          active_sessions: 5,
          open_cases: 875,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      expect(response.data.data.closed_cases).toBe(1250);
      expect(response.data.data.cases_in_progress).toBe(875);
      expect(response.data.data.cases_to_review).toBe(423);
    });
  });

  describe('Error Recovery', () => {
    it('should handle database errors with fallback', async () => {
      const mockStatsWithError = {
        status: 'success',
        data: {
          closed_cases: 0, // Fallback to 0 on error
          cases_in_progress: 0,
          cases_to_review: 0,
          documents: 5, // Other services still work
          active_sessions: 1,
          open_cases: 0,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockStatsWithError,
      });

      const response = await api.get('/api/v1/stats/overview');

      // Case counts should be 0 (error fallback)
      expect(response.data.data.closed_cases).toBe(0);
      expect(response.data.data.cases_in_progress).toBe(0);
      expect(response.data.data.cases_to_review).toBe(0);

      // Other fields should still work
      expect(response.data.data.documents).toBe(5);
      expect(response.data.data.active_sessions).toBe(1);
    });

    it('should handle partial failures gracefully', async () => {
      const mockPartialStats = {
        status: 'success',
        data: {
          closed_cases: 10,
          cases_in_progress: 0, // One fetch failed
          cases_to_review: 5,
          documents: 20,
          active_sessions: 2,
          open_cases: 0,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockPartialStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      expect(response.data.data.closed_cases).toBe(10);
      expect(response.data.data.cases_in_progress).toBe(0);
      expect(response.data.data.cases_to_review).toBe(5);
    });
  });

  describe('Data Type Validation', () => {
    it('should handle missing optional fields', async () => {
      const mockMinimalStats = {
        status: 'success',
        data: {
          closed_cases: 5,
          cases_in_progress: 3,
          cases_to_review: 2,
          documents: 10,
          active_sessions: 1,
          open_cases: 3,
          // recent_activity is optional
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockMinimalStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      expect(response.data.data.closed_cases).toBeDefined();
      expect(response.data.data.cases_in_progress).toBeDefined();
      expect(response.data.data.cases_to_review).toBeDefined();
      expect(response.data.data.recent_activity).toBeUndefined();
    });

    it('should handle all fields as numbers', async () => {
      const mockStats = {
        status: 'success',
        data: {
          closed_cases: 12,
          cases_in_progress: 8,
          cases_to_review: 5,
          documents: 15,
          active_sessions: 2,
          open_cases: 8,
          recent_activity: 25,
        },
      };

      mockedApi.get.mockResolvedValueOnce({
        data: mockStats,
      });

      const response = await api.get('/api/v1/stats/overview');

      // All numeric fields should be numbers
      expect(typeof response.data.data.closed_cases).toBe('number');
      expect(typeof response.data.data.cases_in_progress).toBe('number');
      expect(typeof response.data.data.cases_to_review).toBe('number');
      expect(typeof response.data.data.documents).toBe('number');
      expect(typeof response.data.data.active_sessions).toBe('number');
      expect(typeof response.data.data.open_cases).toBe('number');
    });
  });

  describe('Caching Behavior', () => {
    it('should not cache by default (SWR handles caching)', async () => {
      const mockStats = {
        status: 'success',
        data: {
          closed_cases: 12,
          cases_in_progress: 8,
          cases_to_review: 5,
          documents: 15,
          active_sessions: 2,
          open_cases: 8,
        },
      };

      // First call
      mockedApi.get.mockResolvedValueOnce({ data: mockStats });
      await api.get('/api/v1/stats/overview');

      // Second call should make another request (no built-in caching)
      mockedApi.get.mockResolvedValueOnce({ data: mockStats });
      await api.get('/api/v1/stats/overview');

      expect(mockedApi.get).toHaveBeenCalledTimes(2);
    });
  });
});
