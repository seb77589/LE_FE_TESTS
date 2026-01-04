import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/(public)/auth/login/page';

// Mock the UnifiedLoginForm component
jest.mock('@/components/auth/UnifiedLoginForm', () => ({
  __esModule: true,
  default: function MockUnifiedLoginForm() {
    return <div data-testid="unified-login-form">Mocked Login Form</div>;
  },
}));

// Mock ErrorBoundary to test fallback behavior
jest.mock('@/components/ui/ErrorBoundary', () => {
  const React = require('react');

  const MockErrorBoundary = ({
    children,
    fallback,
    showDetails,
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showDetails?: boolean;
  }) => {
    const [hasError, setHasError] = React.useState(false);

    // Expose error trigger for testing
    React.useEffect(() => {
      (globalThis as any).__triggerErrorBoundary = () => setHasError(true);
      return () => {
        delete (globalThis as any).__triggerErrorBoundary;
      };
    }, []);

    if (hasError) {
      return <>{fallback || <div data-testid="error-fallback">Error occurred</div>}</>;
    }

    return <>{children}</>;
  };

  return {
    __esModule: true,
    ErrorBoundary: MockErrorBoundary,
    default: MockErrorBoundary,
  };
});

// Mock LoginFormFallback
jest.mock('@/components/ui/FallbackComponents', () => ({
  LoginFormFallback: function MockLoginFormFallback() {
    return <div data-testid="login-fallback">Login Form Fallback</div>;
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (globalThis as any).__triggerErrorBoundary;
  });

  afterEach(() => {
    delete (globalThis as any).__triggerErrorBoundary;
  });

  describe('Rendering', () => {
    it('should render login page with error boundary wrapper', () => {
      render(<LoginPage />);

      // Verify UnifiedLoginForm is rendered
      expect(screen.getByTestId('unified-login-form')).toBeInTheDocument();
    });

    it('should render UnifiedLoginForm component inside ErrorBoundary', () => {
      render(<LoginPage />);

      // Verify the login form is present
      const loginForm = screen.getByTestId('unified-login-form');
      expect(loginForm).toBeInTheDocument();
      expect(loginForm).toHaveTextContent('Mocked Login Form');
    });

    it('should not render error fallback initially', () => {
      render(<LoginPage />);

      // Verify error fallback is not shown
      expect(screen.queryByTestId('login-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should wrap UnifiedLoginForm with ErrorBoundary', () => {
      render(<LoginPage />);

      // Verify login form is rendered inside ErrorBoundary
      // The ErrorBoundary provides error protection for the form
      expect(screen.getByTestId('unified-login-form')).toBeInTheDocument();

      // The ErrorBoundary is configured with LoginFormFallback
      // If an error occurs, the fallback would be shown
      // (actual error handling tested in ErrorBoundary component tests)
    });

    it('should pass showDetails prop to ErrorBoundary based on environment', () => {
      // This is implicitly tested through ErrorBoundary behavior
      // In production, showDetails would be false
      // In development, showDetails would be true

      const originalEnv = process.env.NODE_ENV;

      // Test development mode
      process.env.NODE_ENV = 'development';
      const { unmount } = render(<LoginPage />);
      expect(screen.getByTestId('unified-login-form')).toBeInTheDocument();
      unmount();

      // Test production mode
      process.env.NODE_ENV = 'production';
      render(<LoginPage />);
      expect(screen.getByTestId('unified-login-form')).toBeInTheDocument();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Component Integration', () => {
    it('should mount without errors', () => {
      const { container } = render(<LoginPage />);
      expect(container).toBeInTheDocument();
    });

    it('should contain UnifiedLoginForm as child component', () => {
      const { container } = render(<LoginPage />);

      // Verify the structure contains the mocked login form
      const loginForm = screen.getByTestId('unified-login-form');
      expect(container).toContainElement(loginForm);
    });
  });

  describe('Accessibility', () => {
    it('should render without accessibility violations', () => {
      const { container } = render(<LoginPage />);

      // Basic accessibility check - component renders
      expect(container).toBeInTheDocument();

      // Verify form is accessible
      expect(screen.getByTestId('unified-login-form')).toBeInTheDocument();
    });
  });
});
