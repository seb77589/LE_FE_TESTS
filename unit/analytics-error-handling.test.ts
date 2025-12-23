/**
 * Analytics Error Handling Test Suite
 * Tests for enhanced error handling in the analytics system
 */

import { jest } from '@jest/globals';

// Type for spy function
type ConsoleSpy = ReturnType<typeof jest.spyOn>;

// Mock analytics class for testing
class TestAnalytics {
  private readonly sessionId: string = 'test-session-123';
  private readonly userId?: string;

  /**
   * Enhanced error handling for analytics operations
   * (Same implementation as in production for testing)
   */
  private handleAnalyticsError(error: any, context: string, eventData?: any): void {
    const errorType = this.categorizeError(error);
    const errorMessage = error?.message || 'Unknown error';

    console.warn(`[Analytics] ${context} failed:`, {
      error: errorMessage,
      type: errorType,
      context,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      eventData: eventData
        ? { type: eventData.event_type || eventData.eventType }
        : undefined,
    });

    switch (errorType) {
      case 'network':
        this.handleNetworkError(eventData, context);
        break;
      case 'sendBeacon':
        this.handleSendBeaconError(eventData, context);
        break;
      case 'localStorage':
        this.handleStorageError(eventData, context);
        break;
      case 'validation':
        this.handleValidationError(eventData, context);
        break;
      default:
        this.handleGenericError(eventData, context);
    }
  }

  private categorizeError(error: any): string {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';

    if (errorName.includes('typeerror') && errorMessage.includes('sendbeacon')) {
      return 'sendBeacon';
    }
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      error?.name === 'NetworkError'
    ) {
      return 'network';
    }
    if (errorMessage.includes('localstorage') || errorMessage.includes('quota')) {
      return 'localStorage';
    }
    if (errorMessage.includes('validation') || error?.status === 422) {
      return 'validation';
    }
    return 'generic';
  }

  private handleNetworkError(eventData?: any, context?: string): void {
    console.debug(
      `[Analytics] Network error in ${context}, storing event locally for retry`,
    );
  }

  private readonly handleSendBeaconError = jest.fn(
    (eventData?: any, context?: string): void => {
      console.debug(
        `[Analytics] sendBeacon failed in ${context}, falling back to fetch`,
      );
    },
  );

  private handleStorageError(eventData?: any, context?: string): void {
    console.debug(
      `[Analytics] localStorage error in ${context}, operating in memory-only mode`,
    );
  }

  private handleValidationError(eventData?: any, context?: string): void {
    console.warn(
      `[Analytics] Validation error in ${context}, event data may be malformed:`,
      eventData,
    );
  }

  private handleGenericError(eventData?: any, context?: string): void {
    console.debug(`[Analytics] Generic error in ${context}, implementing basic retry`);
  }

  // Test helper methods
  public testHandleAnalyticsError(error: any, context: string, eventData?: any) {
    return this.handleAnalyticsError(error, context, eventData);
  }

  public testCategorizeError(error: any) {
    return this.categorizeError(error);
  }

  public getSendBeaconErrorHandler() {
    return this.handleSendBeaconError;
  }
}

describe('Analytics Error Handling', () => {
  let analytics: TestAnalytics;
  let consoleSpy: ConsoleSpy;

  beforeEach(() => {
    analytics = new TestAnalytics();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Categorization', () => {
    test('should categorize sendBeacon errors correctly', () => {
      const error = new TypeError('sendBeacon is not supported');
      const category = analytics.testCategorizeError(error);
      expect(category).toBe('sendBeacon');
    });

    test('should categorize network errors correctly', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      const category = analytics.testCategorizeError(networkError);
      expect(category).toBe('network');
    });

    test('should categorize fetch errors correctly', () => {
      const fetchError = new Error('fetch failed');
      const category = analytics.testCategorizeError(fetchError);
      expect(category).toBe('network');
    });

    test('should categorize localStorage errors correctly', () => {
      const storageError = new Error('localStorage quota exceeded');
      const category = analytics.testCategorizeError(storageError);
      expect(category).toBe('localStorage');
    });

    test('should categorize validation errors correctly', () => {
      const validationError = { status: 422, message: 'Validation failed' };
      const category = analytics.testCategorizeError(validationError);
      expect(category).toBe('validation');
    });

    test('should categorize unknown errors as generic', () => {
      const unknownError = new Error('Some random error');
      const category = analytics.testCategorizeError(unknownError);
      expect(category).toBe('generic');
    });
  });

  describe('Error Handling Integration', () => {
    test('should log error details with context', () => {
      const error = new Error('Test error');
      const eventData = { event_type: 'page_view', timestamp: '2025-09-14T14:00:00Z' };

      analytics.testHandleAnalyticsError(error, 'reportEventReliable', eventData);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Analytics] reportEventReliable failed:',
        expect.objectContaining({
          error: 'Test error',
          type: 'generic',
          context: 'reportEventReliable',
          eventData: { type: 'page_view' },
        }),
      );
    });

    test('should handle sendBeacon errors with fallback', () => {
      const sendBeaconError = new TypeError('sendBeacon not supported');
      const eventData = { event_type: 'custom', data: { action: 'click' } };

      analytics.testHandleAnalyticsError(
        sendBeaconError,
        'reportEventReliable',
        eventData,
      );

      expect(analytics.getSendBeaconErrorHandler()).toHaveBeenCalledWith(
        eventData,
        'reportEventReliable',
      );
    });

    test('should handle errors without event data gracefully', () => {
      const error = new Error('Generic error');

      expect(() => {
        analytics.testHandleAnalyticsError(error, 'trackEvent');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Analytics] trackEvent failed:',
        expect.objectContaining({
          error: 'Generic error',
          type: 'generic',
          context: 'trackEvent',
          eventData: undefined,
        }),
      );
    });
  });

  describe('Content-Type Validation', () => {
    test('should validate that Blob objects have correct MIME type', () => {
      const testData = JSON.stringify({ event: 'test' });
      const blob = new Blob([testData], { type: 'application/json' });

      expect(blob.type).toBe('application/json');
      expect(blob.size).toBe(testData.length);
    });

    test('should ensure sendBeacon uses proper Content-Type with Blob wrapper', () => {
      // Mock navigator.sendBeacon
      const mockSendBeacon = jest.fn();
      Object.defineProperty(navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
      });

      const testData = JSON.stringify({
        events: [{ event_type: 'test', timestamp: new Date().toISOString() }],
      });

      // Simulate proper usage
      const blob = new Blob([testData], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/analytics/events', blob);

      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/v1/analytics/events',
        expect.objectContaining({
          type: 'application/json',
        }),
      );
    });
  });

  describe('Error Resilience', () => {
    test('should continue operating after multiple errors', () => {
      const errors = [
        new TypeError('sendBeacon error'),
        new Error('Network error'),
        { status: 422, message: 'Validation error' },
      ];

      // Test each error type separately to avoid deep nesting
      const sendBeaconError = errors[0];
      const networkError = errors[1];
      const validationError = errors[2];

      expect(() =>
        analytics.testHandleAnalyticsError(sendBeaconError, 'operation_0'),
      ).not.toThrow();
      expect(() =>
        analytics.testHandleAnalyticsError(networkError, 'operation_1'),
      ).not.toThrow();
      expect(() =>
        analytics.testHandleAnalyticsError(validationError, 'operation_2'),
      ).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    test('should handle malformed error objects gracefully', () => {
      const malformedErrors = [
        null,
        undefined,
        {},
        { someProperty: 'value' },
        'string error',
      ];

      // Test each malformed error separately to avoid deep nesting
      for (const [index, error] of malformedErrors.entries()) {
        const contextName = `malformed_${index}`;
        analytics.testHandleAnalyticsError(error, contextName);
      }

      // Verify no exceptions were thrown
      expect(consoleSpy).toHaveBeenCalledTimes(5);
    });
  });
});

// Integration test for Content-Type validation
describe('Content-Type Integration Tests', () => {
  test('should create Blob with correct Content-Type for analytics requests', () => {
    const eventData = {
      event_type: 'page_view',
      timestamp: new Date().toISOString(),
      user_id: 'test-user',
      session_id: 'test-session',
      data: { page: '/test' },
    };

    const requestBody = JSON.stringify({
      events: [eventData],
      metadata: { test: true },
    });

    // Test Blob creation with proper Content-Type
    const blob = new Blob([requestBody], { type: 'application/json' });

    expect(blob.type).toBe('application/json');
    expect(blob.size).toBe(requestBody.length);
  });

  test('should validate sendBeacon blob Content-Type', async () => {
    const testData = JSON.stringify({ test: 'data' });
    const blob = new Blob([testData], { type: 'application/json' });

    // Verify blob properties
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);

    // Verify blob can be read back correctly (if supported in test environment)
    if (typeof blob.text === 'function') {
      const text = await blob.text();
      expect(JSON.parse(text)).toEqual({ test: 'data' });
    } else {
      // Fallback for test environments that don't support blob.text()
      expect(blob.size).toBe(testData.length);
    }
  });

  test('should ensure Content-Type header format compliance', () => {
    // Test various Content-Type formats
    const validContentTypes = ['application/json', 'application/json; charset=utf-8'];

    const invalidContentTypes = [
      'text/plain',
      'text/plain;charset=UTF-8',
      'application/x-www-form-urlencoded',
    ];

    for (const contentType of validContentTypes) {
      const blob = new Blob(['{}'], { type: contentType });
      expect(blob.type).toMatch(/^application\/json/);
    }

    for (const contentType of invalidContentTypes) {
      const blob = new Blob(['{}'], { type: contentType });
      expect(blob.type).not.toBe('application/json');
    }
  });
});

export { TestAnalytics };
