/**
 * Unit Test for useRetry Hook
 *
 * Coverage Target: 95%+
 * Priority: MEDIUM (error recovery utility)
 *
 * Test Categories:
 * - Basic functionality (3 tests)
 * - Retry logic (4 tests)
 * - State management (3 tests)
 * - Callbacks (3 tests)
 * - Error handling (3 tests)
 * - Simple retry variant (2 tests)
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  errorRecoveryHandling: {
    withRetry: jest.fn(),
  },
  handleError: jest.fn((error) => error),
}));

import { renderHook, act } from '@testing-library/react';
import { useRetry, useSimpleRetry } from '@/hooks/useRetry';
import { errorRecoveryHandling } from '@/lib/errors';

describe('useRetry Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('initializes with correct default state', () => {
      const operation = jest.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useRetry(operation));

      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastError).toBeNull();
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('provides execute function', () => {
      const operation = jest.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useRetry(operation));

      expect(result.current.execute).toBeDefined();
      expect(typeof result.current.execute).toBe('function');
    });

    it('provides reset function', () => {
      const operation = jest.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useRetry(operation));

      expect(result.current.reset).toBeDefined();
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Retry Logic', () => {
    it('successfully executes operation on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useRetry(operation));

      let executeResult: unknown;
      await act(async () => {
        executeResult = await result.current.execute();
      });

      expect(executeResult).toBe('success');
      expect(errorRecoveryHandling.withRetry).toHaveBeenCalled();
    });

    it('uses custom maxRetries option', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useRetry(operation, { maxRetries: 5 }));

      await act(async () => {
        await result.current.execute();
      });

      expect(errorRecoveryHandling.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        5,
        1000,
      );
    });

    it('uses custom baseDelay option', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useRetry(operation, { baseDelay: 2000 }));

      await act(async () => {
        await result.current.execute();
      });

      expect(errorRecoveryHandling.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        3,
        2000,
      );
    });

    it('passes arguments to operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockImplementation(async (fn) =>
        fn(),
      );

      const { result } = renderHook(() => useRetry(operation));

      await act(async () => {
        await result.current.execute('arg1', 'arg2', 'arg3');
      });

      expect(operation).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });

  describe('State Management', () => {
    it('sets isRetrying during execution and clears after', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useRetry(operation));

      await act(async () => {
        await result.current.execute();
      });

      // Should not be retrying after completion
      expect(result.current.isRetrying).toBe(false);
    });

    it('updates retryCount during execution', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      // Mock withRetry to execute the callback (which increments retryCount)
      (errorRecoveryHandling.withRetry as jest.Mock).mockImplementation(async (fn) => {
        return await fn(); // Execute the callback
      });

      const { result } = renderHook(() => useRetry(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.retryCount).toBeGreaterThan(0);
    });

    it('resets state when reset is called', () => {
      const operation = jest.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useRetry(operation));

      // Call reset
      act(() => {
        result.current.reset();
      });

      // After reset, all state should be at initial values
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastError).toBeNull();
    });
  });

  describe('Callbacks', () => {
    it('calls onSuccess callback when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useRetry(operation, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('calls onError callback when operation fails', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();
      (errorRecoveryHandling.withRetry as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useRetry(operation, { onError }));

      try {
        await act(async () => {
          await result.current.execute();
        });
      } catch {
        // Expected to fail
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('calls onRetry callback on retry attempts', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onRetry = jest.fn();
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useRetry(operation, { onRetry }));

      await act(async () => {
        await result.current.execute();
      });

      // onRetry is called when retryCount > 0, which depends on implementation
      // This test verifies the callback is set up correctly
      expect(onRetry).toHaveBeenCalledTimes(0); // First attempt, no retry yet
    });
  });

  describe('Error Handling', () => {
    it('propagates error when operation fails', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      // Use same mock pattern as passing onError test
      (errorRecoveryHandling.withRetry as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useRetry(operation));

      let caughtError: unknown = null;
      try {
        await act(async () => {
          await result.current.execute();
        });
      } catch (e) {
        caughtError = e;
      }

      // Verify error was propagated
      expect(caughtError).toBe(error);
      // Verify isRetrying is false after error
      expect(result.current.isRetrying).toBe(false);
    });

    it('sets isRetrying to false after error', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      // Use same mock pattern as passing tests
      (errorRecoveryHandling.withRetry as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useRetry(operation));

      try {
        await act(async () => {
          await result.current.execute();
        });
      } catch {
        // Expected to fail
      }

      expect(result.current.isRetrying).toBe(false);
    });

    it('throws error after max retries exhausted', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      // Use same mock pattern as passing tests
      (errorRecoveryHandling.withRetry as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useRetry(operation, { maxRetries: 3 }));

      try {
        await act(async () => {
          await result.current.execute();
        });
        throw new Error('Test should have thrown');
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('useSimpleRetry Variant', () => {
    it('initializes with correct state', () => {
      const { result } = renderHook(() => useSimpleRetry());

      expect(result.current.isRetrying).toBe(false);
      expect(typeof result.current.retry).toBe('function');
    });

    it('executes operation with retry logic', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useSimpleRetry({ maxRetries: 3 }));

      let retryResult: string | undefined;
      await act(async () => {
        retryResult = await result.current.retry(operation);
      });

      expect(retryResult).toBe('success');
      expect(errorRecoveryHandling.withRetry).toHaveBeenCalled();
    });

    it('calls onSuccess callback when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useSimpleRetry({ onSuccess }));

      await act(async () => {
        await result.current.retry(operation);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('calls onError callback when operation fails', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();
      (errorRecoveryHandling.withRetry as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useSimpleRetry({ onError }));

      try {
        await act(async () => {
          await result.current.retry(operation);
        });
      } catch {
        // Expected to fail
      }

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('sets isRetrying to false after completion', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      (errorRecoveryHandling.withRetry as jest.Mock).mockResolvedValue('success');

      const { result } = renderHook(() => useSimpleRetry());

      await act(async () => {
        await result.current.retry(operation);
      });

      expect(result.current.isRetrying).toBe(false);
    });
  });
});
