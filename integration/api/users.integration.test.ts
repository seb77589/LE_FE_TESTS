import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { FRONTEND_TEST_CREDENTIALS, FRONTEND_TEST_DATA } from '../../test-credentials';

// Mock api
jest.mock('@/lib/api');

const mockApi = {
  get: jest.fn() as jest.MockedFunction<any>,
  post: jest.fn() as jest.MockedFunction<any>,
  put: jest.fn() as jest.MockedFunction<any>,
  patch: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
};

describe('User Management API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of Object.values(mockApi)) {
      mock.mockReset();
    }
  });

  // Helper functions that simulate the API calls used in components
  const userApiHelpers = {
    listUsers: async (skip?: number, limit?: number) => {
      const params = new URLSearchParams();
      if (skip !== undefined) params.append('skip', skip.toString());
      if (limit !== undefined) params.append('limit', limit.toString());
      const queryString = params.toString();
      const url = queryString ? `/api/v1/users?${queryString}` : '/api/v1/users';

      const response = await mockApi.get(url);
      return response.data;
    },

    updateUser: async (userId: number, updateData: any) => {
      const response = await mockApi.put(`/api/v1/users/${userId}`, updateData);
      return response.data;
    },

    getCurrentUser: async () => {
      const response = await mockApi.get('/api/v1/profile/me');
      return response.data;
    },

    updateCurrentUser: async (updateData: any) => {
      const response = await mockApi.patch('/api/v1/profile/me', updateData);
      return response.data;
    },

    deleteCurrentUser: async (deleteData: any) => {
      const response = await mockApi.delete('/api/v1/profile/me', {
        data: deleteData,
      });
      return response.data;
    },
  };

  describe('User Listing (Admin)', () => {
    it('should successfully list users', async () => {
      const mockUsers = {
        users: [
          {
            id: 1,
            email: FRONTEND_TEST_CREDENTIALS.USER1.email,
            full_name: 'User One',
            role: 'assistant',
            is_active: true,
            is_verified: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
            full_name: 'Admin User',
            role: 'manager',
            is_active: true,
            is_verified: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 2,
      };

      mockApi.get.mockResolvedValueOnce({
        data: mockUsers,
      });

      const result = await userApiHelpers.listUsers();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users');
      expect(result).toEqual(mockUsers);
    });

    it('should successfully list users with pagination', async () => {
      const mockUsers = {
        users: [
          {
            id: 3,
            email: FRONTEND_TEST_CREDENTIALS.USER2.email,
            full_name: 'User Three',
            role: 'assistant',
            is_active: true,
            is_verified: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 10,
      };

      mockApi.get.mockResolvedValueOnce({
        data: mockUsers,
      });

      const result = await userApiHelpers.listUsers(10, 20);

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users?skip=10&limit=20');
      expect(result).toEqual(mockUsers);
    });

    it('should handle permission errors when listing users', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: { detail: 'Insufficient permissions' },
        },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.listUsers()).rejects.toEqual(errorResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users');
    });
  });

  describe('User Management (Admin)', () => {
    it('should successfully update user status', async () => {
      const updateData = { is_active: false };

      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER1.email,
        full_name: 'User One',
        role: 'assistant',
        is_active: false,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockApi.put.mockResolvedValueOnce({
        data: updatedUser,
      });

      const result = await userApiHelpers.updateUser(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should successfully update user information', async () => {
      const updateData = {
        full_name: 'Updated Name',
        role: 'manager',
        is_active: true,
      };

      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER1.email,
        full_name: 'Updated Name',
        role: 'manager',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockApi.put.mockResolvedValueOnce({
        data: updatedUser,
      });

      const result = await userApiHelpers.updateUser(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should handle validation errors when updating user', async () => {
      const updateData = {
        email: 'invalid-email',
        role: 'invalid-role',
      };

      const errorResponse = {
        response: {
          status: 422,
          data: {
            detail: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'role', message: 'Invalid role value' },
            ],
          },
        },
      };

      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.updateUser(1, updateData)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/1', updateData);
    });

    it('should handle permission errors when updating user', async () => {
      const updateData = { role: 'superadmin' };

      const errorResponse = {
        response: {
          status: 403,
          data: { detail: 'Insufficient permissions' },
        },
      };

      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.updateUser(1, updateData)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/1', updateData);
    });
  });

  describe('Current User Management', () => {
    it('should successfully get current user information', async () => {
      const mockCurrentUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.CURRENT.email,
        full_name: 'Current User',
        role: 'manager',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-01T12:00:00Z',
      };

      mockApi.get.mockResolvedValueOnce({
        data: mockCurrentUser,
      });

      const result = await userApiHelpers.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/me');
      expect(result).toEqual(mockCurrentUser);
    });

    it('should successfully update current user profile', async () => {
      const updateData = {
        full_name: 'Updated Current User',
      };

      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.CURRENT.email,
        full_name: 'Updated Current User',
        role: 'manager',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockApi.patch.mockResolvedValueOnce({
        data: updatedUser,
      });

      const result = await userApiHelpers.updateCurrentUser(updateData);

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/profile/me', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should successfully update current user password', async () => {
      const updateData = {
        password: FRONTEND_TEST_DATA.PASSWORD.NEW,
      };

      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.CURRENT.email,
        full_name: 'Current User',
        role: 'manager',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockApi.patch.mockResolvedValueOnce({
        data: updatedUser,
      });

      const result = await userApiHelpers.updateCurrentUser(updateData);

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/profile/me', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should handle validation errors when updating current user', async () => {
      const updateData = {
        password: '123', // Too short
      };

      const errorResponse = {
        response: {
          status: 422,
          data: {
            detail: 'Password must be at least 8 characters long',
          },
        },
      };

      mockApi.patch.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.updateCurrentUser(updateData)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/profile/me', updateData);
    });

    it('should handle unauthorized access to current user', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { detail: 'Invalid or expired token' },
        },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.getCurrentUser()).rejects.toEqual(errorResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/me');
    });
  });

  describe('Account Deletion', () => {
    it('should successfully delete current user account', async () => {
      const deleteData = {
        password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
      };

      const successResponse = {
        message: 'Account deleted successfully',
      };

      mockApi.delete.mockResolvedValueOnce({
        data: successResponse,
      });

      const result = await userApiHelpers.deleteCurrentUser(deleteData);

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/profile/me', {
        data: deleteData,
      });
      expect(result).toEqual(successResponse);
    });

    it('should handle incorrect password when deleting account', async () => {
      const deleteData = {
        password: FRONTEND_TEST_DATA.PASSWORD.WRONG,
      };

      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Current password is incorrect' },
        },
      };

      mockApi.delete.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.deleteCurrentUser(deleteData)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/profile/me', {
        data: deleteData,
      });
    });

    it('should handle unauthorized account deletion', async () => {
      const deleteData = {
        password: FRONTEND_TEST_DATA.PASSWORD.VALID,
      };

      const errorResponse = {
        response: {
          status: 401,
          data: { detail: 'Invalid or expired token' },
        },
      };

      mockApi.delete.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.deleteCurrentUser(deleteData)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/profile/me', {
        data: deleteData,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server errors (500)', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { detail: 'Internal Server Error' },
        },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.listUsers()).rejects.toEqual(errorResponse);
    });

    it('should handle rate limiting errors (429)', async () => {
      const errorResponse = {
        response: {
          status: 429,
          data: { detail: 'Too Many Requests' },
        },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(userApiHelpers.getCurrentUser()).rejects.toEqual(errorResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/me');
    });

    it('should handle malformed response data', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: null,
      });

      const result = await userApiHelpers.listUsers();
      expect(result).toBeNull();
    });

    it('should handle empty response data', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { users: [], total: 0 },
      });

      const result = await userApiHelpers.listUsers();
      expect(result).toEqual({ users: [], total: 0 });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApi.get.mockRejectedValueOnce(networkError);

      await expect(userApiHelpers.listUsers()).rejects.toThrow('Network Error');
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users');
    });
  });
});
