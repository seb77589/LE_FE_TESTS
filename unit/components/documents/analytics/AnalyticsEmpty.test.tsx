/**
 * Tests for AnalyticsEmpty component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnalyticsEmpty } from '@/components/documents/analytics/AnalyticsEmpty';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="chart-icon">Chart</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('AnalyticsEmpty', () => {
  describe('Basic Rendering', () => {
    it('should render analytics empty state', () => {
      render(<AnalyticsEmpty />);
      expect(screen.getByText('No analytics data available')).toBeInTheDocument();
    });

    it('should render chart icon', () => {
      render(<AnalyticsEmpty />);
      expect(screen.getByTestId('chart-icon')).toBeInTheDocument();
    });
  });
});
