/**
 * Unit Test for RegisterForm Component
 *
 * Coverage Target: 95%+
 * Estimated Tests: 18 tests
 * Priority: CRITICAL (registration flow critical)
 *
 * Test Categories:
 * - Basic rendering (5 tests)
 * - Form validation (5 tests)
 * - Password requirements (3 tests)
 * - Registration submission (3 tests)
 * - Error handling (2 tests)
 */

// Mock dependencies BEFORE imports using factory functions
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    register: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/network/rateLimiter', () => ({
  isRateLimited: jest.fn(() => false),
  recordAttempt: jest.fn(),
  getRateLimitStatus: jest.fn(() => ({
    allowed: true,
    remaining: 3,
    resetTime: Date.now() + 3600000,
  })),
}));

jest.mock('@/hooks/usePasswordPolicy', () => ({
  usePasswordPolicy: jest.fn(() => ({
    policy: {
      min_length: 8,
      max_length: 128,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special_chars: true,
      special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      prevent_common_passwords: true,
      prevent_user_info: true,
    },
    isLoading: false,
  })),
  usePasswordValidation: jest.fn(() => ({
    result: {
      is_valid: true,
      failed_rules: [] as any[],
    },
    isValid: true,
    strength: 'strong',
    strengthScore: 80,
    suggestions: [] as any[],
  })),
}));

jest.mock('@/hooks/useEmailValidation', () => ({
  useEmailValidation: jest.fn(() => ({
    getEmailSchema: jest.fn(() => {
      const { z } = require('zod');
      return z.string().email('Please enter a valid email address');
    }),
    isLoading: false,
  })),
}));

jest.mock('@/lib/api/passwordPolicy', () => ({
  getStrengthColor: jest.fn((score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-lime-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  }),
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err: any) => err.message || 'Unknown error'),
  extractErrorContext: jest.fn((err: any) => ({
    message: err.message || 'Unknown error',
    code: err.code,
    validationErrors: err.validationErrors || [],
  })),
  isValidationError: jest.fn(() => false),
  isRateLimitError: jest.fn(() => false),
}));

jest.mock('@/components/ui/RateLimitAlert', () => ({
  RateLimitAlert: ({ message, onDismiss }: any) => (
    <div data-testid="rate-limit-alert">
      <p>{message}</p>
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRouter } from 'next/navigation';
import { isRateLimited, recordAttempt, getRateLimitStatus } from '@/lib/network';
import { usePasswordValidation } from '@/hooks/usePasswordPolicy';
import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';
import {
  extractErrorMessage,
  extractErrorContext,
  isValidationError,
  isRateLimitError,
} from '@/lib/errors';

// Get mocked functions
const mockExtractErrorMessage = extractErrorMessage as jest.MockedFunction<
  typeof extractErrorMessage
>;
const mockExtractErrorContext = extractErrorContext as jest.MockedFunction<
  typeof extractErrorContext
>;
const mockIsValidationError = isValidationError as jest.MockedFunction<
  typeof isValidationError
>;

describe('RegisterForm', () => {
  // Helper to create delayed promise mock
  const createDelayedPromiseMock = (delayMs: number) => {
    return () => new Promise((resolve) => setTimeout(resolve, delayMs));
  };
  let mockRegister: jest.Mock;
  let mockRouterPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockRegister = jest.fn().mockResolvedValue(undefined);
    mockRouterPush = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      isLoading: false,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    });

    (isRateLimited as jest.Mock).mockReturnValue(false);
    (getRateLimitStatus as jest.Mock).mockReturnValue({
      allowed: true,
      remaining: 3,
      resetTime: Date.now() + 3600000,
    });
    (isValidationError as jest.Mock).mockReturnValue(false);
    (isRateLimitError as jest.Mock).mockReturnValue(false);
    (extractErrorContext as jest.Mock).mockReturnValue({
      message: 'Registration failed',
      code: undefined,
      validationErrors: [],
    });

    // Reset usePasswordValidation to default valid state
    (usePasswordValidation as jest.Mock).mockReturnValue({
      result: {
        is_valid: true,
        failed_rules: [],
      },
      isValid: true,
      strength: 'strong',
      strengthScore: 80,
      suggestions: [],
    });
  });

  describe('Basic Rendering', () => {
    it('should render registration form with all fields', () => {
      render(<RegisterForm />);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create account/i }),
      ).toBeInTheDocument();
    });

    it('should render sign in link', () => {
      render(<RegisterForm />);

      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in here/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in here/i })).toHaveAttribute(
        'href',
        '/auth/login',
      );
    });

    it('should render terms and privacy links', () => {
      render(<RegisterForm />);

      // Use regex matcher to handle text split with {' '} in JSX
      expect(
        screen.getByText(/By creating an account.*you agree/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /terms of service/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute(
        'href',
        '/terms',
      );
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
        'href',
        '/privacy',
      );
    });

    it('should render password generator button', () => {
      render(<RegisterForm />);

      const generateButton = screen.getByRole('button', { name: /generate/i });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).toHaveAttribute('title', 'Generate a strong password');
    });

    it('should show password strength indicator when password is entered', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      await waitFor(() => {
        expect(screen.getByText('strong')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show full name required error when submitting empty full name', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
      });
    });

    it('should show email required error when submitting empty email', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      await user.type(fullNameInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address'),
        ).toBeInTheDocument();
      });
    });

    it('should show password mismatch error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.DIFFERENT);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });
    });

    it('should show password length error for short password', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.SHORT);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.SHORT);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters long'),
        ).toBeInTheDocument();
      });
    });

    it('should prevent submission when password does not meet security requirements', async () => {
      const user = userEvent.setup();
      // Mock implementation that returns invalid state for FRONTEND_TEST_DATA.PASSWORD.WEAK
      (usePasswordValidation as jest.Mock).mockImplementation((password: string) => {
        if (password === FRONTEND_TEST_DATA.PASSWORD.WEAK) {
          return {
            result: {
              is_valid: false,
              failed_rules: ['require_uppercase', 'require_numbers'],
            },
            isValid: false,
            strength: FRONTEND_TEST_DATA.PASSWORD.WEAK,
            strengthScore: 20,
            suggestions: ['Add uppercase letters', 'Add numbers'],
          };
        }
        return {
          result: { is_valid: true, failed_rules: [] },
          isValid: true,
          strength: 'strong',
          strengthScore: 80,
          suggestions: [],
        };
      });

      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.WEAK);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.WEAK);

      // Wait for password validation to trigger and disable button
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).toBeDisabled();
      });

      // Note: Password suggestions would be shown in real usage, but testing
      // the dynamic rendering of suggestions requires a more complex mock setup
      // The key behavior - button disabled - is tested above

      // Registration should not be called
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('Password Requirements Display', () => {
    it('should show all password requirements when password is entered', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      await waitFor(() => {
        expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
        expect(screen.getByText(/Lowercase letter/)).toBeInTheDocument();
        expect(screen.getByText(/Uppercase letter/)).toBeInTheDocument();
        expect(screen.getByText(/Number/)).toBeInTheDocument();
        expect(screen.getByText(/Special character/)).toBeInTheDocument();
      });
    });

    it('should show red X for unmet requirements and green checkmark for met requirements', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.SHORT);

      await waitFor(() => {
        const minLengthText = screen.getByText(/At least 8 characters/);
        expect(minLengthText).toHaveClass('text-red-600');
        expect(minLengthText.textContent).toContain('✗');
      });

      // Clear and enter strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      await waitFor(() => {
        const minLengthText = screen.getByText(/At least 8 characters/);
        expect(minLengthText).toHaveClass('text-green-600');
        expect(minLengthText.textContent).toContain('✓');
      });
    });

    it('should show password suggestions when available', async () => {
      const user = userEvent.setup();
      (usePasswordValidation as jest.Mock).mockReturnValue({
        result: {
          is_valid: false,
          failed_rules: ['require_uppercase'],
        },
        isValid: false,
        strength: 'medium',
        strengthScore: 50,
        suggestions: ['Add uppercase letters for better security'],
      });

      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      await waitFor(() => {
        expect(screen.getByText('Suggestions:')).toBeInTheDocument();
        expect(
          screen.getByText(/Add uppercase letters for better security/),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Registration Submission', () => {
    it('should call register with correct user data', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          full_name: 'John Doe',
          email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
          password: FRONTEND_TEST_DATA.PASSWORD.VALID,
        });
      });
    });

    it('should record rate limit attempt on submission', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(recordAttempt).toHaveBeenCalledWith('register_form');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockRegister.mockImplementation(createDelayedPromiseMock(1000));

      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating account...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors from backend', async () => {
      const user = userEvent.setup();
      mockIsValidationError.mockReturnValue(true);
      // Mock extractErrorMessage to return formatted validation error
      mockExtractErrorMessage.mockImplementation((err: any) => {
        if (err?.message === 'Validation failed') {
          return 'email: Email already registered';
        }
        return err?.message || 'Unknown error';
      });
      mockExtractErrorContext.mockReturnValue({
        message: 'email: Email already registered',
        code: 'validation_error',
        validationErrors: [{ field: 'email', message: 'Email already registered' }],
      });
      mockRegister.mockRejectedValue(new Error('Validation failed'));

      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.EXISTING.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/email: Email already registered/i),
        ).toBeInTheDocument();
      });
    });

    it('should redirect to email verification when email not verified', async () => {
      const user = userEvent.setup();
      (extractErrorContext as jest.Mock).mockReturnValue({
        message: 'Email not verified',
        code: 'email_not_verified',
        validationErrors: [],
      });
      mockRegister.mockRejectedValue(new Error('Email not verified'));

      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/verify-email?pending=1');
      });
    });
  });

  describe('Password Generator', () => {
    it('should generate password when generate button clicked', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).not.toBe('');
        expect((passwordInput as HTMLInputElement).value.length).toBe(16);
        expect((confirmPasswordInput as HTMLInputElement).value).toBe(
          (passwordInput as HTMLInputElement).value,
        );
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should show rate limit alert when rate limited', async () => {
      const user = userEvent.setup();
      (isRateLimited as jest.Mock).mockReturnValue(true);
      (getRateLimitStatus as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000, // 1 hour from now
      });

      render(<RegisterForm />);

      const fullNameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      await user.type(fullNameInput, 'John Doe');
      await user.type(emailInput, FRONTEND_TEST_CREDENTIALS.JOHN.email);
      await user.type(passwordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);
      await user.type(confirmPasswordInput, FRONTEND_TEST_DATA.PASSWORD.VALID);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
        expect(
          screen.getByText(/Too many registration attempts. Please wait 1 hour/),
        ).toBeInTheDocument();
      });

      // Registration should not be called
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('Navigation on Authentication', () => {
    it('should redirect to dashboard when user becomes authenticated', async () => {
      const { rerender } = render(<RegisterForm />);

      // Simulate user becoming authenticated
      (useAuth as jest.Mock).mockReturnValue({
        register: mockRegister,
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(<RegisterForm />);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});
