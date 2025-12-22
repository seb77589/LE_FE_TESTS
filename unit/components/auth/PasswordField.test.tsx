/**
 * Tests for PasswordField component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordField } from '@/components/auth/PasswordField';

// Mock password policy hooks
jest.mock('@/hooks/usePasswordPolicy', () => ({
  usePasswordPolicy: jest.fn(() => ({
    policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special: true,
    },
    isLoading: false,
  })),
  usePasswordValidation: jest.fn(() => ({
    result: {
      isValid: true,
      errors: [],
    },
    strength: 'strong',
    strengthScore: 85,
    suggestions: [],
  })),
}));

// Mock Input component
jest.mock('@/components/ui/Input', () => {
  const MockInput = React.forwardRef(({ label, error, ...props }: any, ref: any) => (
    <div>
      <label htmlFor={props.id || props.name}>{label}</label>
      <input id={props.id || props.name} ref={ref} {...props} />
      {error && <span className="error">{error}</span>}
    </div>
  ));
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});

// Simplified test wrapper
const mockRegister = jest.fn(() => ({
  onChange: jest.fn(),
  onBlur: jest.fn(),
  name: 'password',
  ref: jest.fn(),
}));

const mockWatch = jest.fn(() => '');
const mockSetValue = jest.fn();

describe('PasswordField', () => {
  describe('Basic Rendering', () => {
    it('should render password input field', () => {
      render(
        <PasswordField
          register={mockRegister as any}
          watch={mockWatch as any}
          setValue={mockSetValue as any}
          errors={{}}
          onGeneratePassword={jest.fn()}
        />,
      );
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should render generate password button', () => {
      render(
        <PasswordField
          register={mockRegister as any}
          watch={mockWatch as any}
          setValue={mockSetValue as any}
          errors={{}}
          onGeneratePassword={jest.fn()}
        />,
      );
      expect(screen.getByText(/generate/i)).toBeInTheDocument();
    });
  });

  describe('Password Strength Indicator', () => {
    it('should display password strength indicator when password is entered', () => {
      const watchWithPassword = jest.fn(() => 'Test123!');
      render(
        <PasswordField
          register={mockRegister as any}
          watch={watchWithPassword as any}
          setValue={mockSetValue as any}
          errors={{}}
          onGeneratePassword={jest.fn()}
        />,
      );
      // Component should render with password value
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      // Strength indicator should appear when password exists
      expect(screen.getByText(/strong|weak|medium/i)).toBeInTheDocument();
    });
  });

  describe('Password Requirements', () => {
    it('should display password requirements when password is entered', () => {
      const watchWithPassword = jest.fn(() => 'Test123!');
      render(
        <PasswordField
          register={mockRegister as any}
          watch={watchWithPassword as any}
          setValue={mockSetValue as any}
          errors={{}}
          onGeneratePassword={jest.fn()}
        />,
      );
      // Password requirements should be visible when password exists
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display password error message', () => {
      const errors = {
        password: {
          message: 'Password is required',
        },
      };
      render(
        <PasswordField
          register={mockRegister as any}
          watch={mockWatch as any}
          setValue={mockSetValue as any}
          errors={errors}
          onGeneratePassword={jest.fn()}
        />,
      );
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  describe('Generate Password', () => {
    it('should call onGeneratePassword when generate button is clicked', () => {
      const onGeneratePassword = jest.fn();
      render(
        <PasswordField
          register={mockRegister as any}
          watch={mockWatch as any}
          setValue={mockSetValue as any}
          errors={{}}
          onGeneratePassword={onGeneratePassword}
        />,
      );
      const generateButton = screen.getByText(/generate/i);
      fireEvent.click(generateButton);
      expect(onGeneratePassword).toHaveBeenCalledTimes(1);
    });
  });
});
