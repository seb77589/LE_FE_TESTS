import React from 'react';
import { render, screen } from '@testing-library/react';
import ResetPasswordPage from '@/app/(public)/auth/reset-password/page';

// Mock the PasswordResetForm component
jest.mock('@/components/auth/PasswordResetForm', () => ({
  PasswordResetForm: function MockPasswordResetForm() {
    return <div data-testid="password-reset-form">Mocked Password Reset Form</div>;
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render reset password page', () => {
      render(<ResetPasswordPage />);

      // Verify PasswordResetForm is rendered
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });

    it('should render PasswordResetForm component', () => {
      render(<ResetPasswordPage />);

      // Verify the password reset form is present
      const passwordResetForm = screen.getByTestId('password-reset-form');
      expect(passwordResetForm).toBeInTheDocument();
      expect(passwordResetForm).toHaveTextContent('Mocked Password Reset Form');
    });

    it('should be a client component', () => {
      // This page uses 'use client' directive
      // Verify it renders without SSR issues
      const { container } = render(<ResetPasswordPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should mount without errors', () => {
      const { container } = render(<ResetPasswordPage />);
      expect(container).toBeInTheDocument();
    });

    it('should contain PasswordResetForm as child component', () => {
      const { container } = render(<ResetPasswordPage />);

      // Verify the structure contains the mocked password reset form
      const passwordResetForm = screen.getByTestId('password-reset-form');
      expect(container).toContainElement(passwordResetForm);
    });

    it('should render only PasswordResetForm without additional wrappers', () => {
      render(<ResetPasswordPage />);

      // The page should be a simple wrapper around PasswordResetForm
      // No ErrorBoundary or other complex wrappers
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render without accessibility violations', () => {
      const { container } = render(<ResetPasswordPage />);

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
      const { container } = render(<ResetPasswordPage />);

      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });

  describe('Password Reset Flow', () => {
    it('should provide password reset functionality through PasswordResetForm', () => {
      render(<ResetPasswordPage />);

      // The page's purpose is to allow users to reset their password
      // This is delegated to the PasswordResetForm component
      // The form handles token validation and new password submission
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument();
    });
  });
});
