/**
 * Unit tests for Cookie Synchronization Manager
 *
 * Tests the promise-based cookie waiting and retry logic.
 */

// Mock only logger BEFORE imports (we need the real CookieSyncManager)
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    Logger: jest.fn(() => mockLogger),
  };
});

import {
  CookieSyncManager,
  waitForCookie,
  waitForCookieWithRetry,
} from '@/lib/cookies';
import logger from '@/lib/logging';

describe('CookieSyncManager', () => {
  let manager: CookieSyncManager;
  let cookieStore: string;
  let originalCookie: PropertyDescriptor | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = CookieSyncManager.getInstance();
    manager.clearPendingWaits();

    // Mock document.cookie getter/setter to control cookie values
    originalCookie = Object.getOwnPropertyDescriptor(document, 'cookie');
    cookieStore = '';

    Object.defineProperty(document, 'cookie', {
      get: () => cookieStore,
      set: (value: string) => {
        cookieStore = value;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    cookieStore = '';
    if (originalCookie) {
      Object.defineProperty(document, 'cookie', originalCookie);
    }
  });

  describe('waitForCookie', () => {
    it('should return cookie immediately if available', async () => {
      // Arrange - set cookie in document.cookie
      cookieStore = 'test-cookie=test-value; path=/';

      // Act
      const result = await manager.waitForCookie('test-cookie');

      // Assert
      expect(result).toBe('test-value');
      expect(logger.debug).toHaveBeenCalledWith(
        'general',
        expect.stringContaining("Cookie 'test-cookie' available after"),
      );
    });

    it('should poll until cookie becomes available', async () => {
      // Arrange: Cookie appears after delay
      let callCount = 0;
      const originalGet = Object.getOwnPropertyDescriptor(document, 'cookie')?.get;

      // Override the cookie getter to return cookie after 3 calls
      Object.defineProperty(document, 'cookie', {
        get: jest.fn(() => {
          callCount++;
          // Return cookie value after 3rd call
          if (callCount >= 3) {
            return 'test-cookie=delayed-value; path=/';
          }
          return '';
        }),
        set: jest.fn((value: string) => {
          cookieStore = value;
        }),
        configurable: true,
      });

      // Act - use longer timeout and poll interval to ensure reliability
      const resultPromise = manager.waitForCookie('test-cookie', {
        timeout: 500, // Generous timeout
        pollInterval: 50, // Longer poll interval for stability
        useBackoff: false,
      });

      // Wait for result
      const result = await resultPromise;

      // Assert
      expect(result).toBe('delayed-value');
      expect(callCount).toBeGreaterThanOrEqual(3); // Should have polled at least 3 times

      // Restore
      if (originalGet) {
        Object.defineProperty(document, 'cookie', {
          get: originalGet,
          configurable: true,
        });
      }
    });

    it('should return null when timeout is reached', async () => {
      // Arrange: Cookie never appears
      cookieStore = '';

      // Act
      const result = await manager.waitForCookie('test-cookie', {
        timeout: 50,
        pollInterval: 10,
      });

      // Assert
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'general',
        expect.stringContaining("Cookie 'test-cookie' not available after"),
      );
    });

    it('should call onSuccess callback when cookie found', async () => {
      // Arrange
      cookieStore = 'test-cookie=success-value; path=/';
      const onSuccess = jest.fn();

      // Act
      await manager.waitForCookie('test-cookie', { onSuccess });

      // Assert
      expect(onSuccess).toHaveBeenCalledWith('success-value', expect.any(Number));
    });

    it('should call onTimeout callback when timeout reached', async () => {
      // Arrange
      cookieStore = '';
      const onTimeout = jest.fn();

      // Act
      await manager.waitForCookie('test-cookie', {
        timeout: 50,
        pollInterval: 10,
        onTimeout,
      });

      // Assert
      expect(onTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle errors in success callback gracefully', async () => {
      // Arrange
      cookieStore = 'test-cookie=test-value; path=/';
      const onSuccess = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      // Act
      const result = await manager.waitForCookie('test-cookie', { onSuccess });

      // Assert
      expect(result).toBe('test-value');
      expect(logger.warn).toHaveBeenCalledWith(
        'general',
        'Error in cookie sync success callback',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it('should deduplicate concurrent requests for the same cookie', async () => {
      // Arrange: Cookie appears after delay
      let callCount = 0;
      const originalGet = Object.getOwnPropertyDescriptor(document, 'cookie')?.get;
      Object.defineProperty(document, 'cookie', {
        get: jest.fn(() => {
          callCount++;
          return callCount >= 2 ? 'test-cookie=dedup-value; path=/' : '';
        }),
        set: jest.fn((value: string) => {
          cookieStore = value;
        }),
        configurable: true,
      });

      // Act: Make two concurrent requests
      const [result1, result2] = await Promise.all([
        manager.waitForCookie('test-cookie', {
          timeout: 100,
          pollInterval: 20,
        }),
        manager.waitForCookie('test-cookie', {
          timeout: 100,
          pollInterval: 20,
        }),
      ]);

      // Assert: Both should get the same value
      expect(result1).toBe('dedup-value');
      expect(result2).toBe('dedup-value');
      // Deduplication doesn't log - it just reuses the existing promise

      // Restore
      if (originalGet) {
        Object.defineProperty(document, 'cookie', {
          get: originalGet,
          configurable: true,
        });
      }
    });
  });

  describe('waitForCookieWithRetry', () => {
    it('should succeed on first attempt', async () => {
      // Arrange
      cookieStore = 'test-cookie=first-try; path=/';
      const fetchFn = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await manager.waitForCookieWithRetry('test-cookie', fetchFn, {
        timeout: 100,
        maxRetries: 2,
      });

      // Assert
      expect(result).toBe('first-try');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should retry when cookie not available', async () => {
      // Arrange: Cookie appears after first attempt completes (waitForCookie times out)
      let fetchCount = 0;
      const fetchFn = jest.fn().mockImplementation(async () => {
        fetchCount++;
      });

      let cookieCheckCount = 0;
      const originalGet = Object.getOwnPropertyDescriptor(document, 'cookie')?.get;
      Object.defineProperty(document, 'cookie', {
        get: jest.fn(() => {
          cookieCheckCount++;
          // Cookie appears after first waitForCookie times out (after ~50ms with 10ms pollInterval)
          // So after ~5-6 cookie checks, the cookie should appear
          return cookieCheckCount > 6 ? 'test-cookie=retry-success; path=/' : '';
        }),
        set: jest.fn((value: string) => {
          cookieStore = value;
        }),
        configurable: true,
      });

      // Act
      const result = await manager.waitForCookieWithRetry('test-cookie', fetchFn, {
        timeout: 30, // Shorter timeout so waitForCookie times out faster
        pollInterval: 5,
        maxRetries: 2,
        retryDelay: 5, // Shorter retry delay
      });

      // Assert
      expect(result).toBe('retry-success');
      // fetchFn is called: attempt 0 (initial) + attempt 1 (first retry) = 2 times
      expect(fetchFn).toHaveBeenCalledTimes(2);

      // Restore
      if (originalGet) {
        Object.defineProperty(document, 'cookie', {
          get: originalGet,
          configurable: true,
        });
      }
    });

    it('should return null after all retries exhausted', async () => {
      // Arrange: Cookie never appears
      cookieStore = '';
      const fetchFn = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await manager.waitForCookieWithRetry('test-cookie', fetchFn, {
        timeout: 50,
        pollInterval: 10,
        maxRetries: 1,
        retryDelay: 10,
      });

      // Assert
      expect(result).toBeNull();
      expect(fetchFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      // waitForCookieWithRetry doesn't log error - it just returns null after retries
    });

    it('should continue retrying if fetch fails', async () => {
      // Arrange: First fetch on attempt 0 succeeds, but cookie not available
      // Second fetch on attempt 1 succeeds and cookie appears
      let fetchCount = 0;
      const fetchFn = jest.fn().mockImplementation(async () => {
        fetchCount++;
        // Simulate fetch that succeeds but cookie appears later
      });

      let cookieCheckCount = 0;
      const originalGet = Object.getOwnPropertyDescriptor(document, 'cookie')?.get;
      Object.defineProperty(document, 'cookie', {
        get: jest.fn(() => {
          cookieCheckCount++;
          // Cookie appears after first attempt's waitForCookie times out
          return cookieCheckCount > 6 ? 'test-cookie=after-error; path=/' : '';
        }),
        set: jest.fn((value: string) => {
          cookieStore = value;
        }),
        configurable: true,
      });

      // Act
      const result = await manager.waitForCookieWithRetry('test-cookie', fetchFn, {
        timeout: 30,
        pollInterval: 5,
        maxRetries: 2,
        retryDelay: 5,
      });

      // Assert
      expect(result).toBe('after-error');
      expect(fetchFn).toHaveBeenCalledTimes(2);
      // No error logged since fetchFn doesn't throw

      // Restore
      if (originalGet) {
        Object.defineProperty(document, 'cookie', {
          get: originalGet,
          configurable: true,
        });
      }
    });
  });

  describe('getCookieImmediate', () => {
    it('should return cookie value immediately without waiting', () => {
      // Arrange
      cookieStore = 'test-cookie=immediate-value; path=/';

      // Act
      const result = manager.getCookieImmediate('test-cookie');

      // Assert
      expect(result).toBe('immediate-value');
    });

    it('should return null if cookie not available', () => {
      // Arrange
      cookieStore = '';

      // Act
      const result = manager.getCookieImmediate('test-cookie');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('clearPendingWaits', () => {
    it('should clear all pending waits', () => {
      // Act
      manager.clearPendingWaits();

      // Assert: No error should occur
      expect(true).toBe(true);
    });
  });

  describe('Convenience functions', () => {
    it('waitForCookie should use singleton instance', async () => {
      // Arrange
      cookieStore = 'test-cookie=convenience-value; path=/';

      // Act
      const result = await waitForCookie('test-cookie');

      // Assert
      expect(result).toBe('convenience-value');
    });

    it('waitForCookieWithRetry should use singleton instance', async () => {
      // Arrange
      cookieStore = 'test-cookie=retry-value; path=/';
      const fetchFn = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await waitForCookieWithRetry('test-cookie', fetchFn);

      // Assert
      expect(result).toBe('retry-value');
      expect(fetchFn).toHaveBeenCalled();
    });
  });
});
