import { profileApi } from '@/lib/api/profile';
import api from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

describe('Profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadAvatar', () => {
    it('uploads avatar successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        data: {
          url: '/uploads/profile_pictures/test.jpg',
          updated_at: '2023-01-01T00:00:00Z',
          file_size: 1024,
          mime_type: 'image/jpeg',
        },
        status: 200,
      };

      mockApi.post.mockResolvedValue(mockResponse as any);

      const result = await profileApi.uploadAvatar(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/users/me/avatar',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        }),
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('handles upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockError = new Error('Upload failed');

      mockApi.post.mockRejectedValue(mockError);

      await expect(profileApi.uploadAvatar(mockFile)).rejects.toThrow('Upload failed');
    });

    it('handles file validation errors', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockError = {
        response: {
          data: {
            detail: 'Only JPEG, PNG, GIF, and WebP images are allowed',
          },
        },
      };

      mockApi.post.mockRejectedValue(mockError);

      await expect(profileApi.uploadAvatar(mockFile)).rejects.toEqual(mockError);
    });
  });

  describe('deleteAvatar', () => {
    it('deletes avatar successfully', async () => {
      mockApi.delete.mockResolvedValue({
        data: { message: 'Avatar deleted successfully' },
        status: 200,
      } as any);

      await profileApi.deleteAvatar();

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/users/me/avatar');
    });

    it('handles delete errors', async () => {
      const mockError = new Error('Delete failed');
      mockApi.delete.mockRejectedValue(mockError);

      await expect(profileApi.deleteAvatar()).rejects.toThrow('Delete failed');
    });
  });

  describe('getPreferences', () => {
    it('fetches preferences successfully', async () => {
      const mockPreferences = {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        privacy: {
          profile_visibility: 'private',
          show_online_status: true,
          allow_direct_messages: true,
        },
        accessibility: {
          high_contrast: false,
          large_text: false,
          screen_reader: false,
        },
        display: {
          items_per_page: 20,
          default_view: 'list',
        },
      };

      mockApi.get.mockResolvedValue({
        data: mockPreferences,
        status: 200,
      } as any);

      const result = await profileApi.getPreferences();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users/me/preferences');
      expect(result).toEqual(mockPreferences);
    });

    it('handles fetch errors', async () => {
      const mockError = new Error('Failed to fetch preferences');
      mockApi.get.mockRejectedValue(mockError);

      await expect(profileApi.getPreferences()).rejects.toThrow(
        'Failed to fetch preferences',
      );
    });
  });

  describe('updatePreferences', () => {
    it('updates preferences successfully', async () => {
      const preferencesUpdate = {
        theme: 'dark',
        language: 'es',
        notifications: {
          email: false,
          push: true,
          sms: false,
        },
      };

      const mockResponse = {
        data: {
          ...preferencesUpdate,
          timezone: 'UTC',
          privacy: {},
          accessibility: {},
          display: {},
        },
      };

      mockApi.put.mockResolvedValue(mockResponse as any);

      const result = await profileApi.updatePreferences(preferencesUpdate);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/v1/users/me/preferences',
        preferencesUpdate,
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('handles update errors', async () => {
      const preferencesUpdate = { theme: 'dark' };
      const mockError = new Error('Update failed');

      mockApi.put.mockRejectedValue(mockError);

      await expect(profileApi.updatePreferences(preferencesUpdate)).rejects.toThrow(
        'Update failed',
      );
    });

    it('handles validation errors', async () => {
      const preferencesUpdate = { theme: 'invalid' };
      const mockError = {
        response: {
          data: {
            detail: 'Theme must be light, dark, or auto',
          },
        },
      };

      mockApi.put.mockRejectedValue(mockError);

      await expect(profileApi.updatePreferences(preferencesUpdate)).rejects.toEqual(
        mockError,
      );
    });
  });

  describe('getSettings', () => {
    it('fetches settings successfully', async () => {
      const mockSettings = {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        profile_visibility: 'private',
        show_online_status: true,
        allow_direct_messages: true,
        data_sharing: {
          analytics: true,
          marketing: false,
          third_party: false,
        },
      };

      mockApi.get.mockResolvedValue({ data: mockSettings, status: 200 } as any);

      const result = await profileApi.getSettings();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/users/me/settings');
      expect(result).toEqual(mockSettings);
    });

    it('handles fetch errors', async () => {
      const mockError = new Error('Failed to fetch settings');
      mockApi.get.mockRejectedValue(mockError);

      await expect(profileApi.getSettings()).rejects.toThrow(
        'Failed to fetch settings',
      );
    });
  });

  describe('updateSettings', () => {
    it('updates settings successfully', async () => {
      const settingsUpdate = {
        email_notifications: false,
        push_notifications: true,
        profile_visibility: 'public',
      };

      const mockResponse = {
        data: {
          ...settingsUpdate,
          sms_notifications: false,
          show_online_status: true,
          allow_direct_messages: true,
          data_sharing: {},
        },
      };

      mockApi.put.mockResolvedValue(mockResponse as any);

      const result = await profileApi.updateSettings(settingsUpdate);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/v1/users/me/settings',
        settingsUpdate,
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('handles update errors', async () => {
      const settingsUpdate = { email_notifications: false };
      const mockError = new Error('Update failed');

      mockApi.put.mockRejectedValue(mockError);

      await expect(profileApi.updateSettings(settingsUpdate)).rejects.toThrow(
        'Update failed',
      );
    });

    it('handles validation errors', async () => {
      const settingsUpdate = { profile_visibility: 'invalid' };
      const mockError = {
        response: {
          data: {
            detail: 'Profile visibility must be public, private, or friends',
          },
        },
      };

      mockApi.put.mockRejectedValue(mockError);

      await expect(profileApi.updateSettings(settingsUpdate)).rejects.toEqual(
        mockError,
      );
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
      };

      mockApi.get.mockRejectedValue(mockError);

      await expect(profileApi.getPreferences()).rejects.toEqual(mockError);
    });

    it('handles server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
      };

      mockApi.get.mockRejectedValue(mockError);

      await expect(profileApi.getPreferences()).rejects.toEqual(mockError);
    });

    it('handles timeout errors', async () => {
      const mockError = {
        code: 'TIMEOUT',
        message: 'Request timeout',
      };

      mockApi.get.mockRejectedValue(mockError);

      await expect(profileApi.getPreferences()).rejects.toEqual(mockError);
    });
  });

  describe('request configuration', () => {
    it('sets correct headers for file upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockApi.post.mockResolvedValue({ data: {}, status: 200 } as any);

      await profileApi.uploadAvatar(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/users/me/avatar',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        }),
      );
    });

    it('sets correct headers for JSON requests', async () => {
      const preferences = { theme: 'dark' };
      mockApi.put.mockResolvedValue({ data: {}, status: 200 } as any);

      await profileApi.updatePreferences(preferences);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/v1/users/me/preferences',
        preferences,
      );
    });
  });
});
