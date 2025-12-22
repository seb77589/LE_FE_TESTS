/**
 * Preferences + API State Management Integration Tests
 *
 * Tests the integration between:
 * - PreferencesContext + API integration
 * - Preference sync across components
 * - Error handling in preference updates
 * - LocalStorage persistence
 * - Theme application
 * - Settings synchronization
 *
 * @integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PreferencesProvider, usePreferences } from '@/lib/context/PreferencesContext';
import { profileApi, UserPreferences, UserSettings } from '@/lib/api/profile';

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
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err, defaultMsg) => {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) return String(err.message);
    return defaultMsg;
  }),
}));

const mockProfileApi = profileApi as jest.Mocked<typeof profileApi>;

describe('Preferences + API State Management Integration Tests', () => {
  const mockPreferences: UserPreferences = {
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

  const mockSettings: UserSettings = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    Object.defineProperty(globalThis.window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    // Reset document.documentElement
    delete document.documentElement.dataset.theme;
  });

  describe('Preferences Loading from API', () => {
    it('should load preferences from API on mount', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      function TestComponent() {
        const { preferences, isLoading } = usePreferences();

        if (isLoading) {
          return <div data-testid="loading">Loading...</div>;
        }

        return (
          <div>
            {preferences && (
              <div data-testid="preferences-loaded">Preferences Loaded</div>
            )}
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(mockProfileApi.getPreferences).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('preferences-loaded')).toBeInTheDocument();
      });
    });

    it('should apply theme from loaded preferences', async () => {
      mockProfileApi.getPreferences.mockResolvedValue({
        ...mockPreferences,
        theme: 'dark',
      });
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      function TestComponent() {
        const { preferences } = usePreferences();
        return (
          <div>{preferences && <div data-testid="theme">{preferences.theme}</div>}</div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(mockProfileApi.getPreferences).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('dark');
      });
    });

    it('should handle API errors when loading preferences', async () => {
      mockProfileApi.getPreferences.mockRejectedValue(
        new Error('Failed to load preferences'),
      );
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      function TestComponent() {
        const { error, isLoading } = usePreferences();

        if (isLoading) {
          return <div data-testid="loading">Loading...</div>;
        }

        return <div>{error && <div data-testid="error">{error}</div>}</div>;
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(mockProfileApi.getPreferences).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });
  });

  describe('Preferences Update Integration', () => {
    it('should update preferences via API and sync state', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      const updatedPreferences = {
        ...mockPreferences,
        theme: 'dark',
      };

      mockProfileApi.updatePreferences.mockResolvedValue(updatedPreferences);

      function TestComponent() {
        const { preferences, updatePreferences } = usePreferences();
        const [updated, setUpdated] = React.useState(false);

        const handleUpdate = async () => {
          await updatePreferences({ theme: 'dark' });
          setUpdated(true);
        };

        return (
          <div>
            {preferences && (
              <div>
                <div data-testid="current-theme">{preferences.theme}</div>
                <button data-testid="update-button" onClick={handleUpdate}>
                  Update Theme
                </button>
                {updated && <div data-testid="updated">Updated</div>}
              </div>
            )}
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });

      const updateButton = screen.getByTestId('update-button');
      updateButton.click();

      await waitFor(() => {
        expect(mockProfileApi.updatePreferences).toHaveBeenCalledWith({
          theme: 'dark',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('updated')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('dark');
      });
    });

    it('should persist preferences to localStorage after update', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      const updatedPreferences = {
        ...mockPreferences,
        theme: 'dark',
      };

      mockProfileApi.updatePreferences.mockResolvedValue(updatedPreferences);

      const localStorageSetItem = jest.fn();
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: localStorageSetItem,
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      function TestComponent() {
        const { updatePreferences } = usePreferences();

        React.useEffect(() => {
          updatePreferences({ theme: 'dark' });
        }, [updatePreferences]);

        return <div>Test</div>;
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(mockProfileApi.updatePreferences).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(localStorageSetItem).toHaveBeenCalledWith(
          'userPreferences',
          JSON.stringify(updatedPreferences),
        );
      });
    });

    it('should handle update errors gracefully', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);
      mockProfileApi.updatePreferences.mockRejectedValue(
        new Error('Failed to update preferences'),
      );

      function TestComponent() {
        const { updatePreferences, error } = usePreferences();
        const [updateError, setUpdateError] = React.useState<string | null>(null);

        const handleUpdate = async () => {
          try {
            await updatePreferences({ theme: 'dark' });
          } catch {
            setUpdateError('Update failed');
          }
        };

        return (
          <div>
            <button data-testid="update-button" onClick={handleUpdate}>
              Update
            </button>
            {(error || updateError) && (
              <div data-testid="update-error">{error || updateError}</div>
            )}
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('update-button')).toBeInTheDocument();
      });

      const updateButton = screen.getByTestId('update-button');
      updateButton.click();

      await waitFor(() => {
        expect(mockProfileApi.updatePreferences).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('update-error')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Integration', () => {
    it('should load settings from API on mount', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      function TestComponent() {
        const { settings, isLoading } = usePreferences();

        if (isLoading) {
          return <div data-testid="loading">Loading...</div>;
        }

        return (
          <div>
            {settings && <div data-testid="settings-loaded">Settings Loaded</div>}
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(mockProfileApi.getSettings).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('settings-loaded')).toBeInTheDocument();
      });
    });

    it('should update settings via API and sync state', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      const updatedSettings = {
        ...mockSettings,
        email_notifications: false,
      };

      mockProfileApi.updateSettings.mockResolvedValue(updatedSettings);

      function TestComponent() {
        const { settings, updateSettings } = usePreferences();
        const [updated, setUpdated] = React.useState(false);

        const handleUpdate = async () => {
          await updateSettings({ email_notifications: false });
          setUpdated(true);
        };

        return (
          <div>
            {settings && (
              <div>
                <div data-testid="current-email-notifications">
                  {settings.email_notifications ? 'enabled' : 'disabled'}
                </div>
                <button data-testid="update-button" onClick={handleUpdate}>
                  Update Settings
                </button>
                {updated && <div data-testid="updated">Updated</div>}
              </div>
            )}
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-email-notifications')).toHaveTextContent(
          'enabled',
        );
      });

      const updateButton = screen.getByTestId('update-button');
      updateButton.click();

      await waitFor(() => {
        expect(mockProfileApi.updateSettings).toHaveBeenCalledWith({
          email_notifications: false,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('updated')).toBeInTheDocument();
      });
    });

    it('should persist settings to localStorage after update', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      const updatedSettings = {
        ...mockSettings,
        email_notifications: false,
      };

      mockProfileApi.updateSettings.mockResolvedValue(updatedSettings);

      const localStorageSetItem = jest.fn();
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: localStorageSetItem,
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      function TestComponent() {
        const { updateSettings } = usePreferences();

        React.useEffect(() => {
          updateSettings({ email_notifications: false });
        }, [updateSettings]);

        return <div>Test</div>;
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(mockProfileApi.updateSettings).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(localStorageSetItem).toHaveBeenCalledWith(
          'userSettings',
          JSON.stringify(updatedSettings),
        );
      });
    });
  });

  describe('Preference Sync Across Components', () => {
    it('should sync preferences across multiple components', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      mockProfileApi.updatePreferences.mockResolvedValue({
        ...mockPreferences,
        theme: 'dark',
      });

      function ComponentA() {
        const { preferences } = usePreferences();
        return <div data-testid="component-a-theme">{preferences?.theme}</div>;
      }

      function ComponentB() {
        const { preferences } = usePreferences();
        return <div data-testid="component-b-theme">{preferences?.theme}</div>;
      }

      function TestComponent() {
        const { updatePreferences, isLoading } = usePreferences();
        const [updated, setUpdated] = React.useState(false);

        // Wait for initial load before updating theme
        React.useEffect(() => {
          if (!isLoading && !updated) {
            setUpdated(true);
            updatePreferences({ theme: 'dark' });
          }
        }, [isLoading, updatePreferences, updated]);

        return (
          <div>
            <ComponentA />
            <ComponentB />
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      // First wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('component-a-theme')).toBeInTheDocument();
      });

      // Then verify both components show dark theme after update
      await waitFor(() => {
        expect(screen.getByTestId('component-a-theme')).toHaveTextContent('dark');
      });

      await waitFor(() => {
        expect(screen.getByTestId('component-b-theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('LocalStorage Fallback', () => {
    it('should load preferences from localStorage if API fails', async () => {
      const savedPreferences = JSON.stringify(mockPreferences);
      const localStorageGetItem = jest.fn().mockReturnValue(savedPreferences);

      Object.defineProperty(globalThis.window, 'localStorage', {
        value: {
          getItem: localStorageGetItem,
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      mockProfileApi.getPreferences.mockRejectedValue(new Error('API failed'));
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      function TestComponent() {
        const { preferences } = usePreferences();
        return (
          <div>
            {preferences && (
              <div data-testid="preferences-from-storage">{preferences.theme}</div>
            )}
          </div>
        );
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(localStorageGetItem).toHaveBeenCalledWith('userPreferences');
      });
    });
  });

  describe('Theme Application', () => {
    it('should apply theme immediately on update', async () => {
      mockProfileApi.getPreferences.mockResolvedValue(mockPreferences);
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      mockProfileApi.updatePreferences.mockResolvedValue({
        ...mockPreferences,
        theme: 'dark',
      });

      function TestComponent() {
        const { updatePreferences, isLoading } = usePreferences();
        const [updated, setUpdated] = React.useState(false);

        // Wait for initial load before updating theme
        React.useEffect(() => {
          if (!isLoading && !updated) {
            setUpdated(true);
            updatePreferences({ theme: 'dark' });
          }
        }, [isLoading, updatePreferences, updated]);

        return <div>{!isLoading && 'Loaded'}</div>;
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      // First wait for load to complete
      await waitFor(() => {
        expect(screen.getByText('Loaded')).toBeInTheDocument();
      });

      // Then verify theme is dark
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe('dark');
      });
    });

    it('should remove theme attribute when set to auto', async () => {
      mockProfileApi.getPreferences.mockResolvedValue({
        ...mockPreferences,
        theme: 'light',
      });
      mockProfileApi.getSettings.mockResolvedValue(mockSettings);

      mockProfileApi.updatePreferences.mockResolvedValue({
        ...mockPreferences,
        theme: 'auto',
      });

      function TestComponent() {
        const { updatePreferences, isLoading } = usePreferences();
        const [updated, setUpdated] = React.useState(false);

        // Wait for initial load before updating theme
        React.useEffect(() => {
          if (!isLoading && !updated) {
            setUpdated(true);
            updatePreferences({ theme: 'auto' });
          }
        }, [isLoading, updatePreferences, updated]);

        return <div>{!isLoading && 'Loaded'}</div>;
      }

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>,
      );

      // First wait for load to complete
      await waitFor(() => {
        expect(screen.getByText('Loaded')).toBeInTheDocument();
      });

      // Then verify theme attribute is removed
      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBeUndefined();
      });
    });
  });
});
