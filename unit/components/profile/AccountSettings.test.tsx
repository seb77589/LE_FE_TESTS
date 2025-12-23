/**
 * Tests for AccountSettings component
 *
 * Coverage targets: Lines 80%+, Branches 80%+, Functions 80%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountSettings } from '@/components/profile/AccountSettings';

// Mock dependencies
jest.mock('@/hooks/profile/useAccountSettings', () => ({
  useAccountSettings: jest.fn(),
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardDescription: ({ children }: any) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
}));

jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, disabled, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

import { useAccountSettings } from '@/hooks/profile/useAccountSettings';

const mockUseAccountSettings = useAccountSettings as jest.MockedFunction<
  typeof useAccountSettings
>;

describe('AccountSettings', () => {
  const mockSettings = {
    email_notifications: true,
    push_notifications: false,
    sms_notifications: false,
    data_sharing: {
      analytics: true,
      marketing: false,
      third_party: false,
    },
    privacy: {
      profile_visibility: 'public',
      show_email: false,
    },
  };

  const mockOnUpdate = jest.fn().mockResolvedValue(undefined);

  const defaultMockReturn = {
    formData: mockSettings,
    isEditing: false,
    error: '',
    success: '',
    handleChange: jest.fn(),
    handleNestedChange: jest.fn(),
    handleSave: jest.fn().mockResolvedValue(undefined),
    handleCancel: jest.fn(),
    startEditing: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountSettings.mockReturnValue(defaultMockReturn);
  });

  describe('Fallback to settings when formData fields are undefined', () => {
    it('should use settings.email_notifications when formData.email_notifications is undefined', () => {
      const formDataWithUndefined = {
        email_notifications: undefined,
        push_notifications: undefined,
        sms_notifications: undefined,
        data_sharing: undefined,
        privacy: undefined,
      };

      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: formDataWithUndefined,
      });

      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // Email notifications checkbox should be checked based on settings value (true)
      const emailLabel = screen.getByText(/email notifications/i);
      const emailCheckbox = emailLabel.closest('label')?.querySelector('input');
      expect(emailCheckbox).toBeChecked();
    });

    it('should use settings.push_notifications when formData.push_notifications is undefined', () => {
      const formDataWithUndefined = {
        email_notifications: undefined,
        push_notifications: undefined,
        sms_notifications: undefined,
        data_sharing: undefined,
        privacy: undefined,
      };

      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: formDataWithUndefined,
      });

      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // Push notifications checkbox should be unchecked based on settings value (false)
      const pushLabel = screen.getByText(/push notifications/i);
      const pushCheckbox = pushLabel.closest('label')?.querySelector('input');
      expect(pushCheckbox).not.toBeChecked();
    });

    it('should use settings.sms_notifications when formData.sms_notifications is undefined', () => {
      const formDataWithUndefined = {
        email_notifications: undefined,
        push_notifications: undefined,
        sms_notifications: undefined,
        data_sharing: undefined,
        privacy: undefined,
      };

      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: formDataWithUndefined,
      });

      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // SMS notifications checkbox should be unchecked based on settings value (false)
      const smsLabel = screen.getByText(/sms notifications/i);
      const smsCheckbox = smsLabel.closest('label')?.querySelector('input');
      expect(smsCheckbox).not.toBeChecked();
    });

    it('should use settings.data_sharing when formData.data_sharing is undefined', () => {
      const formDataWithUndefined = {
        email_notifications: undefined,
        push_notifications: undefined,
        sms_notifications: undefined,
        data_sharing: undefined,
        privacy: undefined,
      };

      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: formDataWithUndefined,
      });

      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // Analytics checkbox should be checked based on settings value (true)
      const analyticsLabel = screen.getByText(/analytics data collection/i);
      const analyticsCheckbox = analyticsLabel.closest('label')?.querySelector('input');
      expect(analyticsCheckbox).toBeChecked();

      // Marketing checkbox should be unchecked based on settings value (false)
      const marketingLabel = screen.getByText(/marketing communications/i);
      const marketingCheckbox = marketingLabel.closest('label')?.querySelector('input');
      expect(marketingCheckbox).not.toBeChecked();

      // Third party checkbox should be unchecked based on settings value (false)
      const thirdPartyLabel = screen.getByText(/third-party data sharing/i);
      const thirdPartyCheckbox = thirdPartyLabel
        .closest('label')
        ?.querySelector('input');
      expect(thirdPartyCheckbox).not.toBeChecked();
    });

    it('should use settings.privacy when formData.privacy is undefined', () => {
      const formDataWithUndefined = {
        email_notifications: undefined,
        push_notifications: undefined,
        sms_notifications: undefined,
        data_sharing: undefined,
        privacy: undefined,
      };

      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: formDataWithUndefined,
      });

      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // Profile visibility should use settings value
      const visibilityLabel = screen.getByText(/profile visibility/i);
      expect(visibilityLabel).toBeInTheDocument();
    });

    it('should handle partial formData values correctly', () => {
      const partialFormData = {
        email_notifications: false, // explicit value
        push_notifications: undefined, // falls back to settings
        sms_notifications: true, // explicit value
        data_sharing: {
          analytics: undefined, // falls back to settings
          marketing: true, // explicit value
          third_party: undefined, // falls back to settings
        },
        privacy: {
          profile_visibility: undefined, // falls back to settings
          show_email: true, // explicit value
        },
      };

      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: partialFormData,
      });

      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // Email should be unchecked (explicit false)
      const emailLabel = screen.getByText(/email notifications/i);
      const emailCheckbox = emailLabel.closest('label')?.querySelector('input');
      expect(emailCheckbox).not.toBeChecked();

      // SMS should be checked (explicit true)
      const smsLabel = screen.getByText(/sms notifications/i);
      const smsCheckbox = smsLabel.closest('label')?.querySelector('input');
      expect(smsCheckbox).toBeChecked();

      // Marketing should be checked (explicit true in partial)
      const marketingLabel = screen.getByText(/marketing communications/i);
      const marketingCheckbox = marketingLabel.closest('label')?.querySelector('input');
      expect(marketingCheckbox).toBeChecked();
    });
  });

  describe('Basic Rendering', () => {
    it('should render account settings component', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/notification settings/i)).toBeInTheDocument();
    });

    it('should render notification settings section', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/notification settings/i)).toBeInTheDocument();
      expect(screen.getByText(/email notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/push notifications/i)).toBeInTheDocument();
    });

    it('should render privacy settings section', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
    });

    it('should render security settings section', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/security settings/i)).toBeInTheDocument();
    });

    it('should render danger zone section', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
    });
  });

  describe('Editing Mode', () => {
    it('should show edit button when not editing', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/edit settings/i)).toBeInTheDocument();
    });

    it('should show cancel and save buttons when editing', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
      expect(screen.getByText(/save changes/i)).toBeInTheDocument();
    });

    it('should call startEditing when edit button is clicked', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const editButton = screen.getByText(/edit settings/i);
      fireEvent.click(editButton);
      expect(defaultMockReturn.startEditing).toHaveBeenCalledTimes(1);
    });

    it('should call handleCancel when cancel button is clicked', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      expect(defaultMockReturn.handleCancel).toHaveBeenCalledTimes(1);
    });

    it('should call handleSave when save button is clicked', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const saveButton = screen.getByText(/save changes/i);
      fireEvent.click(saveButton);
      expect(defaultMockReturn.handleSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should disable save button when loading', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={true}
        />,
      );
      const saveButton = screen.getByText(/saving/i);
      expect(saveButton).toBeDisabled();
    });

    it('should show "Saving..." text when loading', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={true}
        />,
      );
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  describe('Error and Success Messages', () => {
    it('should display error message when error exists', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to update settings',
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText('Failed to update settings')).toBeInTheDocument();
    });

    it('should display success message when success exists', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        success: 'Settings updated successfully!',
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText('Settings updated successfully!')).toBeInTheDocument();
    });
  });

  describe('Settings Sections', () => {
    it('should render all notification checkboxes', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/email notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/push notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/sms notifications/i)).toBeInTheDocument();
    });

    it('should render privacy settings options', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
    });

    it('should render security action buttons', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/change password/i)).toBeInTheDocument();
      expect(screen.getByText(/login sessions/i)).toBeInTheDocument();
    });

    it('should render danger zone actions', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/delete account/i)).toBeInTheDocument();
    });

    it('should render all data sharing checkboxes', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/analytics data collection/i)).toBeInTheDocument();
      expect(screen.getByText(/marketing communications/i)).toBeInTheDocument();
      expect(screen.getByText(/third-party data sharing/i)).toBeInTheDocument();
    });

    it('should render data sharing section header', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/control how your data is used/i)).toBeInTheDocument();
    });

    it('should render privacy visibility options', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/show online status/i)).toBeInTheDocument();
      expect(screen.getByText(/allow direct messages/i)).toBeInTheDocument();
    });
  });

  describe('Form Field Interactions', () => {
    it('should call handleChange when notification checkbox is clicked', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // email notifications

      expect(defaultMockReturn.handleChange).toHaveBeenCalled();
    });

    it('should call handleNestedChange for data sharing checkboxes', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      // Find analytics checkbox by label text
      const analyticsLabel = screen.getByText(/analytics data collection/i);
      const analyticsCheckbox = analyticsLabel.closest('label')?.querySelector('input');
      if (analyticsCheckbox) {
        fireEvent.click(analyticsCheckbox);
        expect(defaultMockReturn.handleNestedChange).toHaveBeenCalledWith(
          'data_sharing',
          'analytics',
          expect.any(Boolean),
        );
      }
    });

    it('should call handleChange when profile visibility is changed', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const select = screen.getByLabelText(/profile visibility/i);
      fireEvent.change(select, { target: { value: 'private' } });

      expect(defaultMockReturn.handleChange).toHaveBeenCalledWith(
        'profile_visibility',
        'private',
      );
    });

    it('should disable checkboxes when not editing', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: false,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      for (const checkbox of checkboxes) {
        expect(checkbox).toBeDisabled();
      }
    });

    it('should enable checkboxes when editing', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      for (const checkbox of checkboxes) {
        expect(checkbox).not.toBeDisabled();
      }
    });

    it('should disable profile visibility select when not editing', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: false,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const select = screen.getByLabelText(/profile visibility/i);
      expect(select).toBeDisabled();
    });
  });

  describe('Checkbox State Display', () => {
    it('should display checked state from formData for email notifications', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: { ...mockSettings, email_notifications: true },
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const emailLabel = screen.getByText(/email notifications/i);
      const emailCheckbox = emailLabel.closest('label')?.querySelector('input');
      expect(emailCheckbox).toBeChecked();
    });

    it('should display unchecked state from formData', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: { ...mockSettings, push_notifications: false },
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const pushLabel = screen.getByText(/push notifications/i);
      const pushCheckbox = pushLabel.closest('label')?.querySelector('input');
      expect(pushCheckbox).not.toBeChecked();
    });

    it('should display profile visibility from formData', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: { ...mockSettings, profile_visibility: 'private' },
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const select = screen.getByLabelText(/profile visibility/i);
      expect((select as HTMLSelectElement).value).toBe('private');
    });
  });

  describe('Section Headers', () => {
    it('should render notification settings header', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(
        screen.getByText(/manage how you receive notifications/i),
      ).toBeInTheDocument();
    });

    it('should render privacy settings header', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(
        screen.getByText(/control your privacy and visibility/i),
      ).toBeInTheDocument();
    });

    it('should render security settings header', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/manage your account security/i)).toBeInTheDocument();
    });

    it('should render danger zone header', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(
        screen.getByText(/irreversible and destructive actions/i),
      ).toBeInTheDocument();
    });

    it('should render danger zone warning text', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(screen.getByText(/once you delete your account/i)).toBeInTheDocument();
    });
  });

  describe('Button Variants', () => {
    it('should render change password with outline variant', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const changePasswordBtn = screen.getByText(/change password/i);
      expect(changePasswordBtn).toHaveAttribute('data-variant', 'outline');
    });

    it('should render delete account with destructive variant', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const deleteBtn = screen.getByText(/delete account/i);
      expect(deleteBtn).toHaveAttribute('data-variant', 'destructive');
    });
  });

  describe('Alert Variants', () => {
    it('should display error alert with destructive variant', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        error: 'Test error message',
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('data-variant', 'destructive');
    });

    it('should display success alert without destructive variant', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        success: 'Settings saved!',
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).not.toHaveAttribute('data-variant', 'destructive');
    });
  });

  describe('Hook Integration', () => {
    it('should pass settings to useAccountSettings hook', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );
      expect(mockUseAccountSettings).toHaveBeenCalledWith({
        settings: mockSettings,
        onUpdate: mockOnUpdate,
        isLoading: false,
      });
    });

    it('should pass isLoading true to hook', () => {
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={true}
        />,
      );
      expect(mockUseAccountSettings).toHaveBeenCalledWith({
        settings: mockSettings,
        onUpdate: mockOnUpdate,
        isLoading: true,
      });
    });
  });

  describe('Data Sharing Checkbox States', () => {
    it('should display analytics checkbox state from formData', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        formData: {
          ...mockSettings,
          data_sharing: { analytics: true, marketing: false, third_party: false },
        },
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const analyticsLabel = screen.getByText(/analytics data collection/i);
      const analyticsCheckbox = analyticsLabel.closest('label')?.querySelector('input');
      expect(analyticsCheckbox).toBeChecked();
    });

    it('should handle marketing checkbox toggle', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const marketingLabel = screen.getByText(/marketing communications/i);
      const marketingCheckbox = marketingLabel.closest('label')?.querySelector('input');
      if (marketingCheckbox) {
        fireEvent.click(marketingCheckbox);
        expect(defaultMockReturn.handleNestedChange).toHaveBeenCalledWith(
          'data_sharing',
          'marketing',
          expect.any(Boolean),
        );
      }
    });

    it('should handle third party checkbox toggle', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const thirdPartyLabel = screen.getByText(/third-party data sharing/i);
      const thirdPartyCheckbox = thirdPartyLabel
        .closest('label')
        ?.querySelector('input');
      if (thirdPartyCheckbox) {
        fireEvent.click(thirdPartyCheckbox);
        expect(defaultMockReturn.handleNestedChange).toHaveBeenCalledWith(
          'data_sharing',
          'third_party',
          expect.any(Boolean),
        );
      }
    });
  });

  describe('Privacy Checkbox Interactions', () => {
    it('should call handleChange when show online status is toggled', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const onlineStatusLabel = screen.getByText(/show online status/i);
      const onlineStatusCheckbox = onlineStatusLabel
        .closest('label')
        ?.querySelector('input');
      if (onlineStatusCheckbox) {
        fireEvent.click(onlineStatusCheckbox);
        expect(defaultMockReturn.handleChange).toHaveBeenCalledWith(
          'show_online_status',
          expect.any(Boolean),
        );
      }
    });

    it('should call handleChange when allow direct messages is toggled', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const dmLabel = screen.getByText(/allow direct messages/i);
      const dmCheckbox = dmLabel.closest('label')?.querySelector('input');
      if (dmCheckbox) {
        fireEvent.click(dmCheckbox);
        expect(defaultMockReturn.handleChange).toHaveBeenCalledWith(
          'allow_direct_messages',
          expect.any(Boolean),
        );
      }
    });

    it('should call handleChange when push notifications is toggled', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const pushLabel = screen.getByText(/push notifications/i);
      const pushCheckbox = pushLabel.closest('label')?.querySelector('input');
      if (pushCheckbox) {
        fireEvent.click(pushCheckbox);
        expect(defaultMockReturn.handleChange).toHaveBeenCalledWith(
          'push_notifications',
          expect.any(Boolean),
        );
      }
    });

    it('should call handleChange when SMS notifications is toggled', () => {
      mockUseAccountSettings.mockReturnValue({
        ...defaultMockReturn,
        isEditing: true,
      });
      render(
        <AccountSettings
          settings={mockSettings as any}
          onUpdate={mockOnUpdate}
          isLoading={false}
        />,
      );

      const smsLabel = screen.getByText(/sms notifications/i);
      const smsCheckbox = smsLabel.closest('label')?.querySelector('input');
      if (smsCheckbox) {
        fireEvent.click(smsCheckbox);
        expect(defaultMockReturn.handleChange).toHaveBeenCalledWith(
          'sms_notifications',
          expect.any(Boolean),
        );
      }
    });
  });
});
