/**
 * @fileoverview Tests for useAdvancedSearch hook
 * @description Tests the advanced document search hook functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdvancedSearch } from '@/hooks/documents/useAdvancedSearch';
import { searchApi } from '@/lib/api/search';
import type { SearchResponse } from '@/types/search';

// Mock the search API
jest.mock('@/lib/api/search', () => ({
  searchApi: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

const mockSearchResponse: SearchResponse = {
  results: [
    {
      document: {
        id: 1,
        filename: 'test.pdf',
        original_filename: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        upload_date: '2024-12-01T00:00:00Z',
        status: 'uploaded',
        owner_id: 1,
      },
      rank: 0.9,
      filename_highlight: '<mark>test</mark>.pdf',
      content_highlight: 'This is a <mark>test</mark> document',
    },
  ],
  total: 1,
  query: 'test',
  filters: {},
  response_time_ms: 50,
};

describe('useAdvancedSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useAdvancedSearch());

      expect(result.current.results).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.responseTimeMs).toBeNull();
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(20);
    });

    it('accepts custom page size', () => {
      const { result } = renderHook(() => useAdvancedSearch({ pageSize: 10 }));

      expect(result.current.pageSize).toBe(10);
    });
  });

  describe('search', () => {
    it('executes search and updates state', async () => {
      (searchApi.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const { result } = renderHook(() => useAdvancedSearch());

      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      expect(searchApi.search).toHaveBeenCalledWith({ query: 'test' }, 0, 20);
      expect(result.current.results).toEqual(mockSearchResponse.results);
      expect(result.current.total).toBe(1);
      expect(result.current.responseTimeMs).toBe(50);
      expect(result.current.isLoading).toBe(false);
    });

    it('clears results when query is empty', async () => {
      const { result } = renderHook(() => useAdvancedSearch());

      await act(async () => {
        await result.current.search({ query: '' });
      });

      expect(searchApi.search).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('handles search errors', async () => {
      const error = new Error('Search failed');
      (searchApi.search as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAdvancedSearch());

      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      expect(result.current.error).toBe('Search failed');
      expect(result.current.results).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('shows loading state during search', async () => {
      let resolveSearch: (value: SearchResponse) => void;
      const searchPromise = new Promise<SearchResponse>((resolve) => {
        resolveSearch = resolve;
      });
      (searchApi.search as jest.Mock).mockReturnValue(searchPromise);

      const { result } = renderHook(() => useAdvancedSearch());

      // Start search
      act(() => {
        result.current.search({ query: 'test' });
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve search
      await act(async () => {
        resolveSearch!(mockSearchResponse);
        await searchPromise;
      });

      // Should not be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('suggestions', () => {
    it('returns suggestions for valid query', async () => {
      const mockSuggestions = ['contract', 'contractor', 'contracts'];
      (searchApi.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const { result } = renderHook(() => useAdvancedSearch());

      let suggestions: string[] = [];
      await act(async () => {
        suggestions = await result.current.getSuggestions('cont');
      });

      expect(searchApi.getSuggestions).toHaveBeenCalledWith('cont');
      expect(suggestions).toEqual(mockSuggestions);
    });

    it('returns empty array for short query', async () => {
      const { result } = renderHook(() => useAdvancedSearch());

      let suggestions: string[] = [];
      await act(async () => {
        suggestions = await result.current.getSuggestions('c');
      });

      expect(searchApi.getSuggestions).not.toHaveBeenCalled();
      expect(suggestions).toEqual([]);
    });

    it('handles suggestion errors gracefully', async () => {
      (searchApi.getSuggestions as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useAdvancedSearch());

      let suggestions: string[] = [];
      await act(async () => {
        suggestions = await result.current.getSuggestions('test');
      });

      expect(suggestions).toEqual([]);
    });
  });

  describe('pagination', () => {
    it('increments page with nextPage', async () => {
      (searchApi.search as jest.Mock).mockResolvedValue({
        ...mockSearchResponse,
        total: 50, // Multiple pages
      });

      const { result } = renderHook(() => useAdvancedSearch());

      // First search
      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      expect(result.current.page).toBe(1);

      // Go to next page
      await act(async () => {
        result.current.nextPage();
      });

      await waitFor(() => {
        expect(result.current.page).toBe(2);
      });
    });

    it('decrements page with prevPage', async () => {
      (searchApi.search as jest.Mock).mockResolvedValue({
        ...mockSearchResponse,
        total: 50,
      });

      const { result } = renderHook(() => useAdvancedSearch());

      // First search
      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      // Go to page 2
      await act(async () => {
        result.current.setPage(2);
      });

      // Go back
      await act(async () => {
        result.current.prevPage();
      });

      await waitFor(() => {
        expect(result.current.page).toBe(1);
      });
    });

    it('does not go below page 1', async () => {
      const { result } = renderHook(() => useAdvancedSearch());

      await act(async () => {
        result.current.prevPage();
      });

      expect(result.current.page).toBe(1);
    });

    it('sets specific page with setPage', async () => {
      (searchApi.search as jest.Mock).mockResolvedValue({
        ...mockSearchResponse,
        total: 100,
      });

      const { result } = renderHook(() => useAdvancedSearch());

      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      await act(async () => {
        result.current.setPage(3);
      });

      await waitFor(() => {
        expect(result.current.page).toBe(3);
      });
    });
  });

  describe('clearResults', () => {
    it('resets all state', async () => {
      (searchApi.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const { result } = renderHook(() => useAdvancedSearch());

      // Perform search
      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      expect(result.current.results.length).toBe(1);

      // Clear results
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.responseTimeMs).toBeNull();
      expect(result.current.page).toBe(1);
    });
  });
});
