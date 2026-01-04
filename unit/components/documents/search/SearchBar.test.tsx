/**
 * Tests for SearchBar component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/documents/search/SearchBar';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="close-icon">X</div>,
}));

describe('SearchBar', () => {
  const mockOnQueryChange = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnSuggestionClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render search bar', () => {
      render(
        <SearchBar
          query=""
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <SearchBar
          query=""
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      const input = screen.getByTestId('search-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search documents...');
    });

    it('should display query value', () => {
      render(
        <SearchBar
          query="test query"
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      const input = screen.getByTestId('search-input');
      expect((input as HTMLInputElement).value).toBe('test query');
    });

    it('should render search icon', () => {
      render(
        <SearchBar
          query=""
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when query has value', () => {
      render(
        <SearchBar
          query="test"
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('should not show clear button when query is empty', () => {
      render(
        <SearchBar
          query=""
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument();
    });

    it('should call onQueryChange with empty string when clear button is clicked', () => {
      render(
        <SearchBar
          query="test"
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      const clearButton = screen.getByTestId('close-icon').parentElement;
      if (clearButton) {
        fireEvent.click(clearButton);
        expect(mockOnQueryChange).toHaveBeenCalledWith('');
      }
    });
  });

  describe('Search Suggestions', () => {
    it('should display suggestions when available', () => {
      render(
        <SearchBar
          query="test"
          suggestions={['test1', 'test2']}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      expect(screen.getByText('test1')).toBeInTheDocument();
      expect(screen.getByText('test2')).toBeInTheDocument();
    });

    it('should not display suggestions when empty', () => {
      render(
        <SearchBar
          query="test"
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      expect(screen.queryByText('test1')).not.toBeInTheDocument();
    });

    it('should call onSuggestionClick when suggestion is clicked', () => {
      render(
        <SearchBar
          query="test"
          suggestions={['test1']}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      const suggestion = screen.getByText('test1');
      fireEvent.click(suggestion);
      expect(mockOnSuggestionClick).toHaveBeenCalledWith('test1');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when form is submitted', () => {
      render(
        <SearchBar
          query="test"
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      const form = screen.getByTestId('search-input').closest('form');
      if (form) {
        fireEvent.submit(form);
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Input Change', () => {
    it('should call onQueryChange when input value changes', () => {
      render(
        <SearchBar
          query=""
          suggestions={[]}
          onQueryChange={mockOnQueryChange}
          onSubmit={mockOnSubmit}
          onSuggestionClick={mockOnSuggestionClick}
        />,
      );
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'new query' } });
      expect(mockOnQueryChange).toHaveBeenCalledWith('new query');
    });
  });
});
