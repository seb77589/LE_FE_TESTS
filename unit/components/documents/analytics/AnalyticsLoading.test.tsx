/**
 * Tests for AnalyticsLoading component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AnalyticsLoading } from '@/components/documents/analytics/AnalyticsLoading';

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('AnalyticsLoading', () => {
  describe('Basic Rendering', () => {
    it('should render analytics loading state', () => {
      const { container } = render(<AnalyticsLoading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display loading spinner', () => {
      const { container } = render(<AnalyticsLoading />);
      const spinner = container.querySelector('.animate-spin.rounded-full');
      expect(spinner).toBeInTheDocument();
    });
  });
});
