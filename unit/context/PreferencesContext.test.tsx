/**
 * PreferencesContext Unit Tests
 *
 * Coverage Target: 80%+
 * Tests: 15 comprehensive tests
 *
 * Test Coverage:
 * - Provider initialization and loading
 * - Preference updates with theme application
 * - Settings updates with localStorage
 * - Error handling for API failures
 * - Theme hook functionality
 * - Notifications hook functionality
 * - Privacy hook functionality
 * - LocalStorage persistence
 * - Graceful degradation
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/api/profile', () => ({
  profileApi: {
    getPreferences: jest.fn(),
    getSettings: jest.fn(),
    updatePreferences: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  PreferencesProvider,
  usePreferences,
  useTheme,
  useNotifications,
  usePrivacy,
} from '@/lib/context/PreferencesContext';
import { profileApi } from '@/lib/api/profile';
import logger from '@/lib/logging';

// ==============================================================================
// Module-level localStorage mock factory (extracted to reduce nesting - fixes S2004)
// ==============================================================================

// Wrapper to hold store reference (fixes closure issue with store = {})
interface LocalStorageWrapper {
  data: Record<string, string>;
}

// Storage operation functions (use wrapper for consistent reference)
function mockGetItem(wrapper: LocalStorageWrapper, key: string): string | null {
  return wrapper.data[key] || null;
}

function mockSetItem(wrapper: LocalStorageWrapper, key: string, value: string): void {
  wrapper.data[key] = value;
}

function mockRemoveItem(wrapper: LocalStorageWrapper, key: string): void {
  delete wrapper.data[key];
}

function mockClear(wrapper: LocalStorageWrapper): void {
  wrapper.data = {};
}

// Create localStorage mock using module-level functions
function createLocalStorageMock() {
  const wrapper: LocalStorageWrapper = { data: {} };

  return {
    getItem: jest.fn((key: string) => mockGetItem(wrapper, key)),
    setItem: jest.fn((key: string, value: string) => mockSetItem(wrapper, key, value)),
    removeItem: jest.fn((key: string) => mockRemoveItem(wrapper, key)),
    clear: jest.fn(() => mockClear(wrapper)),
  };
}

const mockLocalStorage = createLocalStorageMock();

Object.defineProperty(globalThis.window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock document.documentElement.dataset
// The PreferencesContext uses dataset.theme instead of setAttribute/removeAttribute
const mockDataset: Record<string, string | undefined> = {};

Object.defineProperty(document.documentElement, 'dataset', {
  value: mockDataset,
  writable: true,
  configurable: true,
});

// Helper components to reduce nesting depth - extracted to module level
const TestComponentWithPreferencesLoading = () => {
  const { preferences, isLoading } = usePreferences();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="theme">{preferences?.theme || 'none'}</div>
    </div>
  );
};

const TestComponentWithSettingsLoading = () => {
  const { settings, isLoading } = usePreferences();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="emailNotifications">
        {settings?.email_notifications ? 'true' : 'false'}
      </div>
    </div>
  );
};

const TestComponentWithPreferencesOnly = () => {
  const { preferences } = usePreferences();
  return <div data-testid="theme">{preferences?.theme || 'none'}</div>;
};

const TestComponentWithErrorState = () => {
  const { error, isLoading } = usePreferences();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error || 'no error'}</div>
    </div>
  );
};

const TestComponentWithUpdate = () => {
  const { preferences, updatePreferences } = usePreferences();
  const handleUpdate = React.useCallback(() => {
    updatePreferences({ theme: 'dark' });
  }, [updatePreferences]);
  return (
    <div>
      <div data-testid="theme">{preferences?.theme || 'none'}</div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithAutoTheme = () => {
  const { updatePreferences } = usePreferences();
  const handleUpdate = React.useCallback(() => {
    updatePreferences({ theme: 'auto' });
  }, [updatePreferences]);
  return (
    <button onClick={handleUpdate} data-testid="update-btn">
      Update
    </button>
  );
};

const TestComponentWithErrorHandling = () => {
  const { error, updatePreferences } = usePreferences();
  const handleUpdate = React.useCallback(async () => {
    try {
      await updatePreferences({ theme: 'dark' });
    } catch {
      // Expected to throw
    }
  }, [updatePreferences]);
  return (
    <div>
      <div data-testid="error">{error || 'no error'}</div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithSettingsUpdate = () => {
  const { settings, updateSettings } = usePreferences();
  const handleUpdate = React.useCallback(() => {
    updateSettings({ email_notifications: false });
  }, [updateSettings]);
  return (
    <div>
      <div data-testid="emailNotifications">
        {settings?.email_notifications ? 'true' : 'false'}
      </div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithSettingsError = () => {
  const { error, updateSettings } = usePreferences();
  const handleUpdate = React.useCallback(async () => {
    try {
      await updateSettings({ email_notifications: false });
    } catch {
      // Expected to throw
    }
  }, [updateSettings]);
  return (
    <div>
      <div data-testid="error">{error || 'no error'}</div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithSettingsOnly = () => {
  const { settings } = usePreferences();
  return (
    <div data-testid="emailNotifications">
      {settings?.email_notifications ? 'true' : 'false'}
    </div>
  );
};

const TestComponentWithThemeHook = () => {
  const { theme, setTheme } = useTheme();
  const handleUpdate = React.useCallback(() => {
    setTheme('dark');
  }, [setTheme]);
  return (
    <div>
      <div data-testid="theme">{theme || 'none'}</div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithNotificationsHook = () => {
  const { notifications, updateNotificationPreference } = useNotifications();
  const handleUpdate = React.useCallback(() => {
    updateNotificationPreference('email', false);
  }, [updateNotificationPreference]);
  return (
    <div>
      <div data-testid="emailNotifications">
        {notifications.email ? 'true' : 'false'}
      </div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithPrivacyHook = () => {
  const { privacy, updatePrivacySetting } = usePrivacy();
  const handleUpdate = React.useCallback(() => {
    updatePrivacySetting('profile_visibility', 'public');
  }, [updatePrivacySetting]);
  return (
    <div>
      <div data-testid="profileVisibility">{privacy.profile_visibility}</div>
      <button onClick={handleUpdate} data-testid="update-btn">
        Update
      </button>
    </div>
  );
};

const TestComponentWithoutProvider = () => {
  usePreferences();
  return <div>Test</div>;
};

describe('PreferencesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    // Reset dataset theme
    delete mockDataset.theme;

    // Default mock responses
    (profileApi.getPreferences as jest.Mock).mockResolvedValue({
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: false,
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
        items_per_page: 25,
        default_view: 'list',
      },
    });

    (profileApi.getSettings as jest.Mock).mockResolvedValue({
      email_notifications: true,
      push_notifications: false,
      sms_notifications: false,
      profile_visibility: 'private',
      show_online_status: true,
      allow_direct_messages: true,
      data_sharing: {
        analytics: false,
        marketing: false,
        third_party: false,
      },
    });
  });

  describe('PreferencesProvider Initialization', () => {
    it('should load preferences on mount', async () => {
      render(
        <PreferencesProvider>
          <TestComponentWithPreferencesLoading />
        </PreferencesProvider>,
      );

      // Initially loading
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      // Wait for preferences to load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(profileApi.getPreferences).toHaveBeenCalledTimes(1);
    });

    it('should load settings on mount', async () => {
      render(
        <PreferencesProvider>
          <TestComponentWithSettingsLoading />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('emailNotifications')).toHaveTextContent('true');
      expect(profileApi.getSettings).toHaveBeenCalledTimes(1);
    });

    it('should apply theme on load', async () => {
      (profileApi.getPreferences as jest.Mock).mockResolvedValue({
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithPreferencesOnly />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });

      // PreferencesContext uses dataset.theme instead of setAttribute
      expect(mockDataset.theme).toBe('dark');
    });

    it('should handle API error when loading preferences', async () => {
      (profileApi.getPreferences as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      render(
        <PreferencesProvider>
          <TestComponentWithErrorState />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should not fail if settings load fails', async () => {
      (profileApi.getSettings as jest.Mock).mockRejectedValue(
        new Error('Settings error'),
      );

      render(
        <PreferencesProvider>
          <TestComponentWithPreferencesLoading />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Preferences should still load even if settings fail
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Update Preferences', () => {
    it('should update preferences and apply theme', async () => {
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithUpdate />
        </PreferencesProvider>,
      );

      // Wait for initial load
      const checkThemeLight = () => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      };
      await waitFor(checkThemeLight);

      // Update preferences
      const clickUpdateButton = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButton);

      const checkThemeDark = () => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      };
      await waitFor(checkThemeDark);

      expect(profileApi.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
      // PreferencesContext uses dataset.theme instead of setAttribute
      expect(mockDataset.theme).toBe('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'userPreferences',
        expect.stringContaining('"theme":"dark"'),
      );
    });

    it('should remove theme attribute when set to auto', async () => {
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithAutoTheme />
        </PreferencesProvider>,
      );

      await waitFor(() => {
        expect(profileApi.getPreferences).toHaveBeenCalled();
      });

      await act(async () => {
        screen.getByTestId('update-btn').click();
      });

      // PreferencesContext deletes dataset.theme for 'auto' theme
      await waitFor(() => {
        expect(mockDataset.theme).toBeUndefined();
      });
    });

    it('should handle update preferences error', async () => {
      (profileApi.updatePreferences as jest.Mock).mockRejectedValue(
        new Error('Update failed'),
      );

      render(
        <PreferencesProvider>
          <TestComponentWithErrorHandling />
        </PreferencesProvider>,
      );

      const checkPreferencesCalledForError = () => {
        expect(profileApi.getPreferences).toHaveBeenCalled();
      };
      await waitFor(checkPreferencesCalledForError);

      const clickUpdateButtonForError = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButtonForError);

      const checkErrorDisplayed = () => {
        expect(screen.getByTestId('error')).toHaveTextContent('Update failed');
      };
      await waitFor(checkErrorDisplayed);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Update Settings', () => {
    it('should update settings and persist to localStorage', async () => {
      (profileApi.updateSettings as jest.Mock).mockResolvedValue({
        email_notifications: false,
        push_notifications: true,
        sms_notifications: false,
        profile_visibility: 'private',
        show_online_status: true,
        allow_direct_messages: true,
        data_sharing: {
          analytics: false,
          marketing: false,
          third_party: false,
        },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithSettingsUpdate />
        </PreferencesProvider>,
      );

      const checkEmailNotificationsTrue = () => {
        expect(screen.getByTestId('emailNotifications')).toHaveTextContent('true');
      };
      await waitFor(checkEmailNotificationsTrue);

      const clickUpdateButtonForSettings = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButtonForSettings);

      const checkEmailNotificationsFalse = () => {
        expect(screen.getByTestId('emailNotifications')).toHaveTextContent('false');
      };
      await waitFor(checkEmailNotificationsFalse);

      expect(profileApi.updateSettings).toHaveBeenCalledWith({
        email_notifications: false,
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'userSettings',
        expect.stringContaining('"email_notifications":false'),
      );
    });

    it('should handle update settings error', async () => {
      (profileApi.updateSettings as jest.Mock).mockRejectedValue(
        new Error('Update failed'),
      );

      render(
        <PreferencesProvider>
          <TestComponentWithSettingsError />
        </PreferencesProvider>,
      );

      const checkSettingsCalled = () => {
        expect(profileApi.getSettings).toHaveBeenCalled();
      };
      await waitFor(checkSettingsCalled);

      const clickUpdateButtonForSettingsError = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButtonForSettingsError);

      const checkSettingsErrorDisplayed = () => {
        expect(screen.getByTestId('error')).toHaveTextContent('Update failed');
      };
      await waitFor(checkSettingsErrorDisplayed);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should load preferences from localStorage on mount', async () => {
      const savedPreferences = {
        theme: 'dark',
        language: 'fr',
        timezone: 'Europe/Paris',
        notifications: { email: true, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      };

      const getItemImplementation = (key: string) => {
        if (key === 'userPreferences') {
          return JSON.stringify(savedPreferences);
        }
        return null;
      };
      mockLocalStorage.getItem.mockImplementation(getItemImplementation);

      render(
        <PreferencesProvider>
          <TestComponentWithPreferencesOnly />
        </PreferencesProvider>,
      );

      // Should immediately show saved preferences before API loads
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');

      // Then API should be called
      await waitFor(() => {
        expect(profileApi.getPreferences).toHaveBeenCalled();
      });
    });

    it('should load settings from localStorage on mount', async () => {
      const savedSettings = {
        email_notifications: false,
        push_notifications: true,
        sms_notifications: false,
        profile_visibility: 'private',
        show_online_status: true,
        allow_direct_messages: true,
        data_sharing: {
          analytics: false,
          marketing: false,
          third_party: false,
        },
      };

      const getItemImplementationForSettings = (key: string) => {
        if (key === 'userSettings') {
          return JSON.stringify(savedSettings);
        }
        return null;
      };
      mockLocalStorage.getItem.mockImplementation(getItemImplementationForSettings);

      render(
        <PreferencesProvider>
          <TestComponentWithSettingsOnly />
        </PreferencesProvider>,
      );

      expect(screen.getByTestId('emailNotifications')).toHaveTextContent('false');
    });
  });

  describe('Specialized Hooks', () => {
    it('should use useTheme hook', async () => {
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithThemeHook />
        </PreferencesProvider>,
      );

      const checkThemeLightForHook = () => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      };
      await waitFor(checkThemeLightForHook);

      const clickUpdateButtonForHook = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButtonForHook);

      const checkUpdatePreferencesCalled = () => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
      };
      await waitFor(checkUpdatePreferencesCalled);
    });

    it('should use useNotifications hook', async () => {
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: false, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithNotificationsHook />
        </PreferencesProvider>,
      );

      const checkEmailNotificationsTrueForHook = () => {
        expect(screen.getByTestId('emailNotifications')).toHaveTextContent('true');
      };
      await waitFor(checkEmailNotificationsTrueForHook);

      const clickUpdateButtonForNotifications = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButtonForNotifications);

      const checkNotificationsUpdateCalled = () => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({
          notifications: { email: false, push: false, sms: false },
        });
      };
      await waitFor(checkNotificationsUpdateCalled);
    });

    it('should use usePrivacy hook', async () => {
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: false, sms: false },
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
        display: { items_per_page: 25, default_view: 'list' },
      });

      render(
        <PreferencesProvider>
          <TestComponentWithPrivacyHook />
        </PreferencesProvider>,
      );

      const checkProfileVisibilityPrivate = () => {
        expect(screen.getByTestId('profileVisibility')).toHaveTextContent('private');
      };
      await waitFor(checkProfileVisibilityPrivate);

      const clickUpdateButtonForPrivacy = async () => {
        screen.getByTestId('update-btn').click();
      };
      await act(clickUpdateButtonForPrivacy);

      const checkPrivacyUpdateCalled = () => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({
          privacy: {
            profile_visibility: 'public',
            show_online_status: true,
            allow_direct_messages: true,
          },
        });
      };
      await waitFor(checkPrivacyUpdateCalled);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle localStorage.setItem failure during updatePreferences', async () => {
      // Mock successful API call
      (profileApi.updatePreferences as jest.Mock).mockResolvedValueOnce({
        theme: 'dark',
      });

      // Mock localStorage.setItem to throw (e.g., quota exceeded)
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const TestComponent = () => {
        const { updatePreferences } = usePreferences();
        return (
          <button onClick={() => updatePreferences({ theme: 'dark' })}>Update</button>
        );
      };

      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>
      );

      const button = screen.getByText('Update');
      await act(async () => {
        button.click();
      });

      // Should log warning but not throw
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'ui',
          'Failed to persist preferences to localStorage',
          expect.objectContaining({
            error: 'QuotaExceededError',
          })
        );
      });
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Mock corrupted JSON in localStorage
      mockLocalStorage.getItem.mockImplementationOnce((key: string) => {
        if (key === 'userPreferences') {
          return '{invalid json}';
        }
        return null;
      });

      render(
        <PreferencesProvider>
          <TestComponentWithPreferencesLoading />
        </PreferencesProvider>
      );

      // Should log warning but not crash
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'ui',
          'Failed to load preferences from localStorage:',
          expect.objectContaining({
            error: expect.any(Error),
          })
        );
      });
    });

    it('should throw error when usePreferences called without provider', () => {
      // Suppress console error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponentWithoutProvider />)).toThrow(
        'usePreferences must be used within a PreferencesProvider',
      );

      consoleError.mockRestore();
    });
  });
});
