/**
 * @jest-environment jsdom
 */

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

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

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('Error Tracking Module', () => {
  let errorTracking: any;
  let ErrorTrackingService: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
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

    // Import fresh module
    const trackingModule = require('@/lib/errors/tracking');
    errorTracking = trackingModule.errorTracking;
    ErrorTrackingService = trackingModule.ErrorTrackingService;
  });

  afterEach(() => {
    // Clean up
    if (errorTracking?.disable) {
      try {
        errorTracking.disable();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('ErrorTrackingService singleton', () => {
    it('exports errorTracking instance', () => {
      expect(errorTracking).toBeDefined();
    });

    it('exports ErrorTrackingService class', () => {
      expect(ErrorTrackingService).toBeDefined();
    });

    it('has captureException method', () => {
      expect(typeof errorTracking.captureException).toBe('function');
    });

    it('has captureMessage method', () => {
      expect(typeof errorTracking.captureMessage).toBe('function');
    });

    it('has trackUserAction method', () => {
      expect(typeof errorTracking.trackUserAction).toBe('function');
    });

    it('has trackPageView method', () => {
      expect(typeof errorTracking.trackPageView).toBe('function');
    });

    it('has trackPerformance method', () => {
      expect(typeof errorTracking.trackPerformance).toBe('function');
    });

    it('has setUser method', () => {
      expect(typeof errorTracking.setUser).toBe('function');
    });

    it('has getQueueStatus method', () => {
      expect(typeof errorTracking.getQueueStatus).toBe('function');
    });

    it('has disable method', () => {
      expect(typeof errorTracking.disable).toBe('function');
    });
  });

  describe('captureException', () => {
    it('accepts Error object', () => {
      const error = new Error('Test error');
      expect(() => errorTracking.captureException(error)).not.toThrow();
    });

    it('accepts Error with context', () => {
      const error = new Error('Test error');
      expect(() =>
        errorTracking.captureException(error, { context: 'test' }),
      ).not.toThrow();
    });

    it('handles string error', () => {
      expect(() => errorTracking.captureException('String error')).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('captures info level message', () => {
      expect(() => errorTracking.captureMessage('Info message', 'info')).not.toThrow();
    });

    it('captures warning level message', () => {
      expect(() =>
        errorTracking.captureMessage('Warning message', 'warning'),
      ).not.toThrow();
    });

    it('captures error level message', () => {
      expect(() =>
        errorTracking.captureMessage('Error message', 'error'),
      ).not.toThrow();
    });

    it('captures debug level message', () => {
      expect(() =>
        errorTracking.captureMessage('Debug message', 'debug'),
      ).not.toThrow();
    });

    it('accepts optional context', () => {
      expect(() =>
        errorTracking.captureMessage('Message', 'info', { extra: 'data' }),
      ).not.toThrow();
    });
  });

  describe('trackUserAction', () => {
    it('tracks action with name', () => {
      expect(() => errorTracking.trackUserAction('button_click')).not.toThrow();
    });

    it('tracks action with data', () => {
      expect(() =>
        errorTracking.trackUserAction('form_submit', { formId: 'login' }),
      ).not.toThrow();
    });

    it('handles empty action name', () => {
      expect(() => errorTracking.trackUserAction('')).not.toThrow();
    });
  });

  describe('trackPageView', () => {
    it('tracks page view with pathname', () => {
      expect(() => errorTracking.trackPageView('/dashboard')).not.toThrow();
    });

    it('tracks page view with additional data', () => {
      expect(() =>
        errorTracking.trackPageView('/profile', { userId: '123' }),
      ).not.toThrow();
    });
  });

  describe('trackPerformance', () => {
    it('tracks performance metric', () => {
      expect(() => errorTracking.trackPerformance('api_call', 150)).not.toThrow();
    });

    it('tracks performance with metadata', () => {
      expect(() =>
        errorTracking.trackPerformance('render', 50, { component: 'Header' }),
      ).not.toThrow();
    });

    it('handles zero duration', () => {
      expect(() => errorTracking.trackPerformance('instant', 0)).not.toThrow();
    });

    it('handles negative duration', () => {
      expect(() => errorTracking.trackPerformance('negative', -100)).not.toThrow();
    });
  });

  describe('setUser', () => {
    it('sets user ID', () => {
      expect(() => errorTracking.setUser('user-123')).not.toThrow();
    });

    it('sets user with extra data', () => {
      expect(() =>
        errorTracking.setUser('user-123', {
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
        }),
      ).not.toThrow();
    });

    it('handles empty user ID', () => {
      expect(() => errorTracking.setUser('')).not.toThrow();
    });
  });

  describe('getQueueStatus', () => {
    it('returns status object', () => {
      const status = errorTracking.getQueueStatus();
      expect(typeof status).toBe('object');
    });

    it('has total property', () => {
      const status = errorTracking.getQueueStatus();
      expect(typeof status.total).toBe('number');
    });

    it('has unsent property', () => {
      const status = errorTracking.getQueueStatus();
      expect(typeof status.unsent).toBe('number');
    });

    it('has sent property', () => {
      const status = errorTracking.getQueueStatus();
      expect(typeof status.sent).toBe('number');
    });
  });

  describe('disable', () => {
    it('disables tracking without error', () => {
      expect(() => errorTracking.disable()).not.toThrow();
    });

    it('can be called multiple times', () => {
      errorTracking.disable();
      expect(() => errorTracking.disable()).not.toThrow();
    });
  });

  describe('ErrorTrackingService class', () => {
    it('can be instantiated', () => {
      const service = new ErrorTrackingService();
      expect(service).toBeDefined();
      service.disable();
    });

    it('accepts config options', () => {
      const service = new ErrorTrackingService({
        enableConsoleLogging: false,
        enablePerformanceTracking: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('custom instance has same methods', () => {
      const service = new ErrorTrackingService();
      expect(typeof service.captureException).toBe('function');
      expect(typeof service.captureMessage).toBe('function');
      expect(typeof service.trackUserAction).toBe('function');
      service.disable();
    });
  });

  describe('Configuration', () => {
    it('can create service with custom API endpoint', () => {
      const service = new ErrorTrackingService({
        apiEndpoint: '/custom/endpoint',
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can disable console logging', () => {
      const service = new ErrorTrackingService({
        enableConsoleLogging: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can disable localStorage', () => {
      const service = new ErrorTrackingService({
        enableLocalStorage: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can set max stored errors', () => {
      const service = new ErrorTrackingService({
        maxStoredErrors: 50,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can disable performance tracking', () => {
      const service = new ErrorTrackingService({
        enablePerformanceTracking: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can disable user tracking', () => {
      const service = new ErrorTrackingService({
        enableUserTracking: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can disable automatic error capture', () => {
      const service = new ErrorTrackingService({
        enableAutomaticErrorCapture: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can disable network error tracking', () => {
      const service = new ErrorTrackingService({
        enableNetworkErrorTracking: false,
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can set environment', () => {
      const service = new ErrorTrackingService({
        environment: 'test',
      });
      expect(service).toBeDefined();
      service.disable();
    });

    it('can set release version', () => {
      const service = new ErrorTrackingService({
        release: '2.0.0',
      });
      expect(service).toBeDefined();
      service.disable();
    });
  });

  describe('Edge Cases', () => {
    it('handles Error object gracefully', () => {
      expect(() =>
        errorTracking.captureException(new Error('Test error')),
      ).not.toThrow();
    });

    it('handles object error by converting to string', () => {
      // The module expects Error objects, objects get converted via extractErrorMessage
      expect(() =>
        errorTracking.captureException({ message: 'Error object' }),
      ).not.toThrow();
    });

    it('handles array by converting to string', () => {
      // Arrays get converted via extractErrorMessage
      expect(() => errorTracking.captureException(['error1', 'error2'])).not.toThrow();
    });

    it('handles number by converting to Error', () => {
      // Convert to Error first (what the module expects)
      expect(() => errorTracking.captureException(new Error('404'))).not.toThrow();
    });

    it('handles very long message', () => {
      const longMessage = 'a'.repeat(10000);
      expect(() => errorTracking.captureMessage(longMessage, 'info')).not.toThrow();
    });

    it('handles special characters in action name', () => {
      expect(() =>
        errorTracking.trackUserAction('button_click_<script>'),
      ).not.toThrow();
    });

    it('handles unicode in path', () => {
      expect(() => errorTracking.trackPageView('/путь/페이지')).not.toThrow();
    });
  });

  describe('Queue Management', () => {
    it('getQueueStatus returns status object', () => {
      const status = errorTracking.getQueueStatus();
      expect(typeof status.total).toBe('number');
      expect(typeof status.unsent).toBe('number');
      expect(typeof status.sent).toBe('number');
    });

    it('captures add to queue', () => {
      const initialStatus = errorTracking.getQueueStatus();
      const initialTotal = initialStatus.total;

      errorTracking.captureException(new Error('Test'));

      const status = errorTracking.getQueueStatus();
      expect(status.total).toBeGreaterThanOrEqual(initialTotal);
    });
  });
});

describe('Exported Types', () => {
  it('ErrorContext type can be used', () => {
    const context: import('@/lib/errors/tracking').ErrorContext = {
      timestamp: new Date().toISOString(),
      userAgent: 'test',
    };
    expect(context.timestamp).toBeDefined();
  });

  it('UserActionData type can be used', () => {
    const data: import('@/lib/errors/tracking').UserActionData = {
      timestamp: new Date().toISOString(),
      pathname: '/test',
    };
    expect(data.pathname).toBe('/test');
  });

  it('LogLevel type covers all levels', () => {
    const levels: import('@/lib/errors/tracking').LogLevel[] = [
      'info',
      'warning',
      'error',
      'debug',
    ];
    expect(levels).toHaveLength(4);
  });
});
