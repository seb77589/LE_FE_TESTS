import React from 'react';
import { render, screen } from '@testing-library/react';

// Example component for testing role-based UI
function RoleComponent({ role }: { readonly role: string }) {
  return (
    <div>
      {role === 'manager' && <span>Admin Panel</span>}
      {role === 'assistant' && <span>User Dashboard</span>}
      {role === 'superadmin' && <span>SuperAdmin Tools</span>}
    </div>
  );
}

describe('Role-based UI', () => {
  it('shows correct UI for manager', () => {
    render(<RoleComponent role="manager" />);
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
  });
  it('shows correct UI for assistant', () => {
    render(<RoleComponent role="assistant" />);
    expect(screen.getByText(/user dashboard/i)).toBeInTheDocument();
  });
  it('shows correct UI for superadmin', () => {
    render(<RoleComponent role="superadmin" />);
    expect(screen.getByText(/superadmin tools/i)).toBeInTheDocument();
  });
});
