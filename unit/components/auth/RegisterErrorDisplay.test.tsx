/**
 * Tests for RegisterErrorDisplay component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegisterErrorDisplay } from '@/components/auth/RegisterErrorDisplay';

// Mock RateLimitAlert component
jest.mock('@/components/ui/RateLimitAlert', () => ({
  RateLimitAlert: ({ message, onDismiss }: any) => (
    <div data-testid="rate-limit-alert">
      <span>{message}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

// Mock Alert component
jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, onClose, variant }: any) => (
    <div data-variant={variant} data-testid="alert">
      {children}
      {onClose && <button onClick={onClose}>Close</button>}
    </div>
  ),
}));

describe('RegisterErrorDisplay', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limit Error', () => {
    it('should render rate limit alert when rateLimitResetAt is provided', () => {
      render(
        <RegisterErrorDisplay
          error={null}
          rateLimitResetAt={Date.now() + 3600000}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
    });

    it('should display custom error message in rate limit alert', () => {
      render(
        <RegisterErrorDisplay
          error="Custom rate limit error"
          rateLimitResetAt={Date.now() + 3600000}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByText('Custom rate limit error')).toBeInTheDocument();
    });

    it('should display default message when no error provided', () => {
      render(
        <RegisterErrorDisplay
          error={null}
          rateLimitResetAt={Date.now() + 3600000}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByText(/Too many registration attempts/i)).toBeInTheDocument();
    });
  });

  describe('Regular Error', () => {
    it('should render alert when error is provided and no rate limit', () => {
      render(
        <RegisterErrorDisplay
          error="Registration failed"
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });

    it('should call onDismiss when alert close button is clicked', () => {
      render(
        <RegisterErrorDisplay
          error="Test error"
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Error', () => {
    it('should return null when no error and no rate limit', () => {
      const { container } = render(
        <RegisterErrorDisplay
          error={null}
          rateLimitResetAt={null}
          onDismiss={mockOnDismiss}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
