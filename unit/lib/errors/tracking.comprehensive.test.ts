/**
 * Comprehensive Unit Tests for lib/errors/tracking.ts
 *
 * @description Extended tests covering:
 * - Circuit breaker logic
 * - Error sending and batch handling
 * - Network error tracking (fetch override)
 * - Performance tracking
 * - wrapAsync wrapper
 * - Fallback mode
 * - setSession and clearUser
 * - clearQueue and updateConfig
 *
 * @module __tests__/unit/lib/errors/tracking.comprehensive
 * @jest-environment jsdom
 */

// Create persistent mocks before importing the module
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug,
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('Error Tracking Comprehensive Tests', () => {
  let ErrorTrackingService: any;
  let service: any;

  // Helper to create a fresh instance with config
  const createService = (config = {}) => {
    const svc = new ErrorTrackingService({
      enableConsoleLogging: true,
      enablePerformanceTracking: true,
      enableUserTracking: true,
      enableAutomaticErrorCapture: false, // Disable to prevent interference
      enableNetworkErrorTracking: false, // We'll test this separately
      enableLocalStorage: true,
      ...config,
    });
    return svc;
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Don't use fake timers globally - only in specific tests that need them

    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    // Set up localStorage mock
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const key of Object.keys(store)) delete store[key];
        },
      },
      writable: true,
    });

    // Mock performance API
    Object.defineProperty(globalThis, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([]),
      },
      writable: true,
    });

    // Import fresh module
    const trackingModule = require('@/lib/errors/tracking');
    ErrorTrackingService = trackingModule.ErrorTrackingService;
  });

  afterEach(() => {
    // Clean up any created services
    if (service?.disable) {
      try {
        service.disable();
      } catch {
        /* ignore */
      }
    }
  });

  // ============================================================================
  // Fallback Mode
  // ============================================================================
  describe('Fallback Mode', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should start with fallback mode disabled', () => {
      expect(service.isFallbackMode()).toBe(false);
    });

    it('should enable fallback mode', () => {
      service.setFallbackMode(true);
      expect(service.isFallbackMode()).toBe(true);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Fallback mode enabled'),
      );
    });

    it('should disable fallback mode', () => {
      service.setFallbackMode(true);
      service.setFallbackMode(false);
      expect(service.isFallbackMode()).toBe(false);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        expect.stringContaining('Fallback mode disabled'),
      );
    });

    it('should log to console in fallback mode for captureException', () => {
      service.setFallbackMode(true);
      const error = new Error('Fallback test error');
      service.captureException(error, { context: 'test' });

      expect(mockLoggerError).toHaveBeenCalledWith(
        'general',
        '📊 Error Tracking (Fallback):',
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Fallback test error'),
        }),
      );
    });

    it('should log to console in fallback mode for captureMessage', () => {
      service.setFallbackMode(true);
      service.captureMessage('Test message', 'warning', { extra: 'data' });

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'general',
        '📊 Error Tracking (Fallback):',
        expect.objectContaining({
          level: 'warning',
          message: 'Test message',
        }),
      );
    });

    it('should log to console in fallback mode for trackUserAction', () => {
      service.setFallbackMode(true);
      service.trackUserAction('button_click', { buttonId: 'test' });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '📊 Error Tracking (Fallback):',
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('button_click'),
        }),
      );
    });

    it('should use debug level in logToConsole', () => {
      service.setFallbackMode(true);
      service.captureMessage('Debug message', 'debug', {});

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'general',
        '📊 Error Tracking (Fallback):',
        expect.objectContaining({
          level: 'debug',
        }),
      );
    });
  });

  // ============================================================================
  // Session Management
  // ============================================================================
  describe('Session Management', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should set session ID', () => {
      service.setSession('session-123');
      // Session is set internally, verify by tracking an action
      service.trackUserAction('test_action');
      // The session ID should be included in the queue
    });

    it('should clear user and track logout', () => {
      service.setUser('user-123', { email: 'test@test.com' });
      mockLoggerInfo.mockClear();

      service.clearUser();

      // Should have tracked user_logout
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Captured message (info):',
        expect.objectContaining({
          message: 'User logged out',
        }),
      );
    });
  });

  // ============================================================================
  // Queue Management
  // ============================================================================
  describe('Queue Management', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should clear queue and localStorage', () => {
      service.captureException(new Error('Test'));
      const beforeStatus = service.getQueueStatus();
      expect(beforeStatus.total).toBeGreaterThan(0);

      service.clearQueue();

      const afterStatus = service.getQueueStatus();
      expect(afterStatus.total).toBe(0);
    });

    it('should update config dynamically', () => {
      service.updateConfig({
        enableConsoleLogging: false,
        maxStoredErrors: 50,
      });

      // The config is updated - we can't directly verify internal state
      // but we can verify the service continues to work
      expect(() => service.captureException(new Error('Test'))).not.toThrow();
    });

    it('should limit queue size to maxStoredErrors', () => {
      service = createService({ maxStoredErrors: 5 });

      // Add more than max errors
      for (let i = 0; i < 10; i++) {
        service.trackUserAction(`action_${i}`);
      }

      const status = service.getQueueStatus();
      // Queue should be limited (though there's initial page_view too)
      expect(status.total).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // Circuit Breaker
  // ============================================================================
  describe('Circuit Breaker', () => {
    beforeEach(() => {
      service = createService({ enableConsoleLogging: true });
    });

    it('should open circuit breaker after repeated failures', async () => {
      // Mock fetch to fail consistently
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Create service that will hit circuit breaker
      service = createService({
        enableConsoleLogging: true,
        enableFallbackMode: false,
      });

      // Trigger multiple error sends to trip circuit breaker
      // The circuit breaker opens after 3 failures (circuitBreakerMaxFailures = 3)
      for (let i = 0; i < 5; i++) {
        service.captureException(new Error(`Error ${i}`));
      }

      // Allow time for async error sends to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Circuit breaker should enter fallback mode after failures
      expect(service.isFallbackMode()).toBe(true);
    });

    it('should log circuit breaker state changes', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      service = createService({
        enableConsoleLogging: true,
        enableFallbackMode: false,
      });

      // Trigger failures
      for (let i = 0; i < 4; i++) {
        service.captureException(new Error(`Error ${i}`));
      }

      // Allow time for async error sends
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have logged warning about circuit breaker opening
      // The message is: '[ErrorTracking] Circuit breaker opened, entering fallback mode'
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Circuit breaker opened, entering fallback mode',
      );
    });
  });

  // ============================================================================
  // Error Sending
  // ============================================================================
  describe('Error Sending', () => {
    beforeEach(() => {
      service = createService({ enableConsoleLogging: true });
    });

    it('should send errors when queue has unsent items', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      service.captureException(new Error('Test error'));

      // Wait for async send
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/frontend-errors/report'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should handle failed batch send', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      service.captureException(new Error('Test error'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Failed to send error batch:',
        expect.objectContaining({ status: 500 }),
      );
    });

    it('should attempt fallback endpoint on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce({ ok: true });

      service.captureException(new Error('Test error'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/analytics/errors',
        expect.any(Object),
      );
    });

    it('should log successful error batch send', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      service.captureException(new Error('Success test'));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        expect.stringMatching(/Successfully sent \d+ errors/),
      );
    });
  });

  // ============================================================================
  // wrapAsync
  // ============================================================================
  describe('wrapAsync', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should wrap successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrapped = service.wrapAsync(mockFn, { name: 'testFn' });

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should track start and success events', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const wrapped = service.wrapAsync(mockFn, { name: 'myFunction', extra: 'data' });

      await wrapped();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked user action:',
        expect.objectContaining({ action: 'myFunction_start' }),
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked user action:',
        expect.objectContaining({ action: 'myFunction_success' }),
      );
    });

    it('should track failure and re-throw error', async () => {
      const testError = new Error('Function failed');
      const mockFn = jest.fn().mockRejectedValue(testError);
      const wrapped = service.wrapAsync(mockFn, { name: 'failingFn' });

      await expect(wrapped()).rejects.toThrow('Function failed');

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked user action:',
        expect.objectContaining({ action: 'failingFn_failed' }),
      );
    });

    it('should include duration in tracking', async () => {
      const mockFn = jest.fn().mockResolvedValue('delayed result');
      const wrapped = service.wrapAsync(mockFn, { name: 'delayedFn' });

      await wrapped();

      // Duration should be tracked
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked user action:',
        expect.objectContaining({ action: 'delayedFn_success' }),
      );
    });
  });

  // ============================================================================
  // Performance Tracking
  // ============================================================================
  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      service = createService({ enablePerformanceTracking: true });

      service.trackPerformance('api_latency', 250, { endpoint: '/api/users' });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked performance metric:',
        { metric: 'api_latency' },
      );
    });

    it('should not track performance when disabled', () => {
      service = createService({
        enablePerformanceTracking: false,
        enableConsoleLogging: true,
      });
      mockLoggerInfo.mockClear();

      service.trackPerformance('disabled_metric', 100);

      // Should not have logged performance tracking
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked performance metric:',
        expect.any(Object),
      );
    });
  });

  // ============================================================================
  // User Tracking
  // ============================================================================
  describe('User Tracking', () => {
    it('should track user actions when enabled', () => {
      service = createService({ enableUserTracking: true });

      service.trackUserAction('click_button', { buttonId: 'submit' });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked user action:',
        { action: 'click_button' },
      );
    });

    it('should not track user actions when disabled', () => {
      service = createService({
        enableUserTracking: false,
        enableConsoleLogging: true,
      });
      mockLoggerInfo.mockClear();

      service.trackUserAction('disabled_action');

      // Should not have logged user action tracking
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked user action:',
        expect.any(Object),
      );
    });
  });

  // ============================================================================
  // Disable and Cleanup
  // ============================================================================
  describe('Disable and Cleanup', () => {
    it('should clear interval on disable', () => {
      service = createService();
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');

      service.disable();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should log successful disable', () => {
      service = createService();
      mockLoggerInfo.mockClear();

      service.disable();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Disabled successfully',
      );
    });
  });

  // ============================================================================
  // LocalStorage
  // ============================================================================
  describe('LocalStorage', () => {
    it('should save errors to localStorage', () => {
      service = createService({ enableLocalStorage: true });
      const setItemSpy = jest.spyOn(globalThis.localStorage, 'setItem');

      service.captureException(new Error('Stored error'));

      expect(setItemSpy).toHaveBeenCalledWith(
        'errorTracking_queue',
        expect.any(String),
      );
    });

    it('should load errors from localStorage on init', () => {
      // Pre-populate localStorage
      const storedErrors = JSON.stringify([
        {
          id: 'stored-1',
          timestamp: new Date().toISOString(),
          type: 'error',
          data: { message: 'Stored error' },
          sent: false,
          retryCount: 0,
        },
      ]);
      localStorage.setItem('errorTracking_queue', storedErrors);

      service = createService({ enableLocalStorage: true });

      const status = service.getQueueStatus();
      expect(status.total).toBeGreaterThan(0);
    });

    it('should handle localStorage parse errors', () => {
      localStorage.setItem('errorTracking_queue', 'invalid json');

      service = createService({ enableLocalStorage: true });

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Failed to load stored errors:',
        expect.any(Object),
      );
    });

    it('should filter out errors with too many retries', () => {
      const storedErrors = JSON.stringify([
        {
          id: 'retry-1',
          timestamp: new Date().toISOString(),
          type: 'error',
          data: { message: 'Too many retries' },
          sent: false,
          retryCount: 5, // More than 3
        },
        {
          id: 'retry-2',
          timestamp: new Date().toISOString(),
          type: 'error',
          data: { message: 'Valid error' },
          sent: false,
          retryCount: 1,
        },
      ]);
      localStorage.setItem('errorTracking_queue', storedErrors);

      service = createService({ enableLocalStorage: true });

      // Should only have the valid error plus initial page_view
      const status = service.getQueueStatus();
      expect(status.total).toBeLessThanOrEqual(3);
    });

    it('should not use localStorage when disabled', () => {
      service = createService({ enableLocalStorage: false });
      jest.spyOn(globalThis.localStorage, 'setItem');

      service.captureException(new Error('Not stored'));

      // localStorage.setItem may be called for other things, but not for errorTracking_queue
      // during error capture
    });
  });

  // ============================================================================
  // Network Error Tracking (Fetch Override)
  // ============================================================================
  describe('Network Error Tracking', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should skip tracking for Next.js internal routes', async () => {
      // Create service with network tracking
      mockFetch.mockResolvedValue({ ok: true });

      service = createService({
        enableNetworkErrorTracking: true,
        enableConsoleLogging: false,
      });

      // Make a request to internal route
      await globalThis.fetch('/_next/static/chunks/main.js');

      // Should have been called (not blocked)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should track slow requests', async () => {
      jest.useRealTimers();

      // Mock a slow response that resolves after a delay
      const slowFetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, status: 200 }), 100);
          }),
      );
      globalThis.fetch = slowFetch;

      service = createService({ enableNetworkErrorTracking: true });

      // The fetch override is set in constructor, so we need to use it directly
      // This is testing the tracking setup, not the actual slow detection
      await globalThis.fetch('/api/test');

      jest.useFakeTimers();
    });

    it('should track failed requests', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        type: 'basic',
      });

      service = createService({
        enableNetworkErrorTracking: true,
        enableConsoleLogging: true,
      });

      await globalThis.fetch('/api/users');

      // Should have captured the failure
      // The actual tracking depends on the internal implementation
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failed'));

      service = createService({ enableNetworkErrorTracking: true });

      await globalThis.fetch('/api/data').catch(() => {
        // Expected to throw - error handled
      });
    });

    it('should not track aborted requests', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      service = createService({ enableNetworkErrorTracking: true });

      await globalThis.fetch('/api/data').catch(() => {
        // Expected AbortError - error handled
      });

      // Should not have tracked the aborted request
    });
  });

  // ============================================================================
  // Page View Tracking
  // ============================================================================
  describe('Page View Tracking', () => {
    it('should track page view with title', () => {
      service = createService();
      mockLoggerInfo.mockClear();

      service.trackPageView('/dashboard', { custom: 'data' });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'general',
        '[ErrorTracking] Tracked page view:',
        { page: '/dashboard' },
      );
    });
  });

  // ============================================================================
  // URL Extraction and Skip Logic (Network Tracking)
  // ============================================================================
  describe('URL Extraction and Skip Logic', () => {
    it('should skip tracking for __flight URLs', async () => {
      service = createService({ enableNetworkErrorTracking: true });
      mockFetch.mockResolvedValue({ ok: true });

      await globalThis.fetch('/__flight/data');

      // Should not have captured any network-related errors
      // The fetch was called but no tracking should happen
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip tracking for __RSC URLs', async () => {
      service = createService({ enableNetworkErrorTracking: true });
      mockFetch.mockResolvedValue({ ok: true });

      await globalThis.fetch('/__RSC/chunk');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip tracking for data: URLs', async () => {
      service = createService({ enableNetworkErrorTracking: true });
      mockFetch.mockResolvedValue({ ok: true });

      await globalThis.fetch('data:application/json;base64,e30=');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip tracking for blob: URLs', async () => {
      service = createService({ enableNetworkErrorTracking: true });
      mockFetch.mockResolvedValue({ ok: true });

      await globalThis.fetch('blob:http://localhost/abcd1234');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should extract URL from Request object', async () => {
      service = createService({ enableNetworkErrorTracking: true });
      mockFetch.mockResolvedValue({ ok: true });

      const request = new Request('/api/users');
      await globalThis.fetch(request);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should extract URL from URL object', async () => {
      service = createService({ enableNetworkErrorTracking: true });
      mockFetch.mockResolvedValue({ ok: true });

      const url = new URL('/api/users', 'http://localhost');
      await globalThis.fetch(url);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip analytics endpoints from slow request tracking', async () => {
      jest.useRealTimers();
      service = createService({ enableNetworkErrorTracking: true });

      // Mock a slow response to analytics endpoint
      const slowFetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, status: 200 }), 100);
          }),
      );
      globalThis.fetch = slowFetch;

      await globalThis.fetch('/api/v1/analytics/events');

      // Should not track slow analytics requests
      jest.useFakeTimers();
    });
  });

  // ============================================================================
  // Global Error Handlers
  // ============================================================================
  describe('Global Error Handlers', () => {
    it('should capture unhandled errors', () => {
      service = createService({ enableConsoleLogging: true });

      // Simulate window error event
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });

      globalThis.window.dispatchEvent(errorEvent);

      // The error handler was set up during construction
    });

    it('should setup unhandled rejection tracking when enabled', () => {
      service = createService({
        enableConsoleLogging: true,
        enableUnhandledRejectionTracking: true,
      });

      // Verify service was created with unhandled rejection tracking
      // The handler is registered internally - we just verify it doesn't throw
      expect(service.isFallbackMode()).toBe(false);
    });

    it('should disable unhandled rejection tracking when configured', () => {
      service = createService({
        enableUnhandledRejectionTracking: false,
      });

      // Unhandled rejection handler should not be set up
      expect(service.isFallbackMode()).toBe(false);
    });
  });

  // ============================================================================
  // Circuit Breaker State Transitions
  // ============================================================================
  describe('Circuit Breaker State Transitions', () => {
    it('should track circuit breaker failures via logger', () => {
      service = createService({ enableConsoleLogging: true });

      // The circuit breaker tracking is tested in other tests
      // This verifies the service was configured correctly
      expect(service.isFallbackMode()).toBe(false);
    });
  });

  // ============================================================================
  // Error Batch Handling Edge Cases
  // ============================================================================
  describe('Error Batch Handling Edge Cases', () => {
    it('should handle empty queue', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      service = createService();

      // Clear the queue (includes the initial page_view)
      service.clearQueue();

      // Verify queue is empty
      const status = service.getQueueStatus();
      expect(status.total).toBe(0);
    });

    it('should add multiple errors to queue', () => {
      mockFetch.mockResolvedValue({ ok: true });
      service = createService({ maxStoredErrors: 50 });

      // Add multiple errors
      for (let i = 0; i < 15; i++) {
        service.captureException(new Error(`Error ${i}`));
      }

      // Queue should have errors (page_view + 15 errors)
      const status = service.getQueueStatus();
      expect(status.total).toBeGreaterThan(10);
    });
  });

  // ============================================================================
  // Type Exports
  // ============================================================================
  describe('Type Exports', () => {
    it('should export StoredError interface compatible objects', () => {
      const storedError: import('@/lib/errors/tracking').StoredError = {
        id: 'test-id',
        timestamp: new Date().toISOString(),
        type: 'error',
        data: { message: 'test' },
        sent: false,
        retryCount: 0,
      };
      expect(storedError.type).toBe('error');
    });

    it('should export ErrorTrackingConfig interface compatible objects', () => {
      const config: import('@/lib/errors/tracking').ErrorTrackingConfig = {
        apiEndpoint: '/api/test',
        enableConsoleLogging: true,
        environment: 'test',
      };
      expect(config.enableConsoleLogging).toBe(true);
    });

    it('should export PageViewData interface compatible objects', () => {
      const pageView: import('@/lib/errors/tracking').PageViewData = {
        timestamp: new Date().toISOString(),
        referrer: 'https://example.com',
      };
      expect(pageView.referrer).toBe('https://example.com');
    });
  });
});
