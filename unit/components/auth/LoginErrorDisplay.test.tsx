/**
 * Tests for LoginErrorDisplay component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginErrorDisplay } from '@/components/auth/LoginErrorDisplay';

// Mock RateLimitAlert component
jest.mock('@/components/ui/RateLimitAlert', () => ({
  RateLimitAlert: ({ message, onDismiss }: any) => (
    <div data-testid="rate-limit-alert">
      <span>{message}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

describe('LoginErrorDisplay', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limit Error', () => {
    it('should render rate limit alert when authError type is rate_limit', () => {
      render(
        <LoginErrorDisplay
          error={null}
          authError={{ type: 'rate_limit', message: 'Too many attempts' }}
          rateLimitResetAt={Date.now() + 3600000}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
    });

    it('should display rate limit message', () => {
      render(
        <LoginErrorDisplay
          error={null}
          authError={{ type: 'rate_limit', message: 'Too many attempts' }}
          rateLimitResetAt={Date.now() + 3600000}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByText('Too many attempts')).toBeInTheDocument();
    });
  });

  describe('Other Errors', () => {
    it('should render error message when error is provided', () => {
      render(
        <LoginErrorDisplay
          error="Invalid credentials"
          authError={null}
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should render authError message when authError is provided', () => {
      render(
        <LoginErrorDisplay
          error={null}
          authError={{ type: 'authentication', message: 'Authentication failed' }}
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    });

    it('should render authError details when provided', () => {
      render(
        <LoginErrorDisplay
          error={null}
          authError={{
            type: 'authentication',
            message: 'Error',
            details: 'Additional details',
          }}
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByText('Additional details')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      render(
        <LoginErrorDisplay
          error="Test error"
          authError={null}
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Error', () => {
    it('should return null when no error is provided', () => {
      const { container } = render(
        <LoginErrorDisplay
          error={null}
          authError={null}
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
