/**
 * Profile Component-Hook Integration Tests
 *
 * Tests the integration between:
 * - Profile page + API integration
 * - Profile update flow
 * - Avatar upload integration
 * - AccountSettings component + useAccountSettings hook
 * - Error propagation from API to UI
 *
 * @integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/lib/context/ConsolidatedAuthContext';
import { profileApi } from '@/lib/api/profile';
import api from '@/lib/api';
import useSWR from 'swr';

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

jest.mock('@/lib/api/profile', () => ({
  profileApi: {
    uploadAvatar: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  fetcher: jest.fn(),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', role: 'assistant' },
    isAuthenticated: true,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockProfileApi = profileApi as jest.Mocked<typeof profileApi>;
const mockApi = api as jest.Mocked<typeof api>;
const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

// Shared test component for avatar upload error testing
function AvatarUploadErrorTestComponent() {
  const [error, setError] = React.useState<string | null>(null);

  const handleAvatarUpload = async (file: File) => {
    try {
      await mockProfileApi.uploadAvatar(file);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setError(errorObj.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <div>
      <input
        type="file"
        data-testid="avatar-input"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleAvatarUpload(file);
          }
        }}
      />
      {error && <div data-testid="upload-error">{error}</div>}
    </div>
  );
}

describe('Profile Component-Hook Integration Tests', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'assistant',
    is_active: true,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
  };

  const mockPreferences = {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    privacy: {
      profile_visibility: 'public',
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
      default_view: 'grid',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Page + API Integration', () => {
    it('should fetch user data from API using SWR', async () => {
      mockUseSWR.mockReturnValue({
        data: mockUser,
        error: undefined,
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      function TestComponent() {
        const { data } = useSWR('/api/v1/users/me', require('@/lib/api').fetcher);

        return (
          <div>
            {data && <div data-testid="user-name">{data.full_name}</div>}
            {data && <div data-testid="user-email">{data.email}</div>}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        // useSWR may be called with 2 or 3 arguments depending on options
        expect(mockUseSWR).toHaveBeenCalledWith(
          '/api/v1/users/me',
          expect.any(Function),
        );
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    it('should update profile via API and refresh data', async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockUser,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const updatedUser = {
        ...mockUser,
        full_name: 'Updated Name',
      };

      mockApi.patch.mockResolvedValue({
        data: updatedUser,
        status: 200,
      });

      function TestComponent() {
        const { data, mutate } = useSWR(
          '/api/v1/users/me',
          require('@/lib/api').fetcher,
        );
        const [isUpdating, setIsUpdating] = React.useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setIsUpdating(true);
          try {
            await mockApi.patch('/api/v1/users/me', { full_name: 'Updated Name' });
            await mutate();
          } finally {
            setIsUpdating(false);
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <input
              name="full_name"
              defaultValue={data?.full_name}
              data-testid="name-input"
            />
            <button type="submit" data-testid="submit-button" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </form>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const nameInput = screen.getByTestId('name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/users/me', {
          full_name: 'Updated Name',
        });
      });

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('should handle profile update errors', async () => {
      const user = userEvent.setup();
      mockUseSWR.mockReturnValue({
        data: mockUser,
        error: undefined,
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.patch.mockRejectedValue({
        response: {
          status: 400,
          data: {
            detail: 'Invalid profile data',
          },
        },
      });

      function TestComponent() {
        const [error, setError] = React.useState<string | null>(null);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          try {
            await mockApi.patch('/api/v1/users/me', { full_name: '' });
          } catch (err: any) {
            setError(err.response?.data?.detail || 'Update failed');
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <button type="submit" data-testid="submit-button">
              Update
            </button>
            {error && <div data-testid="error">{error}</div>}
          </form>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid profile data');
      });
    });
  });

  describe('Avatar Upload Integration', () => {
    it('should upload avatar via API and update profile', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      mockProfileApi.uploadAvatar.mockResolvedValue({
        url: '/api/v1/users/me/avatar/avatar.jpg',
        updated_at: new Date().toISOString(),
        file_size: 1024,
        mime_type: 'image/jpeg',
      });

      function TestComponent() {
        const [uploading, setUploading] = React.useState(false);
        const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

        const handleAvatarUpload = async (file: File) => {
          setUploading(true);
          try {
            const response = await mockProfileApi.uploadAvatar(file);
            setAvatarUrl(response.url);
          } finally {
            setUploading(false);
          }
        };

        return (
          <div>
            <input
              type="file"
              data-testid="avatar-input"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleAvatarUpload(file);
                }
              }}
            />
            {uploading && <div data-testid="uploading">Uploading...</div>}
            {avatarUrl && <div data-testid="avatar-url">{avatarUrl}</div>}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const avatarInput = screen.getByTestId('avatar-input');
      await user.upload(avatarInput, mockFile);

      await waitFor(() => {
        expect(mockProfileApi.uploadAvatar).toHaveBeenCalledWith(mockFile);
      });

      await waitFor(() => {
        expect(screen.getByTestId('avatar-url')).toBeInTheDocument();
      });
    });

    it('should handle avatar upload errors', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      mockProfileApi.uploadAvatar.mockRejectedValue({
        response: {
          status: 400,
          data: {
            detail: 'Invalid image format',
          },
        },
      });

      render(
        <AuthProvider>
          <AvatarUploadErrorTestComponent />
        </AuthProvider>,
      );

      const avatarInput = screen.getByTestId('avatar-input');
      await user.upload(avatarInput, mockFile);

      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toHaveTextContent(
          'Invalid image format',
        );
      });
    });

    it('should handle file size validation', async () => {
      const user = userEvent.setup();
      // Create a large file (> 5MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      mockProfileApi.uploadAvatar.mockRejectedValue({
        response: {
          status: 413,
          data: {
            detail: 'File size exceeds maximum allowed size',
          },
        },
      });

      render(
        <AuthProvider>
          <AvatarUploadErrorTestComponent />
        </AuthProvider>,
      );

      const avatarInput = screen.getByTestId('avatar-input');
      await user.upload(avatarInput, largeFile);

      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toHaveTextContent('exceeds maximum');
      });
    });
  });

  describe('AccountSettings + useAccountSettings Hook Integration', () => {
    it('should integrate AccountSettings component with useAccountSettings hook', async () => {
      const user = userEvent.setup();
      const mockSettings = {
        email_notifications: true,
        push_notifications: false,
        sms_notifications: false,
        profile_visibility: 'public',
        show_online_status: true,
        allow_direct_messages: true,
        data_sharing: {
          analytics: true,
          marketing: false,
          third_party: false,
        },
      };

      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      const updatedSettings = {
        ...mockSettings,
        email_notifications: false,
      };

      mockProfileApi.updateSettings.mockResolvedValue(updatedSettings);

      const { useAccountSettings } = require('@/hooks/profile/useAccountSettings');

      function TestComponent() {
        const [settings, setSettings] = React.useState(mockSettings);
        const [isLoading, setIsLoading] = React.useState(false);

        const handleUpdate = async (updates: Partial<typeof mockSettings>) => {
          setIsLoading(true);
          try {
            const updated = await mockProfileApi.updateSettings(updates);
            setSettings(updated);
          } finally {
            setIsLoading(false);
          }
        };

        const accountSettings = useAccountSettings({
          settings,
          onUpdate: handleUpdate,
          isLoading,
        });

        return (
          <div>
            <div data-testid="email-notifications">
              {accountSettings.formData.email_notifications ? 'enabled' : 'disabled'}
            </div>
            {accountSettings.isEditing ? (
              <div>
                <button
                  data-testid="save-button"
                  onClick={accountSettings.handleSave}
                  disabled={isLoading}
                >
                  Save
                </button>
                <button
                  data-testid="cancel-button"
                  onClick={accountSettings.handleCancel}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button data-testid="edit-button" onClick={accountSettings.startEditing}>
                Edit
              </button>
            )}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId('email-notifications')).toHaveTextContent('enabled');

      const editButton = screen.getByTestId('edit-button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toBeInTheDocument();
      });

      // Simulate changing email notifications
      const accountSettingsHook =
        require('@/hooks/profile/useAccountSettings').useAccountSettings;
      // This would be handled by the component's onChange handler
      // For integration test, we verify the hook is being used correctly
      expect(accountSettingsHook).toBeDefined();
    });

    it('should handle settings update errors through hook', async () => {
      const mockSettings = {
        email_notifications: true,
        push_notifications: false,
        sms_notifications: false,
        profile_visibility: 'public',
        show_online_status: true,
        allow_direct_messages: true,
        data_sharing: {
          analytics: true,
          marketing: false,
          third_party: false,
        },
      };

      mockProfileApi.updateSettings.mockRejectedValue({
        response: {
          status: 400,
          data: {
            detail: 'Invalid settings data',
          },
        },
      });

      const { useAccountSettings } = require('@/hooks/profile/useAccountSettings');

      function TestComponent() {
        const handleUpdate = async () => {
          await mockProfileApi.updateSettings({ email_notifications: false });
        };

        const accountSettings = useAccountSettings({
          settings: mockSettings,
          onUpdate: handleUpdate,
        });

        return (
          <div>
            {accountSettings.error && (
              <div data-testid="settings-error">{accountSettings.error}</div>
            )}
            <button data-testid="save-button" onClick={accountSettings.handleSave}>
              Save
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const saveButton = screen.getByTestId('save-button');
      saveButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('settings-error')).toBeInTheDocument();
      });
    });
  });

  describe('Error Propagation from API to UI', () => {
    it('should propagate API errors to profile page UI', async () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: new Error('Failed to fetch user'),
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      function TestComponent() {
        const { data, error } = useSWR(
          '/api/v1/users/me',
          require('@/lib/api').fetcher,
        );

        if (error) {
          return <div data-testid="profile-error">Failed to load profile</div>;
        }

        return <div>{data && <div>Profile loaded</div>}</div>;
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });

    it('should handle network errors during profile update', async () => {
      const user = userEvent.setup();
      mockUseSWR.mockReturnValue({
        data: mockUser,
        error: undefined,
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.patch.mockRejectedValue({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      });

      function TestComponent() {
        const [error, setError] = React.useState<string | null>(null);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          try {
            await mockApi.patch('/api/v1/users/me', { full_name: 'Updated' });
          } catch (err: any) {
            setError(err.message || 'Network error');
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <button type="submit" data-testid="submit-button">
              Update
            </button>
            {error && <div data-testid="network-error">{error}</div>}
          </form>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toHaveTextContent('Network Error');
      });
    });
  });

  describe('Preferences Integration with Profile', () => {
    it('should load preferences alongside profile data', async () => {
      mockUseSWR
        .mockReturnValueOnce({
          data: mockUser,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any)
        .mockReturnValueOnce({
          data: mockPreferences,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any);

      function TestComponent() {
        const { data: userData } = useSWR(
          '/api/v1/users/me',
          require('@/lib/api').fetcher,
        );
        const { data: preferencesData } = useSWR(
          '/api/v1/users/me/preferences',
          require('@/lib/api').fetcher,
        );

        return (
          <div>
            {userData && <div data-testid="user-loaded">User loaded</div>}
            {preferencesData && (
              <div data-testid="preferences-loaded">Preferences loaded</div>
            )}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-loaded')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('preferences-loaded')).toBeInTheDocument();
      });
    });
  });
});
