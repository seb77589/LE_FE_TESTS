/**
 * Tests for UserFormActions component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserFormActions } from '@/components/users/form/UserFormActions';

describe('UserFormActions', () => {
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render cancel and submit buttons', () => {
      render(
        <UserFormActions isEditing={false} loading={false} onCancel={mockOnCancel} />,
      );
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
    });

    it('should show "Create User" text when not editing', () => {
      render(
        <UserFormActions isEditing={false} loading={false} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    it('should show "Update User" text when editing', () => {
      render(
        <UserFormActions isEditing={true} loading={false} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Update User')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show "Saving..." when loading', () => {
      render(
        <UserFormActions isEditing={false} loading={true} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should disable submit button when loading', () => {
      render(
        <UserFormActions isEditing={false} loading={true} onCancel={mockOnCancel} />,
      );
      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();
    });

    it('should not disable submit button when not loading', () => {
      render(
        <UserFormActions isEditing={false} loading={false} onCancel={mockOnCancel} />,
      );
      const submitButton = screen.getByRole('button', { name: /create user/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Cancel Button', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <UserFormActions isEditing={false} loading={false} onCancel={mockOnCancel} />,
      );
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not be disabled when loading', () => {
      render(
        <UserFormActions isEditing={false} loading={true} onCancel={mockOnCancel} />,
      );
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Submit Button', () => {
    it('should have type="submit"', () => {
      render(
        <UserFormActions isEditing={false} loading={false} onCancel={mockOnCancel} />,
      );
      const submitButton = screen.getByRole('button', { name: /create user/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should show correct text based on editing state', () => {
      const { rerender } = render(
        <UserFormActions isEditing={false} loading={false} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Create User')).toBeInTheDocument();

      rerender(
        <UserFormActions isEditing={true} loading={false} onCancel={mockOnCancel} />,
      );
      expect(screen.getByText('Update User')).toBeInTheDocument();
    });
  });
});
