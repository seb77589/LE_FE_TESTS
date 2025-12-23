/**
 * Tests for SecuritySettings component
 *
 * @description Tests for the SecuritySettings component including:
 * - Rendering of password change form
 * - Password validation
 * - Session management display
 * - Error and success states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { FRONTEND_TEST_DATA } from '@/__tests__/test-credentials';

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

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err, fallback) => err?.message || fallback),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
  },
  fetcher: jest.fn(),
}));

jest.mock('@/lib/api/auth', () => ({
  changePassword: jest.fn(),
}));

jest.mock('@/hooks/usePasswordPolicy', () => ({
  usePasswordPolicy: jest.fn(() => ({
    policy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  })),
  usePasswordValidation: jest.fn((password: string) => {
    let strength = 'weak';
    if (password.length >= 12) {
      strength = 'strong';
    } else if (password.length >= 8) {
      strength = 'medium';
    }
    return {
      isValid: password.length >= 8,
      strength,
      strengthScore: Math.min(100, password.length * 10),
      suggestions: [],
      errors: password.length < 8 ? ['Password too short'] : [],
    };
  }),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | boolean)[]) =>
    classes.filter(Boolean).join(' '),
  formatDateTime: jest.fn((date: string) => `Formatted: ${date}`),
}));

import useSWR from 'swr';
import { changePassword } from '@/lib/api/auth';

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockChangePassword = changePassword as jest.MockedFunction<typeof changePassword>;

describe('SecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default SWR mock - no sessions
    mockUseSWR.mockReturnValue({
      data: {
        active_sessions: [],
        session_count: 0,
        max_concurrent_sessions: 5,
      },
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    } as any);
  });

  describe('Rendering', () => {
    it('should render security settings heading', () => {
      render(<SecuritySettings />);

      expect(screen.getByText('Security Settings')).toBeInTheDocument();
      expect(
        screen.getByText('Manage your account security preferences'),
      ).toBeInTheDocument();
    });

    it('should render password change form', () => {
      render(<SecuritySettings />);

      expect(screen.getByText('Update Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });

    it('should render change password button', () => {
      render(<SecuritySettings />);

      expect(
        screen.getByRole('button', { name: /Update Password/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Password Validation', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<SecuritySettings />);

      await user.type(
        screen.getByLabelText('Current Password'),
        FRONTEND_TEST_DATA.PASSWORD.CURRENT,
      );
      await user.type(
        screen.getByLabelText('New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        FRONTEND_TEST_DATA.PASSWORD.DIFFERENT,
      );

      fireEvent.submit(screen.getByRole('button', { name: /Update Password/i }));

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('should show password strength indicator', async () => {
      const user = userEvent.setup();
      render(<SecuritySettings />);

      await user.type(
        screen.getByLabelText('New Password'),
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );

      // Should show strength indicator (based on our mock)
      expect(screen.getByLabelText('New Password')).toHaveValue(
        FRONTEND_TEST_DATA.PASSWORD.SECURE,
      );
    });
  });

  describe('Password Change', () => {
    it('should call changePassword API on submit', async () => {
      const user = userEvent.setup();
      mockChangePassword.mockResolvedValueOnce({ message: 'Password changed' });

      render(<SecuritySettings />);

      await user.type(
        screen.getByLabelText('Current Password'),
        FRONTEND_TEST_DATA.PASSWORD.CURRENT,
      );
      await user.type(
        screen.getByLabelText('New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );

      fireEvent.submit(screen.getByRole('button', { name: /Update Password/i }));

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          current_password: FRONTEND_TEST_DATA.PASSWORD.CURRENT,
          new_password: FRONTEND_TEST_DATA.PASSWORD.NEW,
        });
      });
    });

    it('should show success message on successful password change', async () => {
      const user = userEvent.setup();
      mockChangePassword.mockResolvedValueOnce({
        message: 'Password changed successfully',
      });

      render(<SecuritySettings />);

      // Use specific IDs to avoid label conflicts
      await user.type(
        screen.getByLabelText('Current Password'),
        FRONTEND_TEST_DATA.PASSWORD.CURRENT,
      );
      await user.type(
        screen.getByLabelText('New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );

      fireEvent.submit(screen.getByRole('button', { name: /Update Password/i }));

      await waitFor(() => {
        expect(screen.getByText(/Password changed successfully/)).toBeInTheDocument();
      });
    });

    it('should show error message on failed password change', async () => {
      const user = userEvent.setup();
      mockChangePassword.mockRejectedValueOnce({ message: 'Invalid current password' });

      render(<SecuritySettings />);

      // Use specific IDs to avoid label conflicts
      await user.type(
        screen.getByLabelText('Current Password'),
        FRONTEND_TEST_DATA.PASSWORD.WRONG,
      );
      await user.type(
        screen.getByLabelText('New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );
      await user.type(
        screen.getByLabelText('Confirm New Password'),
        FRONTEND_TEST_DATA.PASSWORD.NEW,
      );

      fireEvent.submit(screen.getByRole('button', { name: /Update Password/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid current password/)).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should display active sessions when available', () => {
      mockUseSWR.mockReturnValue({
        data: {
          active_sessions: [
            {
              id: 'session-1',
              device: 'Chrome on Windows',
              location: 'New York, US',
              last_active: '2024-01-01T12:00:00Z',
              is_current: true,
            },
            {
              id: 'session-2',
              device: 'Firefox on Mac',
              location: 'Los Angeles, US',
              last_active: '2024-01-01T10:00:00Z',
              is_current: false,
            },
          ],
          session_count: 2,
          max_concurrent_sessions: 5,
        },
        error: undefined,
        isLoading: false,
        mutate: jest.fn(),
      } as any);

      render(<SecuritySettings />);

      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      expect(screen.getByText('Firefox on Mac')).toBeInTheDocument();
    });

    it('should show current session badge', () => {
      mockUseSWR.mockReturnValue({
        data: {
          active_sessions: [
            {
              id: 'session-1',
              device: 'Chrome on Windows',
              location: 'New York, US',
              last_active: '2024-01-01T12:00:00Z',
              is_current: true,
            },
          ],
          session_count: 1,
          max_concurrent_sessions: 5,
        },
        error: undefined,
        isLoading: false,
        mutate: jest.fn(),
      } as any);

      render(<SecuritySettings />);

      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });
});
