/**
 * Tests for UnlockAccountDialog component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnlockAccountDialog } from '@/components/admin/unlock/UnlockAccountDialog';
import { LockedAccount } from '@/components/admin/unlock/types';

// Mock Modal component
jest.mock('@/components/ui/Modal', () => {
  return function MockModal({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2 data-testid="modal-title">{title}</h2>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    );
  };
});

// Mock Button component
jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    onClick,
    disabled,
    loading,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: string;
  }) {
    return (
      <button onClick={onClick} disabled={disabled || loading} data-variant={variant}>
        {loading ? 'Loading...' : children}
      </button>
    );
  };
});

describe('UnlockAccountDialog', () => {
  const mockAccount: LockedAccount = {
    user_id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'user',
    failed_attempts: 5,
    lockout_reason: 'Too many failed login attempts',
    lockout_until: new Date().toISOString(),
    remaining_lockout_minutes: 30,
  };

  const mockOnClose = jest.fn();
  const mockOnReasonChange = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render dialog when isOpen is true', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should not render dialog when isOpen is false', () => {
      render(
        <UnlockAccountDialog
          isOpen={false}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should display correct title', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Unlock Account');
    });
  });

  describe('Account Information Display', () => {
    it('should display account name and email', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByText(/test user/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    it('should handle null account gracefully', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={null}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  describe('Reason Input', () => {
    it('should render reason textarea', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByLabelText(/reason for unlocking/i)).toBeInTheDocument();
    });

    it('should display current unlock reason', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason="Test reason"
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByDisplayValue('Test reason')).toBeInTheDocument();
    });

    it('should call onReasonChange when reason changes', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      const textarea = screen.getByLabelText(/reason for unlocking/i);
      fireEvent.change(textarea, { target: { value: 'New reason' } });
      expect(mockOnReasonChange).toHaveBeenCalledWith('New reason');
    });
  });

  describe('Action Buttons', () => {
    it('should render cancel and unlock buttons', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
      const unlockButton = buttons.find((btn) => btn.textContent === 'Unlock Account');
      expect(cancelButton).toBeInTheDocument();
      expect(unlockButton).toBeInTheDocument();
    });

    it('should call onClose when cancel is clicked', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn) => btn.textContent === 'Cancel');
      if (cancelButton) {
        fireEvent.click(cancelButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      } else {
        // Fallback: try finding by text
        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onConfirm when unlock is clicked', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={false}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      const buttons = screen.getAllByRole('button');
      const unlockButton = buttons.find((btn) => btn.textContent === 'Unlock Account');
      if (unlockButton) {
        fireEvent.click(unlockButton);
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      } else {
        // Fallback: try finding by text
        fireEvent.click(screen.getByText('Unlock Account'));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when unlocking', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={true}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      const cancelButton = screen.getByText('Cancel');
      const unlockButton = screen.getByText('Loading...');
      expect(cancelButton).toBeDisabled();
      expect(unlockButton).toBeDisabled();
    });

    it('should show loading text on unlock button when unlocking', () => {
      render(
        <UnlockAccountDialog
          isOpen={true}
          account={mockAccount}
          unlockReason=""
          unlocking={true}
          onClose={mockOnClose}
          onReasonChange={mockOnReasonChange}
          onConfirm={mockOnConfirm}
        />,
      );
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
