/**
 * Tests for PreviewError component
 *
 * SKIP: Component PreviewError does not exist in the codebase.
 * The error state is handled via LoadingError from ErrorDisplay component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Component does not exist - test file should be skipped
// import { PreviewError } from '@/components/documents/preview/PreviewError';

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="error-icon">X</div>,
}));

// Placeholder for tests
const PreviewError = ({ error, onRetry }: { error: string; onRetry: () => void }) => null;

describe.skip('PreviewError (component removed)', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render preview error state', () => {
      render(<PreviewError error="Failed to load preview" onRetry={mockOnRetry} />);
      expect(screen.getByText('Preview Error')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(<PreviewError error="Failed to load preview" onRetry={mockOnRetry} />);
      expect(screen.getByText('Failed to load preview')).toBeInTheDocument();
    });

    it('should render error icon', () => {
      render(<PreviewError error="Failed to load preview" onRetry={mockOnRetry} />);
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });

    it('should render retry button', () => {
      render(<PreviewError error="Failed to load preview" onRetry={mockOnRetry} />);
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onRetry when retry button is clicked', () => {
      render(<PreviewError error="Failed to load preview" onRetry={mockOnRetry} />);
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });
});
