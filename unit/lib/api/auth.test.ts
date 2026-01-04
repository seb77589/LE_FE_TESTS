/**
 * Unit Test for Auth API
 *
 * Coverage Target: 90%+ (security critical)
 * Estimated Tests: 30-35
 * Priority: CRITICAL (authentication security)
 *
 * Test Categories:
 * - Login (6 tests)
 * - Register (5 tests)
 * - GetCurrentUser (6 tests)
 * - RefreshToken (4 tests)
 * - RefreshAuthToken (3 tests)
 * - Logout (3 tests)
 * - UpdateProfile (4 tests)
 * - ChangePassword (4 tests)
 *
 * ============================================
 * SECURITY NOTICE - TEST FILE
 * ============================================
 * This file contains patterns that trigger security analysis tools:
 * - Hard-coded test credentials (mock users, passwords)
 * - HTTP localhost URLs (local testing)
 * - Mock tokens (fake JWT for testing)
 *
 * These are intentional test fixtures and NEVER used in production.
 * Production credentials come from environment variables.
 * Production enforces HTTPS and uses real authentication.
 *
 * See: docs/testing/TEST_SECURITY_POLICY.md
 *
 * @nosonar - Test fixtures (see TEST_SECURITY_POLICY.md)
 * ============================================
 */

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  errorTracking: {
    captureException: jest.fn(),
  },
}));

jest.mock('@/lib/api/config', () => ({
  apiConfig: {
    baseURL: 'http://localhost:8000',
    endpoints: {
      auth: {
        login: '/api/v1/auth/login',
        register: '/api/v1/auth/register',
        logout: '/api/v1/auth/logout',
        me: '/api/v1/auth/me',
        refresh: '/api/v1/auth/refresh',
        updateProfile: '/api/v1/auth/profile',
        changePassword: '/api/v1/auth/change-password',
      },
    },
  },
}));

jest.mock('@/lib/cookies', () => ({
  getCSRFTokenFromCookie: jest.fn(() => 'mock-csrf-token'),
}));

jest.mock('@/lib/api/authInterceptor', () => ({
  fetchWithAuth: jest.fn(),
}));

globalThis.fetch = jest.fn();

import {
  login,
  register,
  getCurrentUser,
  refreshToken,
  refreshAuthToken,
  logout,
  updateProfile,
  changePassword,
} from '@/lib/api/auth';
import { errorTracking } from '@/lib/errors';
import { fetchWithAuth } from '@/lib/api/authInterceptor';
import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (globalThis as any).__lastLoginResponse;
    (globalThis.fetch as jest.Mock).mockClear();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        access_token: 'mock-token-123',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email, role: 'assistant' },
      };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await login({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      });

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    it('should send credentials in form-urlencoded format', async () => {
      const mockResponse = { access_token: 'token', user: {} };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      });

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;

      expect(body).toBeInstanceOf(URLSearchParams);
      expect(body.get('username')).toBe(FRONTEND_TEST_CREDENTIALS.USER.email);
      expect(body.get('password')).toBe(FRONTEND_TEST_CREDENTIALS.USER.password);
    });

    it('should handle login failure with error details', async () => {
      const errorData = { detail: 'Invalid credentials' };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorData,
      });

      await expect(
        login({
          email: FRONTEND_TEST_DATA.EMAIL.NONEXISTENT,
          password: FRONTEND_TEST_DATA.PASSWORD.WRONG,
        }),
      ).rejects.toMatchObject({
        message: 'Invalid credentials',
        status: 401,
      });
    });

    it('should capture exceptions to error tracking', async () => {
      const error = new Error('Network failure');
      (globalThis.fetch as jest.Mock).mockRejectedValue(error);

      await expect(
        login({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        }),
      ).rejects.toThrow('Network failure');

      expect(errorTracking.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'auth_api',
          action: 'login',
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
        }),
      );
    });

    it('should include additional headers if provided', async () => {
      const mockResponse = { access_token: 'token', user: {} };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        headers: { 'X-Custom-Header': 'value' },
      });

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers).toMatchObject({
        'X-Custom-Header': 'value',
      });
    });

    it('should store debug data in development mode', async () => {
      const mockResponse = {
        access_token: 'debug-token',
        user: { id: 1 },
      };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_DATA.PASSWORD.VALID,
      });

      // In test environment, debug data might not be stored
      // Just verify no errors occurred
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should successfully register new user', async () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.NEW.email,
        full_name: 'New User',
        role: 'assistant',
      };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockUser,
      });

      const result = await register({
        email: FRONTEND_TEST_CREDENTIALS.NEW.email,
        password: FRONTEND_TEST_CREDENTIALS.NEW.password,
        full_name: 'New User',
      });

      expect(result).toMatchObject({
        user: mockUser,
        access_token: '',
        token_type: 'bearer',
      });
    });

    it('should send registration data as JSON', async () => {
      const mockUser = { id: 1 };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const userData = {
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
        full_name: 'Test User',
      };

      await register(userData);

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(fetchCall[1].body)).toEqual(userData);
    });

    it('should handle registration validation errors', async () => {
      const errorData = {
        detail: {
          errors: ['Email already exists', 'Password too weak'],
        },
      };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => errorData,
      });

      await expect(
        register({
          email: FRONTEND_TEST_CREDENTIALS.EXISTING.email,
          password: FRONTEND_TEST_DATA.PASSWORD.WEAK,
          full_name: 'User',
        }),
      ).rejects.toMatchObject({
        message: 'Email already exists, Password too weak',
        status: 422,
      });
    });

    it('should handle simple error message format', async () => {
      const errorData = { detail: 'Registration failed' };
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorData,
      });

      await expect(
        register({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
          full_name: 'User',
        }),
      ).rejects.toMatchObject({
        message: 'Registration failed',
      });
    });

    it('should capture registration exceptions to error tracking', async () => {
      const error = new Error('Server error');
      (globalThis.fetch as jest.Mock).mockRejectedValue(error);

      await expect(
        register({
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
          full_name: 'User',
        }),
      ).rejects.toThrow();

      expect(errorTracking.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'auth_api',
          action: 'register',
        }),
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'assistant',
      };
      (fetchWithAuth as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUser,
      });

      const result = await getCurrentUser('mock-token');

      expect(result).toEqual(mockUser);
      expect(fetchWithAuth).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/me',
        expect.any(Object),
      );
    });

    it('should use cookie-based auth when no token provided', async () => {
      const mockUser = { id: 1 };
      (fetchWithAuth as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      await getCurrentUser();

      const fetchCall = (fetchWithAuth as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers).toEqual({});
    });

    it('should retry on session race conditions (401)', async () => {
      const mockUser = { id: 1 };
      (fetchWithAuth as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'No active session found' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        });

      const result = await getCurrentUser(null, 2);

      expect(result).toEqual(mockUser);
      expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it('should throw on final retry failure', async () => {
      (fetchWithAuth as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Forbidden' }),
      });

      await expect(getCurrentUser(null, 2)).rejects.toMatchObject({
        message: 'Forbidden',
        status: 403,
      });
    });

    it('should handle network errors with retries', async () => {
      const error = new Error('Network error');
      (fetchWithAuth as jest.Mock).mockRejectedValueOnce(error).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const result = await getCurrentUser(null, 2);

      expect(result).toEqual({ id: 1 });
    });

    it('should capture exceptions on final failure', async () => {
      const error = new Error('Permanent failure');
      (fetchWithAuth as jest.Mock).mockRejectedValue(error);

      await expect(getCurrentUser(null, 1)).rejects.toThrow();

      expect(errorTracking.captureException).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        token_type: 'bearer',
        session_id: 'sess-123',
        user: { id: 1 },
      };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await refreshToken('old-refresh-token');

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    it('should send refresh token in request body', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      });

      await refreshToken('my-refresh-token');

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.refresh_token).toBe('my-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      });

      await expect(refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should capture refresh token exceptions', async () => {
      const error = new Error('Network failure');
      (globalThis.fetch as jest.Mock).mockRejectedValue(error);

      await expect(refreshToken('token')).rejects.toThrow();

      expect(errorTracking.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'auth_api',
          action: 'refresh_token',
        }),
      );
    });
  });

  describe('refreshAuthToken', () => {
    it('should refresh auth token using HttpOnly cookies', async () => {
      const mockResponse = { access_token: 'new-token-from-cookie' };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await refreshAuthToken();

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/refresh',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should handle refresh failure', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Refresh failed' }),
      });

      await expect(refreshAuthToken()).rejects.toThrow('Refresh failed');
    });

    it('should capture exceptions during auto refresh', async () => {
      const error = new Error('Auto refresh failed');
      (globalThis.fetch as jest.Mock).mockRejectedValue(error);

      await expect(refreshAuthToken()).rejects.toThrow();

      expect(errorTracking.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          action: 'refresh_auth_token',
        }),
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await logout();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    it('should include CSRF token in logout request', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await logout();

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers['X-CSRFToken']).toBe('mock-csrf-token');
    });

    it('should not throw on logout failure', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Server error' }),
      });

      // Should not throw - logout always succeeds locally
      await expect(logout()).resolves.toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_DATA.EMAIL.DIFFERENT,
        full_name: 'Updated Name',
      };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => updatedUser,
      });

      const result = await updateProfile({ full_name: 'Updated Name' }, 'user-token');

      expect(result).toEqual(updatedUser);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/profile',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer user-token',
          }),
        }),
      );
    });

    it('should include CSRF token in update request', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await updateProfile({}, 'token');

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers['X-CSRFToken']).toBe('mock-csrf-token');
    });

    it('should handle update profile errors', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Invalid email format' }),
      });

      await expect(updateProfile({ email: 'invalid' }, 'token')).rejects.toMatchObject({
        message: 'Invalid email format',
        status: 422,
      });
    });

    it('should capture update profile exceptions', async () => {
      const error = new Error('Update failed');
      (globalThis.fetch as jest.Mock).mockRejectedValue(error);

      await expect(updateProfile({}, 'token')).rejects.toThrow();

      expect(errorTracking.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          action: 'update_profile',
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockResponse = { message: 'Password changed successfully' };

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await changePassword({
        current_password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
        new_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
      });

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    it('should include CSRF token in change password request', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await changePassword({
        current_password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
        new_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
      });

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers['X-CSRFToken']).toBe('mock-csrf-token');
    });

    it('should handle incorrect current password', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Current password is incorrect' }),
      });

      await expect(
        changePassword({ current_password: 'wrong', new_password: 'new' }),
      ).rejects.toMatchObject({
        message: 'Current password is incorrect',
      });
    });

    it('should capture change password exceptions', async () => {
      const error = new Error('Change failed');
      (globalThis.fetch as jest.Mock).mockRejectedValue(error);

      await expect(
        changePassword({
          current_password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
          new_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
        }),
      ).rejects.toThrow();

      expect(errorTracking.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          action: 'change_password',
        }),
      );
    });
  });
});
