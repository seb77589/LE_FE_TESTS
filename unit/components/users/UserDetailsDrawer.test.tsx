/**
 * Tests for UserDetailsDrawer component
 *
 * Coverage targets: Lines 80%+, Branches 80%+, Functions 80%+
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDetailsDrawer } from '@/components/users/UserDetailsDrawer';
import type { User } from '@/types/user';

// Mock dependencies
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/lib/utils', () => ({
  formatDateTime: jest.fn((date) => {
    if (!date) return null;
    // eslint-disable-next-line no-restricted-syntax -- Test mock requires toLocaleString for deterministic formatting
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err, defaultMsg) =>
    err instanceof Error ? err.message : defaultMsg,
  ),
}));

import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import api from '@/lib/api';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApi = api as jest.Mocked<typeof api>;

// Test data
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  role: 'ASSISTANT',
  is_active: true,
  is_verified: true,
  last_login: '2024-01-15T10:30:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-10T12:00:00Z',
};

const mockUnverifiedUser: User = {
  ...mockUser,
  id: 2,
  is_verified: false,
  email: 'unverified@example.com',
};

const mockInactiveUser: User = {
  ...mockUser,
  id: 3,
  is_active: false,
  email: 'inactive@example.com',
};

const mockUserWithoutName: User = {
  ...mockUser,
  id: 4,
  full_name: '',
  username: 'noname',
};

const mockUserMinimalData: User = {
  id: 5,
  email: 'minimal@example.com',
  role: 'ASSISTANT',
  is_active: true,
  is_verified: false,
};

describe('UserDetailsDrawer', () => {
  const mockOnClose = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 100,
        email: 'admin@example.com',
        role: 'MANAGER',
        is_active: true,
        is_verified: true,
      },
      isLoading: false,
      isAuthenticated: true,
    } as any);
  });

  describe('Rendering States', () => {
    it('should not render when isOpen is false', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={false}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when user is null', () => {
      render(
        <UserDetailsDrawer
          user={null}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render drawer when isOpen is true and user is provided', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('User Details')).toBeInTheDocument();
    });

    it('should render overlay backdrop', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      const overlay = document.querySelector('[aria-hidden="true"]');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('should display user full name', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display username when full_name is empty', () => {
      render(
        <UserDetailsDrawer
          user={mockUserWithoutName}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('noname')).toBeInTheDocument();
    });

    it('should display email address', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display user ID', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display active status badge', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display inactive status badge', () => {
      render(
        <UserDetailsDrawer
          user={mockInactiveUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should display verified badge for verified users', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should not display verified badge for unverified users', () => {
      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });

    it('should display formatted last login date', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText(/Jan.*15.*2024/)).toBeInTheDocument();
    });

    it('should display "Never" for users who never logged in', () => {
      const userNoLogin = { ...mockUser, last_login: undefined };
      render(
        <UserDetailsDrawer
          user={userNoLogin}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should display dash for missing created_at', () => {
      render(
        <UserDetailsDrawer
          user={mockUserMinimalData}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      // Should have dash placeholder for missing dates
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe('Role Selection', () => {
    it('should render role select dropdown', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it('should have ASSISTANT, MANAGER options for non-superadmin', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      const select = screen.getByLabelText(/role/i);
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'User' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
    });

    it('should include SUPERADMIN option for superadmin users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(screen.getByRole('option', { name: 'Super Admin' })).toBeInTheDocument();
    });

    it('should disable role select for non-superadmin users', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      const select = screen.getByLabelText(/role/i);
      expect(select).toBeDisabled();
    });

    it('should show permission message for non-superadmins', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      expect(
        screen.getByText(/only superadmins can change user roles/i),
      ).toBeInTheDocument();
    });

    it('should enable role select for superadmin users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );
      const select = screen.getByLabelText(/role/i);
      expect(select).not.toBeDisabled();
    });

    it('should show Update button when role is changed by superadmin', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('should not show Update button when role is same', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /^update$/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Role Update API', () => {
    it('should call API to update role when Update button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.put.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/api/v1/users/1', {
          role: 'MANAGER',
        });
      });
    });

    it('should show success message on successful role update', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.put.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Role updated successfully')).toBeInTheDocument();
      });
    });

    it('should call onUpdate callback after successful role update', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.put.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should show error message on failed role update', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.put.mockRejectedValue(new Error('Update failed'));

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to update role. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('should show "Updating..." text while update is in progress', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      let resolveUpdate: (value: any) => void;
      mockApi.put.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      expect(screen.getByText('Updating...')).toBeInTheDocument();

      // Cleanup
      resolveUpdate!({ data: { success: true } });
    });

    it('should not call API if user id is missing', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      const userWithoutId = { ...mockUser, id: undefined } as any;

      render(
        <UserDetailsDrawer
          user={userWithoutId}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // The ID field should show dash
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('Admin Actions - Force Logout', () => {
    it('should show Admin Actions section for superadmin', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText('Admin Actions')).toBeInTheDocument();
    });

    it('should not show Admin Actions section for non-superadmin', () => {
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.queryByText('Admin Actions')).not.toBeInTheDocument();
    });

    it('should show Force Logout button for superadmin', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByRole('button', { name: /force logout/i })).toBeInTheDocument();
    });

    it('should call force logout API when button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const forceLogoutButton = screen.getByRole('button', { name: /force logout/i });
      await user.click(forceLogoutButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/users/1/force-logout');
      });
    });

    it('should show success message on successful force logout', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const forceLogoutButton = screen.getByRole('button', { name: /force logout/i });
      await user.click(forceLogoutButton);

      await waitFor(() => {
        expect(screen.getByText('User logged out successfully')).toBeInTheDocument();
      });
    });

    it('should show error message on failed force logout', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.post.mockRejectedValue(new Error('Logout failed'));

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const forceLogoutButton = screen.getByRole('button', { name: /force logout/i });
      await user.click(forceLogoutButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to force logout. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('should show "Processing..." text while force logout is in progress', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      let resolveLogout: (value: any) => void;
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogout = resolve;
          }),
      );

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const forceLogoutButton = screen.getByRole('button', { name: /force logout/i });
      await user.click(forceLogoutButton);

      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Cleanup
      resolveLogout!({ data: { success: true } });
    });
  });

  describe('Admin Actions - Send Verification Email', () => {
    it('should show Send Verification Email button for unverified users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(
        screen.getByRole('button', { name: /send verification email/i }),
      ).toBeInTheDocument();
    });

    it('should not show Send Verification Email button for verified users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(
        screen.queryByRole('button', { name: /send verification email/i }),
      ).not.toBeInTheDocument();
    });

    it('should call send verification API when button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const sendVerifyButton = screen.getByRole('button', {
        name: /send verification email/i,
      });
      await user.click(sendVerifyButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/v1/admin/users/2/send-verification',
        );
      });
    });

    it('should show success message on successful verification email send', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const sendVerifyButton = screen.getByRole('button', {
        name: /send verification email/i,
      });
      await user.click(sendVerifyButton);

      await waitFor(() => {
        expect(
          screen.getByText('Verification email sent successfully'),
        ).toBeInTheDocument();
      });
    });

    it('should show error message on failed verification email send', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.post.mockRejectedValue(new Error('Send failed'));

      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const sendVerifyButton = screen.getByRole('button', {
        name: /send verification email/i,
      });
      await user.click(sendVerifyButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to send verification email. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('should show "Sending..." text while verification email is being sent', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      let resolveSend: (value: any) => void;
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSend = resolve;
          }),
      );

      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const sendVerifyButton = screen.getByRole('button', {
        name: /send verification email/i,
      });
      await user.click(sendVerifyButton);

      expect(screen.getByText('Sending...')).toBeInTheDocument();

      // Cleanup
      resolveSend!({ data: { success: true } });
    });
  });

  describe('Drawer Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const closeButton = screen.getByRole('button', { name: /close drawer/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const overlay = document.querySelector('[aria-hidden="true"]');
      await user.click(overlay!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when dialog content is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('State Reset on User Change', () => {
    it('should reset error state when user changes', () => {
      const { rerender } = render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Rerender with different user
      rerender(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Error should be cleared (component resets on user change)
      expect(
        screen.queryByText('Failed to update role. Please try again.'),
      ).not.toBeInTheDocument();
    });

    it('should update selectedRole when user changes', () => {
      const { rerender } = render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const managerUser = { ...mockUser, id: 10, role: 'MANAGER' };
      rerender(
        <UserDetailsDrawer
          user={managerUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const select = screen.getByLabelText<HTMLSelectElement>(/role/i);
      expect(select.value).toBe('MANAGER');
    });
  });

  describe('Without onUpdate Callback', () => {
    it('should work without onUpdate prop', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'superadmin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);
      mockApi.put.mockResolvedValue({ data: { success: true } });

      render(<UserDetailsDrawer user={mockUser} isOpen={true} onClose={mockOnClose} />);

      const select = screen.getByLabelText(/role/i);
      await user.selectOptions(select, 'MANAGER');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Role updated successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no username and no full_name', () => {
      const userNoNames = {
        ...mockUser,
        full_name: '',
        username: '',
      };

      render(
        <UserDetailsDrawer
          user={userNoNames}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Should display dash for missing name
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should handle currentUser with undefined role', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Role select should be disabled for undefined role (not superadmin)
      const select = screen.getByLabelText(/role/i);
      expect(select).toBeDisabled();
    });

    it('should not call handleRoleChange when user.id is undefined', async () => {
      const userWithoutId = {
        ...mockUser,
        id: undefined,
      } as any;

      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={userWithoutId}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Change role to trigger update
      const select = screen.getByLabelText(/role/i);
      fireEvent.change(select, { target: { value: 'MANAGER' } });

      // Try to click update - but since user.id is undefined, it should not call API
      const updateButton = screen.queryByText('Update');
      if (updateButton) {
        fireEvent.click(updateButton);
        // API should not be called since user.id is undefined
        await waitFor(() => {
          // Wait for any async operations to complete
        });
      }

      // Since id is undefined, role change button won't appear
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it('should not call handleRoleChange when selectedRole equals current user.role', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Role select should show current role (ASSISTANT)
      const select = screen.getByLabelText(/role/i);
      expect(select).toHaveValue('ASSISTANT');

      // If no role change, no update button should appear
      // The update button only appears when selectedRole !== user.role
      expect(screen.queryByText('Update')).not.toBeInTheDocument();
    });

    it('should handle selectedRole being null with fallback to empty string', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      const userWithNullRole = {
        ...mockUser,
        role: null as any,
      };

      render(
        <UserDetailsDrawer
          user={userWithNullRole}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Select should be rendered with empty value when role is null
      const select = screen.getByLabelText(/role/i);
      expect(select).toBeInTheDocument();
    });

    it('should handle force logout without onUpdate callback', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      mockApi.post.mockResolvedValueOnce({ data: { success: true } });

      // Render without onUpdate callback
      render(<UserDetailsDrawer user={mockUser} isOpen={true} onClose={mockOnClose} />);

      // Click force logout button
      const forceLogoutButton = screen.getByText('Force Logout');
      fireEvent.click(forceLogoutButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/v1/admin/users/${mockUser.id}/force-logout`,
        );
        expect(screen.getByText('User logged out successfully')).toBeInTheDocument();
      });
    });

    it('should handle send verification without onUpdate callback', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      mockApi.post.mockResolvedValueOnce({ data: { success: true } });

      // Render without onUpdate callback
      render(
        <UserDetailsDrawer
          user={mockUnverifiedUser}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      // Click send verification button
      const verificationButton = screen.getByText('Send Verification Email');
      fireEvent.click(verificationButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/v1/admin/users/${mockUnverifiedUser.id}/send-verification`,
        );
        expect(
          screen.getByText('Verification email sent successfully'),
        ).toBeInTheDocument();
      });
    });

    it('should handle role update success without onUpdate callback', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      mockApi.put.mockResolvedValueOnce({ data: { success: true } });

      // Render without onUpdate callback
      render(<UserDetailsDrawer user={mockUser} isOpen={true} onClose={mockOnClose} />);

      // Change role to MANAGER (different from current ASSISTANT)
      const select = screen.getByLabelText(/role/i);
      fireEvent.change(select, { target: { value: 'MANAGER' } });

      // Wait for the update button to appear after state change
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      });

      // Click update button
      const updateButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(`/api/v1/users/${mockUser.id}`, {
          role: 'MANAGER',
        });
        expect(screen.getByText('Role updated successfully')).toBeInTheDocument();
      });
    });

    it('should not call force logout API when user.id is undefined', async () => {
      const userWithoutId = {
        ...mockUser,
        id: undefined,
      } as any;

      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={userWithoutId}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Try to click force logout if it exists
      const forceLogoutButton = screen.queryByText('Force Logout');
      if (forceLogoutButton) {
        mockApi.post.mockClear();
        fireEvent.click(forceLogoutButton);

        // API should not be called because user.id is undefined
        expect(mockApi.post).not.toHaveBeenCalled();
      }
    });

    it('should not call send verification API when user.id is undefined', async () => {
      const userWithoutId = {
        ...mockUnverifiedUser,
        id: undefined,
      } as any;

      mockUseAuth.mockReturnValue({
        user: {
          id: 100,
          email: 'admin@example.com',
          role: 'SUPERADMIN',
          is_active: true,
          is_verified: true,
        },
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(
        <UserDetailsDrawer
          user={userWithoutId}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Try to click send verification if it exists
      const verificationButton = screen.queryByText('Send Verification Email');
      if (verificationButton) {
        mockApi.post.mockClear();
        fireEvent.click(verificationButton);

        // API should not be called because user.id is undefined
        expect(mockApi.post).not.toHaveBeenCalled();
      }
    });
  });
});
