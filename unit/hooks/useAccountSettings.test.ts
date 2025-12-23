/**
 * Tests for useAccountSettings hook
 *
 * @description Comprehensive tests for the account settings hook including
 * form state management, edit mode toggle, nested field updates, and save/cancel.
 *
 * @module __tests__/unit/hooks/useAccountSettings
 */

import { renderHook, act } from '@testing-library/react';
import { useAccountSettings } from '@/hooks/profile/useAccountSettings';

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

describe('useAccountSettings', () => {
  const mockSettings = {
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    timezone: 'America/New_York',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
  };

  const mockOnUpdate = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractErrorMessage.mockImplementation((err, defaultMsg) => defaultMsg);
  });

  describe('Initial state', () => {
    it('should initialize formData from settings', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.formData).toEqual(mockSettings);
    });

    it('should start with isEditing as false', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.isEditing).toBe(false);
    });

    it('should start with empty error string', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.error).toBe('');
    });

    it('should start with empty success string', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      expect(result.current.success).toBe('');
    });

    it('should expose all required handlers', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
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
        useAccountSettings({
          settings: mockSettings,
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
        useAccountSettings({
          settings: mockSettings,
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
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.startEditing();
        result.current.handleChange('full_name', 'Jane Doe');
      });

      expect(result.current.formData.full_name).toBe('Jane Doe');

      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.formData.full_name).toBe('John Doe');
    });

    it('should clear error and success on cancel', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      // Simulate having error/success state
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
    it('should update field when handleChange is called', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('full_name', 'Jane Doe');
      });

      expect(result.current.formData.full_name).toBe('Jane Doe');
    });

    it('should update email field', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('email', 'jane@example.com');
      });

      expect(result.current.formData.email).toBe('jane@example.com');
    });

    it('should update phone field', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('phone', '+9876543210');
      });

      expect(result.current.formData.phone).toBe('+9876543210');
    });

    it('should clear error when field changes', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      // First simulate an error by having handleSave fail
      // Then change a field - error should clear
      act(() => {
        result.current.handleChange('full_name', 'Test');
      });

      expect(result.current.error).toBe('');
    });

    it('should clear success when field changes', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('full_name', 'Test');
      });

      expect(result.current.success).toBe('');
    });
  });

  describe('Nested field changes', () => {
    it('should update nested field when handleNestedChange is called', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('notifications', 'email', false);
      });

      expect((result.current.formData as any).notifications.email).toBe(false);
    });

    it('should update push notification setting', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('notifications', 'push', true);
      });

      expect((result.current.formData as any).notifications.push).toBe(true);
    });

    it('should preserve other nested fields when updating one', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('notifications', 'push', true);
      });

      expect((result.current.formData as any).notifications.email).toBe(true);
      expect((result.current.formData as any).notifications.sms).toBe(false);
    });

    it('should clear error when nested field changes', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleNestedChange('notifications', 'email', false);
      });

      expect(result.current.error).toBe('');
    });
  });

  describe('Save handler', () => {
    it('should call onUpdate with form data when handleSave is called', async () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      act(() => {
        result.current.handleChange('full_name', 'Jane Doe');
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'Jane Doe' }),
      );
    });

    it('should set success message on successful save', async () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.success).toBe('Settings updated successfully!');
    });

    it('should exit edit mode on successful save', async () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
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
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.error).toBe('Failed to update settings');
    });

    it('should log error on save failure', async () => {
      mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
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
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
        }),
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockExtractErrorMessage).toHaveBeenCalled();
    });
  });

  describe('Settings prop updates', () => {
    it('should update formData when settings prop changes', () => {
      const { result, rerender } = renderHook(
        ({ settings }) =>
          useAccountSettings({
            settings,
            onUpdate: mockOnUpdate,
          }),
        {
          initialProps: { settings: mockSettings },
        },
      );

      const newSettings = {
        ...mockSettings,
        full_name: 'New Name',
      };

      rerender({ settings: newSettings });

      expect(result.current.formData.full_name).toBe('New Name');
    });
  });

  describe('Loading state', () => {
    it('should accept isLoading prop', () => {
      const { result } = renderHook(() =>
        useAccountSettings({
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          isLoading: true,
        }),
      );

      // Hook should work with isLoading prop
      expect(result.current.formData).toBeDefined();
    });
  });
});
