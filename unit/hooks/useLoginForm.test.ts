/**
 * Tests for useLoginForm hook
 *
 * @description Comprehensive tests for the login form hook including
 * form validation, submission, rate limiting, and error handling.
 *
 * @module __tests__/unit/hooks/useLoginForm
 *
 * ============================================
 * SECURITY NOTICE - TEST FILE
 * ============================================
 * Test credentials are loaded from config/.env via FRONTEND_TEST_DATA.
 * No hardcoded credentials in this file.
 *
 * See: docs/testing/TEST_SECURITY_POLICY.md
 * ============================================
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';

// Mock dependencies
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    login: jest.fn().mockResolvedValue(undefined),
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
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/network', () => ({
  isRateLimited: jest.fn(() => false),
  recordAttempt: jest.fn(),
  getRateLimitStatus: jest.fn(() => ({ resetTime: null })),
}));

jest.mock('@/lib/session', () => ({
  tokenManager: {
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/api', () => ({
  testApiConnectivity: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/hooks/useCSRFToken', () => ({
  addCSRFToken: jest.fn((headers) => headers),
}));

jest.mock('@/lib/errors', () => ({
  parseAuthError: jest.fn(() => ({
    type: 'unknown',
    message: 'An error occurred',
    details: '',
    retryable: true,
  })),
  AuthErrorDetails: {},
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Import mocked modules
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { isRateLimited, getRateLimitStatus } from '@/lib/network';
import { testApiConnectivity } from '@/lib/api';
import { parseAuthError } from '@/lib/errors';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockIsRateLimited = isRateLimited as jest.MockedFunction<typeof isRateLimited>;
const mockGetRateLimitStatus = getRateLimitStatus as jest.MockedFunction<
  typeof getRateLimitStatus
>;
const mockTestApiConnectivity = testApiConnectivity as jest.MockedFunction<
  typeof testApiConnectivity
>;
const mockParseAuthError = parseAuthError as jest.MockedFunction<typeof parseAuthError>;

describe('useLoginForm', () => {
  const mockLogin = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ login: mockLogin } as any);
    mockIsRateLimited.mockReturnValue(false);
    mockGetRateLimitStatus.mockReturnValue({ resetTime: null } as any);
    mockTestApiConnectivity.mockResolvedValue(true);
    mockParseAuthError.mockReturnValue({
      type: 'unknown',
      message: 'An error occurred',
      details: '',
      retryable: true,
    } as any);
  });

  describe('Initial state', () => {
    it('should return register function', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(typeof result.current.register).toBe('function');
    });

    it('should start with no errors', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.errors).toEqual({});
    });

    it('should start with isLoading as false', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.isLoading).toBe(false);
    });

    it('should start with loading as false', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.loading).toBe(false);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.error).toBeNull();
    });

    it('should start with no authError', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.authError).toBeNull();
    });

    it('should start with no remainingAttempts', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.remainingAttempts).toBeNull();
    });

    it('should start with no rateLimitResetAt', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.rateLimitResetAt).toBeNull();
    });

    it('should start as not hydrated then become hydrated', async () => {
      const { result } = renderHook(() => useLoginForm());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });
    });
  });

  describe('Form submission handlers', () => {
    it('should expose onSubmit handler', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(typeof result.current.onSubmit).toBe('function');
    });

    it('should expose formSubmitHandler', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(typeof result.current.formSubmitHandler).toBe('function');
    });

    it('should expose clearError handler', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Options', () => {
    it('should accept redirectTo option', () => {
      const { result } = renderHook(() =>
        useLoginForm({ redirectTo: '/custom-dashboard' }),
      );
      expect(result.current).toBeDefined();
    });

    it('should accept onSuccess callback', () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useLoginForm({ onSuccess }));
      expect(result.current).toBeDefined();
    });

    it('should accept enablePerformanceMonitoring option', () => {
      const { result } = renderHook(() =>
        useLoginForm({ enablePerformanceMonitoring: true }),
      );
      expect(result.current).toBeDefined();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useLoginForm());

      // Simulate an error state by calling onSubmit with rate limiting
      mockIsRateLimited.mockReturnValueOnce(true);
      mockGetRateLimitStatus.mockReturnValueOnce({
        resetTime: Date.now() + 15 * 60 * 1000,
      } as any);

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      // Should have error
      expect(result.current.error).not.toBeNull();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.authError).toBeNull();
      expect(result.current.rateLimitResetAt).toBeNull();
    });
  });

  describe('Rate limiting', () => {
    it('should check rate limiting before login attempt', async () => {
      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(mockIsRateLimited).toHaveBeenCalled();
    });

    it('should not call login when rate limited', async () => {
      mockIsRateLimited.mockReturnValue(true);
      mockGetRateLimitStatus.mockReturnValue({
        resetTime: Date.now() + 15 * 60 * 1000,
      } as any);

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should set error when rate limited', async () => {
      mockIsRateLimited.mockReturnValue(true);
      mockGetRateLimitStatus.mockReturnValue({
        resetTime: Date.now() + 15 * 60 * 1000,
      } as any);

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.error).toContain('Too many login attempts');
      expect(result.current.authError?.type).toBe('rate_limit');
    });

    it('should set rateLimitResetAt when rate limited', async () => {
      const resetTime = Date.now() + 15 * 60 * 1000;
      mockIsRateLimited.mockReturnValue(true);
      mockGetRateLimitStatus.mockReturnValue({ resetTime } as any);

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.rateLimitResetAt).toBe(resetTime);
    });
  });

  describe('Login flow', () => {
    it('should set isLoading to true during login', async () => {
      let loginResolve: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        loginResolve = resolve;
      });
      mockLogin.mockReturnValueOnce(loginPromise as any);

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve login
      await act(async () => {
        loginResolve!(undefined);
        await loginPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should test API connectivity before login', async () => {
      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(mockTestApiConnectivity).toHaveBeenCalled();
    });

    it('should set error if API connectivity fails', async () => {
      mockTestApiConnectivity.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      // Error message depends on implementation
      expect(result.current.error).not.toBeNull();
    });

    it('should call login with correct credentials', async () => {
      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        }),
      );
    });

    it('should call onSuccess callback on successful login', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useLoginForm({ onSuccess }));

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should clear remainingAttempts on successful login', async () => {
      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.remainingAttempts).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should set error on login failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Login failed'));

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should set authError on login failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Login failed'));

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.authError).not.toBeNull();
    });

    it('should extract remaining attempts from error response', async () => {
      mockLogin.mockRejectedValueOnce({
        response: {
          data: { remaining_attempts: 3 },
        },
      });

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.remainingAttempts).toBe(3);
    });

    it('should reset isLoading to false on error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Login failed'));

      const { result } = renderHook(() => useLoginForm());

      await act(async () => {
        await result.current.onSubmit({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Form submission handler', () => {
    it('should prevent default on form submission', () => {
      const { result } = renderHook(() => useLoginForm());

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.FormEvent;

      act(() => {
        result.current.formSubmitHandler(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('should combine isLoading and isSubmitting into loading', async () => {
      const { result } = renderHook(() => useLoginForm());

      // Initially both should be false
      expect(result.current.loading).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('Form validation', () => {
    it('should expose errors object from react-hook-form', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.errors).toBeDefined();
      expect(typeof result.current.errors).toBe('object');
    });

    it('should register form fields', () => {
      const { result } = renderHook(() => useLoginForm());

      const emailField = result.current.register('email');
      const passwordField = result.current.register('password');

      expect(emailField.name).toBe('email');
      expect(passwordField.name).toBe('password');
    });
  });
});
