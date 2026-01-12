/**
 * Tests for UserFormFields component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserFormFields } from '@/components/users/form/UserFormFields';
import { User } from '@/types/user';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

describe('UserFormFields', () => {
  const mockFormData: User = {
    id: 1,
    email: FRONTEND_TEST_CREDENTIALS.USER.email,
    full_name: 'Test User',
    username: 'testuser',
    role: 'ASSISTANT', // Changed from 'USER' - new role naming
    is_active: true,
    is_verified: true,
  };

  const mockOnChange = jest.fn();
  const mockOnConfirmPasswordChange = jest.fn();
  const mockOnActiveChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all form fields', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it('should display form data values', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue(FRONTEND_TEST_CREDENTIALS.USER.email),
      ).toBeInTheDocument();
    });
  });

  describe('Field Interactions', () => {
    it('should call onChange when full name is changed', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      const fullNameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(fullNameInput, { target: { value: 'New Name' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange when email is changed', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, {
        target: { value: FRONTEND_TEST_CREDENTIALS.NEW.email },
      });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange when role is changed', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      const roleSelect = screen.getByLabelText(/role/i);
      fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Password Fields', () => {
    it('should render password field when not editing', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      // Password inputs use type="password" - find them by their id
      expect(document.getElementById('field-password')).toBeInTheDocument();
      expect(document.getElementById('field-confirm-password')).toBeInTheDocument();
    });

    it('should call onConfirmPasswordChange when confirm password changes', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      expect(mockOnConfirmPasswordChange).toHaveBeenCalledWith('password123');
    });
  });

  describe('Editing Mode', () => {
    it('should show active checkbox when editing', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={true}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it('should not show active checkbox when not editing', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      expect(screen.queryByLabelText(/active/i)).not.toBeInTheDocument();
    });

    it('should call onActiveChange when active checkbox is toggled', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={true}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      const activeCheckbox = screen.getByLabelText(/active/i);
      fireEvent.click(activeCheckbox);

      expect(mockOnActiveChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Role Options', () => {
    it('should have all role options available', () => {
      // Role options are ASSISTANT, MANAGER, and SUPERADMIN (if isSuperAdmin=true)
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
          isSuperAdmin={true} // Needed to see all 3 options
        />,
      );

      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect).toHaveValue('ASSISTANT');

      // Note: FormSelect includes a "Select..." placeholder option
      const options = Array.from(roleSelect.querySelectorAll('option'));
      expect(options).toHaveLength(4); // Placeholder + 3 roles
      expect(options[0]).toHaveTextContent('Select...');
      expect(options[1]).toHaveTextContent('User (Assistant)');
      expect(options[2]).toHaveTextContent('Admin (Manager)');
      expect(options[3]).toHaveTextContent('Super Admin');
    });
  });

  describe('Required Fields', () => {
    it('should mark email as required', () => {
      render(
        <UserFormFields
          formData={mockFormData}
          confirmPassword=""
          isEditing={false}
          onChange={mockOnChange}
          onConfirmPasswordChange={mockOnConfirmPasswordChange}
          onActiveChange={mockOnActiveChange}
        />,
      );

      // FormField shows visual required indicator (asterisk) but doesn't set HTML required attribute
      // Check that the email input field exists and has proper visual indicator
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();

      // The label should contain the asterisk visual indicator
      const emailLabel = screen.getByText(/email address/i);
      expect(emailLabel.parentElement).toHaveTextContent('*');
    });
  });
});
