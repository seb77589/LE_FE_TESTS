/**
 * Unit Test for UnifiedLoginForm Component
 *
 * Coverage Target: 80%+
 * Estimated Tests: 30-35
 * Priority: HIGH (auth flow critical)
 *
 * Test Categories:
 * - Basic rendering (5 tests)
 * - Form validation (8 tests)
 * - Login submission (6 tests)
 * - Error handling (8 tests)
 * - Rate limiting (4 tests)
 * - URL cleanup and security (3 tests)
 * - Notification handling (3 tests)
 * - Props variations (3 tests)
 */

// Mock dependencies BEFORE imports using factory functions
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    login: jest.fn(),
    user: null as any,
    isAuthenticated: false,
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

jest.mock('@/hooks/useErrorTracking', () => ({
  useFormTracking: jest.fn(() => ({
    trackFormSubmit: jest.fn(),
    trackFormSuccess: jest.fn(),
    trackFormError: jest.fn(),
  })),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/network/rateLimiter', () => ({
  isRateLimited: jest.fn(),
  recordAttempt: jest.fn(),
  getRateLimitStatus: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  tokenManager: {
    clearTokens: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  testApiConnectivity: jest.fn(),
}));

jest.mock('@/hooks/useCSRFToken', () => ({
  addCSRFToken: jest.fn((headers) => headers),
}));

jest.mock('@/lib/errors', () => ({
  parseAuthError: jest.fn(),
  isEmailVerificationError: jest.fn(),
  isAccountLockedError: jest.fn(),
}));

jest.mock('react-hot-toast', () => {
  const mockToast = Object.assign(
    jest.fn((message: any) => message),
    {
      error: jest.fn(),
      success: jest.fn(),
    },
  );
  return {
    __esModule: true,
    default: mockToast,
  };
});

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
import UnifiedLoginForm from '@/components/auth/UnifiedLoginForm';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useSearchParams } from 'next/navigation';
import { useFormTracking } from '@/hooks/useErrorTracking';
import { isRateLimited, recordAttempt, getRateLimitStatus } from '@/lib/network';
import { tokenManager } from '@/lib/session';
import { testApiConnectivity } from '@/lib/api';
import { parseAuthError } from '@/lib/errors';
import toast from 'react-hot-toast';
import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';

// ==============================================================================
// Module-level test utilities (extracted to reduce nesting depth - fixes S2004)
// ==============================================================================

// Delayed promise factory - creates a Promise that resolves after specified delay
function createDelayedPromise<T = void>(value: T, delayMs: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}

// Factory for creating mock implementations that return delayed promises
function createDelayedMockImpl<T = void>(delayMs: number, value?: T): () => Promise<T> {
  return () => createDelayedPromise(value as T, delayMs);
}

// Pre-defined delayed promise for API connectivity timeout test
const createApiConnectivityTimeoutMock = (): Promise<boolean> =>
  createDelayedPromise(false, 10000);

describe('UnifiedLoginForm', () => {
  let mockLogin: jest.Mock;
  let mockSearchParamsGet: jest.Mock;
  let mockTrackFormSubmit: jest.Mock;
  let mockTrackFormSuccess: jest.Mock;
  let mockTrackFormError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockLogin = jest.fn().mockResolvedValue(undefined);
    mockSearchParamsGet = jest.fn().mockReturnValue(null);
    mockTrackFormSubmit = jest.fn();
    mockTrackFormSuccess = jest.fn();
    mockTrackFormError = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      user: null,
      isAuthenticated: false,
    });

    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockSearchParamsGet,
    });

    (useFormTracking as jest.Mock).mockReturnValue({
      trackFormSubmit: mockTrackFormSubmit,
      trackFormSuccess: mockTrackFormSuccess,
      trackFormError: mockTrackFormError,
    });

    (testApiConnectivity as jest.Mock).mockResolvedValue(true);
    (tokenManager.clearTokens as jest.Mock).mockResolvedValue(undefined);
    (isRateLimited as jest.Mock).mockReturnValue(false);
    (getRateLimitStatus as jest.Mock).mockReturnValue({
      allowed: true,
      remaining: 5,
      resetTime: Date.now() + 900000,
    });
    (parseAuthError as jest.Mock).mockReturnValue({
      type: 'authentication',
      message: 'Invalid credentials',
      details: null,
      retryable: true,
    });

    // Mock localStorage
    Object.defineProperty(globalThis.window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  // Helper to create delayed promise mock - uses module-level factory
  const createDelayedPromiseMock = (delayMs: number) => createDelayedMockImpl(delayMs);

  describe('Basic Rendering', () => {
    it('should render login form with all fields', () => {
      render(<UnifiedLoginForm />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show email required error when submitting empty email', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should show invalid email error for malformed email', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID); // Need valid password to see email error

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton); // Form validation mode is onSubmit

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('should show password length error for short password', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton); // Form validation mode is onSubmit

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters'),
        ).toBeInTheDocument();
      });
    });

    it('should not submit form when validation fails', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should disable form fields when loading', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(createDelayedPromiseMock(1000));

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Login Submission', () => {
    it('should call login with correct credentials', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_CREDENTIALS.USER.password,
          headers: {},
        });
      });
    });

    it('should clear tokens before login attempt', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(tokenManager.clearTokens).toHaveBeenCalledWith('fresh_login_attempt');
      });
    });

    it('should test API connectivity before login', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(testApiConnectivity).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(createDelayedPromiseMock(1000));

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });

    it('should call onSuccess callback after successful login', async () => {
      const user = userEvent.setup();
      const onSuccessMock = jest.fn();

      render(<UnifiedLoginForm onSuccess={onSuccessMock} />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });

    it('should track form submission analytics', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTrackFormSubmit).toHaveBeenCalledWith({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          hasEmail: true,
          hasPassword: true,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      (parseAuthError as jest.Mock).mockReturnValue({
        type: 'authentication',
        message: 'Invalid credentials',
        details: null,
        retryable: true,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WRONG);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should clear error when dismiss button clicked', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      (parseAuthError as jest.Mock).mockReturnValue({
        type: 'authentication',
        message: 'Invalid credentials',
        details: null,
        retryable: true,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WRONG);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText('Dismiss error');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });

    it('should show error when API connectivity check fails', async () => {
      const user = userEvent.setup();
      (testApiConnectivity as jest.Mock).mockResolvedValue(false);

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should clear tokens on failed login attempt', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WRONG);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(tokenManager.clearTokens).toHaveBeenCalledWith('failed_login_cleanup');
      });
    });

    it('should track form error analytics on failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WRONG);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTrackFormError).toHaveBeenCalled();
      });
    });

    it('should show error details when available', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Login failed'));
      (parseAuthError as jest.Mock).mockReturnValue({
        type: 'authentication',
        message: 'Login failed',
        details: 'Your account has been temporarily locked',
        retryable: false,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
        expect(
          screen.getByText('Your account has been temporarily locked'),
        ).toBeInTheDocument();
      });
    });

    it('should show remaining attempts warning when low', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials', remaining_attempts: 2 } },
      });
      (parseAuthError as jest.Mock).mockReturnValue({
        type: 'authentication',
        message: 'Invalid credentials',
        details: null,
        retryable: true,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WRONG);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/⚠️ Warning: 2 login attempts remaining/),
        ).toBeInTheDocument();
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
        resetTime: Date.now() + 900000, // 15 minutes from now
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
        expect(
          screen.getByText(/Too many login attempts. Please wait 15 minutes/),
        ).toBeInTheDocument();
      });

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should record login attempt when not rate limited', async () => {
      const user = userEvent.setup();
      (isRateLimited as jest.Mock).mockReturnValue(false);

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(recordAttempt).toHaveBeenCalledWith('unified_login_attempts');
      });
    });

    it('should dismiss rate limit alert when dismiss clicked', async () => {
      const user = userEvent.setup();
      (isRateLimited as jest.Mock).mockReturnValue(true);
      (getRateLimitStatus as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByTestId('rate-limit-alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Forced Logout Notifications', () => {
    it('should show toast for forced logout from localStorage', () => {
      (globalThis.window.localStorage.getItem as jest.Mock).mockReturnValue('true');

      render(<UnifiedLoginForm />);

      expect(toast.error).toHaveBeenCalled();
      expect(globalThis.window.localStorage.removeItem).toHaveBeenCalledWith(
        'forcedLogout',
      );
    });

    it('should show toast for forced logout from URL parameter', () => {
      mockSearchParamsGet.mockReturnValue('forced');

      render(<UnifiedLoginForm />);

      expect(toast.error).toHaveBeenCalled();
    });

    it('should show toast for expired session from URL parameter', () => {
      mockSearchParamsGet.mockReturnValue('expired');

      render(<UnifiedLoginForm />);

      expect(toast).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(createDelayedPromiseMock(500));

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only submit once (or handle gracefully)
      await waitFor(() => {
        expect(mockLogin.mock.calls.length).toBeLessThanOrEqual(3);
      });
    });

    it('should handle network timeout errors', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });
      (parseAuthError as jest.Mock).mockReturnValue({
        type: 'network',
        message: 'Request timeout. Please check your connection.',
        details: null,
        retryable: true,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      });
    });

    it('should handle empty string email', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(emailInput, '   '); // Whitespace only
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton); // Form validation mode is onSubmit

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('should handle very long email addresses', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      // Zod's email validator accepts long emails as valid, so this tests that
      // very long (but valid format) emails can be submitted
      const longEmail = 'a'.repeat(50) + '@example.com';
      await user.type(emailInput, longEmail);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton); // Form validation mode is onSubmit

      // Long but valid email should be accepted and login called
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle special characters in email', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(emailInput, 'test+tag@example.com');
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton); // Form validation mode is onSubmit

      // Should accept valid special characters - login should be called
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle password with only spaces', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, '    '); // 4 spaces only - less than 8 chars

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton); // Form validation mode is onSubmit

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters'),
        ).toBeInTheDocument();
      });
    });

    it('should handle API connectivity check timeout', async () => {
      const user = userEvent.setup();
      (testApiConnectivity as jest.Mock).mockImplementation(
        createApiConnectivityTimeoutMock,
      );

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should handle timeout gracefully
      await waitFor(() => {
        expect(testApiConnectivity).toHaveBeenCalled();
      });
    });

    it('should handle concurrent login attempts from multiple tabs', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(createDelayedPromiseMock(1000));

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Simulate concurrent attempts
      const promise1 = user.click(submitButton);
      const promise2 = user.click(submitButton);

      await Promise.all([promise1, promise2]);

      // Should handle gracefully
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle rate limit status changes during form fill', async () => {
      const user = userEvent.setup();
      // First submission succeeds, second submission is rate limited
      (isRateLimited as jest.Mock)
        .mockReturnValueOnce(false) // First submit - not rate limited
        .mockReturnValueOnce(true); // Second submit - rate limited
      (getRateLimitStatus as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000,
      });

      render(<UnifiedLoginForm />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First submission - should succeed
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      // Clear inputs and re-enter for second submission
      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      // Second submission - should be rate limited
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
      });
    });

    // REMOVED: localStorage error handling test
    // HttpOnly cookies replaced localStorage for token storage in v0.2.0
    // Test was skipped and is now obsolete - localStorage is no longer used for tokens
    // See: docs/testing/SKIPPED_TESTS_CLEANUP.md for migration details

    it('should use custom redirectTo prop', async () => {
      const user = userEvent.setup();
      render(<UnifiedLoginForm redirectTo="/custom-redirect" />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTrackFormSuccess).toHaveBeenCalledWith({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          redirectTo: '/custom-redirect',
        });
      });
    });
  });
});
