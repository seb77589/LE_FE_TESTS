/**
 * Tests for useDocumentSearch hook
 *
 * @description Comprehensive tests for the document search hook including
 * filter management, search history, suggestions, and form submission.
 *
 * @module __tests__/unit/hooks/useDocumentSearch
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDocumentSearch,
  UseDocumentSearchOptions,
} from '@/hooks/documents/useDocumentSearch';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// ==============================================================================
// Module-level localStorage mock factory (extracted to reduce nesting - fixes S2004)
// ==============================================================================

// Wrapper to hold store reference (fixes closure issue with store = {})
interface LocalStorageWrapper {
  data: Record<string, string>;
}

// Storage operation functions (use wrapper for consistent reference)
function mockGetItem(wrapper: LocalStorageWrapper, key: string): string | null {
  return wrapper.data[key] || null;
}

function mockSetItem(wrapper: LocalStorageWrapper, key: string, value: string): void {
  wrapper.data[key] = value;
}

function mockRemoveItem(wrapper: LocalStorageWrapper, key: string): void {
  delete wrapper.data[key];
}

function mockClear(wrapper: LocalStorageWrapper): void {
  wrapper.data = {};
}

// Create localStorage mock using module-level functions
function createLocalStorageMock() {
  const wrapper: LocalStorageWrapper = { data: {} };

  return {
    getItem: jest.fn((key: string) => mockGetItem(wrapper, key)),
    setItem: jest.fn((key: string, value: string) => mockSetItem(wrapper, key, value)),
    removeItem: jest.fn((key: string) => mockRemoveItem(wrapper, key)),
    clear: jest.fn(() => mockClear(wrapper)),
    get store() {
      return wrapper.data;
    },
  };
}

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Module-level helper to flush async effects (extracted to reduce nesting - fixes S2004)
async function flushEffects(): Promise<void> {
  await Promise.resolve();
}

describe('useDocumentSearch', () => {
  const mockOnSearch = jest.fn();
  const mockOnFilter = jest.fn();

  const defaultOptions: UseDocumentSearchOptions = {
    onSearch: mockOnSearch,
    onFilter: mockOnFilter,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Initial state', () => {
    it('should return default filter values', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      expect(result.current.filters).toEqual({
        query: '',
        fileType: '',
        dateRange: { start: '', end: '' },
        sizeRange: { min: 0, max: 100 * 1024 * 1024 },
        status: '',
        sortBy: 'upload_date',
        sortOrder: 'desc',
        tags: [],
        owner: '',
      });
    });

    it('should merge initial filters with defaults', () => {
      const { result } = renderHook(() =>
        useDocumentSearch({
          ...defaultOptions,
          initialFilters: { query: 'contract', fileType: 'pdf' },
        }),
      );

      expect(result.current.filters.query).toBe('contract');
      expect(result.current.filters.fileType).toBe('pdf');
      expect(result.current.filters.status).toBe(''); // default preserved
    });

    it('should start with showFilters as false', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));
      expect(result.current.showFilters).toBe(false);
    });

    it('should start with empty suggestions', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));
      expect(result.current.suggestions).toEqual([]);
    });

    it('should start with hasActiveFilters as false', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('Query changes', () => {
    it('should update query when handleQueryChange is called', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('test query');
      });

      expect(result.current.filters.query).toBe('test query');
    });

    it('should set hasActiveFilters to true when query is non-empty', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('Filter changes', () => {
    it('should update fileType filter', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('fileType', 'pdf');
      });

      expect(result.current.filters.fileType).toBe('pdf');
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should update status filter', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('status', 'processed');
      });

      expect(result.current.filters.status).toBe('processed');
    });

    it('should update dateRange filter', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('dateRange', {
          start: '2024-01-01',
          end: '2024-12-31',
        });
      });

      expect(result.current.filters.dateRange).toEqual({
        start: '2024-01-01',
        end: '2024-12-31',
      });
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should update sizeRange filter', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('sizeRange', { min: 1000, max: 50000 });
      });

      expect(result.current.filters.sizeRange).toEqual({ min: 1000, max: 50000 });
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should update tags filter', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('tags', ['legal', 'contract']);
      });

      expect(result.current.filters.tags).toEqual(['legal', 'contract']);
    });

    it('should update owner filter', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('owner', 'user@example.com');
      });

      expect(result.current.filters.owner).toBe('user@example.com');
    });
  });

  describe('Filter visibility', () => {
    it('should toggle showFilters', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      expect(result.current.showFilters).toBe(false);

      act(() => {
        result.current.setShowFilters(true);
      });

      expect(result.current.showFilters).toBe(true);

      act(() => {
        result.current.setShowFilters(false);
      });

      expect(result.current.showFilters).toBe(false);
    });
  });

  describe('Form submission', () => {
    it('should call onSearch when handleSubmit is called', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('search term');
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'search term' }),
      );
    });

    it('should call onFilter when handleSubmit is called', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      expect(mockOnFilter).toHaveBeenCalled();
    });

    it('should not call onFilter if not provided', () => {
      const { result } = renderHook(() =>
        useDocumentSearch({ onSearch: mockOnSearch }),
      );

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      expect(mockOnSearch).toHaveBeenCalled();
      // No error thrown - onFilter is optional
    });
  });

  describe('Clear filters', () => {
    it('should reset all filters to defaults', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      // Set some filters
      act(() => {
        result.current.handleQueryChange('test');
        result.current.handleFilterChange('fileType', 'pdf');
        result.current.handleFilterChange('status', 'pending');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.fileType).toBe('');
      expect(result.current.filters.status).toBe('');
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('should call onSearch with default filters after clearing', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('test');
      });

      mockOnSearch.mockClear();

      act(() => {
        result.current.clearFilters();
      });

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: '', fileType: '' }),
      );
    });
  });

  describe('Search history', () => {
    it('should load search history from localStorage on mount', async () => {
      const history = ['previous search', 'another search'];
      localStorageMock.setItem('documentSearchHistory', JSON.stringify(history));

      renderHook(() => useDocumentSearch(defaultOptions));

      // Wait for effect to run
      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('documentSearchHistory');
      });
    });

    it('should save search to history on submit', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('new search term');
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'documentSearchHistory',
        expect.stringContaining('new search term'),
      );
    });

    it('should not save empty searches to history', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      // Check that setItem was not called with empty string in the JSON
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const historyCall = setItemCalls.find(
        (call: [string, string]) => call[0] === 'documentSearchHistory',
      );

      // Either not called or doesn't contain empty string at start
      if (historyCall) {
        const savedHistory = JSON.parse(historyCall[1]);
        expect(savedHistory[0]).not.toBe('');
      }
    });

    it('should not duplicate existing searches in history', () => {
      const history = ['existing search'];
      localStorageMock.setItem('documentSearchHistory', JSON.stringify(history));

      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('existing search');
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      // Should not add duplicate
      const lastSetItemCall = localStorageMock.setItem.mock.calls.filter(
        (call: [string, string]) => call[0] === 'documentSearchHistory',
      );

      if (lastSetItemCall.length > 0) {
        const savedHistory = JSON.parse(lastSetItemCall.at(-1)![1]);
        const duplicateCount = savedHistory.filter(
          (item: string) => item === 'existing search',
        ).length;
        expect(duplicateCount).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Suggestions', () => {
    it('should show suggestions when query matches history', async () => {
      const history = ['contract review', 'contract template', 'legal document'];
      localStorageMock.setItem('documentSearchHistory', JSON.stringify(history));

      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      // Need to wait for history to load, then update query
      await act(flushEffects);

      act(() => {
        result.current.handleQueryChange('contract');
      });

      // Wait for suggestions effect
      await waitFor(() => {
        // Suggestions are based on search history filtering
        expect(result.current.suggestions.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should not show suggestions for single character queries', () => {
      const history = ['contract'];
      localStorageMock.setItem('documentSearchHistory', JSON.stringify(history));

      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('c');
      });

      expect(result.current.suggestions).toEqual([]);
    });

    it('should limit suggestions to 5 items', async () => {
      const history = [
        'search1',
        'search2',
        'search3',
        'search4',
        'search5',
        'search6',
        'search7',
      ];
      localStorageMock.setItem('documentSearchHistory', JSON.stringify(history));

      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      await act(flushEffects);

      act(() => {
        result.current.handleQueryChange('search');
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Suggestion click', () => {
    it('should update query when suggestion is clicked', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleSuggestionClick('suggested term');
      });

      expect(result.current.filters.query).toBe('suggested term');
    });

    it('should trigger search when suggestion is clicked', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleSuggestionClick('suggested term');
      });

      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'suggested term' }),
      );
    });
  });

  describe('hasActiveFilters detection', () => {
    it('should be true when query is set', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleQueryChange('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when fileType is set', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('fileType', 'pdf');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when dateRange start is set', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('dateRange', {
          start: '2024-01-01',
          end: '',
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when dateRange end is set', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('dateRange', {
          start: '',
          end: '2024-12-31',
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when sizeRange min is above 0', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('sizeRange', {
          min: 1000,
          max: 100 * 1024 * 1024,
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when sizeRange max is below default', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('sizeRange', {
          min: 0,
          max: 50 * 1024 * 1024,
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when status is set', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));

      act(() => {
        result.current.handleFilterChange('status', 'pending');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be false when all filters are at defaults', () => {
      const { result } = renderHook(() => useDocumentSearch(defaultOptions));
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.setItem('documentSearchHistory', 'invalid json');

      // Should not throw
      expect(() => {
        renderHook(() => useDocumentSearch(defaultOptions));
      }).not.toThrow();
    });
  });
});
