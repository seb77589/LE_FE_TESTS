/**
 * Tests for AccessDenied component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccessDenied } from '@/components/admin/unlock/AccessDenied';

// Mock Alert component
jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
    <div data-variant={variant} role="alert">
      {children}
    </div>
  ),
}));

describe('AccessDenied', () => {
  it('should render access denied message', () => {
    render(<AccessDenied />);
    expect(screen.getByText(/you do not have permission/i)).toBeInTheDocument();
  });

  it('should display appropriate message for non-admin users', () => {
    render(<AccessDenied />);
    expect(screen.getByText(/you do not have permission/i)).toBeInTheDocument();
  });
});
