/**
 * Tests for errors/recovery module
 *
 * Tests covering:
 * - retryWithBackoff success case
 * - retryWithBackoff retry logic with exponential backoff
 * - retryWithBackoff failure after max retries
 * - retryWithBackoff 4xx handling (no retry)
 * - withFallback success case
 * - withFallback fallback on error
 * - NetworkMonitor class functionality
 */

// Mock logger before imports
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { retryWithBackoff, withFallback, NetworkMonitor } from '@/lib/errors/recovery';
import logger from '@/lib/logging';

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('errors/recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('returns result on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(operation, 3, 100);

      // First retry after 100ms
      await jest.advanceTimersByTimeAsync(100);
      // Second retry after 200ms
      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting all retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      // Use real timers for this test to avoid async timing issues
      jest.useRealTimers();

      await expect(retryWithBackoff(operation, 2, 10)).rejects.toThrow(
        'Persistent failure',
      );
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('uses exponential backoff delays', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const baseDelay = 100;
      const promise = retryWithBackoff(operation, 3, baseDelay);

      // First call happens immediately
      expect(operation).toHaveBeenCalledTimes(1);

      // First retry after baseDelay * 2^0 = 100ms
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry after baseDelay * 2^1 = 200ms
      await jest.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      await promise;
    });

    it('does not retry on 4xx client errors (except 408, 429)', async () => {
      const clientError = {
        response: { status: 404 },
        message: 'Not Found',
      };
      const operation = jest.fn().mockRejectedValue(clientError);

      await expect(retryWithBackoff(operation, 3, 100)).rejects.toEqual(clientError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on 408 Request Timeout', async () => {
      const timeoutError = { response: { status: 408 } };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(operation, 3, 100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 Too Many Requests', async () => {
      const rateLimitError = { response: { status: 429 } };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(operation, 3, 100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('retries on 5xx server errors', async () => {
      const serverError = { response: { status: 500 } };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(operation, 3, 100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('retries on network errors without response', async () => {
      const networkError = new Error('Network offline');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(operation, 3, 100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('uses default values when not specified', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('withFallback', () => {
    it('returns operation result on success', async () => {
      const operation = jest.fn().mockResolvedValue('primary result');

      const result = await withFallback(operation, 'fallback');

      expect(result).toBe('primary result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('returns fallback value on error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      const result = await withFallback(operation, 'fallback value');

      expect(result).toBe('fallback value');
    });

    it('logs error when using fallback', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API error'));

      await withFallback(operation, 'fallback');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Operation failed'),
        expect.objectContaining({ error: expect.anything() }),
      );
    });

    it('handles synchronous operations', async () => {
      const operation = jest.fn().mockReturnValue('sync result');

      const result = await withFallback(operation, 'fallback');

      expect(result).toBe('sync result');
    });

    it('handles synchronous errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      const result = await withFallback(operation, 'fallback');

      expect(result).toBe('fallback');
    });

    it('works with null fallback value', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      const result = await withFallback(operation, null);

      expect(result).toBeNull();
    });

    it('works with object fallback value', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      const fallbackObj = { data: [], status: 'offline' };

      const result = await withFallback(operation, fallbackObj);

      expect(result).toEqual(fallbackObj);
    });
  });

  describe('NetworkMonitor', () => {
    it('provides online status via getOnlineStatus', () => {
      const monitor = new NetworkMonitor();
      // Default should be true (navigator.onLine in jsdom)
      expect(typeof monitor.getOnlineStatus()).toBe('boolean');
    });

    it('adds and notifies listeners', () => {
      const monitor = new NetworkMonitor();
      const listener = jest.fn();

      monitor.addListener(listener);
      // Manually trigger status change using internal method
      monitor['notifyListeners'](false);

      expect(listener).toHaveBeenCalledWith(false);
    });

    it('returns unsubscribe function from addListener', () => {
      const monitor = new NetworkMonitor();
      const listener = jest.fn();

      const unsubscribe = monitor.addListener(listener);
      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe
      unsubscribe();
      monitor['notifyListeners'](true);

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies all listeners on status change', () => {
      const monitor = new NetworkMonitor();
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      monitor.addListener(listener1);
      monitor.addListener(listener2);
      monitor['notifyListeners'](true);

      expect(listener1).toHaveBeenCalledWith(true);
      expect(listener2).toHaveBeenCalledWith(true);
    });

    describe('window event handling', () => {
      let addEventListenerSpy: jest.SpyInstance;

      beforeEach(() => {
        addEventListenerSpy = jest.spyOn(globalThis.window, 'addEventListener');
      });

      afterEach(() => {
        addEventListenerSpy.mockRestore();
      });

      it('subscribes to window online event', () => {
        const _monitor = new NetworkMonitor();

        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'online',
          expect.any(Function),
        );
      });

      it('subscribes to window offline event', () => {
        const _monitor = new NetworkMonitor();

        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'offline',
          expect.any(Function),
        );
      });

      it('updates status on online event', () => {
        const monitor = new NetworkMonitor();
        const listener = jest.fn();
        monitor.addListener(listener);

        // Find and call the online handler
        const calls = addEventListenerSpy.mock.calls;
        const onlineCall = calls.find(
          (call: [string, unknown]) => call[0] === 'online',
        );
        const onlineHandler = onlineCall?.[1] as (() => void) | undefined;

        onlineHandler?.();

        expect(listener).toHaveBeenCalledWith(true);
        expect(monitor.getOnlineStatus()).toBe(true);
      });

      it('updates status on offline event', () => {
        const monitor = new NetworkMonitor();
        const listener = jest.fn();
        monitor.addListener(listener);

        // Find and call the offline handler
        const calls = addEventListenerSpy.mock.calls;
        const offlineCall = calls.find(
          (call: [string, unknown]) => call[0] === 'offline',
        );
        const offlineHandler = offlineCall?.[1] as (() => void) | undefined;

        offlineHandler?.();

        expect(listener).toHaveBeenCalledWith(false);
        expect(monitor.getOnlineStatus()).toBe(false);
      });
    });
  });
});
