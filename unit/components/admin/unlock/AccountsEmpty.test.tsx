/**
 * Tests for AccountsEmpty component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccountsEmpty } from '@/components/admin/unlock/AccountsEmpty';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
}));

describe('AccountsEmpty', () => {
  it('should render empty state message', () => {
    render(<AccountsEmpty />);
    expect(screen.getByText(/no locked accounts found/i)).toBeInTheDocument();
  });

  it('should display helpful message', () => {
    render(<AccountsEmpty />);
    expect(
      screen.getByText(/all user accounts are currently unlocked/i),
    ).toBeInTheDocument();
  });
});
