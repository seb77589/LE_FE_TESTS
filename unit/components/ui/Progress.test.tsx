/**
 * Tests for Progress component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Progress } from '@/components/ui/Progress';

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Progress', () => {
  describe('Basic Rendering', () => {
    it('should render progress bar', () => {
      const { container } = render(<Progress value={50} />);
      const progress = container.querySelector('.bg-gray-200');
      expect(progress).toBeInTheDocument();
    });

    it('should display progress bar with correct width', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('should handle custom max value', () => {
      const { container } = render(<Progress value={50} max={200} />);
      const progressBar = container.querySelector('.bg-blue-600');
      // 50/200 = 25%
      expect(progressBar).toHaveStyle({ width: '25%' });
    });
  });

  describe('Value Ranges', () => {
    it('should handle 0% value', () => {
      const { container } = render(<Progress value={0} />);
      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('should handle 100% value', () => {
      const { container } = render(<Progress value={100} />);
      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should clamp values above max', () => {
      const { container } = render(<Progress value={150} max={100} />);
      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should clamp values below 0', () => {
      const { container } = render(<Progress value={-10} max={100} />);
      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Progress value={50} className="custom-class" />);
      const progress = container.querySelector('.bg-gray-200');
      expect(progress).toHaveClass('custom-class');
    });
  });
});
