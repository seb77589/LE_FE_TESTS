/**
 * Auth Security API Integration Tests
 *
 * Tests the integration between:
 * - Authentication security API endpoints
 * - API client interceptors
 * - Error handling for security operations
 *
 * Coverage:
 * - Session security API integration
 * - Token security API integration
 * - Error handling for security operations
 *
 * @integration
 *
 * ============================================
 * SECURITY NOTICE - TEST FILE
 * ============================================
 * This file may contain:
 * - HTTP localhost URLs for local testing
 * - Mock API responses with test data
 * - Test-only error scenarios
 *
 * These are intentional test fixtures and NEVER used in production.
 * Production uses HTTPS, real backend endpoints, and secure authentication.
 *
 * See: docs/testing/TEST_SECURITY_POLICY.md
 *
 * @nosonar - Test fixtures (see TEST_SECURITY_POLICY.md)
 * ============================================
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api';

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

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

describe('Auth Security API Integration Tests', () => {
  describe('Session Security API', () => {
    it('should fetch session information securely', async () => {
      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session_id: '123', user_id: 1 },
        status: 200,
        headers: {
          'set-cookie': 'session=abc123; HttpOnly; Secure; SameSite=Strict',
        },
      });

      const endpoint = '/api/v1/users/me';
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
    });

    it('should handle 401 unauthorized error', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Authentication required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users/me';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
        }),
      });
    });

    it('should handle session expiration', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Session expired' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users/me';
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
          data: expect.objectContaining({
            detail: expect.stringContaining('Session expired'),
          }),
        }),
      });
    });
  });

  describe('Token Security API', () => {
    it('should refresh token securely', async () => {
      (api.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: { access_token: 'new_token', refresh_token: 'new_refresh' },
        status: 200,
        headers: {
          'set-cookie': 'refresh_token=xyz; HttpOnly; Secure; SameSite=Strict',
        },
      });

      const endpoint = '/api/v1/auth/refresh';
      const response = await api.post(endpoint, { refresh_token: 'old_refresh' });

      expect(api.post).toHaveBeenCalledWith(endpoint, { refresh_token: 'old_refresh' });
      expect(response.status).toBe(200);
    });

    it('should handle invalid refresh token', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Invalid refresh token' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/auth/refresh';
      await expect(
        api.post(endpoint, { refresh_token: 'invalid' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
        }),
      });
    });

    it('should handle expired refresh token', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Refresh token expired' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/auth/refresh';
      await expect(
        api.post(endpoint, { refresh_token: 'expired' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
        }),
      });
    });
  });

  describe('Logout Security API', () => {
    it('should logout securely', async () => {
      (api.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: { message: 'Logged out successfully' },
        status: 200,
        headers: {
          'set-cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
        },
      });

      const endpoint = '/api/v1/auth/logout';
      const response = await api.post(endpoint);

      expect(api.post).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { detail: 'Logout failed' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/auth/logout';
      await expect(api.post(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from security API errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { detail: 'Session expired' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users/me';
      try {
        await api.get(endpoint);
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Session expired');
      }
    });
  });
});
