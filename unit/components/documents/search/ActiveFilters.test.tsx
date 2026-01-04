/**
 * Tests for ActiveFilters component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveFilters } from '@/components/documents/search/ActiveFilters';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
}));

// Mock searchConstants
jest.mock('@/components/documents/search/searchConstants', () => ({
  fileTypes: [
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Image' },
  ],
  statusOptions: [
    { value: 'uploaded', label: 'Uploaded' },
    { value: 'processing', label: 'Processing' },
  ],
}));

describe('ActiveFilters', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render active filters component', () => {
      render(
        <ActiveFilters
          filters={{
            query: '',
            fileType: '',
            status: '',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      // Component renders but may show no filters
      expect(screen.queryByText(/Query:/i)).not.toBeInTheDocument();
    });

    it('should display query filter when present', () => {
      render(
        <ActiveFilters
          filters={{
            query: 'test',
            fileType: '',
            status: '',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      expect(screen.getByText(/Query: test/i)).toBeInTheDocument();
    });

    it('should display file type filter when present', () => {
      render(
        <ActiveFilters
          filters={{
            query: '',
            fileType: 'pdf',
            status: '',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      expect(screen.getByText(/Type: PDF/i)).toBeInTheDocument();
    });

    it('should display status filter when present', () => {
      render(
        <ActiveFilters
          filters={{
            query: '',
            fileType: '',
            status: 'uploaded',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      expect(screen.getByText(/Status: Uploaded/i)).toBeInTheDocument();
    });
  });

  describe('Filter Removal', () => {
    it('should call onFilterChange when query filter is removed', () => {
      render(
        <ActiveFilters
          filters={{
            query: 'test',
            fileType: '',
            status: '',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      const closeButtons = screen.getAllByTestId('close-icon');
      const queryCloseButton = closeButtons[0].parentElement;
      if (queryCloseButton) {
        fireEvent.click(queryCloseButton);
        expect(mockOnFilterChange).toHaveBeenCalledWith('query', '');
      }
    });

    it('should call onFilterChange when file type filter is removed', () => {
      render(
        <ActiveFilters
          filters={{
            query: '',
            fileType: 'pdf',
            status: '',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      const closeButtons = screen.getAllByTestId('close-icon');
      const fileTypeCloseButton = closeButtons[0].parentElement;
      if (fileTypeCloseButton) {
        fireEvent.click(fileTypeCloseButton);
        expect(mockOnFilterChange).toHaveBeenCalledWith('fileType', '');
      }
    });

    it('should call onFilterChange when status filter is removed', () => {
      render(
        <ActiveFilters
          filters={{
            query: '',
            fileType: '',
            status: 'uploaded',
            dateRange: { start: '', end: '' },
          }}
          onFilterChange={mockOnFilterChange}
        />,
      );
      const closeButtons = screen.getAllByTestId('close-icon');
      const statusCloseButton = closeButtons[0].parentElement;
      if (statusCloseButton) {
        fireEvent.click(statusCloseButton);
        expect(mockOnFilterChange).toHaveBeenCalledWith('status', '');
      }
    });
  });
});
