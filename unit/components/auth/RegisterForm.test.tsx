/**
 * Tests for RegisterForm component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '@/components/auth/RegisterForm';

// ==============================================================================
// Module-level mock component factories (extracted to reduce nesting - fixes S2004)
// ==============================================================================

// Mock PasswordField render function
function renderMockPasswordField(props: {
  register: (name: string) => Record<string, unknown>;
  errors: Record<string, { message?: string }>;
  onGeneratePassword: () => void;
}): React.ReactElement {
  const { register, errors, onGeneratePassword } = props;
  return (
    <div data-testid="password-field">
      <input
        {...register('password')}
        type="password"
        placeholder="Password"
        data-testid="password-input"
      />
      {errors.password && <span>{errors.password.message}</span>}
      <button
        type="button"
        onClick={onGeneratePassword}
        data-testid="generate-password"
      >
        Generate
      </button>
    </div>
  );
}

// Mock RegisterErrorDisplay render function
function renderMockRegisterErrorDisplay(props: {
  error: string | null;
  onDismiss?: () => void;
}): React.ReactElement | null {
  const { error, onDismiss } = props;
  if (!error) return null;
  return (
    <div data-testid="register-error">
      <p>{error}</p>
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  );
}

// Mock Input render function (for forwardRef)
function renderMockInput(
  props: { label: string; error?: string; id?: string; name?: string },
  ref: React.Ref<HTMLInputElement>,
): React.ReactElement {
  const { label, error, ...restProps } = props;
  const inputId = restProps.id || restProps.name;
  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} ref={ref} {...restProps} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// Mock Button render function
function renderMockButton(props: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}): React.ReactElement {
  const { children, loading, disabled, onClick, ...restProps } = props;
  return (
    <button {...restProps} disabled={disabled || loading} onClick={onClick}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

// Mock Link render function
function renderMockLink(props: {
  children: React.ReactNode;
  href: string;
}): React.ReactElement {
  return <a href={props.href}>{props.children}</a>;
}

// ==============================================================================
// Jest mocks using module-level factories
// ==============================================================================

jest.mock('@/hooks/auth/useRegisterForm', () => ({
  useRegisterForm: jest.fn(),
}));

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
    isValid: true,
    strength: 'strong',
    strengthScore: 85,
    suggestions: [],
  })),
}));

jest.mock('@/components/auth/PasswordField', () => ({
  PasswordField: (props: any) => renderMockPasswordField(props),
}));

jest.mock('@/components/auth/RegisterErrorDisplay', () => ({
  RegisterErrorDisplay: (props: any) => renderMockRegisterErrorDisplay(props),
}));

jest.mock('@/components/ui/Input', () => {
  const MockInput = React.forwardRef((props: any, ref: any) => renderMockInput(props, ref));
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: (props: any) => renderMockButton(props),
}));

jest.mock('next/link', () => (props: any) => renderMockLink(props));

import { useRegisterForm } from '@/hooks/auth/useRegisterForm';

const mockUseRegisterForm = useRegisterForm as jest.MockedFunction<
  typeof useRegisterForm
>;

describe('RegisterForm', () => {
  const mockRegister = jest.fn(() => ({
    onChange: jest.fn(),
    onBlur: jest.fn(),
    name: 'field',
    ref: jest.fn(),
  }));

  const mockWatch = jest.fn(() => '');
  const mockSetValue = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockHandleGeneratePassword = jest.fn();
  const mockClearError = jest.fn();

  const defaultMockReturn = {
    register: mockRegister,
    errors: {},
    watch: mockWatch,
    setValue: mockSetValue,
    isLoading: false,
    error: null,
    rateLimitResetAt: null,
    isHydrated: true,
    onSubmit: mockOnSubmit,
    handleGeneratePassword: mockHandleGeneratePassword,
    clearError: mockClearError,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRegisterForm.mockReturnValue(defaultMockReturn);
  });

  describe('Basic Rendering', () => {
    it('should render register form', () => {
      render(<RegisterForm />);
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
    });

    it('should render form title', () => {
      render(<RegisterForm />);
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });

    it('should render login link', () => {
      render(<RegisterForm />);
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in here/i })).toHaveAttribute(
        'href',
        '/auth/login',
      );
    });

    it('should render full name input', () => {
      render(<RegisterForm />);
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<RegisterForm />);
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    });

    it('should render password field component', () => {
      render(<RegisterForm />);
      expect(screen.getByTestId('password-field')).toBeInTheDocument();
    });

    it('should render confirm password input', () => {
      render(<RegisterForm />);
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<RegisterForm />);
      expect(
        screen.getByRole('button', { name: /create account/i }),
      ).toBeInTheDocument();
    });

    it('should render terms and privacy links', () => {
      render(<RegisterForm />);
      expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute(
        'href',
        '/terms',
      );
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
        'href',
        '/privacy',
      );
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when form is submitted', async () => {
      render(<RegisterForm />);
      const form = screen.getByTestId('register-form');
      fireEvent.submit(form);
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable submit button when loading', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });
      render(<RegisterForm />);
      const submitButtons = screen.getAllByRole('button');
      const submitButton = submitButtons.find((btn) => btn.type === 'submit');
      expect(submitButton).toBeDefined();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state on submit button when loading', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });
      render(<RegisterForm />);
      // Button shows spinner and "Create account" text when loading
      const submitButtons = screen.getAllByRole('button');
      const submitButton = submitButtons.find((btn) => btn.type === 'submit');
      expect(submitButton).toBeDefined();
      expect(submitButton).toBeDisabled();
      // Button component shows spinner when loading (handled internally)
      // The button text remains "Create account" with spinner overlay
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        error: 'Registration failed',
      });
      render(<RegisterForm />);
      expect(screen.getByTestId('register-error')).toBeInTheDocument();
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });

    it('should call clearError when error is dismissed', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        error: 'Registration failed',
      });
      render(<RegisterForm />);
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);
      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('should display field errors', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        errors: {
          full_name: { message: 'Full name is required' },
          email: { message: 'Email is invalid' },
        },
      });
      render(<RegisterForm />);
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
    });
  });

  describe('Password Field Integration', () => {
    it('should pass register function to PasswordField', () => {
      render(<RegisterForm />);
      expect(mockRegister).toHaveBeenCalled();
    });

    it('should call handleGeneratePassword when generate button is clicked', () => {
      render(<RegisterForm />);
      const generateButton = screen.getByTestId('generate-password');
      fireEvent.click(generateButton);
      expect(mockHandleGeneratePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hydration State', () => {
    it('should set data-hydrated attribute when hydrated', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        isHydrated: true,
      });
      render(<RegisterForm />);
      const form = screen.getByTestId('register-form');
      expect(form).toHaveAttribute('data-hydrated', 'true');
    });

    it('should not set data-hydrated attribute when not hydrated', () => {
      mockUseRegisterForm.mockReturnValue({
        ...defaultMockReturn,
        isHydrated: false,
      });
      render(<RegisterForm />);
      const form = screen.getByTestId('register-form');
      expect(form).not.toHaveAttribute('data-hydrated');
    });
  });
});
