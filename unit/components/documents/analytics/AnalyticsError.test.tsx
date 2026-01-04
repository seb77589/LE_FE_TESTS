/**
 * Tests for AnalyticsError component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsError } from '@/components/documents/analytics/AnalyticsError';

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, className }: any) => (
    <button onClick={onClick} data-variant={variant} className={className}>
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="chart-icon">Chart</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('AnalyticsError', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render analytics error state', () => {
      render(<AnalyticsError error="Failed to load analytics" />);
      const errorElements = screen.getAllByText('Failed to load analytics');
      expect(errorElements.length).toBeGreaterThan(0);
    });

    it('should display error message', () => {
      render(<AnalyticsError error="Network error" />);
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should render chart icon', () => {
      render(<AnalyticsError error="Failed to load analytics" />);
      expect(screen.getByTestId('chart-icon')).toBeInTheDocument();
    });

    it('should display error title', () => {
      render(<AnalyticsError error="Failed to load analytics" />);
      const errorElements = screen.getAllByText('Failed to load analytics');
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  describe('Retry Button', () => {
    it('should render retry button when onRetry is provided', () => {
      render(<AnalyticsError error="Failed to load analytics" onRetry={mockOnRetry} />);
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should not render retry button when onRetry is not provided', () => {
      render(<AnalyticsError error="Failed to load analytics" />);
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      render(<AnalyticsError error="Failed to load analytics" onRetry={mockOnRetry} />);
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });
});
