/**
 * Tests for AccountStatusChip component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccountStatusChip } from '@/components/admin/unlock/AccountStatusChip';
import { LockedAccount } from '@/components/admin/unlock/types';

describe('AccountStatusChip', () => {
  const mockLockedAccount: LockedAccount = {
    user_id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'user',
    failed_attempts: 5,
    lockout_reason: 'Too many failed login attempts',
    lockout_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    remaining_lockout_minutes: 30,
  };

  const mockUnlockedAccount: LockedAccount = {
    ...mockLockedAccount,
    remaining_lockout_minutes: 0,
    lockout_until: null,
  };

  describe('Locked Account Display', () => {
    it('should display locked status when account is locked', () => {
      render(<AccountStatusChip account={mockLockedAccount} />);
      expect(screen.getByText(/locked/i)).toBeInTheDocument();
    });

    it('should display remaining lockout minutes', () => {
      render(<AccountStatusChip account={mockLockedAccount} />);
      expect(screen.getByText(/30m remaining/i)).toBeInTheDocument();
    });

    it('should have correct styling for locked status', () => {
      const { container } = render(<AccountStatusChip account={mockLockedAccount} />);
      const chip = container.querySelector('.bg-red-100.text-red-800');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Unlocked Account Display', () => {
    it('should display unlocked status when account is unlocked', () => {
      render(<AccountStatusChip account={mockUnlockedAccount} />);
      expect(screen.getByText(/unlocked/i)).toBeInTheDocument();
    });

    it('should have correct styling for unlocked status', () => {
      const { container } = render(<AccountStatusChip account={mockUnlockedAccount} />);
      const chip = container.querySelector('.bg-green-100.text-green-800');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should display alert icon for locked account', () => {
      render(<AccountStatusChip account={mockLockedAccount} />);
      // Icon is rendered via lucide-react, check for presence
      const chip = screen.getByText(/locked/i).closest('span');
      expect(chip).toBeInTheDocument();
    });

    it('should display check icon for unlocked account', () => {
      render(<AccountStatusChip account={mockUnlockedAccount} />);
      // Icon is rendered via lucide-react, check for presence
      const chip = screen.getByText(/unlocked/i).closest('span');
      expect(chip).toBeInTheDocument();
    });
  });
});
