/**
 * Unit Test for ErrorDisplay Component
 *
 * Coverage Target: 80%+
 * Estimated Tests: 20-25
 * Priority: HIGH (error rendering)
 *
 * Test Categories:
 * - ErrorDisplay main component (10 tests)
 * - InlineError component (3 tests)
 * - ErrorBanner component (4 tests)
 * - LoadingError component (4 tests)
 */

// Mock dependencies BEFORE imports
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={`button-${props.variant}-${props.size || 'default'}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorDisplay, {
  InlineError,
  ErrorBanner,
  LoadingError,
} from '@/components/ui/ErrorDisplay';

describe('ErrorDisplay', () => {
  describe('Basic Rendering', () => {
    it('should render error message with default severity', () => {
      render(<ErrorDisplay message="Something went wrong" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<ErrorDisplay message="Test message" title="Custom Error" />);

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('should render with error severity (default)', () => {
      const { container } = render(
        <ErrorDisplay message="Error message" severity="error" />,
      );

      const alertDiv = container.querySelector('[role="alert"]');
      // Component uses design tokens instead of hardcoded colors
      expect(alertDiv?.className).toContain('bg-destructive');
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render with warning severity', () => {
      const { container } = render(
        <ErrorDisplay message="Warning message" severity="warning" />,
      );

      const alertDiv = container.querySelector('[role="alert"]');
      // Component uses design token 'bg-accent' instead of 'bg-yellow-50'
      expect(alertDiv?.className).toContain('bg-accent');
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should render with info severity', () => {
      const { container } = render(
        <ErrorDisplay message="Info message" severity="info" />,
      );

      const alertDiv = container.querySelector('[role="alert"]');
      // Component uses design token 'bg-primary' instead of 'bg-blue-50'
      expect(alertDiv?.className).toContain('bg-primary');
      expect(screen.getByText('Information')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ErrorDisplay message="Test" className="my-custom-class" />,
      );

      const alertDiv = container.querySelector('[role="alert"]');
      expect(alertDiv).toHaveClass('my-custom-class');
    });
  });

  describe('Details Section', () => {
    it('should render details section when provided', () => {
      render(
        <ErrorDisplay
          message="Error occurred"
          details="Stack trace: Error at line 42"
        />,
      );

      expect(screen.getByText('Show details')).toBeInTheDocument();
      expect(screen.getByText(/Stack trace: Error at line 42/)).toBeInTheDocument();
    });

    it('should not render details section when not provided', () => {
      render(<ErrorDisplay message="Error occurred" />);

      expect(screen.queryByText('Show details')).not.toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when Dismiss button clicked', async () => {
      const user = userEvent.setup();
      const onDismissMock = jest.fn();

      render(
        <ErrorDisplay
          message="Dismissible error"
          dismissible={true}
          onDismiss={onDismissMock}
        />,
      );

      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      expect(onDismissMock).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when X button clicked', async () => {
      const user = userEvent.setup();
      const onDismissMock = jest.fn();

      render(
        <ErrorDisplay
          message="Dismissible error"
          dismissible={true}
          onDismiss={onDismissMock}
        />,
      );

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(onDismissMock).toHaveBeenCalledTimes(1);
    });

    it('should not show dismiss button when dismissible=false', () => {
      render(
        <ErrorDisplay
          message="Non-dismissible error"
          dismissible={false}
          onDismiss={jest.fn()}
        />,
      );

      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });

    it('should not show dismiss button when onDismiss not provided', () => {
      render(<ErrorDisplay message="Error" dismissible={true} />);

      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button when showRetry=true and onRetry provided', () => {
      render(
        <ErrorDisplay
          message="Failed operation"
          showRetry={true}
          onRetry={jest.fn()}
        />,
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call onRetry when Retry button clicked', async () => {
      const user = userEvent.setup();
      const onRetryMock = jest.fn();

      render(
        <ErrorDisplay
          message="Failed operation"
          showRetry={true}
          onRetry={onRetryMock}
        />,
      );

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it('should show Retrying... when retry is in progress', () => {
      render(
        <ErrorDisplay
          message="Failed operation"
          showRetry={true}
          onRetry={jest.fn()}
          retrying={true}
        />,
      );

      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should disable retry button when retrying', () => {
      render(
        <ErrorDisplay
          message="Failed operation"
          showRetry={true}
          onRetry={jest.fn()}
          retrying={true}
        />,
      );

      const button = screen.getByTestId('button-secondary-sm');
      expect(button).toBeDisabled();
    });

    it('should not show retry button when showRetry=false', () => {
      render(<ErrorDisplay message="Error" showRetry={false} onRetry={jest.fn()} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should not show retry button when onRetry not provided', () => {
      render(<ErrorDisplay message="Error" showRetry={true} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ErrorDisplay message="Accessible error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible dismiss button label', () => {
      render(<ErrorDisplay message="Error" dismissible={true} onDismiss={jest.fn()} />);

      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should have accessible close button label', () => {
      render(<ErrorDisplay message="Error" dismissible={true} onDismiss={jest.fn()} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });
  });
});

describe('InlineError', () => {
  it('should render inline error with message', () => {
    render(<InlineError message="Field is required" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <InlineError message="Error" className="my-custom-class" />,
    );

    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('my-custom-class');
  });

  it('should have error styling', () => {
    const { container } = render(<InlineError message="Error" />);

    const alertDiv = container.querySelector('[role="alert"]');
    // Component uses design token 'text-destructive' instead of 'text-red-600'
    expect(alertDiv?.className).toContain('text-destructive');
  });
});

describe('ErrorBanner', () => {
  it('should render error banner with message', () => {
    render(<ErrorBanner message="Page-level error occurred" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Page-level error occurred')).toBeInTheDocument();
  });

  it('should show retry button when onRetry provided', () => {
    render(<ErrorBanner message="Error" onRetry={jest.fn()} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    const onRetryMock = jest.fn();

    render(<ErrorBanner message="Error" onRetry={onRetryMock} />);

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('should show Retrying... when retrying', () => {
    render(<ErrorBanner message="Error" onRetry={jest.fn()} retrying={true} />);

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('should disable retry button when retrying', () => {
    render(<ErrorBanner message="Error" onRetry={jest.fn()} retrying={true} />);

    const button = screen.getByTestId('button-secondary-sm');
    expect(button).toBeDisabled();
  });

  it('should not show retry button when onRetry not provided', () => {
    render(<ErrorBanner message="Error" />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorBanner message="Error" className="my-custom-class" />,
    );

    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('my-custom-class');
  });
});

describe('LoadingError', () => {
  it('should render with default message', () => {
    render(<LoadingError />);

    expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingError message="Custom error message" />);

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should show Try Again button when onRetry provided', () => {
    render(<LoadingError onRetry={jest.fn()} />);

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should call onRetry when button clicked', async () => {
    const user = userEvent.setup();
    const onRetryMock = jest.fn();

    render(<LoadingError onRetry={onRetryMock} />);

    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('should show Retrying... when retrying', () => {
    render(<LoadingError onRetry={jest.fn()} retrying={true} />);

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('should disable button when retrying', () => {
    render(<LoadingError onRetry={jest.fn()} retrying={true} />);

    const button = screen.getByTestId('button-primary-default');
    expect(button).toBeDisabled();
  });

  it('should not show button when onRetry not provided', () => {
    render(<LoadingError />);

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});
