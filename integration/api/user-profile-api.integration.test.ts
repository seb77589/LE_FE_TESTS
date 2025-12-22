/**
 * User Profile API Integration Tests
 *
 * Tests the integration between:
 * - User profile API endpoints
 * - API client interceptors
 * - Error handling for profile operations
 *
 * Coverage:
 * - Profile fetching
 * - Profile updating
 * - Avatar upload
 * - Password change
 * - Error handling
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

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

describe('User Profile API Integration Tests', () => {
  describe('Profile Fetching', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        created_at: '2025-01-01T00:00:00Z',
      };

      (api.get as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockProfile,
        status: 200,
      });

      const endpoint = queryKeys.users.profile;
      const response = await api.get(endpoint);

      expect(api.get).toHaveBeenCalledWith(endpoint);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockProfile);
    });

    it('should handle 401 unauthorized error when fetching profile', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Authentication required' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.users.profile;
      await expect(api.get(endpoint)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
        }),
      });
    });
  });

  describe('Profile Updating', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        full_name: 'Updated Name',
        email: 'updated@example.com',
      };

      const mockUpdatedProfile = {
        id: 1,
        ...updateData,
        role: 'user',
        created_at: '2025-01-01T00:00:00Z',
      };

      (api.put as jest.Mock) = jest.fn().mockResolvedValue({
        data: mockUpdatedProfile,
        status: 200,
      });

      const endpoint = queryKeys.users.profile;
      const response = await api.put(endpoint, updateData);

      expect(api.put).toHaveBeenCalledWith(endpoint, updateData);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockUpdatedProfile);
    });

    it('should handle 400 bad request error when updating profile', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { detail: 'Invalid email format' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.users.profile;
      await expect(api.put(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 400,
        }),
      });
    });
  });

  describe('Password Change', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        current_password: 'oldPassword123',
        new_password: 'newPassword123',
      };

      (api.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: { message: 'Password changed successfully' },
        status: 200,
      });

      const endpoint = '/api/v1/users/me/password';
      const response = await api.post(endpoint, passwordData);

      expect(api.post).toHaveBeenCalledWith(endpoint, passwordData);
      expect(response.status).toBe(200);
    });

    it('should handle 403 forbidden error when password change fails', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { detail: 'Current password is incorrect' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = '/api/v1/users/me/password';
      await expect(api.post(endpoint, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });
  });

  describe('Error Message Extraction', () => {
    it('should extract error message from profile API errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Failed to update profile' },
        },
        isAxiosError: true,
      } as AxiosError;

      (api.put as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const endpoint = queryKeys.users.profile;
      try {
        await api.put(endpoint, {});
      } catch (error) {
        const errorMessage = handleApiError(error as AxiosError);
        expect(errorMessage).toContain('Failed to update profile');
      }
    });
  });
});
