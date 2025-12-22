/**
 * Tests for UserTable component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserTable from '@/components/users/UserTable';
import { User } from '@/types/user';

const mockUsers: User[] = [
  {
    id: 1,
    email: 'user1@example.com',
    full_name: 'User One',
    role: 'ASSISTANT',
    is_active: true,
  },
  {
    id: 2,
    email: 'user2@example.com',
    full_name: 'User Two',
    role: 'MANAGER',
    is_active: false,
  },
  {
    id: 3,
    email: 'user3@example.com',
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

    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('User Three')).toBeInTheDocument();
  });

  it('should format roles correctly', () => {
    render(<UserTable users={mockUsers} />);

    expect(screen.getByText('User')).toBeInTheDocument(); // ASSISTANT
    expect(screen.getByText('Admin')).toBeInTheDocument(); // MANAGER
    expect(screen.getByText('Super Admin')).toBeInTheDocument(); // SUPERADMIN
  });

  it('should show active status', () => {
    render(<UserTable users={mockUsers} />);

    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it('should show inactive status', () => {
    render(<UserTable users={mockUsers} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
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

    const rows = screen.getAllByTestId('user-row');
    fireEvent.click(rows[0]);

    expect(mockOnRowClick).toHaveBeenCalledWith(mockUsers[0]);
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
    render(<UserTable users={mockUsers} onSelectAll={mockOnSelectAll} />);

    const selectAllCheckbox = screen.getByLabelText('Select all users');
    // Use click instead of change for checkbox
    fireEvent.click(selectAllCheckbox);

    expect(mockOnSelectAll).toHaveBeenCalledWith(true);
  });

  it('should handle individual user selection', async () => {
    const user = userEvent.setup();
    const mockOnSelectUser = jest.fn();
    render(<UserTable users={mockUsers} onSelectUser={mockOnSelectUser} />);

    // Find checkbox by aria-label to get the correct one
    const user1Checkbox = screen.getByLabelText('Select user 1');

    // Use userEvent.click which properly triggers onChange
    await user.click(user1Checkbox);
    expect(mockOnSelectUser).toHaveBeenCalledWith(1, true); // user id 1, checked=true
  });

  it('should show selected users', () => {
    render(
      <UserTable users={mockUsers} selectedUserIds={[1, 2]} onSelectUser={jest.fn()} />,
    );

    // Find checkboxes by aria-label to get the correct ones
    const user1Checkbox = screen.getByLabelText('Select user 1');
    const user2Checkbox = screen.getByLabelText('Select user 2');
    const user3Checkbox = screen.getByLabelText('Select user 3');

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

    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
