/**
 * Tests for useUserPreferences hook
 *
 * @description Comprehensive tests for the user preferences hook including
 * form state management, edit mode toggle, nested field updates, and save/cancel.
 *
 * @module __tests__/unit/hooks/useUserPreferences
 */

import { renderHook, act } from '@testing-library/react';
import { useUserPreferences } from '@/hooks/profile/useUserPreferences';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err, defaultMsg) => defaultMsg),
}));

// Import mocked modules
import logger from '@/lib/logging';
import { extractErrorMessage } from '@/lib/errors';

const mockExtractErrorMessage = extractErrorMessage as jest.MockedFunction<
  typeof extractErrorMessage
>;

describe('useUserPreferences', () => {
  const mockPreferences = {
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    timezone: 'America/New_York',
    display: {
      compactMode: false,
      showSidebar: true,
      showThumbnails: true,
    },
    notifications: {
      emailDigest: 'daily',
      browserNotifications: true,
      documentUpdates: true,
      systemAlerts: true,
    },
  };

  const mockOnUpdate = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractErrorMessage.mockImplementation((err, defaultMsg) => defaultMsg);
  });

  describe('Initial state', () => {
    it('should initialize formData from preferences', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.formData).toEqual(mockPreferences);
    });

    it('should start with isEditing as false', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.isEditing).toBe(false);
    });

    it('should start with empty error string', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.error).toBe('');
    });

    it('should start with empty success string', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.success).toBe('');
    });

    it('should expose all required handlers', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(typeof result.current.handleChange).toBe('function');
      expect(typeof result.current.handleNestedChange).toBe('function');
      expect(typeof result.current.handleSave).toBe('function');
      expect(typeof result.current.handleCancel).toBe('function');
      expect(typeof result.current.startEditing).toBe('function');
    });
  });

  describe('Edit mode', () => {
    it('should enter edit mode when startEditing is called', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);
    });

    it('should exit edit mode when handleCancel is called', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.startEditing();
      });

      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.isEditing).toBe(false);
    });

    it('should reset form data when handleCancel is called', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.startEditing();
        result.current.handleChange('theme', 'dark');
      });

      expect(result.current.formData.theme).toBe('dark');

      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.formData.theme).toBe('light');
    });

    it('should clear error and success on cancel', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.startEditing();
      });

      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.error).toBe('');
      expect(result.current.success).toBe('');
    });
  });

  describe('Field changes', () => {
    it('should update theme when handleChange is called', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('theme', 'dark');
      });

      expect(result.current.formData.theme).toBe('dark');
    });

    it('should update language field', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('language', 'es');
      });

      expect(result.current.formData.language).toBe('es');
    });

    it('should update dateFormat field', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('dateFormat', 'DD/MM/YYYY');
      });

      expect(result.current.formData.dateFormat).toBe('DD/MM/YYYY');
    });

    it('should update timeFormat field', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('timeFormat', '24h');
      });

      expect(result.current.formData.timeFormat).toBe('24h');
    });

    it('should update timezone field', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('timezone', 'Europe/London');
      });

      expect(result.current.formData.timezone).toBe('Europe/London');
    });

    it('should clear error when field changes', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('theme', 'dark');
      });

      expect(result.current.error).toBe('');
    });

    it('should clear success when field changes', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('theme', 'dark');
      });

      expect(result.current.success).toBe('');
    });
  });

  describe('Nested field changes', () => {
    it('should update display.compactMode', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('display', 'compactMode', true);
      });

      expect((result.current.formData as any).display.compactMode).toBe(true);
    });

    it('should update display.showSidebar', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('display', 'showSidebar', false);
      });

      expect((result.current.formData as any).display.showSidebar).toBe(false);
    });

    it('should update notifications.emailDigest', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('notifications', 'emailDigest', 'weekly');
      });

      expect((result.current.formData as any).notifications.emailDigest).toBe('weekly');
    });

    it('should update notifications.browserNotifications', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange(
          'notifications',
          'browserNotifications',
          false,
        );
      });

      expect((result.current.formData as any).notifications.browserNotifications).toBe(
        false,
      );
    });

    it('should preserve other nested fields when updating one', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('display', 'compactMode', true);
      });

      expect((result.current.formData as any).display.showSidebar).toBe(true);
      expect((result.current.formData as any).display.showThumbnails).toBe(true);
    });

    it('should clear error when nested field changes', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('display', 'compactMode', true);
      });

      expect(result.current.error).toBe('');
    });
  });

  describe('Save handler', () => {
    it('should call onUpdate with form data when handleSave is called', async () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('theme', 'dark');
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'dark' }),
      );
    });

    it('should set success message on successful save', async () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.success).toBe('Preferences updated successfully!');
    });

    it('should exit edit mode on successful save', async () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.startEditing();
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.isEditing).toBe(false);
    });

    it('should set error message on save failure', async () => {
      mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.error).toBe('Failed to update preferences');
    });

    it('should log error on save failure', async () => {
      mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should use extractErrorMessage for error extraction', async () => {
      mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockExtractErrorMessage).toHaveBeenCalled();
    });
  });

  describe('Preferences prop updates', () => {
    it('should update formData when preferences prop changes', () => {
      const { result, rerender } = renderHook(
        ({ preferences }) =>
          useUserPreferences({
            preferences,
            onUpdate: mockOnUpdate,
          }),
        {
          initialProps: { preferences: mockPreferences },
        },
      );

      const newPreferences = {
        ...mockPreferences,
        theme: 'dark',
      };

      rerender({ preferences: newPreferences });

      expect(result.current.formData.theme).toBe('dark');
    });
  });

  describe('Loading state', () => {
    it('should accept isLoading prop', () => {
      const { result } = renderHook(() =>
        useUserPreferences({
          preferences: mockPreferences,
          onUpdate: mockOnUpdate,
          isLoading: true,
        }),
      );

      // Hook should work with isLoading prop
      expect(result.current.formData).toBeDefined();
    });
  });
});
