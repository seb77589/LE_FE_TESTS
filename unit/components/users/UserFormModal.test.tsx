/**
 * Unit Test for UserFormModal Component
 *
 * Coverage Target: 95%+
 * Priority: HIGH (user management critical)
 *
 * Test Categories:
 * - Basic rendering (4 tests)
 * - Form interactions (5 tests)
 * - Create user flow (4 tests)
 * - Edit user flow (5 tests)
 * - Validation (5 tests)
 * - Error handling (3 tests)
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

// Mock auth context
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 1,
      email: 'admin@example.com',
      role: 'SUPERADMIN',
    },
    isAuthenticated: true,
    isLoading: false,
    isAdmin: jest.fn(() => true),
    isSuperAdmin: jest.fn(() => true),
    hasRole: jest.fn(() => true),
    token: 'mock-token',
    logout: jest.fn(),
  })),
}));

jest.mock('@/components/ui/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        <div>{children}</div>
      </div>
    ) : null,
}));

// Mock company/manager hooks - return empty arrays to avoid company validation
jest.mock('@/hooks/companies', () => ({
  useCompanyOptions: jest.fn(() => ({
    companies: [{ id: 1, name: 'Test Company' }],
    isLoading: false,
    error: null,
  })),
  useManagerOptions: jest.fn(() => ({
    managers: [{ id: 1, full_name: 'Test Manager' }],
    isLoading: false,
    error: null,
  })),
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserFormModal from '@/components/users/UserFormModal';
import api from '@/lib/api';
import { User } from '@/types/user';

import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';
describe('UserFormModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const existingUser: User = {
    id: 1,
    full_name: 'John Doe',
    username: 'johndoe',
    email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
    role: 'ASSISTANT',
    is_active: true,
    company_id: 1, // Required for ASSISTANT role when logged in as SuperAdmin
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (api.put as jest.Mock).mockResolvedValue({ data: { success: true } });
  });

  describe('Basic Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <UserFormModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('renders with "Create New User" title when no user is provided', () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      expect(screen.getByTestId('modal-title')).toHaveTextContent('Create New User');
    });

    it('renders with "Edit User" title when user is provided', () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      expect(screen.getByTestId('modal-title')).toHaveTextContent('Edit User');
    });

    it('renders all form fields', () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates full name field when typed', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const fullNameInput = screen.getByLabelText('Full Name');
      await userEvent.type(fullNameInput, 'Jane Doe');

      expect(fullNameInput).toHaveValue('Jane Doe');
    });

    it('updates username field when typed', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const usernameInput = screen.getByLabelText('Username');
      await userEvent.type(usernameInput, 'janedoe');

      expect(usernameInput).toHaveValue('janedoe');
    });

    it('updates email field when typed', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const emailInput = screen.getByLabelText(/Email Address/);
      await userEvent.type(emailInput, FRONTEND_TEST_CREDENTIALS.JANE.email);

      expect(emailInput).toHaveValue(FRONTEND_TEST_CREDENTIALS.JANE.email);
    });

    it('updates role field when selected', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const roleSelect = screen.getByLabelText('Role');
      // Role names changed: USER -> ASSISTANT, ADMIN -> MANAGER
      await userEvent.selectOptions(roleSelect, 'MANAGER');

      expect(roleSelect).toHaveValue('MANAGER');
    });

    it('updates password fields when typed', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const passwordInput = screen.getByLabelText(/^Password/);
      const confirmInput = screen.getByLabelText('Confirm Password');

      await userEvent.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.SECURE);
      await userEvent.type(confirmInput, FRONTEND_TEST_DATA.PASSWORD.SECURE);

      expect(passwordInput).toHaveValue(FRONTEND_TEST_DATA.PASSWORD.SECURE);
      expect(confirmInput).toHaveValue(FRONTEND_TEST_DATA.PASSWORD.SECURE);
    });
  });

  describe('Create User Flow', () => {
    it('shows password as required for new user', () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const passwordLabel = screen.getByText(/Password \*/);
      expect(passwordLabel).toBeInTheDocument();
    });

    it('does not show Active checkbox for new user', () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('submits create user form with correct data', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(screen.getByLabelText('Full Name'), 'Jane Doe');
      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.JANE.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(
        screen.getByLabelText(/^Password/),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/api/v1/auth/register', {
          email: FRONTEND_TEST_CREDENTIALS.JANE.email,
          password: FRONTEND_TEST_DATA.PASSWORD.SECURE,
          full_name: 'Jane Doe',
          role: 'SUPERADMIN',
          company_id: null,
          manager_id: null,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Helper to create delayed promise mock
    const createDelayedPromiseMock = (delayMs: number) => {
      return () => new Promise((resolve) => setTimeout(resolve, delayMs));
    };

    it('displays loading state during create submission', async () => {
      (api.post as jest.Mock).mockImplementation(createDelayedPromiseMock(100));

      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.JANE.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(
        screen.getByLabelText(/^Password/),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );

      const submitButton = screen.getByRole('button', { name: 'Create User' });
      await userEvent.click(submitButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Edit User Flow', () => {
    it('populates form with user data when editing', () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      expect(screen.getByLabelText('Full Name')).toHaveValue('John Doe');
      expect(screen.getByLabelText('Username')).toHaveValue('johndoe');
      expect(screen.getByLabelText(/Email Address/)).toHaveValue(
        FRONTEND_TEST_CREDENTIALS.JOHN.email,
      );
      // Role 'ASSISTANT' from user data is now a valid option
      expect(screen.getByLabelText('Role')).toHaveValue('ASSISTANT');
    });

    it('shows Active checkbox when editing user', () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      const activeCheckbox = screen.getByText('Active')
        .previousSibling as HTMLInputElement;
      expect(activeCheckbox).toBeInTheDocument();
      expect(activeCheckbox.type).toBe('checkbox');
      expect(activeCheckbox.checked).toBe(true);
    });

    it('shows optional password text when editing', () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      const passwordLabel = screen.getByText(
        'New Password (leave blank to keep current)',
      );
      expect(passwordLabel).toBeInTheDocument();
    });

    it('submits update with modified fields', async () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      const fullNameInput = screen.getByLabelText('Full Name');
      await userEvent.clear(fullNameInput);
      await userEvent.type(fullNameInput, 'John Updated');

      await userEvent.click(screen.getByRole('button', { name: 'Update User' }));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          '/api/v1/users/1',
          expect.objectContaining({
            full_name: 'John Updated',
            email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
            password: undefined,
          }),
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('includes password in update if provided', async () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      await userEvent.type(
        screen.getByLabelText(/^New Password/),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Update User' }));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          '/api/v1/users/1',
          expect.objectContaining({
            password: FRONTEND_TEST_DATA.PASSWORD.NEW,
          }),
        );
      });
    });
  });

  describe('Validation', () => {
    it('has required attribute on email field', () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const emailInput = screen.getByLabelText(/Email Address/);
      expect(emailInput).toHaveAttribute('required');
    });

    it('has required attribute on password field for new user', () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      const passwordInput = screen.getByLabelText(/^Password/);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('shows error when password is too short', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.JANE.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(screen.getByLabelText(/^Password/), 'short');
      await userEvent.type(screen.getByLabelText('Confirm Password'), 'short');

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters.'),
        ).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.JANE.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(
        screen.getByLabelText(/^Password/),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        'DifferentPass123!',
      );

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('validates password when editing and new password is provided', async () => {
      render(
        <UserFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={existingUser}
        />,
      );

      await userEvent.type(screen.getByLabelText(/^New Password/), 'short');
      await userEvent.type(screen.getByLabelText('Confirm Password'), 'short');

      await userEvent.click(screen.getByRole('button', { name: 'Update User' }));

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters.'),
        ).toBeInTheDocument();
      });

      expect(api.put).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      const errorMessage = 'User with this email already exists';
      (api.post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            detail: errorMessage,
          },
        },
      });

      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.EXISTING.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(
        screen.getByLabelText(/^Password/),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('displays generic error message when no detail is provided', async () => {
      (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.JANE.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(
        screen.getByLabelText(/^Password/),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to save user. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('handles object error details by stringifying', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            detail: { field: 'email', message: 'Invalid format' },
          },
        },
      });

      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.type(
        screen.getByLabelText(/Email Address/),
        FRONTEND_TEST_CREDENTIALS.JANE.email,
      );
      // Use SUPERADMIN role to avoid company requirement
      await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPERADMIN');
      await userEvent.type(
        screen.getByLabelText(/^Password/),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
      await userEvent.type(
        screen.getByLabelText('Confirm Password'),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(
          screen.getByText(/{"field":"email","message":"Invalid format"}/),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('resets form when modal is reopened', () => {
      const { rerender } = render(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      // Type in email
      const emailInput = screen.getByLabelText(/Email Address/);
      userEvent.type(emailInput, FRONTEND_TEST_CREDENTIALS.USER.email);

      // Close modal
      rerender(
        <UserFormModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      // Reopen modal
      rerender(
        <UserFormModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      );

      // Email field should be empty
      const newEmailInput = screen.getByLabelText(/Email Address/);
      expect(newEmailInput).toHaveValue('');
    });
  });
});
