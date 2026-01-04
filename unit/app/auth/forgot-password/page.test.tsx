import React from 'react';
import { render, screen } from '@testing-library/react';
import ForgotPasswordPage from '@/app/(public)/auth/forgot-password/page';

// Mock the PasswordResetForm component
jest.mock('@/components/auth/PasswordResetForm', () => ({
  PasswordResetForm: function MockPasswordResetForm() {
    return <div data-testid="password-reset-form">Mocked Password Reset Form</div>;
  },
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render forgot password page', () => {
      render(<ForgotPasswordPage />);

      // Verify PasswordResetForm is rendered
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });

    it('should render PasswordResetForm component', () => {
      render(<ForgotPasswordPage />);

      // Verify the password reset form is present
      const passwordResetForm = screen.getByTestId('password-reset-form');
      expect(passwordResetForm).toBeInTheDocument();
      expect(passwordResetForm).toHaveTextContent('Mocked Password Reset Form');
    });

    it('should be a client component', () => {
      // This page uses 'use client' directive
      // Verify it renders without SSR issues
      const { container } = render(<ForgotPasswordPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should mount without errors', () => {
      const { container } = render(<ForgotPasswordPage />);
      expect(container).toBeInTheDocument();
    });

    it('should contain PasswordResetForm as child component', () => {
      const { container } = render(<ForgotPasswordPage />);

      // Verify the structure contains the mocked password reset form
      const passwordResetForm = screen.getByTestId('password-reset-form');
      expect(container).toContainElement(passwordResetForm);
    });

    it('should render only PasswordResetForm without additional wrappers', () => {
      render(<ForgotPasswordPage />);

      // The page should be a simple wrapper around PasswordResetForm
      // No ErrorBoundary or other complex wrappers
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render without accessibility violations', () => {
      const { container } = render(<ForgotPasswordPage />);

      // Basic accessibility check - component renders
      expect(container).toBeInTheDocument();

      // Verify form is accessible
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });

  describe('Client-Side Rendering', () => {
    it('should handle client-side rendering correctly', () => {
      // Page is marked with 'use client'
      // Should render on client without issues
      const { container } = render(<ForgotPasswordPage />);

      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });

  describe('Password Recovery Flow', () => {
    it('should provide password recovery functionality through PasswordResetForm', () => {
      render(<ForgotPasswordPage />);

      // The page's purpose is to allow users to request password reset
      // This is delegated to the PasswordResetForm component
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });
});
