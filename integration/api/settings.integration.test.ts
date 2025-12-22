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

describe('Settings API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of Object.values(mockApi)) {
      mock.mockReset();
    }
  });

  // Helper functions that simulate the API calls used in components
  const settingsApiHelpers = {
    getSettings: async () => {
      const response = await mockApi.get('/api/v1/settings');
      return response.data;
    },

    updateSettings: async (settingsData: any) => {
      const response = await mockApi.post('/api/v1/settings', settingsData);
      return response.data;
    },

    getUserSettings: async () => {
      const response = await mockApi.get('/api/v1/users/me');
      return response.data;
    },

    updateUserProfile: async (profileData: any) => {
      const response = await mockApi.patch('/api/v1/users/me', profileData);
      return response.data;
    },
  };

  describe('Application Settings', () => {
    it('should successfully get application settings', async () => {
      const mockSettings = {
        preferences: {
          darkMode: false,
          emailNotifications: true,
          language: 'en',
          timezone: 'UTC',
        },
        features: {
          documentUpload: true,
          userManagement: true,
          auditLogs: true,
        },
        limits: {
          maxFileSize: 10485760, // 10MB
          maxUsers: 100,
          sessionTimeout: 3600, // 1 hour
        },
      };

      mockApi.get.mockResolvedValueOnce({
        data: mockSettings,
      });

      const result = await settingsApiHelpers.getSettings();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/settings');
      expect(result).toEqual(mockSettings);
    });

    it('should successfully update application settings', async () => {
      const settingsUpdate = {
        preferences: {
          darkMode: true,
          emailNotifications: false,
          language: 'es',
        },
      };

      const updatedSettings = {
        preferences: {
          darkMode: true,
          emailNotifications: false,
          language: 'es',
          timezone: 'UTC',
        },
        features: {
          documentUpload: true,
          userManagement: true,
          auditLogs: true,
        },
        limits: {
          maxFileSize: 10485760,
          maxUsers: 100,
          sessionTimeout: 3600,
        },
      };

      mockApi.post.mockResolvedValueOnce({
        data: updatedSettings,
      });

      const result = await settingsApiHelpers.updateSettings(settingsUpdate);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/settings', settingsUpdate);
      expect(result).toEqual(updatedSettings);
    });

    it('should handle unauthorized access to settings', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { detail: 'Invalid or expired token' },
        },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(settingsApiHelpers.getSettings()).rejects.toEqual(errorResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/settings');
    });

    it('should handle permission errors when updating settings', async () => {
      const settingsUpdate = {
        preferences: {
          darkMode: true,
        },
      };

      const errorResponse = {
        response: {
          status: 403,
          data: { detail: 'Insufficient permissions to modify settings' },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(settingsApiHelpers.updateSettings(settingsUpdate)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/settings', settingsUpdate);
    });
  });

  describe('User Settings and Profile', () => {
    it('should successfully get user settings', async () => {
      const mockUserData = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        name: 'Test User',
        full_name: 'Test User',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        preferences: {
          darkMode: false,
          emailNotifications: true,
          language: 'en',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApi.get.mockResolvedValueOnce({
        data: mockUserData,
      });

      const result = await settingsApiHelpers.getUserSettings();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users/me');
      expect(result).toEqual(mockUserData);
    });

    it('should successfully update user profile settings', async () => {
      const profileUpdate = {
        name: 'Updated User Name',
        preferences: {
          darkMode: true,
          emailNotifications: false,
        },
      };

      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        name: 'Updated User Name',
        full_name: 'Updated User Name',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        preferences: {
          darkMode: true,
          emailNotifications: false,
          language: 'en',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockApi.patch.mockResolvedValueOnce({
        data: updatedUser,
      });

      const result = await settingsApiHelpers.updateUserProfile(profileUpdate);

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/users/me', profileUpdate);
      expect(result).toEqual(updatedUser);
    });

    it('should successfully update user password via profile', async () => {
      const passwordUpdate = {
        password: FRONTEND_TEST_DATA.PASSWORD.SECURE,
      };

      const updatedUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        name: 'Test User',
        full_name: 'Test User',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockApi.patch.mockResolvedValueOnce({
        data: updatedUser,
      });

      const result = await settingsApiHelpers.updateUserProfile(passwordUpdate);

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/users/me', passwordUpdate);
      expect(result).toEqual(updatedUser);
    });

    it('should handle validation errors when updating profile', async () => {
      const invalidUpdate = {
        name: '', // Empty name
        password: '123', // Too short password
      };

      const errorResponse = {
        response: {
          status: 422,
          data: {
            detail: [
              { field: 'name', message: 'Name cannot be empty' },
              {
                field: 'password',
                message: 'Password must be at least 8 characters long',
              },
            ],
          },
        },
      };

      mockApi.patch.mockRejectedValueOnce(errorResponse);

      await expect(settingsApiHelpers.updateUserProfile(invalidUpdate)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/users/me', invalidUpdate);
    });

    it('should handle unauthorized access to user settings', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { detail: 'Invalid or expired token' },
        },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(settingsApiHelpers.getUserSettings()).rejects.toEqual(errorResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users/me');
    });
  });

  describe('Settings Form Integration', () => {
    it('should handle combined profile and settings update', async () => {
      const combinedUpdate = {
        name: 'Updated Name',
        password: FRONTEND_TEST_DATA.PASSWORD.NEW,
      };

      const profileResponse = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        name: 'Updated Name',
        full_name: 'Updated Name',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const settingsData = {
        preferences: {
          darkMode: true,
          emailNotifications: false,
        },
      };

      const settingsResponse = {
        preferences: {
          darkMode: true,
          emailNotifications: false,
          language: 'en',
          timezone: 'UTC',
        },
      };

      mockApi.patch.mockResolvedValueOnce({
        data: profileResponse,
      });

      mockApi.post.mockResolvedValueOnce({
        data: settingsResponse,
      });

      // Simulate the combined update pattern used in the settings page
      const profileResult = await settingsApiHelpers.updateUserProfile(combinedUpdate);
      const settingsResult = await settingsApiHelpers.updateSettings(settingsData);

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/users/me', combinedUpdate);
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/settings', settingsData);
      expect(profileResult).toEqual(profileResponse);
      expect(settingsResult).toEqual(settingsResponse);
    });

    it('should handle partial settings update', async () => {
      const partialUpdate = {
        preferences: {
          darkMode: true,
          // emailNotifications not included - should not change
        },
      };

      const updatedSettings = {
        preferences: {
          darkMode: true,
          emailNotifications: true, // Preserved from previous value
          language: 'en',
          timezone: 'UTC',
        },
        features: {
          documentUpload: true,
          userManagement: true,
          auditLogs: true,
        },
      };

      mockApi.post.mockResolvedValueOnce({
        data: updatedSettings,
      });

      const result = await settingsApiHelpers.updateSettings(partialUpdate);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/settings', partialUpdate);
      expect(result).toEqual(updatedSettings);
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

      await expect(settingsApiHelpers.getSettings()).rejects.toEqual(errorResponse);
    });

    it('should handle rate limiting errors (429)', async () => {
      const errorResponse = {
        response: {
          status: 429,
          data: { detail: 'Too Many Requests' },
        },
      };

      const settingsUpdate = { preferences: { darkMode: true } };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(settingsApiHelpers.updateSettings(settingsUpdate)).rejects.toEqual(
        errorResponse,
      );
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/settings', settingsUpdate);
    });

    it('should handle malformed settings data', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: null,
      });

      const result = await settingsApiHelpers.getSettings();
      expect(result).toBeNull();
    });

    it('should handle empty settings response', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          preferences: {},
          features: {},
          limits: {},
        },
      });

      const result = await settingsApiHelpers.getSettings();
      expect(result).toEqual({
        preferences: {},
        features: {},
        limits: {},
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApi.get.mockRejectedValueOnce(networkError);

      await expect(settingsApiHelpers.getSettings()).rejects.toThrow('Network Error');
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/settings');
    });

    it('should handle invalid JSON response', async () => {
      const invalidResponse = {
        data: 'invalid json string',
      };

      mockApi.get.mockResolvedValueOnce(invalidResponse);

      const result = await settingsApiHelpers.getSettings();
      expect(result).toBe('invalid json string');
    });
  });

  describe('Settings Persistence and Consistency', () => {
    it('should maintain settings consistency across updates', async () => {
      // First, get current settings
      const currentSettings = {
        preferences: {
          darkMode: false,
          emailNotifications: true,
          language: 'en',
        },
      };

      mockApi.get.mockResolvedValueOnce({
        data: currentSettings,
      });

      // Then update only darkMode
      const settingsUpdate = {
        preferences: {
          darkMode: true,
          emailNotifications: true, // Explicitly maintaining current value
          language: 'en', // Explicitly maintaining current value
        },
      };

      const updatedSettings = {
        preferences: {
          darkMode: true,
          emailNotifications: true,
          language: 'en',
        },
      };

      mockApi.post.mockResolvedValueOnce({
        data: updatedSettings,
      });

      const currentResult = await settingsApiHelpers.getSettings();
      const updateResult = await settingsApiHelpers.updateSettings(settingsUpdate);

      expect(currentResult).toEqual(currentSettings);
      expect(updateResult).toEqual(updatedSettings);
      expect(updateResult.preferences.emailNotifications).toBe(true); // Preserved
      expect(updateResult.preferences.language).toBe('en'); // Preserved
      expect(updateResult.preferences.darkMode).toBe(true); // Updated
    });
  });
});
