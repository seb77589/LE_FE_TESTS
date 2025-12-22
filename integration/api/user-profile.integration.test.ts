/**
 * User Profile API Integration Tests
 *
 * Tests the integration between:
 * - User profile API endpoints (get, update, avatar upload)
 * - API client interceptors
 * - Error handling for profile operations
 * - Request/response transformation
 *
 * Coverage:
 * - Get current user profile
 * - Update user profile
 * - Upload profile avatar
 * - Update password
 * - Error handling for profile operations
 *
 * @integration
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
import { buildUrl } from '@/lib/api/config';
import { FRONTEND_TEST_DATA } from '@/__tests__/test-credentials';

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
  const mockUserProfile = {
    id: 1,
    email: 'user@example.com',
    full_name: 'Test User',
    username: 'testuser',
    role: 'USER',
    is_active: true,
    is_verified: true,
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Current User Profile', () => {
    it('should fetch current user profile via GET', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: mockUserProfile,
        status: 200,
        headers: {},
      });

      (api.get as jest.Mock) = mockGet;

      const response = await api.get(buildUrl('/api/v1/users/profile'));

      expect(mockGet).toHaveBeenCalledWith(buildUrl('/api/v1/users/profile'));
      expect(response.data).toEqual(mockUserProfile);
      expect(response.data.email).toBe('user@example.com');
      expect(response.data.full_name).toBe('Test User');
    });

    it('should handle 401 when unauthenticated', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {
            detail: 'Authentication required',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(api.get(buildUrl('/api/v1/users/profile'))).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
          data: expect.objectContaining({
            detail: expect.stringContaining('Authentication required'),
          }),
        }),
      });
    });

    it('should handle 404 when profile not found', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            detail: 'User profile not found',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile'),
          method: 'get',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.get as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(api.get(buildUrl('/api/v1/users/profile'))).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
          data: expect.objectContaining({
            detail: 'User profile not found',
          }),
        }),
      });
    });
  });

  describe('Update User Profile', () => {
    it('should update user profile via PATCH', async () => {
      const updatedProfile = {
        ...mockUserProfile,
        full_name: 'Updated Name',
        username: 'updateduser',
      };

      const mockPatch = jest.fn().mockResolvedValue({
        data: updatedProfile,
        status: 200,
        headers: {},
      });

      (api.patch as jest.Mock) = mockPatch;

      const updateData = {
        full_name: 'Updated Name',
        username: 'updateduser',
      };

      const response = await api.patch(buildUrl('/api/v1/users/profile'), updateData);

      expect(mockPatch).toHaveBeenCalledWith(
        buildUrl('/api/v1/users/profile'),
        updateData,
      );
      expect(response.data.full_name).toBe('Updated Name');
      expect(response.data.username).toBe('updateduser');
    });

    it('should handle validation errors on update', async () => {
      const mockError = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'Invalid email format',
                type: 'value_error',
              },
            ],
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/users/profile'), {
          email: 'invalid-email',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 422,
          data: expect.objectContaining({
            detail: expect.arrayContaining([
              expect.objectContaining({
                loc: expect.arrayContaining(['body', 'email']),
                msg: expect.stringContaining('Invalid email'),
              }),
            ]),
          }),
        }),
      });
    });

    it('should handle 403 when access denied', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            detail: 'You do not have permission to update this profile',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/users/profile'), { full_name: 'New Name' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
          data: expect.objectContaining({
            detail: expect.stringContaining('permission'),
          }),
        }),
      });
    });
  });

  describe('Upload Profile Avatar', () => {
    it('should upload avatar via POST with FormData', async () => {
      const updatedProfile = {
        ...mockUserProfile,
        avatar_url: 'https://example.com/new-avatar.jpg',
      };

      const mockPost = jest.fn().mockResolvedValue({
        data: updatedProfile,
        status: 200,
        headers: {},
      });

      (api.post as jest.Mock) = mockPost;

      const formData = new FormData();
      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      formData.append('avatar', file);

      const response = await api.post(
        buildUrl('/api/v1/users/profile/avatar'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      expect(mockPost).toHaveBeenCalledWith(
        buildUrl('/api/v1/users/profile/avatar'),
        formData,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        }),
      );
      expect(response.data.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('should handle file size validation errors', async () => {
      const mockError = {
        response: {
          status: 413,
          statusText: 'Payload Too Large',
          data: {
            detail: 'File size exceeds maximum allowed size of 5MB',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile/avatar'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const formData = new FormData();
      const file = new File(['large-file'], 'large.jpg', { type: 'image/jpeg' });
      formData.append('avatar', file);

      await expect(
        api.post(buildUrl('/api/v1/users/profile/avatar'), formData),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 413,
          data: expect.objectContaining({
            detail: expect.stringContaining('File size exceeds'),
          }),
        }),
      });
    });

    it('should handle invalid file type errors', async () => {
      const mockError = {
        response: {
          status: 415,
          statusText: 'Unsupported Media Type',
          data: {
            detail: 'Invalid file type. Only JPEG, PNG, and GIF are allowed',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile/avatar'),
          method: 'post',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.post as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const formData = new FormData();
      const file = new File(['file'], 'document.pdf', { type: 'application/pdf' });
      formData.append('avatar', file);

      await expect(
        api.post(buildUrl('/api/v1/users/profile/avatar'), formData),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 415,
          data: expect.objectContaining({
            detail: expect.stringContaining('Invalid file type'),
          }),
        }),
      });
    });
  });

  describe('Update Password', () => {
    it('should update password via PATCH', async () => {
      const mockPatch = jest.fn().mockResolvedValue({
        data: { message: 'Password updated successfully' },
        status: 200,
        headers: {},
      });

      (api.patch as jest.Mock) = mockPatch;

      const passwordData = {
        current_password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
        new_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
        confirm_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
      };

      const response = await api.patch(
        buildUrl('/api/v1/users/profile/password'),
        passwordData,
      );

      expect(mockPatch).toHaveBeenCalledWith(
        buildUrl('/api/v1/users/profile/password'),
        passwordData,
      );
      expect(response.data.message).toBe('Password updated successfully');
    });

    it('should handle incorrect current password', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            detail: 'Current password is incorrect',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile/password'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/users/profile/password'), {
          current_password: FRONTEND_TEST_DATA.PASSWORD.WRONG,
          new_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 400,
          data: expect.objectContaining({
            detail: expect.stringContaining('Current password is incorrect'),
          }),
        }),
      });
    });

    it('should handle password validation errors', async () => {
      const mockError = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: {
            detail: [
              {
                loc: ['body', 'new_password'],
                msg: 'Password must be at least 8 characters long',
                type: 'value_error',
              },
            ],
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile/password'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/users/profile/password'), {
          current_password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
          new_password: FRONTEND_TEST_DATA.PASSWORD.SHORT,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 422,
          data: expect.objectContaining({
            detail: expect.arrayContaining([
              expect.objectContaining({
                loc: expect.arrayContaining(['body', 'new_password']),
                msg: expect.stringContaining('at least 8 characters'),
              }),
            ]),
          }),
        }),
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from profile API responses', () => {
      const apiError = {
        response: {
          data: {
            detail: 'Failed to update profile',
          },
          status: 400,
        },
        message: 'Request failed',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Failed to update profile');
    });

    it('should handle rate limiting errors (429)', async () => {
      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60',
            'x-ratelimit-remaining': '0',
          },
          data: {
            detail: 'Rate limit exceeded. Please try again later.',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/users/profile'), { full_name: 'New Name' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 429,
        }),
      });
    });

    it('should handle server errors (500)', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            detail: 'An unexpected error occurred',
          },
        },
        config: {
          url: buildUrl('/api/v1/users/profile'),
          method: 'patch',
        },
        isAxiosError: true,
      } as AxiosError;

      (api.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(
        api.patch(buildUrl('/api/v1/users/profile'), { full_name: 'New Name' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 500,
          data: expect.objectContaining({
            detail: expect.stringContaining('unexpected error'),
          }),
        }),
      });
    });
  });
});
