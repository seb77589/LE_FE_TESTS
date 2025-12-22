/**
 * @fileoverview Comprehensive unit tests for AdvancedFilters component
 *
 * Tests cover:
 * - Rendering: all filter controls render correctly
 * - Interactions: user interactions trigger correct callbacks
 * - Filter changes: all filter types (fileType, status, dates, sizes, sort)
 * - Presets: date and size preset button clicks
 * - Apply button: triggers onApply callback
 *
 * @module tests/AdvancedFilters.test
 * @since 0.2.0
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedFilters, AdvancedFiltersProps } from '@/components/documents/search/AdvancedFilters';
import { SearchFilters } from '@/components/documents/search/types';

// ==============================================================================
// Test Setup
// ==============================================================================

// Default filter values for testing
const createDefaultFilters = (): SearchFilters => ({
  query: '',
  fileType: '',
  dateRange: {
    start: '',
    end: '',
  },
  sizeRange: {
    min: 0,
    max: 100 * 1024 * 1024, // 100 MB
  },
  status: '',
  sortBy: 'upload_date',
  sortOrder: 'desc',
  tags: [],
  owner: '',
});

// Helper to render component with default props
const renderAdvancedFilters = (overrides?: Partial<AdvancedFiltersProps>) => {
  const defaultProps: AdvancedFiltersProps = {
    filters: createDefaultFilters(),
    onFilterChange: jest.fn(),
    onApply: jest.fn(),
  };

  const props = { ...defaultProps, ...overrides };

  return {
    ...render(<AdvancedFilters {...props} />),
    props,
  };
};

// ==============================================================================
// Test Suites
// ==============================================================================

describe('AdvancedFilters', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('rendering', () => {
    it('should render without crashing', () => {
      renderAdvancedFilters();
      // Use getByLabelText for the label instead of getByText (which has multiple matches)
      expect(screen.getByLabelText('File Type')).toBeInTheDocument();
    });

    it('should render file type filter', () => {
      renderAdvancedFilters();
      expect(screen.getByLabelText('File Type')).toBeInTheDocument();
      expect(screen.getByLabelText('File Type')).toHaveAttribute('id', 'filter-file-type');
    });

    it('should render status filter', () => {
      renderAdvancedFilters();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toHaveAttribute('id', 'filter-status');
    });

    it('should render date range inputs', () => {
      renderAdvancedFilters();
      expect(screen.getByLabelText('From Date')).toBeInTheDocument();
      expect(screen.getByLabelText('To Date')).toBeInTheDocument();
    });

    it('should render file size range inputs', () => {
      renderAdvancedFilters();
      expect(screen.getByLabelText('Min Size')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Size')).toBeInTheDocument();
    });

    it('should render sort by filter', () => {
      renderAdvancedFilters();
      expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
    });

    it('should render sort order filter', () => {
      renderAdvancedFilters();
      expect(screen.getByLabelText('Sort Order')).toBeInTheDocument();
    });

    it('should render Apply Filters button', () => {
      renderAdvancedFilters();
      expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument();
    });

    it('should render size preset buttons', () => {
      renderAdvancedFilters();
      expect(screen.getByRole('button', { name: 'Small (< 1MB)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Medium (1-10MB)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Large (10-100MB)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Very Large (> 100MB)' })).toBeInTheDocument();
    });

    it('should render date preset buttons', () => {
      renderAdvancedFilters();
      expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Last 90 days' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Last year' })).toBeInTheDocument();
    });

    it('should display current filter values in selects', () => {
      const filters = createDefaultFilters();
      filters.fileType = 'image';
      filters.status = 'processed';
      filters.sortBy = 'filename';
      filters.sortOrder = 'asc';

      renderAdvancedFilters({ filters });

      expect(screen.getByLabelText('File Type')).toHaveValue('image');
      expect(screen.getByLabelText('Status')).toHaveValue('processed');
      expect(screen.getByLabelText('Sort By')).toHaveValue('filename');
      expect(screen.getByLabelText('Sort Order')).toHaveValue('asc');
    });
  });

  // ==========================================================================
  // File Type Filter Tests
  // ==========================================================================
  describe('file type filter', () => {
    it('should call onFilterChange when file type is changed', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const select = screen.getByLabelText('File Type');
      await user.selectOptions(select, 'image');

      expect(props.onFilterChange).toHaveBeenCalledWith('fileType', 'image');
    });

    it('should have All Types as default option', () => {
      renderAdvancedFilters();
      const select = screen.getByLabelText('File Type');
      expect(select).toHaveValue('');
    });

    it('should have all expected file type options', () => {
      renderAdvancedFilters();
      const select = screen.getByLabelText('File Type');

      // Query within the select element
      const options = within(select).getAllByRole('option');
      const optionTexts = options.map((opt) => opt.textContent);

      expect(optionTexts).toContain('All Types');
      expect(optionTexts).toContain('Images');
      expect(optionTexts).toContain('PDFs');
      expect(optionTexts).toContain('Text Files');
      expect(optionTexts).toContain('Word Docs');
    });
  });

  // ==========================================================================
  // Status Filter Tests
  // ==========================================================================
  describe('status filter', () => {
    it('should call onFilterChange when status is changed', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const select = screen.getByLabelText('Status');
      await user.selectOptions(select, 'processed');

      expect(props.onFilterChange).toHaveBeenCalledWith('status', 'processed');
    });

    it('should have all expected status options', () => {
      renderAdvancedFilters();
      const select = screen.getByLabelText('Status');

      const options = within(select).getAllByRole('option');
      const optionTexts = options.map((opt) => opt.textContent);

      expect(optionTexts).toContain('All Status');
      expect(optionTexts).toContain('Uploaded');
      expect(optionTexts).toContain('Processing');
      expect(optionTexts).toContain('Processed');
      expect(optionTexts).toContain('Error');
    });
  });

  // ==========================================================================
  // Date Range Filter Tests
  // ==========================================================================
  describe('date range filter', () => {
    it('should call onFilterChange when start date is changed', () => {
      const { props } = renderAdvancedFilters();

      const input = screen.getByLabelText('From Date');
      fireEvent.change(input, { target: { value: '2025-01-01' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2025-01-01',
        end: '',
      });
    });

    it('should call onFilterChange when end date is changed', () => {
      const { props } = renderAdvancedFilters();

      const input = screen.getByLabelText('To Date');
      fireEvent.change(input, { target: { value: '2025-12-31' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '',
        end: '2025-12-31',
      });
    });

    it('should display current date range values', () => {
      const filters = createDefaultFilters();
      filters.dateRange = { start: '2025-06-01', end: '2025-06-30' };

      renderAdvancedFilters({ filters });

      expect(screen.getByLabelText('From Date')).toHaveValue('2025-06-01');
      expect(screen.getByLabelText('To Date')).toHaveValue('2025-06-30');
    });

    it('should preserve existing end date when changing start date', () => {
      const filters = createDefaultFilters();
      filters.dateRange = { start: '', end: '2025-12-31' };

      const { props } = renderAdvancedFilters({ filters });

      const input = screen.getByLabelText('From Date');
      fireEvent.change(input, { target: { value: '2025-01-01' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2025-01-01',
        end: '2025-12-31',
      });
    });
  });

  // ==========================================================================
  // Date Preset Tests
  // ==========================================================================
  describe('date presets', () => {
    beforeEach(() => {
      // Mock Date.now for consistent date calculations
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-12-19T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set date range to today when Today preset is clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const todayButton = screen.getByRole('button', { name: 'Today' });
      await user.click(todayButton);

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2025-12-19',
        end: '2025-12-19',
      });
    });

    it('should set date range to last 7 days when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const last7Button = screen.getByRole('button', { name: 'Last 7 days' });
      await user.click(last7Button);

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2025-12-12',
        end: '2025-12-19',
      });
    });

    it('should set date range to last 30 days when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const last30Button = screen.getByRole('button', { name: 'Last 30 days' });
      await user.click(last30Button);

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2025-11-19',
        end: '2025-12-19',
      });
    });

    it('should set date range to last 90 days when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const last90Button = screen.getByRole('button', { name: 'Last 90 days' });
      await user.click(last90Button);

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2025-09-20',
        end: '2025-12-19',
      });
    });

    it('should set date range to last year when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const lastYearButton = screen.getByRole('button', { name: 'Last year' });
      await user.click(lastYearButton);

      expect(props.onFilterChange).toHaveBeenCalledWith('dateRange', {
        start: '2024-12-19',
        end: '2025-12-19',
      });
    });
  });

  // ==========================================================================
  // Size Range Filter Tests
  // ==========================================================================
  describe('size range filter', () => {
    it('should call onFilterChange when min size is changed', () => {
      const { props } = renderAdvancedFilters();

      const input = screen.getByLabelText('Min Size');
      fireEvent.change(input, { target: { value: '1000' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 1000,
        max: 100 * 1024 * 1024,
      });
    });

    it('should call onFilterChange when max size is changed', () => {
      const { props } = renderAdvancedFilters();

      const input = screen.getByLabelText('Max Size');
      fireEvent.change(input, { target: { value: '5000000' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 0,
        max: 5000000,
      });
    });

    it('should display formatted size range text', () => {
      const filters = createDefaultFilters();
      filters.sizeRange = { min: 1024 * 1024, max: 10 * 1024 * 1024 };

      renderAdvancedFilters({ filters });

      // The component shows "1 MB - 10 MB" text (parseFloat removes trailing zeros)
      expect(screen.getByText(/1 MB.*-.*10 MB/)).toBeInTheDocument();
    });

    it('should preserve min when changing max', () => {
      const filters = createDefaultFilters();
      filters.sizeRange = { min: 5000, max: 100 * 1024 * 1024 };

      const { props } = renderAdvancedFilters({ filters });

      const input = screen.getByLabelText('Max Size');
      fireEvent.change(input, { target: { value: '10000000' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 5000,
        max: 10000000,
      });
    });
  });

  // ==========================================================================
  // Size Preset Tests
  // ==========================================================================
  describe('size presets', () => {
    it('should set size range to Small preset when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const smallButton = screen.getByRole('button', { name: 'Small (< 1MB)' });
      await user.click(smallButton);

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 0,
        max: 1024 * 1024,
      });
    });

    it('should set size range to Medium preset when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const mediumButton = screen.getByRole('button', { name: 'Medium (1-10MB)' });
      await user.click(mediumButton);

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 1024 * 1024,
        max: 10 * 1024 * 1024,
      });
    });

    it('should set size range to Large preset when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const largeButton = screen.getByRole('button', { name: 'Large (10-100MB)' });
      await user.click(largeButton);

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 10 * 1024 * 1024,
        max: 100 * 1024 * 1024,
      });
    });

    it('should set size range to Very Large preset when clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const veryLargeButton = screen.getByRole('button', { name: 'Very Large (> 100MB)' });
      await user.click(veryLargeButton);

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 100 * 1024 * 1024,
        max: Infinity,
      });
    });
  });

  // ==========================================================================
  // Sort Filter Tests
  // ==========================================================================
  describe('sort filters', () => {
    it('should call onFilterChange when sort by is changed', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const select = screen.getByLabelText('Sort By');
      await user.selectOptions(select, 'filename');

      expect(props.onFilterChange).toHaveBeenCalledWith('sortBy', 'filename');
    });

    it('should have all expected sort options', () => {
      renderAdvancedFilters();
      const select = screen.getByLabelText('Sort By');

      const options = within(select).getAllByRole('option');
      const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);

      expect(optionValues).toContain('filename');
      expect(optionValues).toContain('upload_date');
      expect(optionValues).toContain('file_size');
      expect(optionValues).toContain('mime_type');
      expect(optionValues).toContain('status');
    });

    it('should call onFilterChange when sort order is changed to ascending', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const select = screen.getByLabelText('Sort Order');
      await user.selectOptions(select, 'asc');

      expect(props.onFilterChange).toHaveBeenCalledWith('sortOrder', 'asc');
    });

    it('should call onFilterChange when sort order is changed to descending', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const select = screen.getByLabelText('Sort Order');
      await user.selectOptions(select, 'desc');

      expect(props.onFilterChange).toHaveBeenCalledWith('sortOrder', 'desc');
    });

    it('should have ascending and descending options', () => {
      renderAdvancedFilters();
      const select = screen.getByLabelText('Sort Order');

      const options = within(select).getAllByRole('option');
      const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);

      expect(optionValues).toContain('asc');
      expect(optionValues).toContain('desc');
    });
  });

  // ==========================================================================
  // Apply Button Tests
  // ==========================================================================
  describe('apply button', () => {
    it('should call onApply when Apply Filters button is clicked', async () => {
      const { props } = renderAdvancedFilters();
      const user = userEvent.setup();

      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
      await user.click(applyButton);

      expect(props.onApply).toHaveBeenCalledTimes(1);
    });

    it('should have type="button" to prevent form submission', () => {
      renderAdvancedFilters();
      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });

      expect(applyButton).toHaveAttribute('type', 'button');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle empty min size input gracefully', () => {
      const { props } = renderAdvancedFilters();

      const minInput = screen.getByLabelText('Min Size');
      fireEvent.change(minInput, { target: { value: '' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 0, // Should default to 0
        max: 100 * 1024 * 1024,
      });
    });

    it('should handle non-numeric min size input gracefully', () => {
      const { props } = renderAdvancedFilters();

      const minInput = screen.getByLabelText('Min Size');
      fireEvent.change(minInput, { target: { value: 'abc' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 0, // Should default to 0 for NaN
        max: 100 * 1024 * 1024,
      });
    });

    it('should handle empty max size input with default value', () => {
      const { props } = renderAdvancedFilters();

      const maxInput = screen.getByLabelText('Max Size');
      fireEvent.change(maxInput, { target: { value: '' } });

      expect(props.onFilterChange).toHaveBeenCalledWith('sizeRange', {
        min: 0,
        max: 100 * 1024 * 1024, // 100 MB default
      });
    });

    it('should render with all filters pre-populated', () => {
      const filters: SearchFilters = {
        query: 'test query',
        fileType: 'application/pdf',
        dateRange: { start: '2025-01-01', end: '2025-12-31' },
        sizeRange: { min: 1024, max: 1024 * 1024 },
        status: 'processed',
        sortBy: 'filename',
        sortOrder: 'asc',
        tags: ['important'],
        owner: 'user123',
      };

      renderAdvancedFilters({ filters });

      expect(screen.getByLabelText('File Type')).toHaveValue('application/pdf');
      expect(screen.getByLabelText('Status')).toHaveValue('processed');
      expect(screen.getByLabelText('From Date')).toHaveValue('2025-01-01');
      expect(screen.getByLabelText('To Date')).toHaveValue('2025-12-31');
      expect(screen.getByLabelText('Min Size')).toHaveValue(1024);
      expect(screen.getByLabelText('Max Size')).toHaveValue(1024 * 1024);
      expect(screen.getByLabelText('Sort By')).toHaveValue('filename');
      expect(screen.getByLabelText('Sort Order')).toHaveValue('asc');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================
  describe('accessibility', () => {
    it('should have proper labels for all inputs', () => {
      renderAdvancedFilters();

      // All form controls should be accessible via label
      expect(screen.getByLabelText('File Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('From Date')).toBeInTheDocument();
      expect(screen.getByLabelText('To Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Min Size')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Size')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort Order')).toBeInTheDocument();
    });

    it('should have type="button" on all preset buttons to prevent form submission', () => {
      renderAdvancedFilters();

      // Size preset buttons
      expect(screen.getByRole('button', { name: 'Small (< 1MB)' })).toHaveAttribute(
        'type',
        'button',
      );
      expect(screen.getByRole('button', { name: 'Medium (1-10MB)' })).toHaveAttribute(
        'type',
        'button',
      );
      expect(screen.getByRole('button', { name: 'Large (10-100MB)' })).toHaveAttribute(
        'type',
        'button',
      );
      expect(screen.getByRole('button', { name: 'Very Large (> 100MB)' })).toHaveAttribute(
        'type',
        'button',
      );

      // Date preset buttons
      expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('type', 'button');
      expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('type', 'button');
      expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
        'type',
        'button',
      );
      expect(screen.getByRole('button', { name: 'Last 90 days' })).toHaveAttribute(
        'type',
        'button',
      );
      expect(screen.getByRole('button', { name: 'Last year' })).toHaveAttribute('type', 'button');
    });

    it('should have proper ID attributes on form controls', () => {
      renderAdvancedFilters();

      expect(screen.getByLabelText('File Type')).toHaveAttribute('id', 'filter-file-type');
      expect(screen.getByLabelText('Status')).toHaveAttribute('id', 'filter-status');
      expect(screen.getByLabelText('From Date')).toHaveAttribute('id', 'filter-date-from');
      expect(screen.getByLabelText('To Date')).toHaveAttribute('id', 'filter-date-to');
      expect(screen.getByLabelText('Min Size')).toHaveAttribute('id', 'filter-size-min');
      expect(screen.getByLabelText('Max Size')).toHaveAttribute('id', 'filter-size-max');
      expect(screen.getByLabelText('Sort By')).toHaveAttribute('id', 'filter-sort-by');
      expect(screen.getByLabelText('Sort Order')).toHaveAttribute('id', 'filter-sort-order');
    });

    it('should use date input type for date fields', () => {
      renderAdvancedFilters();

      expect(screen.getByLabelText('From Date')).toHaveAttribute('type', 'date');
      expect(screen.getByLabelText('To Date')).toHaveAttribute('type', 'date');
    });

    it('should use number input type for size fields', () => {
      renderAdvancedFilters();

      expect(screen.getByLabelText('Min Size')).toHaveAttribute('type', 'number');
      expect(screen.getByLabelText('Max Size')).toHaveAttribute('type', 'number');
    });
  });

  // ==========================================================================
  // Section Headings Tests
  // ==========================================================================
  describe('section headings', () => {
    it('should render File Size Range section heading', () => {
      renderAdvancedFilters();
      expect(screen.getByText('File Size Range')).toBeInTheDocument();
    });

    it('should render Quick Date Filters section heading', () => {
      renderAdvancedFilters();
      expect(screen.getByText('Quick Date Filters')).toBeInTheDocument();
    });
  });
});
