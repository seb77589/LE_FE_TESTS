/**
 * Tests for DocumentSearch component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentSearch from '@/components/documents/DocumentSearch';

// Mock useDocumentSearch hook
const mockHandleQueryChange = jest.fn();
const mockHandleFilterChange = jest.fn();
const mockHandleSubmit = jest.fn();
const mockClearFilters = jest.fn();
const mockSetShowFilters = jest.fn();

jest.mock('@/hooks/documents/useDocumentSearch', () => ({
  useDocumentSearch: jest.fn(() => ({
    filters: { query: '', fileType: '', status: '', dateRange: { start: '', end: '' } },
    suggestions: [],
    showFilters: false,
    hasActiveFilters: false,
    setShowFilters: mockSetShowFilters,
    handleQueryChange: mockHandleQueryChange,
    handleFilterChange: mockHandleFilterChange,
    handleSubmit: mockHandleSubmit,
    handleSuggestionClick: jest.fn(),
    clearFilters: mockClearFilters,
  })),
}));

// Mock child components
jest.mock('@/components/documents/search/SearchBar', () => ({
  SearchBar: ({ query, onQueryChange, onSubmit }: any) => (
    <div data-testid="search-bar">
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <button data-testid="search-submit" onClick={onSubmit}>
        Search
      </button>
    </div>
  ),
}));

jest.mock('@/components/documents/search/AdvancedFilters', () => ({
  AdvancedFilters: ({ filters, onFilterChange, onApply }: any) => (
    <div data-testid="advanced-filters">
      <button data-testid="apply-filters" onClick={onApply}>
        Apply
      </button>
    </div>
  ),
}));

jest.mock('@/components/documents/search/ActiveFilters', () => ({
  ActiveFilters: () => <div data-testid="active-filters">Active Filters</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  Filter: () => <div data-testid="filter-icon">Filter</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('DocumentSearch', () => {
  const mockOnSearch = jest.fn();
  const mockOnFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render search component', () => {
      render(<DocumentSearch onSearch={mockOnSearch} onFilter={mockOnFilter} />);
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('should render filter button when showAdvancedFilters is true', () => {
      render(<DocumentSearch onSearch={mockOnSearch} onFilter={mockOnFilter} />);
      expect(screen.getByText(/filters/i)).toBeInTheDocument();
    });

    it('should not render filter button when showAdvancedFilters is false', () => {
      render(
        <DocumentSearch
          onSearch={mockOnSearch}
          onFilter={mockOnFilter}
          showAdvancedFilters={false}
        />,
      );
      expect(screen.queryByText(/filters/i)).not.toBeInTheDocument();
    });
  });

  describe('Filter Toggle', () => {
    it('should toggle filters when filter button is clicked', () => {
      render(<DocumentSearch onSearch={mockOnSearch} onFilter={mockOnFilter} />);
      const filterButton = screen.getByText(/filters/i);
      fireEvent.click(filterButton);
      expect(mockSetShowFilters).toHaveBeenCalled();
    });
  });

  describe('Active Filters', () => {
    it('should show active filters when hasActiveFilters is true', () => {
      const { useDocumentSearch } = require('@/hooks/documents/useDocumentSearch');
      useDocumentSearch.mockReturnValueOnce({
        filters: {
          query: 'test',
          fileType: 'pdf',
          status: '',
          dateRange: { start: '', end: '' },
        },
        suggestions: [],
        showFilters: false,
        hasActiveFilters: true,
        setShowFilters: mockSetShowFilters,
        handleQueryChange: mockHandleQueryChange,
        handleFilterChange: mockHandleFilterChange,
        handleSubmit: mockHandleSubmit,
        handleSuggestionClick: jest.fn(),
        clearFilters: mockClearFilters,
      });

      render(<DocumentSearch onSearch={mockOnSearch} onFilter={mockOnFilter} />);
      expect(screen.getByTestId('active-filters')).toBeInTheDocument();
    });

    it('should show clear filters button when hasActiveFilters is true', () => {
      const { useDocumentSearch } = require('@/hooks/documents/useDocumentSearch');
      useDocumentSearch.mockReturnValueOnce({
        filters: {
          query: 'test',
          fileType: '',
          status: '',
          dateRange: { start: '', end: '' },
        },
        suggestions: [],
        showFilters: false,
        hasActiveFilters: true,
        setShowFilters: mockSetShowFilters,
        handleQueryChange: mockHandleQueryChange,
        handleFilterChange: mockHandleFilterChange,
        handleSubmit: mockHandleSubmit,
        handleSuggestionClick: jest.fn(),
        clearFilters: mockClearFilters,
      });

      render(<DocumentSearch onSearch={mockOnSearch} onFilter={mockOnFilter} />);
      expect(screen.getByText(/clear all/i)).toBeInTheDocument();
    });

    it('should call clearFilters when clear button is clicked', () => {
      const { useDocumentSearch } = require('@/hooks/documents/useDocumentSearch');
      useDocumentSearch.mockReturnValueOnce({
        filters: {
          query: 'test',
          fileType: '',
          status: '',
          dateRange: { start: '', end: '' },
        },
        suggestions: [],
        showFilters: false,
        hasActiveFilters: true,
        setShowFilters: mockSetShowFilters,
        handleQueryChange: mockHandleQueryChange,
        handleFilterChange: mockHandleFilterChange,
        handleSubmit: mockHandleSubmit,
        handleSuggestionClick: jest.fn(),
        clearFilters: mockClearFilters,
      });

      render(<DocumentSearch onSearch={mockOnSearch} onFilter={mockOnFilter} />);
      const clearButton = screen.getByText(/clear all/i);
      fireEvent.click(clearButton);
      expect(mockClearFilters).toHaveBeenCalled();
    });
  });
});
