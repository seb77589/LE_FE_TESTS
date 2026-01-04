/**
 * Tests for ErrorDisplay component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay from '@/components/ui/ErrorDisplay';

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  X: () => <div data-testid="x-icon">X</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
}));

describe('ErrorDisplay', () => {
  const mockOnDismiss = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render error message', () => {
      render(<ErrorDisplay message="Test error message" />);
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render with default severity (error)', () => {
      render(<ErrorDisplay message="Error message" />);
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('should render custom title when provided', () => {
      render(<ErrorDisplay message="Error" title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  describe('Severity Levels', () => {
    it('should render error severity', () => {
      render(<ErrorDisplay message="Error" severity="error" />);
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('should render warning severity', () => {
      render(<ErrorDisplay message="Warning" severity="warning" />);
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should render info severity', () => {
      render(<ErrorDisplay message="Info" severity="info" />);
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });
  });

  describe('Dismissible', () => {
    it('should show dismiss button when dismissible is true', () => {
      render(
        <ErrorDisplay message="Error" dismissible={true} onDismiss={mockOnDismiss} />,
      );
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      render(
        <ErrorDisplay message="Error" dismissible={true} onDismiss={mockOnDismiss} />,
      );
      const dismissButton = screen.getByTestId('x-icon').parentElement;
      if (dismissButton) {
        fireEvent.click(dismissButton);
        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      }
    });

    it('should not show dismiss button when dismissible is false', () => {
      render(<ErrorDisplay message="Error" dismissible={false} />);
      expect(screen.queryByText(/dismiss/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button when showRetry is true', () => {
      render(<ErrorDisplay message="Error" showRetry={true} onRetry={mockOnRetry} />);
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      render(<ErrorDisplay message="Error" showRetry={true} onRetry={mockOnRetry} />);
      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should disable retry button when retrying is true', () => {
      render(
        <ErrorDisplay
          message="Error"
          showRetry={true}
          onRetry={mockOnRetry}
          retrying={true}
        />,
      );
      const retryButton = screen.getByTestId('button');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Details', () => {
    it('should show details when provided', () => {
      render(<ErrorDisplay message="Error" details="Technical details here" />);
      expect(screen.getByText('Technical details here')).toBeInTheDocument();
    });

    it('should not show details section when details not provided', () => {
      render(<ErrorDisplay message="Error" />);
      expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
    });
  });
});
