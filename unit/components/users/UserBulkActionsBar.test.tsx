/**
 * Tests for UserBulkActionsBar component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserBulkActionsBar from '@/components/users/UserBulkActionsBar';

describe('UserBulkActionsBar', () => {
  const mockOnActivate = jest.fn();
  const mockOnDeactivate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when selectedCount is 0', () => {
    const { container } = render(
      <UserBulkActionsBar
        selectedCount={0}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when selectedCount is greater than 0', () => {
    render(
      <UserBulkActionsBar
        selectedCount={3}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('3 users selected')).toBeInTheDocument();
  });

  it('should display singular form for single user', () => {
    render(
      <UserBulkActionsBar
        selectedCount={1}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('1 user selected')).toBeInTheDocument();
  });

  it('should call onActivate when activate button clicked', () => {
    render(
      <UserBulkActionsBar
        selectedCount={2}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
      />,
    );

    const activateButton = screen.getByText('Activate');
    fireEvent.click(activateButton);

    expect(mockOnActivate).toHaveBeenCalled();
  });

  it('should call onDeactivate when deactivate button clicked', () => {
    render(
      <UserBulkActionsBar
        selectedCount={2}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
      />,
    );

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    expect(mockOnDeactivate).toHaveBeenCalled();
  });

  it('should call onDelete when delete button clicked', () => {
    render(
      <UserBulkActionsBar
        selectedCount={2}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('should disable buttons when disabled prop is true', () => {
    render(
      <UserBulkActionsBar
        selectedCount={2}
        onActivate={mockOnActivate}
        onDeactivate={mockOnDeactivate}
        onDelete={mockOnDelete}
        disabled={true}
      />,
    );

    const activateButton = screen.getByText('Activate');
    const deactivateButton = screen.getByText('Deactivate');
    const deleteButton = screen.getByText('Delete');

    expect(activateButton).toBeDisabled();
    expect(deactivateButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });
});
