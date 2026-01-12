/**
 * Tests for PreviewLoading component
 *
 * SKIP: Component PreviewLoading does not exist in the codebase.
 * The preview loading state is handled inline in other components.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Component does not exist - test file should be skipped
// import { PreviewLoading } from '@/components/documents/preview/PreviewLoading';

// Placeholder for tests
const PreviewLoading = () => null;

describe.skip('PreviewLoading (component removed)', () => {
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
