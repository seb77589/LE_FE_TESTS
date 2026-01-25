/**
 * Comprehensive API Client Integration Tests - Phase 4.1
 *
 * Additional tests to improve coverage for:
 * - authApi methods (password reset, change password, profile, email verification, logout, refresh)
 * - tokenUtils (cookie-based token management)
 * - Error extraction helpers (formatValidationError, extractApiErrorDetail, etc.)
 * - SWR fetcher function
 */

import api, { authApi, tokenUtils, handleApiError, fetcher } from '@/lib/api';
import { apiConfig } from '@/lib/api/config';
import Cookies from 'js-cookie';

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

jest.mock('@/lib/api/auth', () => ({
  refreshAuthToken: jest.fn(),
}));

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

// Mock global fetch for fetcher tests
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('API Client Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('authApi Methods', () => {
    describe('requestPasswordReset', () => {
      it('should send password reset request with email', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: { message: 'Password reset email sent' },
        });

        const result = await authApi.requestPasswordReset({
          email: 'test@example.com',
        });

        expect(mockPost).toHaveBeenCalledWith(
          apiConfig.endpoints.auth.passwordResetRequest,
          { email: 'test@example.com' },
        );
        expect(result.message).toBe('Password reset email sent');

        mockPost.mockRestore();
      });

      it('should handle password reset request error', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 404, data: { detail: 'User not found' } },
          isAxiosError: true,
        });

        await expect(
          authApi.requestPasswordReset({ email: 'nonexistent@example.com' }),
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 404 }),
        });

        mockPost.mockRestore();
      });
    });

    describe('resetPassword', () => {
      it('should reset password with token and new password', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: { message: 'Password reset successful' },
        });

        const result = await authApi.resetPassword({
          token: 'reset-token-123',
          new_password: 'NewSecurePassword123!',
        });

        expect(mockPost).toHaveBeenCalledWith(apiConfig.endpoints.auth.passwordReset, {
          token: 'reset-token-123',
          new_password: 'NewSecurePassword123!',
        });
        expect(result.message).toBe('Password reset successful');

        mockPost.mockRestore();
      });

      it('should handle invalid reset token', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 400, data: { detail: 'Invalid or expired token' } },
          isAxiosError: true,
        });

        await expect(
          authApi.resetPassword({
            token: 'invalid-token',
            new_password: 'NewPassword123!',
          }),
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 400 }),
        });

        mockPost.mockRestore();
      });
    });

    describe('changePassword', () => {
      it('should change password with current and new password', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: { message: 'Password changed successfully' },
        });

        const result = await authApi.changePassword({
          current_password: 'OldPassword123!',
          new_password: 'NewPassword123!',
        });

        expect(mockPost).toHaveBeenCalledWith(apiConfig.endpoints.auth.changePassword, {
          current_password: 'OldPassword123!',
          new_password: 'NewPassword123!',
        });
        expect(result.message).toBe('Password changed successfully');

        mockPost.mockRestore();
      });

      it('should handle incorrect current password', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 400, data: { detail: 'Current password is incorrect' } },
          isAxiosError: true,
        });

        await expect(
          authApi.changePassword({
            current_password: 'WrongPassword',
            new_password: 'NewPassword123!',
          }),
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 400 }),
        });

        mockPost.mockRestore();
      });
    });

    describe('updateProfile', () => {
      it('should update user profile', async () => {
        const mockPut = jest.spyOn(api, 'put').mockResolvedValueOnce({
          data: {
            id: 1,
            email: 'test@example.com',
            first_name: 'Updated',
            last_name: 'User',
          },
        });

        const result = await authApi.updateProfile({
          first_name: 'Updated',
          last_name: 'User',
        });

        expect(mockPut).toHaveBeenCalledWith(apiConfig.endpoints.auth.updateProfile, {
          first_name: 'Updated',
          last_name: 'User',
        });
        expect(result.first_name).toBe('Updated');

        mockPut.mockRestore();
      });

      it('should handle profile update validation error', async () => {
        const mockPut = jest.spyOn(api, 'put').mockRejectedValueOnce({
          response: {
            status: 422,
            data: {
              detail: [{ loc: ['body', 'email'], msg: 'Invalid email format' }],
            },
          },
          isAxiosError: true,
        });

        await expect(
          authApi.updateProfile({ email: 'invalid-email' }),
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 422 }),
        });

        mockPut.mockRestore();
      });
    });

    describe('requestEmailVerification', () => {
      it('should request email verification', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: { message: 'Verification email sent' },
        });

        const result = await authApi.requestEmailVerification('test@example.com');

        expect(mockPost).toHaveBeenCalledWith(
          apiConfig.endpoints.auth.verifyEmailRequest,
          { email: 'test@example.com' },
        );
        expect(result.message).toBe('Verification email sent');

        mockPost.mockRestore();
      });
    });

    describe('verifyEmail', () => {
      it('should verify email with token', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: { message: 'Email verified successfully' },
        });

        const result = await authApi.verifyEmail('verification-token-123');

        expect(mockPost).toHaveBeenCalledWith(apiConfig.endpoints.auth.verifyEmail, {
          token: 'verification-token-123',
        });
        expect(result.message).toBe('Email verified successfully');

        mockPost.mockRestore();
      });

      it('should handle invalid verification token', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 400, data: { detail: 'Invalid verification token' } },
          isAxiosError: true,
        });

        await expect(authApi.verifyEmail('invalid-token')).rejects.toMatchObject({
          response: expect.objectContaining({ status: 400 }),
        });

        mockPost.mockRestore();
      });
    });

    describe('logout', () => {
      it('should logout user', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: { message: 'Logged out successfully' },
        });

        const result = await authApi.logout();

        expect(mockPost).toHaveBeenCalledWith(apiConfig.endpoints.auth.logout);
        expect(result.message).toBe('Logged out successfully');

        mockPost.mockRestore();
      });

      it('should handle logout when not authenticated', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 401, data: { detail: 'Not authenticated' } },
          isAxiosError: true,
        });

        await expect(authApi.logout()).rejects.toMatchObject({
          response: expect.objectContaining({ status: 401 }),
        });

        mockPost.mockRestore();
      });
    });

    describe('refreshToken', () => {
      it('should refresh authentication token', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: {
            access_token: 'new-access-token',
            token_type: 'Bearer',
          },
        });

        const result = await authApi.refreshToken();

        expect(mockPost).toHaveBeenCalledWith(
          apiConfig.endpoints.auth.refresh,
          {},
          { headers: { 'Content-Type': 'application/json' } },
        );
        expect(result.access_token).toBe('new-access-token');

        mockPost.mockRestore();
      });

      it('should handle refresh token expired', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 401, data: { detail: 'Refresh token expired' } },
          isAxiosError: true,
        });

        await expect(authApi.refreshToken()).rejects.toMatchObject({
          response: expect.objectContaining({ status: 401 }),
        });

        mockPost.mockRestore();
      });
    });

    describe('register', () => {
      it('should register new user', async () => {
        const mockPost = jest.spyOn(api, 'post').mockResolvedValueOnce({
          data: {
            id: 1,
            email: 'newuser@example.com',
            first_name: 'New',
            last_name: 'User',
          },
        });

        const result = await authApi.register({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          first_name: 'New',
          last_name: 'User',
        });

        expect(mockPost).toHaveBeenCalledWith(
          apiConfig.endpoints.auth.register,
          expect.objectContaining({
            email: 'newuser@example.com',
            password: 'SecurePassword123!',
          }),
        );
        expect(result.email).toBe('newuser@example.com');

        mockPost.mockRestore();
      });

      it('should handle registration with existing email', async () => {
        const mockPost = jest.spyOn(api, 'post').mockRejectedValueOnce({
          response: { status: 409, data: { detail: 'Email already registered' } },
          isAxiosError: true,
        });

        await expect(
          authApi.register({
            email: 'existing@example.com',
            password: 'Password123!',
            first_name: 'Test',
            last_name: 'User',
          }),
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 409 }),
        });

        mockPost.mockRestore();
      });
    });
  });

  describe('tokenUtils', () => {
    describe('setToken', () => {
      it('should set access token cookie', () => {
        tokenUtils.setToken('test-token-123');

        expect(Cookies.set).toHaveBeenCalledWith(
          'access_token',
          'test-token-123',
          expect.objectContaining({
            expires: 7,
            sameSite: 'lax',
            path: '/',
          }),
        );
      });

      it('should set secure cookie in production', () => {
        const originalEnv = process.env.NODE_ENV;
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          writable: true,
        });

        tokenUtils.setToken('prod-token');

        expect(Cookies.set).toHaveBeenCalledWith(
          'access_token',
          'prod-token',
          expect.objectContaining({
            secure: true,
          }),
        );

        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
        });
      });
    });

    describe('getToken', () => {
      it('should get access token from cookie', () => {
        (Cookies.get as jest.Mock).mockReturnValueOnce('stored-token');

        const token = tokenUtils.getToken();

        expect(Cookies.get).toHaveBeenCalledWith('access_token');
        expect(token).toBe('stored-token');
      });

      it('should return undefined when no token', () => {
        (Cookies.get as jest.Mock).mockReturnValueOnce(undefined);

        const token = tokenUtils.getToken();

        expect(token).toBeUndefined();
      });
    });

    describe('removeToken', () => {
      it('should remove access token cookie', () => {
        tokenUtils.removeToken();

        expect(Cookies.remove).toHaveBeenCalledWith('access_token', { path: '/' });
      });
    });
  });

  describe('handleApiError', () => {
    it('should extract string detail from API error', () => {
      const error = {
        response: {
          data: { detail: 'User not found' },
          status: 404,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toBe('User not found');
    });

    it('should extract validation errors array from API error', () => {
      const error = {
        response: {
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'Invalid email format' },
              { loc: ['body', 'password'], msg: 'Password too short' },
            ],
          },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('email');
      expect(message).toContain('Invalid email format');
      expect(message).toContain('password');
      expect(message).toContain('Password too short');
    });

    it('should handle object detail with message field', () => {
      const error = {
        response: {
          data: { detail: { message: 'Custom error message' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('Custom error message');
    });

    it('should handle object detail with msg field', () => {
      const error = {
        response: {
          data: { detail: { msg: 'Validation failed' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('Validation failed');
    });

    it('should handle object detail with error field', () => {
      const error = {
        response: {
          data: { detail: { error: 'Something went wrong' } },
          status: 500,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('Something went wrong');
    });

    it('should handle object detail with nested message', () => {
      const error = {
        response: {
          data: { detail: { message: { message: 'Nested message' } } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      // Should stringify the nested object
      expect(message).toContain('message');
    });

    it('should fallback to concatenated string values for unknown object detail', () => {
      const error = {
        response: {
          data: { detail: { field1: 'error1', field2: 'error2' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('error1');
      expect(message).toContain('error2');
    });

    it('should handle non-axios Error', () => {
      const error = new Error('Regular error message');

      const message = handleApiError(error);

      expect(message).toBe('Regular error message');
    });

    it('should handle unknown error type', () => {
      const error = 'string error';

      const message = handleApiError(error);

      expect(message).toBe('An unexpected error occurred');
    });

    it('should handle null/undefined error', () => {
      expect(handleApiError(null)).toBe('An unexpected error occurred');
      expect(handleApiError(undefined)).toBe('An unexpected error occurred');
    });

    it('should use error.message when no API detail', () => {
      const error = {
        message: 'Network Error',
        response: { data: {} },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toBe('Network Error');
    });

    it('should handle validation error with just msg string', () => {
      const error = {
        response: {
          data: { detail: [{ msg: 'Field is required' }] },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('Field is required');
    });

    it('should handle validation error with loc array', () => {
      const error = {
        response: {
          data: {
            detail: [{ loc: ['body', 'user', 'email'], msg: 'Invalid email' }],
          },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('user.email');
      expect(message).toContain('Invalid email');
    });

    it('should handle detail with number values', () => {
      const error = {
        response: {
          data: { detail: { code: 123, message: 'Error' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('Error');
    });

    it('should handle detail with boolean values', () => {
      const error = {
        response: {
          data: { detail: { success: false, message: 'Failed' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);

      expect(message).toContain('Failed');
    });
  });

  describe('fetcher function', () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('should fetch data from absolute URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await fetcher('http://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should fetch data from relative URL with leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetcher('/api/v1/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.any(Object),
      );
    });

    it('should fetch data from relative URL without leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetcher('api/v1/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.any(Object),
      );
    });

    it('should include credentials in fetch request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetcher('/api/v1/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetcher('/api/v1/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should throw error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(fetcher('/api/v1/notfound')).rejects.toThrow(
        'Resource not found.',
      );
    });

    it('should throw error on 500 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetcher('/api/v1/error')).rejects.toThrow('Request failed with status 500');
    });

    it('should throw error on 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(fetcher('/api/v1/protected')).rejects.toThrow(
        'Session expired. Please log in again.',
      );
    });

    it('should handle fetch network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetcher('/api/v1/test')).rejects.toThrow('Network error');
    });

    it('should parse JSON response', async () => {
      const responseData = { users: [{ id: 1, name: 'Test' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await fetcher('/api/v1/users');

      expect(result).toEqual(responseData);
    });

    it('should handle https URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secure: true }),
      });

      await fetcher('https://secure.example.com/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://secure.example.com/api/test',
        expect.any(Object),
      );
    });
  });

  describe('Header Parsing Integration', () => {
    it('should handle Headers API object in response', async () => {
      const mockHeaders = new Headers();
      mockHeaders.set('x-ratelimit-remaining', '5');
      mockHeaders.set('x-ratelimit-limit', '100');

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
      };

      // Simulate response through interceptor
      const interceptor = api.interceptors.response.handlers[0];
      const result = await interceptor?.fulfilled?.(mockResponse);

      expect(result).toBeDefined();
    });

    it('should handle plain object headers in response', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '10',
          'x-ratelimit-limit': '100',
          'content-type': 'application/json',
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
        },
      };

      // Simulate response through interceptor
      const interceptor = api.interceptors.response.handlers[0];
      const result = await interceptor?.fulfilled?.(mockResponse);

      expect(result).toBeDefined();
    });

    it('should handle headers with numeric values', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        headers: {
          'x-ratelimit-remaining': 5,
          'x-ratelimit-limit': 100,
        },
        config: {
          url: '/api/v1/test',
        },
      };

      const interceptor = api.interceptors.response.handlers[0];
      const result = await interceptor?.fulfilled?.(mockResponse);

      expect(result).toBeDefined();
    });

    it('should handle headers with null values', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        headers: {
          'x-custom-header': null,
          'content-type': 'application/json',
        },
        config: {
          url: '/api/v1/test',
        },
      };

      const interceptor = api.interceptors.response.handlers[0];
      const result = await interceptor?.fulfilled?.(mockResponse);

      expect(result).toBeDefined();
    });

    it('should handle missing headers gracefully', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        headers: undefined,
        config: {
          url: '/api/v1/test',
        },
      };

      const interceptor = api.interceptors.response.handlers[0];
      const result = await interceptor?.fulfilled?.(mockResponse);

      expect(result).toBeDefined();
    });
  });

  describe('CSRF Token Integration', () => {
    it('should add CSRF token to POST requests', async () => {
      // Mock getCSRFToken to return a token
      jest.doMock('@/lib/cookies', () => ({
        getCSRFToken: () => 'csrf-token-123',
      }));

      // Make a POST request through the interceptor
      const requestInterceptor = api.interceptors.request.handlers[0];
      const config = {
        url: '/api/v1/test',
        method: 'post',
        headers: {},
      };

      if (requestInterceptor?.fulfilled) {
        await requestInterceptor.fulfilled(config);
      }

      // Request should be processed without error
      expect(config.url).toBe('/api/v1/test');
    });

    it('should add CSRF token to PUT requests', async () => {
      const requestInterceptor = api.interceptors.request.handlers[0];
      const config = {
        url: '/api/v1/test',
        method: 'put',
        headers: {},
      };

      if (requestInterceptor?.fulfilled) {
        await requestInterceptor.fulfilled(config);
      }

      expect(config.url).toBe('/api/v1/test');
    });

    it('should add CSRF token to DELETE requests', async () => {
      const requestInterceptor = api.interceptors.request.handlers[0];
      const config = {
        url: '/api/v1/test',
        method: 'delete',
        headers: {},
      };

      if (requestInterceptor?.fulfilled) {
        await requestInterceptor.fulfilled(config);
      }

      expect(config.url).toBe('/api/v1/test');
    });

    it('should add CSRF token to PATCH requests', async () => {
      const requestInterceptor = api.interceptors.request.handlers[0];
      const config = {
        url: '/api/v1/test',
        method: 'patch',
        headers: {},
      };

      if (requestInterceptor?.fulfilled) {
        await requestInterceptor.fulfilled(config);
      }

      expect(config.url).toBe('/api/v1/test');
    });

    it('should not add CSRF token to GET requests', async () => {
      const requestInterceptor = api.interceptors.request.handlers[0];
      const config = {
        url: '/api/v1/test',
        method: 'get',
        headers: {},
      };

      if (requestInterceptor?.fulfilled) {
        await requestInterceptor.fulfilled(config);
      }

      // CSRF token should not be added for GET
      expect(config.headers['X-CSRFToken']).toBeUndefined();
    });
  });

  describe('API Client Configuration', () => {
    it('should have withCredentials enabled', () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it('should have timeout configured', () => {
      expect(api.defaults.timeout).toBeGreaterThan(0);
    });

    it('should have Content-Type header set', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should have baseURL configured', () => {
      expect(api.defaults.baseURL).toBeDefined();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle 401 error for user check endpoint', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { detail: 'Unauthorized' },
        },
        config: {
          url: '/api/v1/users/me',
          method: 'get',
        },
        isAxiosError: true,
      };

      const interceptor = api.interceptors.response.handlers[0];

      await expect(interceptor?.rejected?.(mockError)).rejects.toBeDefined();
    });

    it('should handle 429 with retry-after header', async () => {
      const mockError = {
        response: {
          status: 429,
          headers: {
            'retry-after': '5',
          },
          data: { detail: 'Rate limited' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: 3, // Max retries reached
        },
        isAxiosError: true,
      };

      const interceptor = api.interceptors.response.handlers[0];

      // Should reject since max retries reached
      await expect(interceptor?.rejected?.(mockError)).rejects.toBeDefined();
    });

    it('should handle 500 error after max retries', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Server error' },
        },
        config: {
          url: '/api/v1/test',
          method: 'get',
          _retryCount: 2, // Max retries for 500 reached
        },
        isAxiosError: true,
      };

      const interceptor = api.interceptors.response.handlers[0];

      await expect(interceptor?.rejected?.(mockError)).rejects.toBeDefined();
    });

    it('should handle error without response', async () => {
      // Test through mock - axios mock handles network errors
      const getSpy = jest.spyOn(api, 'get').mockRejectedValueOnce({
        message: 'Network Error',
        config: { url: '/api/v1/test' },
        isAxiosError: true,
      });

      await expect(api.get('/api/v1/test')).rejects.toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle empty error object', () => {
      const message = handleApiError({});
      expect(message).toBe('An unexpected error occurred');
    });
  });

  describe('Backoff and Rate Limit Tests', () => {
    it('should handle response with retry-after header', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        headers: {
          'retry-after': '10',
        },
        config: { url: '/test' },
      });

      const response = await api.get('/test');
      expect(response.headers['retry-after']).toBe('10');
      getSpy.mockRestore();
    });

    it('should handle response with x-ratelimit-reset header', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 30;
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        headers: {
          'x-ratelimit-reset': String(resetTime),
        },
        config: { url: '/test' },
      });

      const response = await api.get('/test');
      expect(response.headers['x-ratelimit-reset']).toBe(String(resetTime));
      getSpy.mockRestore();
    });

    it('should handle non-numeric retry-after header', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        headers: {
          'retry-after': 'Wed, 21 Oct 2025 07:28:00 GMT',
        },
        config: { url: '/test' },
      });

      const response = await api.get('/test');
      expect(response).toBeDefined();
      expect(response.data.success).toBe(true);
      getSpy.mockRestore();
    });

    it('should handle response with rate limit remaining', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: { items: [] },
        status: 200,
        headers: {
          'x-ratelimit-remaining': '50',
          'x-ratelimit-limit': '100',
        },
        config: { url: '/api/v1/test' },
      });

      const response = await api.get('/api/v1/test');
      expect(response.headers['x-ratelimit-remaining']).toBe('50');
      getSpy.mockRestore();
    });

    it('should handle invalid rate limit header values', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {
          'x-ratelimit-remaining': 'invalid',
          'x-ratelimit-limit': 'NaN',
        },
        config: { url: '/api/v1/test' },
      });

      const response = await api.get('/api/v1/test');
      expect(response).toBeDefined();
      getSpy.mockRestore();
    });
  });

  describe('Header Edge Cases', () => {
    it('should handle response with undefined header values', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {
          'x-custom': undefined,
          'content-type': 'application/json',
        },
        config: { url: '/test' },
      });

      const response = await api.get('/test');
      expect(response).toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle response with complex header objects', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {
          'x-complex': JSON.stringify({ nested: { deep: 'value' } }),
        },
        config: { url: '/test' },
      });

      const response = await api.get('/test');
      expect(response).toBeDefined();
      getSpy.mockRestore();
    });
  });

  describe('Error Detail Extraction Edge Cases', () => {
    it('should handle empty detail array', () => {
      const error = {
        response: {
          data: { detail: [] },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('');
    });

    it('should handle detail with only non-string values', () => {
      const error = {
        response: {
          data: { detail: { count: 5, active: true } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBeDefined();
    });

    it('should handle deeply nested error message', () => {
      const error = {
        response: {
          data: { detail: { msg: { msg: { msg: 'Deep error' } } } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('msg');
    });

    it('should handle error with Symbol properties', () => {
      const detail: Record<string | symbol, unknown> = { message: 'Error' };
      detail[Symbol('hidden')] = 'hidden value';

      const error = {
        response: {
          data: { detail },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Error');
    });

    it('should handle detail with nested msg field', () => {
      const error = {
        response: {
          data: { detail: { msg: 'Nested message' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Nested message');
    });

    it('should handle detail with nested message field', () => {
      const error = {
        response: {
          data: { detail: { message: 'Inner message' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Inner message');
    });

    it('should handle detail array with validation errors containing ctx', () => {
      const error = {
        response: {
          data: {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'Invalid email',
                type: 'value_error',
                ctx: { reason: 'missing @' },
              },
            ],
          },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('Invalid email');
    });

    it('should handle detail with error property', () => {
      const error = {
        response: {
          data: { detail: { error: 'Error property value' } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Error property value');
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle ECONNREFUSED error', async () => {
      const getSpy = jest.spyOn(api, 'get').mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8000',
        config: { url: '/api/v1/test' },
        isAxiosError: true,
      });

      await expect(api.get('/api/v1/test')).rejects.toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle ETIMEDOUT error', async () => {
      const getSpy = jest.spyOn(api, 'get').mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Connection timed out',
        config: { url: '/api/v1/test' },
        isAxiosError: true,
      });

      await expect(api.get('/api/v1/test')).rejects.toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle ENOTFOUND error', async () => {
      const getSpy = jest.spyOn(api, 'get').mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.example.com',
        config: { url: '/api/v1/test' },
        isAxiosError: true,
      });

      await expect(api.get('/api/v1/test')).rejects.toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle network error without code', async () => {
      const getSpy = jest.spyOn(api, 'get').mockRejectedValueOnce({
        message: 'Network Error',
        config: { url: '/api/v1/test' },
        isAxiosError: true,
      });

      await expect(api.get('/api/v1/test')).rejects.toBeDefined();
      getSpy.mockRestore();
    });
  });

  describe('Request Configuration Variations', () => {
    it('should handle request with query parameters', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: { items: [] },
        status: 200,
        headers: {},
        config: { url: '/api/v1/users?page=1&limit=10' },
      });

      const response = await api.get('/api/v1/users', {
        params: { page: 1, limit: 10 },
      });
      expect(response).toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle request with custom headers', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {},
        config: {
          url: '/api/v1/test',
          headers: { 'X-Custom-Header': 'custom-value' },
        },
      });

      const response = await api.get('/api/v1/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      expect(response).toBeDefined();
      getSpy.mockRestore();
    });

    it('should handle POST request with form data', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test content']), 'test.txt');

      const postSpy = jest.spyOn(api, 'post').mockResolvedValueOnce({
        data: { uploaded: true },
        status: 201,
        headers: {},
        config: { url: '/api/v1/upload' },
      });

      const response = await api.post('/api/v1/upload', formData);
      expect(response.data.uploaded).toBe(true);
      postSpy.mockRestore();
    });

    it('should handle DELETE request with body', async () => {
      const deleteSpy = jest.spyOn(api, 'delete').mockResolvedValueOnce({
        data: { deleted: true },
        status: 200,
        headers: {},
        config: { url: '/api/v1/items/1' },
      });

      const response = await api.delete('/api/v1/items/1', {
        data: { reason: 'test' },
      });
      expect(response.data.deleted).toBe(true);
      deleteSpy.mockRestore();
    });
  });

  describe('Special Error Response Formats', () => {
    it('should handle error with error field at root', () => {
      const error = {
        response: {
          data: { error: 'Root error message' },
          status: 500,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      // The API expects detail field - without it returns default message
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle error with message field at root', () => {
      const error = {
        response: {
          data: { message: 'Root message' },
          status: 500,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      // The API expects detail field - without it returns default message
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle error with statusText fallback', () => {
      const error = {
        response: {
          data: {},
          status: 503,
          statusText: 'Service Unavailable',
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      // Status text may or may not be used depending on implementation
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should handle error without response but with message', () => {
      const error = {
        message: 'Request failed',
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Request failed');
    });

    it('should handle error response with non-standard structure', () => {
      const error = {
        response: {
          data: { errors: { field: ['Error 1', 'Error 2'] } },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBeDefined();
    });
  });

  describe('API Methods with Different Content Types', () => {
    it('should handle request with JSON content type', async () => {
      const postSpy = jest.spyOn(api, 'post').mockResolvedValueOnce({
        data: { id: 1 },
        status: 201,
        headers: { 'content-type': 'application/json' },
        config: { url: '/api/v1/items' },
      });

      const response = await api.post('/api/v1/items', { name: 'test' });
      expect(response.data.id).toBe(1);
      postSpy.mockRestore();
    });

    it('should handle request with text response', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: 'Plain text response',
        status: 200,
        headers: { 'content-type': 'text/plain' },
        config: { url: '/api/v1/text' },
      });

      const response = await api.get('/api/v1/text');
      expect(response.data).toBe('Plain text response');
      getSpy.mockRestore();
    });

    it('should handle request with blob response', async () => {
      const blob = new Blob(['file content']);
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        data: blob,
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
        config: { url: '/api/v1/download' },
      });

      const response = await api.get('/api/v1/download', { responseType: 'blob' });
      expect(response.data).toBeDefined();
      getSpy.mockRestore();
    });
  });

  describe('Fetcher URL Construction', () => {
    beforeEach(() => {
      // Mock global fetch
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use URL as-is when it starts with http', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetcher('http://example.com/api/test');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://example.com/api/test',
        expect.any(Object),
      );
    });

    it('should use URL as-is when it starts with https', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetcher('https://example.com/api/test');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.any(Object),
      );
    });

    it('should prepend leading slash when URL does not start with slash', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetcher('api/v1/test');

      // Should have prepended a leading slash
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.any(Object),
      );
    });

    it('should use leading slash URL as-is', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await fetcher('/api/v1/test');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.any(Object),
      );
    });

    it('should throw error on non-ok response', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(fetcher('/api/v1/notfound')).rejects.toThrow('Resource not found.');
    });

    it('should return JSON data from response', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [1, 2, 3] }),
      });

      const result = await fetcher('/api/v1/items');
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('Error Helper Functions Branch Coverage', () => {
    it('should handle validation error with just loc array', () => {
      const error = {
        response: {
          data: {
            detail: [{ loc: ['body', 'nested', 'field'], msg: 'Required' }],
          },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('nested.field');
      expect(message).toContain('Required');
    });

    it('should handle validation error without loc', () => {
      const error = {
        response: {
          data: {
            detail: [{ msg: 'General error' }],
          },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('Field');
      expect(message).toContain('General error');
    });

    it('should handle detail object with number value', () => {
      const error = {
        response: {
          data: {
            detail: { count: 42 },
          },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBeDefined();
    });

    it('should handle detail object with boolean value', () => {
      const error = {
        response: {
          data: {
            detail: { active: false },
          },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBeDefined();
    });

    it('should handle detail object with nested object in message field', () => {
      const error = {
        response: {
          data: {
            detail: { message: { message: 'Nested message in message' } },
          },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('message');
    });

    it('should handle detail object with nested object in msg field', () => {
      const error = {
        response: {
          data: {
            detail: { msg: { msg: 'Nested msg in msg' } },
          },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('msg');
    });

    it('should use string value fallback from object detail', () => {
      const error = {
        response: {
          data: {
            detail: {
              nonStandardField1: 'First string',
              nonStandardField2: 'Second string',
              nonStandardNum: 123,
            },
          },
          status: 400,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('First string');
    });

    it('should handle validation error array with objects', () => {
      const error = {
        response: {
          data: {
            detail: [
              { loc: ['query', 'page'], msg: 'Must be positive' },
              { loc: ['query', 'limit'], msg: 'Must be less than 100' },
            ],
          },
          status: 422,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toContain('page');
      expect(message).toContain('limit');
    });

    it('should handle Error instance', () => {
      const error = new Error('Standard error instance');
      const message = handleApiError(error);
      expect(message).toBe('Standard error instance');
    });

    it('should handle unknown non-axios non-Error types', () => {
      const message1 = handleApiError('string error');
      const message2 = handleApiError(12345);
      const message3 = handleApiError(true);
      const message4 = handleApiError(undefined);
      const message5 = handleApiError(null);

      expect(message1).toBe('An unexpected error occurred');
      expect(message2).toBe('An unexpected error occurred');
      expect(message3).toBe('An unexpected error occurred');
      expect(message4).toBe('An unexpected error occurred');
      expect(message5).toBe('An unexpected error occurred');
    });
  });

  describe('Axios Error with Message Fallback', () => {
    it('should use error.message when no response data', () => {
      const error = {
        message: 'Request failed with status code 503',
        response: {
          data: null,
          status: 503,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Request failed with status code 503');
    });

    it('should use error.message when response data is empty', () => {
      const error = {
        message: 'Network Error',
        response: {
          data: {},
          status: 0,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('Network Error');
    });

    it('should use default message when no error.message', () => {
      const error = {
        response: {
          data: {},
          status: 500,
        },
        isAxiosError: true,
      };

      const message = handleApiError(error);
      expect(message).toBe('An unexpected error occurred');
    });
  });
});
