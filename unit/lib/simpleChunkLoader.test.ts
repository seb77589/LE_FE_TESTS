/**
 * @jest-environment jsdom
 */

/**
 * Tests for simpleChunkLoader module
 *
 * Tests covering:
 * - loadChunkWithRetry success case
 * - loadChunkWithRetry retry logic
 * - loadChunkWithRetry failure after retries
 * - installChunkErrorHandler setup
 * - preloadCriticalChunks behavior
 */

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

import {
  loadChunkWithRetry,
  installChunkErrorHandler,
  preloadCriticalChunks,
} from '@/lib/simpleChunkLoader';
import logger from '@/lib/logging';

// Access the mock
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('simpleChunkLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadChunkWithRetry', () => {
    it('returns module on successful load', async () => {
      const mockModule = { default: () => 'component' };
      const loadFn = jest.fn().mockResolvedValue(mockModule);

      const result = await loadChunkWithRetry('test-chunk', loadFn);

      expect(result).toBe(mockModule);
      expect(loadFn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const mockModule = { default: () => 'component' };
      const loadFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockModule);

      const result = await loadChunkWithRetry('test-chunk', loadFn, 3);

      expect(result).toBe(mockModule);
      expect(loadFn).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('failed, retrying'),
        expect.any(Object)
      );
    }, 15000);

    it('throws after all retries exhausted', async () => {
      const error = new Error('Persistent error');
      const loadFn = jest.fn().mockRejectedValue(error);

      // With retries=1, it tries once initially, then retries once = 2 calls total
      await expect(loadChunkWithRetry('test-chunk', loadFn, 1)).rejects.toThrow('Persistent error');
      expect(loadFn).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('failed after all retries'),
        expect.any(Object)
      );
    }, 5000);

    it('logs warning on each retry attempt', async () => {
      const mockModule = { default: () => 'component' };
      const loadFn = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockModule);

      await loadChunkWithRetry('test-chunk', loadFn, 3);

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('test-chunk'),
        expect.objectContaining({ retriesLeft: 2 })
      );
    }, 15000);

    it('returns immediately on first success', async () => {
      const mockModule = { default: 'test' };
      const loadFn = jest.fn().mockResolvedValue(mockModule);

      const result = await loadChunkWithRetry('fast-chunk', loadFn);

      expect(result).toBe(mockModule);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('handles errors without response property', async () => {
      const mockModule = { default: () => 'component' };
      const networkError = new Error('Network offline');
      const loadFn = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockModule);

      const result = await loadChunkWithRetry('test-chunk', loadFn, 2);

      expect(result).toBe(mockModule);
      expect(loadFn).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  describe('installChunkErrorHandler', () => {
    let addEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addEventListenerSpy = jest.spyOn(globalThis.window, 'addEventListener');
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
    });

    it('adds error event listener to window', () => {
      installChunkErrorHandler();

      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('logs error when chunk loading error is detected', () => {
      installChunkErrorHandler();

      // Get the error handler
      const calls = addEventListenerSpy.mock.calls;
      const errorCall = calls.find((call: [string, unknown]) => call[0] === 'error');
      const errorHandler = errorCall?.[1] as ((event: { message?: string }) => void) | undefined;

      // Mock confirm to return false (don't reload)
      const confirmSpy = jest.spyOn(globalThis, 'confirm').mockReturnValue(false);

      // Simulate chunk loading error
      const errorEvent = {
        message: 'Loading chunk 123 failed',
      };
      errorHandler?.(errorEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'general',
        'Chunk loading error detected',
        expect.objectContaining({ message: 'Loading chunk 123 failed' })
      );

      confirmSpy.mockRestore();
    });

    it('prompts user to reload on chunk error', () => {
      installChunkErrorHandler();

      const calls = addEventListenerSpy.mock.calls;
      const errorCall = calls.find((call: [string, unknown]) => call[0] === 'error');
      const errorHandler = errorCall?.[1] as ((event: { message?: string }) => void) | undefined;

      const confirmSpy = jest.spyOn(globalThis, 'confirm').mockReturnValue(false);

      const errorEvent = { message: 'Loading chunk failed' };
      errorHandler?.(errorEvent);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Failed to load application resources. Reload page?'
      );

      confirmSpy.mockRestore();
    });

    it('ignores non-chunk errors', () => {
      installChunkErrorHandler();

      const calls = addEventListenerSpy.mock.calls;
      const errorCall = calls.find((call: [string, unknown]) => call[0] === 'error');
      const errorHandler = errorCall?.[1] as ((event: { message?: string }) => void) | undefined;

      const confirmSpy = jest.spyOn(globalThis, 'confirm');

      const errorEvent = { message: 'Some other error' };
      errorHandler?.(errorEvent);

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('handles undefined message gracefully', () => {
      installChunkErrorHandler();

      const calls = addEventListenerSpy.mock.calls;
      const errorCall = calls.find((call: [string, unknown]) => call[0] === 'error');
      const errorHandler = errorCall?.[1] as ((event: { message?: string }) => void) | undefined;

      const confirmSpy = jest.spyOn(globalThis, 'confirm');

      const errorEvent = { message: undefined };
      errorHandler?.(errorEvent);

      expect(confirmSpy).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('preloadCriticalChunks', () => {
    it('logs debug message when called', () => {
      preloadCriticalChunks();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Critical chunks preload called')
      );
    });

    it('does not throw', () => {
      expect(() => preloadCriticalChunks()).not.toThrow();
    });
  });
});
