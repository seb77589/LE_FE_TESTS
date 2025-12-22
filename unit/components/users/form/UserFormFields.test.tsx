/**
 * Tests for UserFormFields component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserFormFields } from '@/components/users/form/UserFormFields';
import { User } from '@/types/user';

describe('UserFormFields', () => {
  const mockFormData: User = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    username: 'testuser',
    role: 'USER',
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
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
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
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

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

      expect(screen.getByLabelText(/password \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
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
      expect(roleSelect).toHaveValue('USER');

      const options = Array.from(roleSelect.querySelectorAll('option'));
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('User');
      expect(options[1]).toHaveTextContent('Admin');
      expect(options[2]).toHaveTextContent('SuperAdmin');
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

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeRequired();
    });
  });
});
