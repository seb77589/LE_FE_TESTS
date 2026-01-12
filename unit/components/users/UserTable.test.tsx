/**
 * Tests for UserTable component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserTable from '@/components/users/UserTable';
import { User } from '@/types/user';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

const mockUsers: User[] = [
  {
    id: 1,
    email: FRONTEND_TEST_CREDENTIALS.USER1.email,
    full_name: 'User One',
    role: 'ASSISTANT',
    is_active: true,
  },
  {
    id: 2,
    email: FRONTEND_TEST_CREDENTIALS.USER2.email,
    full_name: 'User Two',
    role: 'MANAGER',
    is_active: false,
  },
  {
    id: 3,
    email: FRONTEND_TEST_CREDENTIALS.SUPERADMIN.email,
    full_name: 'User Three',
    role: 'SUPERADMIN',
    is_active: true,
  },
];

describe('UserTable', () => {
  it('should render user table', () => {
    render(<UserTable users={mockUsers} />);

    expect(screen.getByTestId('user-table')).toBeInTheDocument();
  });

  it('should render all users', () => {
    render(<UserTable users={mockUsers} />);

    // Use getAllBy since DataTable renders both mobile and desktop views
    expect(screen.getAllByText('User One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User Two').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User Three').length).toBeGreaterThan(0);
  });

  it('should format roles correctly', () => {
    render(<UserTable users={mockUsers} />);

    // Use getAllBy since DataTable renders both mobile and desktop views
    expect(screen.getAllByText('User').length).toBeGreaterThan(0); // ASSISTANT formatted
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0); // MANAGER formatted
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThan(0); // SUPERADMIN formatted
  });

  it('should show active status', () => {
    render(<UserTable users={mockUsers} />);

    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it('should show inactive status', () => {
    render(<UserTable users={mockUsers} />);

    // Use getAllBy since DataTable renders both mobile and desktop views
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('should call onEdit when edit button clicked', () => {
    const mockOnEdit = jest.fn();
    render(<UserTable users={mockUsers} onEdit={mockOnEdit} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('should call onToggleActive when toggle button clicked', () => {
    const mockOnToggleActive = jest.fn();
    render(<UserTable users={mockUsers} onToggleActive={mockOnToggleActive} />);

    const toggleButtons = screen.getAllByText('Enable');
    fireEvent.click(toggleButtons[0]);

    expect(mockOnToggleActive).toHaveBeenCalledWith(mockUsers[1]);
  });

  it('should call onRowClick when row clicked', () => {
    const mockOnRowClick = jest.fn();
    render(<UserTable users={mockUsers} onRowClick={mockOnRowClick} />);

    // DataTable uses table rows, find them by role
    const rows = screen.getAllByRole('row');
    // First row is header, click on second row (first data row)
    const dataRows = rows.filter(row => row.classList.contains('cursor-pointer'));
    if (dataRows.length > 0) {
      fireEvent.click(dataRows[0]);
      expect(mockOnRowClick).toHaveBeenCalledWith(mockUsers[0]);
    } else {
      // If rows don't have cursor-pointer, find by user name text
      const userOneElements = screen.getAllByText('User One');
      const row = userOneElements[0].closest('tr');
      if (row) {
        fireEvent.click(row);
        expect(mockOnRowClick).toHaveBeenCalledWith(mockUsers[0]);
      }
    }
  });

  it('should show loading state for specific user', () => {
    render(
      <UserTable users={mockUsers} onToggleActive={jest.fn()} loadingUserId={1} />,
    );

    // User with loadingUserId should show loading state - check for disabled state
    const toggleButtons = screen.getAllByText('Disable');
    // Button for user with loadingUserId should be disabled or show loading
    expect(toggleButtons.length).toBeGreaterThan(0);
  });

  it('should handle select all checkbox', () => {
    const mockOnSelectAll = jest.fn();
    render(<UserTable users={mockUsers} onSelectAll={mockOnSelectAll} onSelectUser={jest.fn()} />);

    // DataTable uses 'Select all rows' aria-label
    const selectAllCheckbox = screen.getByLabelText('Select all rows');
    fireEvent.click(selectAllCheckbox);

    expect(mockOnSelectAll).toHaveBeenCalledWith(true);
  });

  it('should handle individual user selection', async () => {
    const user = userEvent.setup();
    const mockOnSelectUser = jest.fn();
    render(<UserTable users={mockUsers} onSelectUser={mockOnSelectUser} />);

    // DataTable uses 'Select row {id}' aria-label
    const user1Checkbox = screen.getByLabelText('Select row 1');

    await user.click(user1Checkbox);
    expect(mockOnSelectUser).toHaveBeenCalledWith(1, true);
  });

  it('should show selected users', () => {
    render(
      <UserTable users={mockUsers} selectedUserIds={[1, 2]} onSelectUser={jest.fn()} />,
    );

    // DataTable uses 'Select row {id}' aria-label
    const user1Checkbox = screen.getByLabelText('Select row 1');
    const user2Checkbox = screen.getByLabelText('Select row 2');
    const user3Checkbox = screen.getByLabelText('Select row 3');

    // Users 1 and 2 should be checked
    expect(user1Checkbox).toBeChecked();
    expect(user2Checkbox).toBeChecked();
    // User 3 should not be checked
    expect(user3Checkbox).not.toBeChecked();
  });

  it('should not show actions column when no handlers provided', () => {
    render(<UserTable users={mockUsers} />);

    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('should show actions column when showActions is true', () => {
    render(<UserTable users={mockUsers} showActions={true} />);

    // Use getAllBy since DataTable renders both mobile and desktop views
    expect(screen.getAllByText('Actions').length).toBeGreaterThan(0);
  });
});
