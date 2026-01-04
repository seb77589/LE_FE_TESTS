import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserPreferences from '@/components/profile/UserPreferences';

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

describe('UserPreferences', () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders preferences form', () => {
    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('User Preferences')).toBeInTheDocument();
    expect(
      screen.getByText('Customize your application experience'),
    ).toBeInTheDocument();
  });

  it('displays current preference values', () => {
    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Check theme selection - use getByLabelText and check value
    const themeSelect = screen.getByLabelText('Theme');
    expect(themeSelect).toHaveValue('light');

    // Check language selection
    const languageSelect = screen.getByLabelText('Language');
    expect(languageSelect).toHaveValue('en');

    // Check notification checkboxes
    const emailCheckbox = screen.getByRole('checkbox', {
      name: /email notifications/i,
    });
    const pushCheckbox = screen.getByRole('checkbox', { name: /push notifications/i });
    const smsCheckbox = screen.getByRole('checkbox', { name: /sms notifications/i });

    expect(emailCheckbox).toBeChecked();
    expect(pushCheckbox).toBeChecked();
    expect(smsCheckbox).not.toBeChecked();
  });

  it('allows editing preferences', async () => {
    const user = userEvent.setup();
    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Should show save and cancel buttons
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('updates theme preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change theme
    const themeSelect = screen.getByLabelText('Theme');
    await user.selectOptions(themeSelect, 'dark');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        theme: 'dark',
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
      });
    });
  });

  it('updates notification preferences', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle email notifications
    const emailCheckbox = screen.getByRole('checkbox', {
      name: /email notifications/i,
    });
    await user.click(emailCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: expect.objectContaining({
            email: false,
          }),
        }),
      );
    });
  });

  it('updates privacy settings', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change profile visibility - find by label or role
    const visibilitySelect =
      screen.getByLabelText(/profile visibility/i) ||
      screen.getByRole('combobox', { name: /visibility/i });
    await user.selectOptions(visibilitySelect, 'public');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          privacy: expect.objectContaining({
            profile_visibility: 'public',
          }),
        }),
      );
    });
  });

  it('updates accessibility settings', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle high contrast
    const highContrastCheckbox = screen.getByRole('checkbox', {
      name: /high contrast mode/i,
    });
    await user.click(highContrastCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accessibility: expect.objectContaining({
            high_contrast: true,
          }),
        }),
      );
    });
  });

  it('updates display settings', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change items per page - find by label
    const itemsPerPageInput = screen.getByLabelText(/items per page/i);
    await user.clear(itemsPerPageInput);
    await user.type(itemsPerPageInput, '50');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          display: expect.objectContaining({
            items_per_page: 50,
          }),
        }),
      );
    });
  });

  it('handles update errors', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockRejectedValue(new Error('Update failed'));

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change theme
    const themeSelect = screen.getByLabelText('Theme');
    await user.selectOptions(themeSelect, 'dark');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('shows success message on successful update', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change theme
    const themeSelect = screen.getByLabelText('Theme');
    await user.selectOptions(themeSelect, 'dark');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Preferences updated successfully!')).toBeInTheDocument();
    });
  });

  it('cancels editing and reverts changes', async () => {
    const user = userEvent.setup();

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change theme
    const themeSelect = screen.getByLabelText('Theme');
    await user.selectOptions(themeSelect, 'dark');

    // Cancel editing
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should revert to original value
    const themeSelectAfterCancel = screen.getByLabelText('Theme');
    expect(themeSelectAfterCancel).toHaveValue('light');
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('shows loading state during update', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(
      <UserPreferences
        preferences={mockPreferences}
        onUpdate={mockOnUpdate}
        isLoading={true}
      />,
    );

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Save button should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('disables form when loading', () => {
    render(
      <UserPreferences
        preferences={mockPreferences}
        onUpdate={mockOnUpdate}
        isLoading={true}
      />,
    );

    // All form elements should be disabled
    // Find select by id since it has id="appearance-theme"
    const themeSelect = screen.getByLabelText('Theme');
    const emailCheckbox = screen.getByRole('checkbox', {
      name: /email notifications/i,
    });

    expect(themeSelect).toBeDisabled();
    expect(emailCheckbox).toBeDisabled();
  });

  it('updates language preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change language
    const languageSelect = screen.getByLabelText('Language');
    await user.selectOptions(languageSelect, 'es');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'es',
        }),
      );
    });
  });

  it('updates SMS notification preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle SMS notifications
    const smsCheckbox = screen.getByRole('checkbox', {
      name: /sms notifications/i,
    });
    await user.click(smsCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: expect.objectContaining({
            sms: true,
          }),
        }),
      );
    });
  });

  it('updates show online status preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle show online status
    const onlineStatusCheckbox = screen.getByRole('checkbox', {
      name: /show online status/i,
    });
    await user.click(onlineStatusCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          privacy: expect.objectContaining({
            show_online_status: false,
          }),
        }),
      );
    });
  });

  it('updates allow direct messages preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle allow direct messages
    const dmCheckbox = screen.getByRole('checkbox', {
      name: /allow direct messages/i,
    });
    await user.click(dmCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          privacy: expect.objectContaining({
            allow_direct_messages: false,
          }),
        }),
      );
    });
  });

  it('updates large text accessibility preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle large text
    const largeTextCheckbox = screen.getByRole('checkbox', {
      name: /large text/i,
    });
    await user.click(largeTextCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accessibility: expect.objectContaining({
            large_text: true,
          }),
        }),
      );
    });
  });

  it('updates screen reader accessibility preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle screen reader
    const screenReaderCheckbox = screen.getByRole('checkbox', {
      name: /screen reader/i,
    });
    await user.click(screenReaderCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accessibility: expect.objectContaining({
            screen_reader: true,
          }),
        }),
      );
    });
  });

  it('updates default view preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Change default view
    const defaultViewSelect = screen.getByLabelText('Default view');
    await user.selectOptions(defaultViewSelect, 'grid');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          display: expect.objectContaining({
            default_view: 'grid',
          }),
        }),
      );
    });
  });

  it('updates push notification preference', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);

    render(<UserPreferences preferences={mockPreferences} onUpdate={mockOnUpdate} />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit preferences/i });
    await user.click(editButton);

    // Toggle push notifications (was true, should be false)
    const pushCheckbox = screen.getByRole('checkbox', {
      name: /push notifications/i,
    });
    await user.click(pushCheckbox);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: expect.objectContaining({
            push: false,
          }),
        }),
      );
    });
  });
});
