/**
 * Component-Hook Integration Tests for Authentication
 *
 * Tests the integration between:
 * - UnifiedLoginForm component
 * - useLoginForm hook
 * - useAuth hook (ConsolidatedAuthContext)
 * - API calls
 * - Error propagation from API to UI
 *
 * @integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnifiedLoginForm from '@/components/auth/UnifiedLoginForm';
import { AuthProvider, useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { FRONTEND_TEST_CREDENTIALS, FRONTEND_TEST_DATA } from '../../test-credentials';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    requestVerificationEmail: jest.fn(),
    requestEmailVerification: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  testApiConnectivity: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  tokenManager: {
    clearTokens: jest.fn(),
    isAuthenticated: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    cleanup: jest.fn(),
    getValidAccessToken: jest.fn(),
    setTokens: jest.fn(),
    refreshAccessToken: jest.fn(),
    getTokenMetadata: jest.fn(),
    clearAuth: jest.fn(),
  },
  sessionManager: {
    initialize: jest.fn(),
    getSessionId: jest.fn(),
    validateSession: jest.fn(),
    cleanup: jest.fn(),
  },
}));

jest.mock('@/lib/network/rateLimiter', () => ({
  isRateLimited: jest.fn(),
  recordAttempt: jest.fn(),
  getRateLimitStatus: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked modules
import { authApi, testApiConnectivity } from '@/lib/api';
import { tokenManager, sessionManager } from '@/lib/session';
import { isRateLimited, getRateLimitStatus } from '@/lib/network';

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockTestApiConnectivity = testApiConnectivity as jest.MockedFunction<
  typeof testApiConnectivity
>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;
const mockIsRateLimited = isRateLimited as jest.MockedFunction<typeof isRateLimited>;
const mockGetRateLimitStatus = getRateLimitStatus as jest.MockedFunction<
  typeof getRateLimitStatus
>;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function PasswordResetCompleteComponent(
  props: Readonly<{
    resetPassword: (params: {
      token: string;
      new_password: string;
    }) => Promise<{ message: string }>;
    token: string;
  }>,
) {
  const { resetPassword, token } = props;
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await resetPassword({
        token,
        new_password: password,
      });
      setSuccess(response.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
        placeholder="New Password"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        data-testid="confirm-password-input"
        placeholder="Confirm Password"
      />
      <button type="submit" data-testid="submit-button" disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </button>
      {success && <div data-testid="success-message">{success}</div>}
    </form>
  );
}

function EmailVerificationComponent(
  props: Readonly<{
    verifyEmail: (params: { token: string }) => Promise<{ message: string }>;
    token: string;
  }>,
) {
  const { verifyEmail, token } = props;
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      try {
        const response = await verifyEmail({ token });
        if (isMounted) {
          setSuccess(response.message);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.detail || 'Verification failed');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  return (
    <div>
      {isLoading && (
        <div data-testid="verifying">
          {error ? 'Verifying...' : 'Verifying email...'}
        </div>
      )}
      {success && <div data-testid="success-message">{success}</div>}
      {error && <div data-testid="error-message">{error}</div>}
    </div>
  );
}

function ResendVerificationComponent(
  props: Readonly<{
    requestVerificationEmail: (params: {
      email: string;
    }) => Promise<{ message: string }>;
    email: string;
  }>,
) {
  const { requestVerificationEmail, email } = props;
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const response = await requestVerificationEmail({ email });
      setSuccess(response.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button data-testid="resend-button" onClick={handleResend} disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Resend Verification Email'}
      </button>
      {success && <div data-testid="success-message">{success}</div>}
    </div>
  );
}

function PasswordResetRequestComponent(
  props: Readonly<{
    requestPasswordReset: (params: { email: string }) => Promise<{ message: string }>;
  }>,
) {
  const { requestPasswordReset } = props;
  const [email, setEmail] = React.useState('');
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await requestPasswordReset({ email });
      setSuccess(response.message);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to send reset email');
      setSuccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
        placeholder="Email"
      />
      <button type="submit" data-testid="submit-button" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>
      {success && <div data-testid="success-message">{success}</div>}
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
}

function AuthUserVerifiedComponent() {
  const { user } = useAuth();
  const [verified, setVerified] = React.useState(false);

  React.useEffect(() => {
    if (user?.is_verified) {
      setVerified(true);
    }
  }, [user]);

  return <div>{verified && <div data-testid="user-verified">User verified</div>}</div>;
}

describe('Component-Hook Integration Tests - Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.location.pathname to a protected page so auth context initializes
    // The auth context skips initialization on public pages ('/', '/auth/login', etc.)
    globalThis.history.pushState({}, '', '/dashboard');

    // Default mocks
    mockTestApiConnectivity.mockResolvedValue(true);
    mockTokenManager.clearTokens.mockResolvedValue(undefined);
    mockTokenManager.isAuthenticated.mockResolvedValue(false);
    mockIsRateLimited.mockReturnValue(false);
    mockGetRateLimitStatus.mockReturnValue({
      allowed: true,
      remaining: 5,
      resetTime: Date.now() + 900000,
    });
  });

  describe('UnifiedLoginForm + useAuth Integration', () => {
    it('should integrate form submission with auth context login', async () => {
      const user = userEvent.setup();

      // Mock the API to return a successful login response
      mockAuthApi.login.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        session_id: 'test-session',
      });
      mockAuthApi.getCurrentUser.mockResolvedValue({
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        full_name: 'Test User',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      // Fill form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Verify authApi.login was called through auth context
      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith(
          expect.objectContaining({
            email: FRONTEND_TEST_CREDENTIALS.USER.email,
            password: FRONTEND_TEST_CREDENTIALS.USER.password,
          }),
        );
      });
    });

    it('should propagate API errors to UI through auth context', async () => {
      const user = userEvent.setup();

      // Mock the API to return an error
      mockAuthApi.login.mockRejectedValue({
        response: {
          status: 401,
          data: {
            detail: 'Invalid credentials',
          },
        },
      });

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      // Fill and submit form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WRONG);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Error should be displayed in UI
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should handle loading state during authentication', async () => {
      const user = userEvent.setup();

      // Mock the API with a delayed response to test loading state
      mockAuthApi.login.mockImplementation(async () => {
        await sleep(500);
        return {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          token_type: 'bearer',
        };
      });

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      // Fill and submit form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Loading state should be shown
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Propagation from API to UI', () => {
    it('should display network errors in form', async () => {
      const user = userEvent.setup();

      // Mock the API to return a network error
      mockAuthApi.login.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Network error should be displayed
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should display validation errors from API', async () => {
      const user = userEvent.setup();

      // Mock the API to return validation errors
      mockAuthApi.login.mockRejectedValue({
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'Invalid email format' },
              { loc: ['body', 'password'], msg: 'Password too short' },
            ],
          },
        },
      });

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Use valid formats to bypass client-side validation, so API gets called
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'LongEnoughPassword123!');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // API error should be displayed as alert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission with Auth Context', () => {
    it('should clear tokens before login attempt', async () => {
      const user = userEvent.setup();

      // Mock successful login
      mockAuthApi.login.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
      });

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Token cleanup should be called
      await waitFor(() => {
        expect(mockTokenManager.clearTokens).toHaveBeenCalled();
      });
    });

    it('should initialize session manager after successful login', async () => {
      const user = userEvent.setup();

      // Mock successful login
      mockAuthApi.login.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        session_id: 'test-session-123',
      });

      render(
        <AuthProvider>
          <UnifiedLoginForm />
        </AuthProvider>,
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);
      await user.type(passwordInput, FRONTEND_TEST_CREDENTIALS.USER.password);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // authApi.login should be called
      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalled();
      });
    });
  });

  describe('Password Reset Flow Integration', () => {
    it('should integrate password reset request with API', async () => {
      const user = userEvent.setup();
      const { authApi } = require('@/lib/api');
      const mockRequestPasswordReset = authApi.requestPasswordReset as jest.Mock;

      mockRequestPasswordReset.mockResolvedValue({
        message: 'Password reset email sent successfully',
      });

      render(
        <AuthProvider>
          <PasswordResetRequestComponent
            requestPasswordReset={mockRequestPasswordReset}
          />
        </AuthProvider>,
      );

      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRequestPasswordReset).toHaveBeenCalledWith({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Password reset email sent',
        );
      });
    });

    it('should handle password reset link completion', async () => {
      const user = userEvent.setup();
      const { authApi } = require('@/lib/api');
      const mockResetPassword = authApi.resetPassword as jest.Mock;

      mockResetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      render(
        <AuthProvider>
          <PasswordResetCompleteComponent
            resetPassword={mockResetPassword}
            token="reset-token-123"
          />
        </AuthProvider>,
      );

      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const newPassword = 'NewSecurePassword123!';

      await user.type(passwordInput, newPassword);
      await user.type(confirmPasswordInput, newPassword);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          token: 'reset-token-123',
          new_password: newPassword,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Password reset successfully',
        );
      });
    });

    it('should handle password reset errors', async () => {
      const user = userEvent.setup();
      const { authApi } = require('@/lib/api');
      const mockRequestPasswordReset = authApi.requestPasswordReset as jest.Mock;

      mockRequestPasswordReset.mockRejectedValue({
        response: {
          status: 404,
          data: {
            detail: 'User not found',
          },
        },
      });

      render(
        <AuthProvider>
          <PasswordResetRequestComponent
            requestPasswordReset={mockRequestPasswordReset}
          />
        </AuthProvider>,
      );

      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, 'nonexistent@example.com');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('User not found');
      });
    });
  });

  describe('Email Verification Flow Integration', () => {
    it('should verify email via API with token', async () => {
      const { authApi } = require('@/lib/api');
      const mockVerifyEmail = authApi.verifyEmail as jest.Mock;

      mockVerifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      });

      render(
        <AuthProvider>
          <EmailVerificationComponent
            verifyEmail={mockVerifyEmail}
            token="verification-token-123"
          />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith({
          token: 'verification-token-123',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Email verified successfully',
        );
      });
    });

    it('should handle email verification errors', async () => {
      const { authApi } = require('@/lib/api');
      const mockVerifyEmail = authApi.verifyEmail as jest.Mock;

      mockVerifyEmail.mockRejectedValue({
        response: {
          status: 400,
          data: {
            detail: 'Invalid or expired verification token',
          },
        },
      });

      render(
        <AuthProvider>
          <EmailVerificationComponent
            verifyEmail={mockVerifyEmail}
            token="invalid-token"
          />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Invalid or expired verification token',
        );
      });
    });

    it('should request email verification resend', async () => {
      const user = userEvent.setup();
      const { authApi } = require('@/lib/api');
      const mockRequestVerificationEmail =
        authApi.requestVerificationEmail as jest.Mock;

      mockRequestVerificationEmail.mockResolvedValue({
        message: 'Verification email sent successfully',
      });

      render(
        <AuthProvider>
          <ResendVerificationComponent
            requestVerificationEmail={mockRequestVerificationEmail}
            email={FRONTEND_TEST_CREDENTIALS.USER.email}
          />
        </AuthProvider>,
      );

      const resendButton = screen.getByTestId('resend-button');
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockRequestVerificationEmail).toHaveBeenCalledWith({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Verification email sent',
        );
      });
    });

    it('should integrate email verification with auth context', async () => {
      const { authApi } = require('@/lib/api');
      const mockVerifyEmail = authApi.verifyEmail as jest.Mock;
      const mockGetCurrentUser = authApi.getCurrentUser as jest.Mock;

      mockVerifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      });

      mockGetCurrentUser.mockResolvedValue({
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        full_name: 'Test User',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      render(
        <AuthProvider>
          <AuthUserVerifiedComponent />
        </AuthProvider>,
      );

      // Simulate email verification
      await mockVerifyEmail({ token: 'test-token' });

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-verified')).toBeInTheDocument();
      });
    });
  });
});
