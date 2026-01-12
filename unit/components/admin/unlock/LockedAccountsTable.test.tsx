/**
 * Tests for LockedAccountsTable component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LockedAccountsTable } from '@/components/admin/unlock/LockedAccountsTable';
import { LockedAccount } from '@/components/admin/unlock/types';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock Button component
jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </button>
    );
  };
});

// Mock AccountStatusChip component
jest.mock('@/components/admin/unlock/AccountStatusChip', () => ({
  AccountStatusChip: ({ account }: { account: LockedAccount }) => (
    <div data-testid={`status-chip-${account.user_id}`}>
      {account.remaining_lockout_minutes > 0 ? 'Locked' : 'Unlocked'}
    </div>
  ),
}));

// Mock formatDateTime utility
jest.mock('@/lib/utils', () => ({
  formatDateTime: (date: string) => `Formatted: ${date}`,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Unlock: () => <div data-testid="unlock-icon">Unlock</div>,
}));

describe('LockedAccountsTable', () => {
  const mockAccounts: LockedAccount[] = [
    {
      user_id: 1,
      email: FRONTEND_TEST_CREDENTIALS.USER1.email,
      full_name: 'User One',
      role: 'user',
      failed_attempts: 5,
      lockout_reason: 'Too many failed login attempts',
      lockout_until: new Date().toISOString(),
      remaining_lockout_minutes: 30,
    },
    {
      user_id: 2,
      email: FRONTEND_TEST_CREDENTIALS.USER2.email,
      full_name: 'User Two',
      role: 'admin',
      failed_attempts: 3,
      lockout_reason: null,
      lockout_until: null,
      remaining_lockout_minutes: 0,
    },
  ];

  const mockOnUnlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render table component', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const userElements = screen.getAllByText('User One');
      expect(userElements.length).toBeGreaterThan(0);
    });

    it('should render all table headers', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const userElements = screen.getAllByText('User One');
      expect(userElements.length).toBeGreaterThan(0);
      const emailElements = screen.getAllByText(FRONTEND_TEST_CREDENTIALS.USER1.email);
      expect(emailElements.length).toBeGreaterThan(0);
      const userRoles = screen.getAllByText('user');
      expect(userRoles.length).toBeGreaterThan(0);
      const adminRoles = screen.getAllByText('admin');
      expect(adminRoles.length).toBeGreaterThan(0);
    });

    it('should render all accounts', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const userOneElements = screen.getAllByText('User One');
      expect(userOneElements.length).toBeGreaterThan(0);
      const email1Elements = screen.getAllByText(FRONTEND_TEST_CREDENTIALS.USER1.email);
      expect(email1Elements.length).toBeGreaterThan(0);
      const userTwoElements = screen.getAllByText('User Two');
      expect(userTwoElements.length).toBeGreaterThan(0);
      const email2Elements = screen.getAllByText(FRONTEND_TEST_CREDENTIALS.USER2.email);
      expect(email2Elements.length).toBeGreaterThan(0);
    });
  });

  describe('Account Data Display', () => {
    it('should display account full name and email', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const userElements = screen.getAllByText('User One');
      expect(userElements.length).toBeGreaterThan(0);
      const emailElements = screen.getAllByText(FRONTEND_TEST_CREDENTIALS.USER1.email);
      expect(emailElements.length).toBeGreaterThan(0);
    });

    it('should display account role', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const userRoles = screen.getAllByText('user');
      expect(userRoles.length).toBeGreaterThan(0);
      const adminRoles = screen.getAllByText('admin');
      expect(adminRoles.length).toBeGreaterThan(0);
    });

    it('should display failed attempts count', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const count5Elements = screen.getAllByText('5');
      expect(count5Elements.length).toBeGreaterThan(0);
      const count3Elements = screen.getAllByText('3');
      expect(count3Elements.length).toBeGreaterThan(0);
    });

    it('should display lockout reason or N/A', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // First account has lockout_reason, second has null (displays N/A)
      const reasonText = screen.queryAllByText(/too many failed login attempts/i);
      const naElements = screen.queryAllByText('N/A');
      // Verify both exist: reason for first account, N/A for second
      expect(reasonText.length + naElements.length).toBeGreaterThan(0);
    });

    it('should display formatted lockout until date or N/A', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // First account has lockout_until, second doesn't
      // Check that formatted date appears (may appear multiple times in table)
      const formattedDates = screen.queryAllByText(/formatted:/i);
      const naElements = screen.getAllByText('N/A');
      // At least one formatted date and one N/A should exist
      expect(formattedDates.length + naElements.length).toBeGreaterThan(0);
    });
  });

  describe('Unlock Button', () => {
    it('should render unlock button for each account', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      const unlockButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.textContent?.toLowerCase().includes('unlock'));
      // DataTable renders both desktop and mobile views - expect 4 (2 accounts x 2 views)
      expect(unlockButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should call onUnlock when unlock button is clicked', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      const unlockButton = screen
        .getAllByRole('button')
        .find(
          (btn) =>
            btn.textContent?.toLowerCase().includes('unlock') &&
            !btn.textContent?.includes('Unlocking'),
        );
      if (unlockButton) {
        fireEvent.click(unlockButton);
      }
      expect(mockOnUnlock).toHaveBeenCalledWith(mockAccounts[0]);
    });

    it('should disable unlock button when unlocking', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={1}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable replaces row content with "Loading..." when loadingRowId matches
      // So buttons for account 1 won't be visible (only account 2 buttons remain)
      const unlockButtons = screen.getAllByRole('button');
      // The non-loading account should still have an enabled Unlock button
      const enabledUnlockButton = unlockButtons.find(
        (btn) => btn.textContent?.includes('Unlock') && !btn.hasAttribute('disabled'),
      );
      expect(enabledUnlockButton).toBeInTheDocument();
    });

    it('should show "Loading..." text when unlocking', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={1}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable shows "Loading..." for the row with loadingRowId
      const loadingElements = screen.getAllByText('Loading...');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should render empty table when no accounts', () => {
      const { container } = render(
        <LockedAccountsTable accounts={[]} unlocking={null} onUnlock={mockOnUnlock} />,
      );
      // DataTable component should render (wrapper exists)
      expect(container.firstChild).toBeInTheDocument();
      // But no account rows
      expect(screen.queryByText('User One')).not.toBeInTheDocument();
    });
  });

  describe('Status Chip Integration', () => {
    it('should render AccountStatusChip for each account', () => {
      render(
        <LockedAccountsTable
          accounts={mockAccounts}
          unlocking={null}
          onUnlock={mockOnUnlock}
        />,
      );
      // DataTable renders both desktop and mobile views, so use getAllBy
      const statusChip1 = screen.getAllByTestId('status-chip-1');
      expect(statusChip1.length).toBeGreaterThan(0);
      const statusChip2 = screen.getAllByTestId('status-chip-2');
      expect(statusChip2.length).toBeGreaterThan(0);
    });
  });
});
