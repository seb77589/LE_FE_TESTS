/**
 * Tests for DangerTab component
 *
 * @description Tests for the DangerTab settings component including:
 * - Initial state rendering
 * - Confirmation flow
 * - Validation errors
 * - Account deletion API call
 * - Error handling
 * - Cancel functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DangerTab } from '@/components/settings/DangerTab';
import { FRONTEND_TEST_DATA } from '@tests/jest-test-credentials';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock api
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import api from '@/lib/api';
import toast from 'react-hot-toast';

describe('DangerTab', () => {
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render danger zone warning', () => {
      render(<DangerTab />);

      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(
        screen.getByText(/Actions in this section are permanent/),
      ).toBeInTheDocument();
    });

    it('should render delete account section', () => {
      render(<DangerTab />);

      expect(screen.getByText('Delete Account')).toBeInTheDocument();
      expect(
        screen.getByText(/Permanently delete your account and all associated data/),
      ).toBeInTheDocument();
    });

    it('should render delete my account button initially', () => {
      render(<DangerTab />);

      expect(
        screen.getByRole('button', { name: /Delete My Account/i }),
      ).toBeInTheDocument();
    });

    it('should render additional information section', () => {
      render(<DangerTab />);

      expect(screen.getByText('Important Information')).toBeInTheDocument();
      expect(
        screen.getByText(/Account deletion is permanent and cannot be undone/),
      ).toBeInTheDocument();
    });

    it('should not show confirmation form initially', () => {
      render(<DangerTab />);

      expect(screen.queryByText(/Are you absolutely sure?/)).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Type.*DELETE.*to confirm/),
      ).not.toBeInTheDocument();
    });
  });

  describe('Confirmation Flow', () => {
    it('should show confirmation form when delete button is clicked', async () => {
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));

      expect(screen.getByText(/Are you absolutely sure?/)).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete:/)).toBeInTheDocument();
    });

    it('should show list of items to be deleted', async () => {
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));

      expect(
        screen.getByText(/Your profile and account information/),
      ).toBeInTheDocument();
      expect(screen.getByText(/All documents you have uploaded/)).toBeInTheDocument();
      expect(screen.getByText(/All cases you have created/)).toBeInTheDocument();
      expect(
        screen.getByText(/Your activity history and preferences/),
      ).toBeInTheDocument();
    });

    it('should show confirmation text input', async () => {
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));

      expect(screen.getByLabelText(/Type.*DELETE.*to confirm/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
    });

    it('should show password input', async () => {
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));

      expect(
        screen.getByLabelText(/Enter your password to confirm/),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Your password')).toBeInTheDocument();
    });

    it('should hide confirmation form when cancel is clicked', async () => {
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      expect(screen.getByText(/Are you absolutely sure?/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(screen.queryByText(/Are you absolutely sure?/)).not.toBeInTheDocument();
    });

    it('should clear inputs when cancel is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));

      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.VALID,
      );

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));

      expect(screen.getByPlaceholderText('DELETE')).toHaveValue('');
      expect(screen.getByPlaceholderText('Your password')).toHaveValue('');
    });
  });

  describe('Validation', () => {
    it('should show error when DELETE is not typed', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.VALID,
      );

      // Click the delete button in confirmation form
      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Please type DELETE to confirm')).toBeInTheDocument();
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');

      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });

  describe('Account Deletion', () => {
    it('should call API to delete account with password', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockApi.delete.mockResolvedValueOnce({ data: {} });

      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.VALID,
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/users/me', {
          data: { password: FRONTEND_TEST_DATA.PASSWORD.VALID },
        });
      });
    });

    it('should show success toast and redirect on successful deletion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockApi.delete.mockResolvedValueOnce({ data: {} });

      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.VALID,
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Account deletion requested. You will be logged out.',
        );
      });

      // Advance timer for redirect
      jest.advanceTimersByTime(2000);

      expect(mockPush).toHaveBeenCalledWith('/auth/logout');
    });

    it('should use custom onDeleteAccount handler if provided', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const customDeleteHandler = jest.fn().mockResolvedValueOnce(undefined);

      render(<DangerTab onDeleteAccount={customDeleteHandler} />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.VALID,
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(customDeleteHandler).toHaveBeenCalledWith(
          FRONTEND_TEST_DATA.PASSWORD.VALID,
        );
      });

      expect(mockApi.delete).not.toHaveBeenCalled();
    });

    it('should show error toast on deletion failure', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockApi.delete.mockRejectedValueOnce({
        response: { data: { detail: 'Invalid password' } },
      });

      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.WRONG,
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid password');
      });

      expect(screen.getByText('Invalid password')).toBeInTheDocument();
    });

    it('should show loading state during deletion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      // Create a long-delayed promise to show loading state
      const pendingPromise = new Promise(() => {});
      mockApi.delete.mockReturnValue(pendingPromise);

      render(<DangerTab />);

      fireEvent.click(screen.getByRole('button', { name: /Delete My Account/i }));
      await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
      await user.type(
        screen.getByPlaceholderText('Your password'),
        FRONTEND_TEST_DATA.PASSWORD.VALID,
      );

      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete My Account/i,
      });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Deleting Account...')).toBeInTheDocument();
      });
    });
  });
});
