/**
 * Tests for UserImport component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserImport } from '@/components/admin/UserImport';

describe('UserImport', () => {
  const mockOnImport = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render user import component', () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      expect(screen.getByText(/import users/i)).toBeInTheDocument();
    });

    it('should render file input', () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      const fileInput = screen.getByLabelText(/import users from json file/i);
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'application/json');
    });

    it('should render help text', () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      expect(
        screen.getByText(/upload a json file with user data to import/i),
      ).toBeInTheDocument();
    });
  });

  describe('Import Functionality', () => {
    it('should call onImport when file is selected', async () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      const fileInput = screen.getByLabelText(/import users from json file/i);
      const file = new File(['{"users": []}'], 'users.json', {
        type: 'application/json',
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable file input when importing', () => {
      render(
        <UserImport importing={true} importResult={null} onImport={mockOnImport} />,
      );
      const fileInput = screen.getByLabelText(/import users from json file/i);
      expect(fileInput).toBeDisabled();
    });

    it('should not disable file input when not importing', () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      const fileInput = screen.getByLabelText(/import users from json file/i);
      expect(fileInput).not.toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show importing text when importing', () => {
      render(
        <UserImport importing={true} importResult={null} onImport={mockOnImport} />,
      );
      expect(screen.getByText(/importing/i)).toBeInTheDocument();
    });

    it('should not show importing text when not importing', () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      expect(screen.queryByText(/importing/i)).not.toBeInTheDocument();
    });
  });

  describe('Import Result Display', () => {
    it('should display success message when import succeeds', () => {
      const successResult = 'Successfully imported 10 users';
      render(
        <UserImport
          importing={false}
          importResult={successResult}
          onImport={mockOnImport}
        />,
      );
      expect(screen.getByText(successResult)).toBeInTheDocument();
      // Component uses design tokens bg-green-100 and text-green-800
      expect(screen.getByText(successResult)).toHaveClass('bg-green-100');
      expect(screen.getByText(successResult)).toHaveClass('text-green-800');
    });

    it('should display error message when import fails', () => {
      const errorResult = 'Failed to import users: Invalid file format';
      render(
        <UserImport
          importing={false}
          importResult={errorResult}
          onImport={mockOnImport}
        />,
      );
      expect(screen.getByText(errorResult)).toBeInTheDocument();
      // Component uses design tokens bg-destructive/10 and text-destructive for errors
      expect(screen.getByText(errorResult)).toHaveClass('text-destructive');
    });

    it('should not display result when importResult is null', () => {
      render(
        <UserImport importing={false} importResult={null} onImport={mockOnImport} />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should have alert role for result message', () => {
      const result = 'Import completed';
      render(
        <UserImport importing={false} importResult={result} onImport={mockOnImport} />,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
