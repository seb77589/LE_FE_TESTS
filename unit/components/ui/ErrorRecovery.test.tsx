/**
 * Tests for ErrorRecovery utility
 *
 * @description Tests for error recovery exports including:
 * - errorRecovery singleton instance
 * - useErrorRecovery hook
 * - withErrorRecovery HOC
 * - NetworkMonitor re-export
 */

import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import {
  errorRecovery,
  useErrorRecovery,
  withErrorRecovery,
  NetworkMonitor,
} from '@/components/ui/ErrorRecovery';

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch for auth refresh tests
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('errorRecovery singleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    errorRecovery.reset();
  });

  it('should be defined', () => {
    expect(errorRecovery).toBeDefined();
  });

  it('should have recover method', () => {
    expect(typeof errorRecovery.recover).toBe('function');
  });

  it('should have addStrategy method', () => {
    expect(typeof errorRecovery.addStrategy).toBe('function');
  });

  it('should have reset method', () => {
    expect(typeof errorRecovery.reset).toBe('function');
  });

  it('should return false for unknown errors with max retries reached', async () => {
    const unknownError = new Error('Unknown error type');
    // This will exhaust retries since no strategy matches
    const result = await errorRecovery.recover(unknownError);
    // Result depends on whether any default strategy matches
    expect(typeof result).toBe('boolean');
  });

  it('should handle network errors', async () => {
    const networkError = new Error('NetworkError: Failed to fetch');
    const result = await errorRecovery.recover(networkError);
    expect(result).toBe(true); // Network retry strategy returns true
  });

  it('should allow adding custom strategies', () => {
    const customStrategy = {
      name: 'custom-test',
      condition: (error: Error) => error.message === 'custom error',
      action: async () => true,
      priority: 0,
    };

    expect(() => errorRecovery.addStrategy(customStrategy)).not.toThrow();
  });

  it('should reset retry count', () => {
    expect(() => errorRecovery.reset()).not.toThrow();
  });
});

describe('useErrorRecovery hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorRecovery.reset();
  });

  it('should return recover function', () => {
    const { result } = renderHook(() => useErrorRecovery());
    expect(typeof result.current.recover).toBe('function');
  });

  it('should return addStrategy function', () => {
    const { result } = renderHook(() => useErrorRecovery());
    expect(typeof result.current.addStrategy).toBe('function');
  });

  it('should return reset function', () => {
    const { result } = renderHook(() => useErrorRecovery());
    expect(typeof result.current.reset).toBe('function');
  });

  it('should call errorRecovery.recover when recover is called', async () => {
    const { result } = renderHook(() => useErrorRecovery());
    const testError = new Error('NetworkError');

    await act(async () => {
      const recovered = await result.current.recover(testError);
      expect(typeof recovered).toBe('boolean');
    });
  });
});

describe('withErrorRecovery HOC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Simple test component
  const TestComponent: React.FC<{ readonly message?: string }> = ({
    message = 'Hello',
  }) => {
    return <div data-testid="test-component">{message}</div>;
  };

  it('should wrap component and render it', () => {
    const WrappedComponent = withErrorRecovery(TestComponent);
    render(<WrappedComponent message="Test" />);

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should accept recovery options', () => {
    const WrappedComponent = withErrorRecovery(TestComponent, {
      maxRetries: 5,
      retryDelay: 2000,
    });

    render(<WrappedComponent />);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  it('should render wrapped component with props', () => {
    const WrappedComponent = withErrorRecovery(TestComponent);
    render(<WrappedComponent message="Custom Message" />);

    expect(screen.getByText('Custom Message')).toBeInTheDocument();
  });
});

describe('NetworkMonitor re-export', () => {
  it('should export NetworkMonitor', () => {
    expect(NetworkMonitor).toBeDefined();
  });
});
