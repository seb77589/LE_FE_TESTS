/**
 * Tests for LoginFormFields component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoginFormFields } from '@/components/auth/LoginFormFields';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock useForm to provide register function
const mockRegister = jest.fn((name: string) => ({
  onChange: jest.fn(),
  onBlur: jest.fn(),
  name,
  ref: jest.fn(),
}));

jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useForm: jest.fn(() => ({
    register: mockRegister,
    formState: { errors: {} },
  })),
}));

describe('LoginFormFields', () => {
  describe('Basic Rendering', () => {
    it('should render email input field', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={null}
        />,
      );
      // Label has "*" appended for required fields, use regex
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });

    it('should render password input field', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={null}
        />,
      );
      // Label has "*" appended for required fields, use regex
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={null}
        />,
      );
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render forgot password link by default', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={null}
        />,
      );
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
        'href',
        '/auth/forgot-password',
      );
    });
  });

  describe('Loading State', () => {
    it('should disable inputs when loading', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={true}
          remainingAttempts={null}
        />,
      );
      // Label has "*" appended for required fields, use regex
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    it('should show loading state on submit button', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={true}
          remainingAttempts={null}
        />,
      );
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('should display email error message', () => {
      const errors = {
        email: {
          message: 'Email is required',
        },
      };
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={errors}
          loading={false}
          remainingAttempts={null}
        />,
      );
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should display password error message', () => {
      const errors = {
        password: {
          message: 'Password is required',
        },
      };
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={errors}
          loading={false}
          remainingAttempts={null}
        />,
      );
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('should apply error styling to email input', () => {
      const errors = {
        email: {
          message: 'Invalid email',
        },
      };
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={errors}
          loading={false}
          remainingAttempts={null}
        />,
      );
      // Label has "*" appended for required fields, use regex
      const emailInput = screen.getByLabelText(/Email Address/i);
      // Component uses design token 'border-destructive' instead of 'border-red-500'
      expect(emailInput).toHaveClass('border-destructive');
    });

    it('should apply error styling to password input', () => {
      const errors = {
        password: {
          message: 'Invalid password',
        },
      };
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={errors}
          loading={false}
          remainingAttempts={null}
        />,
      );
      // Use placeholder to avoid matching error message text
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      // Component uses design token 'border-destructive' instead of 'border-red-500'
      expect(passwordInput).toHaveClass('border-destructive');
    });
  });

  describe('Remaining Attempts Warning', () => {
    it('should show warning when remaining attempts is less than 3', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={2}
        />,
      );
      expect(screen.getByText(/2 login attempts remaining/i)).toBeInTheDocument();
    });

    it('should show singular form for 1 remaining attempt', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={1}
        />,
      );
      expect(screen.getByText(/1 login attempt remaining/i)).toBeInTheDocument();
    });

    it('should not show warning when remaining attempts is null', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={null}
        />,
      );
      expect(screen.queryByText(/attempts remaining/i)).not.toBeInTheDocument();
    });

    it('should not show warning when remaining attempts is 3 or more', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={3}
        />,
      );
      expect(screen.queryByText(/attempts remaining/i)).not.toBeInTheDocument();
    });
  });

  describe('Forgot Password Link', () => {
    it('should hide forgot password link when showForgotPasswordLink is false', () => {
      render(
        <LoginFormFields
          register={mockRegister as any}
          errors={{}}
          loading={false}
          remainingAttempts={null}
          showForgotPasswordLink={false}
        />,
      );
      expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument();
    });
  });
});
