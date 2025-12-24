/**
 * Tests for AccountUnlockManager component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AccountUnlockManager from '@/components/admin/AccountUnlockManager';

// Mock useAuth hook - must use require() inside the mock factory for hoisting
jest.mock('@/lib/context/ConsolidatedAuthContext', () => {
  const { FRONTEND_TEST_CREDENTIALS: creds } = require('@tests/jest-test-credentials');
  return {
    useAuth: jest.fn(() => ({
      user: { id: 1, email: creds.ADMIN.email, role: 'superadmin' },
      isAuthenticated: true,
    })),
  };
});

// Mock useAccountUnlock hook - must use require() inside the mock factory for hoisting
jest.mock('@/hooks/admin/useAccountUnlock', () => {
  const { FRONTEND_TEST_CREDENTIALS: creds } = require('@tests/jest-test-credentials');
  return {
    useAccountUnlock: jest.fn(() => ({
      lockedAccounts: [
        {
          id: 1,
          email: creds.USER1.email,
          full_name: 'User One',
          role: 'user',
          failed_login_attempts: 5,
          locked_until: '2025-01-01T12:00:00Z',
          lockout_reason: 'Too many failed attempts',
        },
      ],
      loading: false,
      error: null,
      success: null,
      unlocking: false,
      unlockDialogOpen: false,
      selectedAccount: null,
      unlockReason: '',
      setUnlockDialogOpen: jest.fn(),
      setUnlockReason: jest.fn(),
      setError: jest.fn(),
      setSuccess: jest.fn(),
      handleUnlockAccount: jest.fn(),
      confirmUnlock: jest.fn(),
      fetchLockedAccounts: jest.fn(),
    })),
  };
});

// Mock child components
jest.mock('@/components/admin/unlock/LockedAccountsTable', () => ({
  LockedAccountsTable: ({ accounts }: any) => (
    <div data-testid="locked-accounts-table">{accounts.length} accounts</div>
  ),
}));

jest.mock('@/components/admin/unlock/UnlockAccountDialog', () => ({
  UnlockAccountDialog: () => <div data-testid="unlock-dialog">Dialog</div>,
}));

jest.mock('@/components/admin/unlock/AccountsLoading', () => ({
  AccountsLoading: () => <div data-testid="accounts-loading">Loading</div>,
}));

jest.mock('@/components/admin/unlock/AccountsEmpty', () => ({
  AccountsEmpty: () => <div data-testid="accounts-empty">Empty</div>,
}));

jest.mock('@/components/admin/unlock/AccessDenied', () => ({
  AccessDenied: () => <div data-testid="access-denied">Access Denied</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }: any) => <div data-variant={variant}>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon">Refresh</div>,
  AlertTriangle: () => <div data-testid="alert-icon">Alert</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
}));

describe('AccountUnlockManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Access Control', () => {
    it('should show access denied for non-superadmin users', () => {
      const { useAuth } = require('@/lib/context/ConsolidatedAuthContext');
      useAuth.mockReturnValueOnce({
        user: { ...mockUser, role: 'user' },
        isAuthenticated: true,
      });

      render(<AccountUnlockManager />);
      expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    });

    it('should render manager for superadmin users', () => {
      render(<AccountUnlockManager />);
      expect(screen.getByText('Account Unlock Manager')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('should render account unlock manager', () => {
      render(<AccountUnlockManager />);
      expect(screen.getByText('Account Unlock Manager')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<AccountUnlockManager />);
      expect(screen.getByText(/Manage and unlock user accounts/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading', () => {
      const { useAccountUnlock } = require('@/hooks/admin/useAccountUnlock');
      useAccountUnlock.mockReturnValueOnce({
        ...mockUseAccountUnlock,
        loading: true,
      });

      render(<AccountUnlockManager />);
      expect(screen.getByTestId('accounts-loading')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no locked accounts', () => {
      const { useAccountUnlock } = require('@/hooks/admin/useAccountUnlock');
      useAccountUnlock.mockReturnValueOnce({
        ...mockUseAccountUnlock,
        lockedAccounts: [],
      });

      render(<AccountUnlockManager />);
      expect(screen.getByTestId('accounts-empty')).toBeInTheDocument();
    });
  });

  describe('Accounts Table', () => {
    it('should render locked accounts table when accounts exist', () => {
      render(<AccountUnlockManager />);
      expect(screen.getByTestId('locked-accounts-table')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      const { useAccountUnlock } = require('@/hooks/admin/useAccountUnlock');
      useAccountUnlock.mockReturnValueOnce({
        ...mockUseAccountUnlock,
        error: 'Failed to load accounts',
      });

      render(<AccountUnlockManager />);
      expect(screen.getByText('Failed to load accounts')).toBeInTheDocument();
    });
  });

  describe('Success Display', () => {
    it('should display success message when success exists', () => {
      const { useAccountUnlock } = require('@/hooks/admin/useAccountUnlock');
      useAccountUnlock.mockReturnValueOnce({
        ...mockUseAccountUnlock,
        success: 'Account unlocked successfully',
      });

      render(<AccountUnlockManager />);
      expect(screen.getByText('Account unlocked successfully')).toBeInTheDocument();
    });
  });
});
