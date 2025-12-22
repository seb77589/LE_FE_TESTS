/**
 * Tests for ActivityFilters component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFilters } from '@/components/admin/activity/ActivityFilters';
import { ActivityFilters as ActivityFiltersType } from '@/components/admin/activity/types';

// Mock dependencies
jest.mock('@/components/ui/Input', () => {
  const MockInput = React.forwardRef(({ label, ...props }: any, ref: any) => (
    <div>
      <label htmlFor={props.id}>{label}</label>
      <input id={props.id} ref={ref} {...props} />
    </div>
  ));
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});

jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
}));

describe('ActivityFilters', () => {
  const mockFilters: ActivityFiltersType = {
    hours: 24,
    search: '',
  };

  const mockActivityTypes = ['user_login', 'document_uploaded', 'admin_action'];
  const mockSeverityLevels = ['low', 'medium', 'high', 'critical'];

  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render activity filters component', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      expect(screen.getByText(/activity type/i)).toBeInTheDocument();
      expect(screen.getByText(/severity/i)).toBeInTheDocument();
      expect(screen.getByText(/time period/i)).toBeInTheDocument();
    });

    it('should render all filter controls', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      expect(screen.getByTestId('activity-filter')).toBeInTheDocument();
      expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/time period/i)).toBeInTheDocument();
    });
  });

  describe('Activity Type Filter', () => {
    it('should display activity type options', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      expect(screen.getByText('user_login')).toBeInTheDocument();
      expect(screen.getByText('document_uploaded')).toBeInTheDocument();
      expect(screen.getByText('admin_action')).toBeInTheDocument();
    });

    it('should call onFiltersChange when activity type changes', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const activityTypeSelect = screen.getByTestId('activity-filter');
      fireEvent.change(activityTypeSelect, { target: { value: 'user_login' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        activity_type: 'user_login',
      });
    });

    it('should show "All types" option', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      expect(screen.getByText('All types')).toBeInTheDocument();
    });
  });

  describe('Severity Filter', () => {
    it('should display severity level options', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('should call onFiltersChange when severity changes', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const severitySelect = screen.getByLabelText(/severity/i);
      fireEvent.change(severitySelect, { target: { value: 'high' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        severity: 'high',
      });
    });
  });

  describe('Time Period Filter', () => {
    it('should display time period options', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      expect(screen.getByText('Last hour')).toBeInTheDocument();
      expect(screen.getByText('Last 6 hours')).toBeInTheDocument();
      expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
      expect(screen.getByText('Last week')).toBeInTheDocument();
    });

    it('should call onFiltersChange when time period changes', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const timePeriodSelect = screen.getByLabelText(/time period/i);
      fireEvent.change(timePeriodSelect, { target: { value: '168' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        hours: 168,
      });
    });

    it('should default to 24 hours', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const timePeriodSelect = screen.getByLabelText(/time period/i);
      expect(timePeriodSelect).toHaveValue('24');
    });
  });

  describe('Search Filter', () => {
    it('should render search input', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const searchInput = screen.getByPlaceholderText(/search activities/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should call onFiltersChange when search changes', () => {
      render(
        <ActivityFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const searchInput = screen.getByPlaceholderText(/search activities/i);
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        search: 'test search',
      });
    });
  });

  describe('Clear Filters (undefined branches)', () => {
    it('should set activity_type to undefined when "All types" is selected', () => {
      const filtersWithType = { ...mockFilters, activity_type: 'user_login' };
      render(
        <ActivityFilters
          filters={filtersWithType}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const activityTypeSelect = screen.getByTestId('activity-filter');
      fireEvent.change(activityTypeSelect, { target: { value: '' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...filtersWithType,
        activity_type: undefined,
      });
    });

    it('should set severity to undefined when "All severities" is selected', () => {
      const filtersWithSeverity = { ...mockFilters, severity: 'high' };
      render(
        <ActivityFilters
          filters={filtersWithSeverity}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const severitySelect = screen.getByLabelText(/severity/i);
      fireEvent.change(severitySelect, { target: { value: '' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...filtersWithSeverity,
        severity: undefined,
      });
    });

    it('should default hours select to 24 when hours is undefined', () => {
      const filtersWithUndefinedHours: ActivityFiltersType = {
        search: '',
        // hours is intentionally undefined to test the || '24' fallback
      };
      render(
        <ActivityFilters
          filters={filtersWithUndefinedHours}
          onFiltersChange={mockOnFiltersChange}
          activityTypes={mockActivityTypes}
          severityLevels={mockSeverityLevels}
        />,
      );
      const hoursSelect = screen.getByLabelText(/time period/i);
      expect(hoursSelect).toHaveValue('24');
    });
  });
});
