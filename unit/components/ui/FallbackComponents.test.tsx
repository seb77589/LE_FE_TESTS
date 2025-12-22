/**
 * Tests for FallbackComponents
 *
 * @description Tests for fallback UI components including:
 * - LoginFormFallback
 * - AuthContextFallback
 * - ErrorFallback
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  LoginFormFallback,
  AuthContextFallback,
  ErrorFallback,
} from '@/components/ui/FallbackComponents';

describe('LoginFormFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form fallback with heading', () => {
    render(<LoginFormFallback />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Unable to load the login form')).toBeInTheDocument();
  });

  it('should render error alert', () => {
    render(<LoginFormFallback />);

    expect(screen.getByText(/Loading Error:/)).toBeInTheDocument();
    expect(screen.getByText(/The login form could not be loaded/)).toBeInTheDocument();
  });

  it('should render reload page button', () => {
    render(<LoginFormFallback />);

    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<LoginFormFallback onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: /Try Loading Again/i })).toBeInTheDocument();
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<LoginFormFallback />);

    expect(screen.queryByRole('button', { name: /Try Loading Again/i })).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<LoginFormFallback onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /Try Loading Again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should have reload button that is clickable', () => {
    // Note: We can't test window.location.reload directly in Jest due to JSDOM limitations
    // We verify the button exists and is wired up
    render(<LoginFormFallback />);

    const reloadButton = screen.getByRole('button', { name: /Reload Page/i });
    expect(reloadButton).toBeInTheDocument();
    // Clicking should not throw
    expect(() => fireEvent.click(reloadButton)).not.toThrow();
  });
});

describe('AuthContextFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render authentication error heading', () => {
    render(<AuthContextFallback />);

    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to initialize authentication system')).toBeInTheDocument();
  });

  it('should render system error alert', () => {
    render(<AuthContextFallback />);

    expect(screen.getByText(/System Error:/)).toBeInTheDocument();
  });

  it('should render reload page button', () => {
    render(<AuthContextFallback />);

    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
  });

  it('should have reload button that is clickable', () => {
    // Note: We can't test window.location.reload directly in Jest due to JSDOM limitations
    render(<AuthContextFallback />);

    const reloadButton = screen.getByRole('button', { name: /Reload Page/i });
    expect(reloadButton).toBeInTheDocument();
    expect(() => fireEvent.click(reloadButton)).not.toThrow();
  });
});

describe('ErrorFallback', () => {
  const mockError = new Error('Test error message');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render error fallback with heading', () => {
    render(<ErrorFallback error={mockError} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<ErrorFallback error={mockError} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render error alert', () => {
    render(<ErrorFallback error={mockError} />);

    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
  });

  it('should render reload page button', () => {
    render(<ErrorFallback error={mockError} />);

    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
  });

  it('should render try again button when resetErrorBoundary is provided', () => {
    const resetErrorBoundary = jest.fn();
    render(<ErrorFallback error={mockError} resetErrorBoundary={resetErrorBoundary} />);

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('should not render try again button when resetErrorBoundary is not provided', () => {
    render(<ErrorFallback error={mockError} />);

    expect(screen.queryByRole('button', { name: /Try Again/i })).not.toBeInTheDocument();
  });

  it('should call resetErrorBoundary when try again button is clicked', () => {
    const resetErrorBoundary = jest.fn();
    render(<ErrorFallback error={mockError} resetErrorBoundary={resetErrorBoundary} />);

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it('should have reload button that is clickable', () => {
    // Note: We can't test window.location.reload directly in Jest due to JSDOM limitations
    render(<ErrorFallback error={mockError} />);

    const reloadButton = screen.getByRole('button', { name: /Reload Page/i });
    expect(reloadButton).toBeInTheDocument();
    expect(() => fireEvent.click(reloadButton)).not.toThrow();
  });
});
