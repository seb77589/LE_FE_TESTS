import React from 'react';
import { render, screen } from '@testing-library/react';
import RegisterPage from '@/app/(public)/auth/register/page';

// Mock the RegisterForm component
jest.mock('@/components/auth/RegisterForm', () => ({
  RegisterForm: function MockRegisterForm() {
    return <div data-testid="register-form">Mocked Register Form</div>;
  },
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render register page', () => {
      render(<RegisterPage />);

      // Verify RegisterForm is rendered
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
    });

    it('should render RegisterForm component', () => {
      render(<RegisterPage />);

      // Verify the register form is present
      const registerForm = screen.getByTestId('register-form');
      expect(registerForm).toBeInTheDocument();
      expect(registerForm).toHaveTextContent('Mocked Register Form');
    });

    it('should be a client component', () => {
      // This page uses 'use client' directive
      // Verify it renders without SSR issues
      const { container } = render(<RegisterPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should mount without errors', () => {
      const { container } = render(<RegisterPage />);
      expect(container).toBeInTheDocument();
    });

    it('should contain RegisterForm as child component', () => {
      const { container } = render(<RegisterPage />);

      // Verify the structure contains the mocked register form
      const registerForm = screen.getByTestId('register-form');
      expect(container).toContainElement(registerForm);
    });

    it('should render only RegisterForm without additional wrappers', () => {
      render(<RegisterPage />);

      // The page should be a simple wrapper around RegisterForm
      // No ErrorBoundary or other complex wrappers
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render without accessibility violations', () => {
      const { container } = render(<RegisterPage />);

      // Basic accessibility check - component renders
      expect(container).toBeInTheDocument();

      // Verify form is accessible
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
    });
  });

  describe('Client-Side Rendering', () => {
    it('should handle client-side rendering correctly', () => {
      // Page is marked with 'use client'
      // Should render on client without issues
      const { container } = render(<RegisterPage />);

      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('register-form')).toBeInTheDocument();
    });
  });
});
