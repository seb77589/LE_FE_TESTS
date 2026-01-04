/**
 * Tests for PreviewLoading component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PreviewLoading } from '@/components/documents/preview/PreviewLoading';

describe('PreviewLoading', () => {
  describe('Basic Rendering', () => {
    it('should render preview loading state', () => {
      const { container } = render(<PreviewLoading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display loading spinner', () => {
      const { container } = render(<PreviewLoading />);
      const spinner = container.querySelector('.animate-spin.rounded-full');
      expect(spinner).toBeInTheDocument();
    });
  });
});
