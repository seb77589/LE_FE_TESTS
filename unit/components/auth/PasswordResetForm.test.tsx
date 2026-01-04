/**
 * Unit Test for PasswordResetForm Component
 *
 * Coverage Target: 95%+
 * Estimated Tests: 11 tests
 * Priority: CRITICAL (password reset flow critical)
 *
 * Test Categories:
 * - Basic rendering (3 tests)
 * - Form validation (2 tests)
 * - Reset submission (3 tests)
 * - Error handling (2 tests)
 * - Rate limiting (1 test)
 */

// Mock dependencies BEFORE imports using factory functions
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    requestPasswordReset: jest.fn(),
  },
  handleApiError: jest.fn((err: any) => err.message || 'An error occurred'),
}));

jest.mock('@/lib/network/rateLimiter', () => ({
  isRateLimited: jest.fn(() => false),
  recordAttempt: jest.fn(),
  getRateLimitStatus: jest.fn(() => ({
    allowed: true,
    remaining: 3,
    resetTime: Date.now() + 3600000,
  })),
}));

jest.mock('@/components/ui/RateLimitAlert', () => ({
  RateLimitAlert: ({ message, onDismiss }: any) => (
    <div data-testid="rate-limit-alert">
      <p>{message}</p>
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { authApi, handleApiError } from '@/lib/api';
import { isRateLimited, recordAttempt, getRateLimitStatus } from '@/lib/network';

import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';
describe('PasswordResetForm', () => {
  // Helper to create delayed promise mock
  const createDelayedPromiseMock = (delayMs: number) => {
    return () => new Promise((resolve) => setTimeout(resolve, delayMs));
  };
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (authApi.requestPasswordReset as jest.Mock).mockResolvedValue({
      message: 'Password reset email sent successfully',
    });
    (handleApiError as jest.Mock).mockImplementation(
      (err: any) => err.message || 'An error occurred',
    );
    (isRateLimited as jest.Mock).mockReturnValue(false);
    (getRateLimitStatus as jest.Mock).mockReturnValue({
      allowed: true,
      remaining: 3,
      resetTime: Date.now() + 3600000,
    });
  });

  describe('Basic Rendering', () => {
    it('should render password reset form with all elements', () => {
      render(<PasswordResetForm />);

      expect(screen.getByText('Reset your password')).toBeInTheDocument();
      expect(
        screen.getByText(/Enter your email address and we'll send you a link/),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /send reset link/i }),
      ).toBeInTheDocument();
    });

    it('should render back to sign in link', () => {
      render(<PasswordResetForm />);

      const backLink = screen.getByRole('link', { name: /back to sign in/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/auth/login');
    });

    it('should have email input with correct attributes', () => {
      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Form Validation', () => {
    it('should show email required error when submitting empty email', async () => {
      const user = userEvent.setup();
      render(<PasswordResetForm />);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });

      // API should not be called
      expect(authApi.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should show invalid email error for malformed email', async () => {
      const user = userEvent.setup();
      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger onChange validation

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Submission', () => {
    it('should call requestPasswordReset with correct email', async () => {
      const user = userEvent.setup();
      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.requestPasswordReset).toHaveBeenCalledWith({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
        });
      });
    });

    it('should show success message after successful reset request', async () => {
      const user = userEvent.setup();
      (authApi.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'Password reset email sent successfully. Please check your inbox.',
      });

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Password reset email sent successfully. Please check your inbox.',
          ),
        ).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      (authApi.requestPasswordReset as jest.Mock).mockImplementation(
        createDelayedPromiseMock(1000),
      );

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Sending reset link...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      const user = userEvent.setup();
      (authApi.requestPasswordReset as jest.Mock).mockRejectedValue(
        new Error('Email not found'),
      );
      (handleApiError as jest.Mock).mockReturnValue('Email not found');

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_DATA.EMAIL.NONEXISTENT);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Email not found')).toBeInTheDocument();
      });
    });

    it('should clear error when dismiss button clicked', async () => {
      const user = userEvent.setup();
      (authApi.requestPasswordReset as jest.Mock).mockRejectedValue(
        new Error('Email not found'),
      );
      (handleApiError as jest.Mock).mockReturnValue('Email not found');

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email not found')).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText('Close alert');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Email not found')).not.toBeInTheDocument();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should show rate limit alert when rate limited', async () => {
      const user = userEvent.setup();
      (isRateLimited as jest.Mock).mockReturnValue(true);
      (getRateLimitStatus as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000, // 1 hour from now
      });

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
        expect(
          screen.getByText(/Too many password reset attempts. Please wait 1 hour/),
        ).toBeInTheDocument();
      });

      // API should not be called
      expect(authApi.requestPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('Success/Error State Management', () => {
    it('should clear success message when dismiss button clicked', async () => {
      const user = userEvent.setup();
      (authApi.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'Password reset email sent successfully',
      });

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Password reset email sent successfully'),
        ).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText('Close alert');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Password reset email sent successfully'),
        ).not.toBeInTheDocument();
      });
    });

    it('should clear previous errors on new submission', async () => {
      const user = userEvent.setup();
      (authApi.requestPasswordReset as jest.Mock)
        .mockRejectedValueOnce(new Error('Email not found'))
        .mockResolvedValueOnce({ message: 'Success' });
      (handleApiError as jest.Mock).mockReturnValue('Email not found');

      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      // First submission (error)
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email not found')).toBeInTheDocument();
      });

      // Second submission (success)
      await user.clear(emailInput);
      await user.type(emailInput, FRONTEND_TEST_DATA.EMAIL.VALID);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Email not found')).not.toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });
  });

  describe('Rate Limit Recording', () => {
    it('should record rate limit attempt on submission', async () => {
      const user = userEvent.setup();
      render(<PasswordResetForm />);

      const emailInput = screen.getByLabelText('Email address');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(recordAttempt).toHaveBeenCalledWith('password_reset_form', undefined, {
          maxAttempts: 3,
          timeWindowMs: 3600000,
        });
      });
    });
  });
});
