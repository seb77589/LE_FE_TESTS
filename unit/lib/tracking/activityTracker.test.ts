/**
 * @jest-environment jsdom
 */

// Mock logger before imports - define inside factory to avoid hoisting issues
jest.mock('@/lib/logging', () => {
  const mockLoggerInstance = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLoggerInstance,
    Logger: jest.fn(() => mockLoggerInstance),
  };
});

// Mock sessionManager and tokenManager
jest.mock('@/lib/session', () => ({
  sessionManager: {
    getSessionId: jest.fn(),
  },
  tokenManager: {
    isAuthenticated: jest.fn(),
  },
}));

// Mock buildUrl
jest.mock('@/lib/api/config', () => ({
  buildUrl: jest.fn((path: string) => `http://localhost:8000${path}`),
}));

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// ==============================================================================
// Module-level mock response factories (extracted to reduce nesting - fixes S2004)
// ==============================================================================

// Factory for creating successful fetch responses with JSON data
function createMockFetchResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

// Factory for creating error fetch responses with text body
function createMockFetchErrorResponse(status: number, errorText: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(errorText),
  };
}

// Factory for creating auth failure response
function createMockAuthFailureResponse() {
  return {
    ok: false,
    status: 401,
  };
}

// Default successful batch response data
const defaultBatchResponseData = { ingested_count: 1, failed_count: 0 };

import { ActivityTracker } from '@/lib/tracking/activityTracker';
import logger from '@/lib/logging';
import { sessionManager, tokenManager } from '@/lib/session';

// Get typed references to mocks
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockGetSessionId = sessionManager.getSessionId as jest.Mock;
const mockIsAuthenticated = tokenManager.isAuthenticated as jest.Mock;

describe('ActivityTracker', () => {
  let tracker: ActivityTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock returns
    mockGetSessionId.mockReturnValue('test-session-123');
    mockIsAuthenticated.mockResolvedValue(true);
    mockFetch.mockResolvedValue(createMockFetchResponse(defaultBatchResponseData));
  });

  afterEach(() => {
    if (tracker) {
      tracker.stopTracking();
    }
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      tracker = new ActivityTracker();
      expect(tracker).toBeDefined();
    });

    it('should create instance with custom config', () => {
      tracker = new ActivityTracker({
        trackClicks: false,
        trackScrolls: false,
        debounceMs: 500,
        maxEventsPerMinute: 30,
      });
      expect(tracker).toBeDefined();
    });

    it('should start tracking when explicitly called', () => {
      tracker = new ActivityTracker();
      tracker.startTracking();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'activity',
        'Activity tracking started',
      );
    });

    it('should not start tracking when disabled', () => {
      tracker = new ActivityTracker({ enabled: false });
      const summary = tracker.getActivitySummary();
      expect(summary.eventCount).toBe(0);
    });
  });

  describe('startTracking', () => {
    it('should not start tracking if already tracking', () => {
      tracker = new ActivityTracker();
      tracker.startTracking();
      mockLogger.info.mockClear();

      tracker.startTracking();
      // Should not log again since already tracking
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'activity',
        'Activity tracking started',
      );
    });

    it('should setup event listeners based on config', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      tracker = new ActivityTracker({
        trackClicks: true,
        trackScrolls: true,
        trackKeypresses: true,
        trackMouseMovement: true,
        trackFocus: true,
        trackFormInputs: true,
      });
      tracker.startTracking();

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), {
        passive: true,
      });
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
        { passive: true },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function), {
        passive: true,
      });
      expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function), {
        passive: true,
      });
      expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function), {
        passive: true,
      });

      addEventListenerSpy.mockRestore();
    });

    it('should not setup click listener when trackClicks is false', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      tracker = new ActivityTracker({
        trackClicks: false,
        trackScrolls: false,
        trackKeypresses: false,
        trackMouseMovement: false,
        trackFocus: false,
        trackFormInputs: false,
      });

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        expect.anything(),
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe('stopTracking', () => {
    it('should remove all event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      tracker = new ActivityTracker();
      tracker.startTracking();
      tracker.stopTracking();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should clear timers', () => {
      tracker = new ActivityTracker();
      tracker.startTracking();
      tracker.stopTracking();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'activity',
        'Activity tracking stopped',
      );
    });

    it('should flush remaining events before stopping', async () => {
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 100, // High so it doesn't auto-sync
        debounceMs: 10,
      });
      tracker.startTracking();

      // Simulate some activity
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      // Process debounce
      jest.advanceTimersByTime(15);

      // Wait for processActivity to run
      await Promise.resolve();

      tracker.stopTracking();

      // Wait for async flush to complete
      await Promise.resolve();
      await Promise.resolve();

      // Should have attempted to flush
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle flush errors gracefully', async () => {
      // Note: Errors during flush are caught inside syncToServer and logged there,
      // not in the stopTracking .catch() handler.
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 100, // High so it doesn't auto-sync
        debounceMs: 10,
      });
      tracker.startTracking();

      // Simulate some activity
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      // Process debounce
      jest.advanceTimersByTime(15);

      // Wait for processActivity to run
      await Promise.resolve();

      tracker.stopTracking();

      // Wait for async operations
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      // Run any remaining timers
      jest.runAllTimers();
      await Promise.resolve();

      // The error is logged inside syncToServer, not the stopTracking .catch()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'activity',
        'Failed to sync events to server',
        expect.objectContaining({
          error: 'Network error',
        }),
      );
    });

    it('should not try to stop if not tracking', () => {
      tracker = new ActivityTracker({ enabled: false });
      mockLogger.info.mockClear();
      tracker.stopTracking();

      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'activity',
        'Activity tracking stopped',
      );
    });
  });

  describe('getLastActivity', () => {
    it('should return last activity timestamp', () => {
      const now = Date.now();
      tracker = new ActivityTracker();
      const lastActivity = tracker.getLastActivity();
      expect(lastActivity).toBeGreaterThanOrEqual(now - 100);
      expect(lastActivity).toBeLessThanOrEqual(Date.now() + 100);
    });
  });

  describe('isActive', () => {
    it('should return true when user is active', () => {
      tracker = new ActivityTracker({ inactivityThreshold: 30000 });
      expect(tracker.isActive()).toBe(true);
    });

    it('should return false after inactivity threshold', () => {
      tracker = new ActivityTracker({ inactivityThreshold: 1000 });

      // Advance time past threshold
      jest.advanceTimersByTime(2000);

      expect(tracker.isActive()).toBe(false);
    });
  });

  describe('addActivityListener / removeActivityListener', () => {
    it('should add listener', () => {
      tracker = new ActivityTracker();
      tracker.startTracking();
      const listener = jest.fn();
      tracker.addActivityListener(listener);

      // Trigger activity
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      // Process debounce
      jest.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'click',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should remove listener', () => {
      tracker = new ActivityTracker();
      const listener = jest.fn();
      tracker.addActivityListener(listener);
      tracker.removeActivityListener(listener);

      // Trigger activity
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      // Process debounce
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not throw when removing non-existent listener', () => {
      tracker = new ActivityTracker();
      const listener = jest.fn();
      expect(() => tracker.removeActivityListener(listener)).not.toThrow();
    });
  });

  describe('getActivitySummary', () => {
    it('should return activity summary', () => {
      tracker = new ActivityTracker();
      const summary = tracker.getActivitySummary();

      expect(summary).toEqual({
        lastActivity: expect.any(Number),
        isActive: true,
        eventCount: 0,
        timeSinceLastActivity: expect.any(Number),
      });
    });

    it('should include correct event count', () => {
      tracker = new ActivityTracker();
      tracker.startTracking();

      // Trigger activity
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      // Process debounce
      jest.advanceTimersByTime(1100);

      const summary = tracker.getActivitySummary();
      expect(summary.eventCount).toBe(1);
    });
  });

  describe('event handlers', () => {
    describe('click events', () => {
      it('should record click events with coordinates', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const clickEvent = new MouseEvent('click', {
          clientX: 150,
          clientY: 250,
          button: 0,
        });
        document.dispatchEvent(clickEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'click',
            metadata: expect.objectContaining({
              x: 150,
              y: 250,
              button: 0,
            }),
          }),
        );
      });
    });

    describe('scroll events', () => {
      it('should record scroll events', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const scrollEvent = new Event('scroll');
        document.dispatchEvent(scrollEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'scroll',
          }),
        );
      });
    });

    describe('keypress events', () => {
      it('should record keypress events', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const keyEvent = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
        });
        document.dispatchEvent(keyEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'keypress',
            metadata: expect.objectContaining({
              key: 'a',
              code: 'KeyA',
            }),
          }),
        );
      });

      it('should ignore modifier keys', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.addActivityListener(listener);

        const ignoredKeys = ['Tab', 'Shift', 'Control', 'Alt', 'Meta'];
        for (const key of ignoredKeys) {
          const keyEvent = new KeyboardEvent('keydown', { key });
          document.dispatchEvent(keyEvent);
        }

        jest.advanceTimersByTime(1100);

        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe('mousemove events', () => {
      it('should record mouse movement when enabled', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker({ trackMouseMovement: true });
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const moveEvent = new MouseEvent('mousemove', {
          clientX: 200,
          clientY: 300,
        });
        document.dispatchEvent(moveEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'mousemove',
            metadata: expect.objectContaining({
              x: 200,
              y: 300,
            }),
          }),
        );
      });

      it('should not record mouse movement when disabled (default)', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker(); // trackMouseMovement: false by default
        tracker.addActivityListener(listener);

        const moveEvent = new MouseEvent('mousemove', {
          clientX: 200,
          clientY: 300,
        });
        document.dispatchEvent(moveEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).not.toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'mousemove',
          }),
        );
      });
    });

    describe('focus/blur events', () => {
      it('should record focus events', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const focusEvent = new FocusEvent('focus');
        document.dispatchEvent(focusEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'focus',
          }),
        );
      });

      it('should record blur events', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const blurEvent = new FocusEvent('blur');
        document.dispatchEvent(blurEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'blur',
          }),
        );
      });
    });

    describe('form input events', () => {
      it('should record form input events for input elements', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.startTracking();
        tracker.addActivityListener(listener);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'test';
        document.body.appendChild(input);

        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'form_input',
            metadata: expect.objectContaining({
              inputType: 'text',
              valueLength: 4,
            }),
          }),
        );

        input.remove();
      });

      it('should ignore non-form elements', () => {
        const listener = jest.fn();
        tracker = new ActivityTracker();
        tracker.addActivityListener(listener);

        const div = document.createElement('div');
        document.body.appendChild(div);

        const inputEvent = new Event('input', { bubbles: true });
        div.dispatchEvent(inputEvent);

        jest.advanceTimersByTime(1100);

        expect(listener).not.toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'form_input',
          }),
        );

        div.remove();
      });
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid events', () => {
      const listener = jest.fn();
      tracker = new ActivityTracker({ debounceMs: 500 });
      tracker.startTracking();
      tracker.addActivityListener(listener);

      // Fire multiple clicks rapidly
      for (let i = 0; i < 5; i++) {
        const clickEvent = new MouseEvent('click', {
          clientX: i * 10,
          clientY: i * 10,
        });
        document.dispatchEvent(clickEvent);
      }

      // Advance time to process debounce
      jest.advanceTimersByTime(600);

      // Should only get the last event due to debouncing
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('event queue limiting', () => {
    it('should limit event queue to maxEventsPerMinute', () => {
      tracker = new ActivityTracker({
        maxEventsPerMinute: 5,
        debounceMs: 10,
      });

      // Fire more events than the limit
      for (let i = 0; i < 10; i++) {
        const clickEvent = new MouseEvent('click', {
          clientX: i * 10,
          clientY: i * 10,
        });
        document.dispatchEvent(clickEvent);
        jest.advanceTimersByTime(20); // Ensure debounce timer fires
      }

      const summary = tracker.getActivitySummary();
      expect(summary.eventCount).toBeLessThanOrEqual(5);
    });
  });

  describe('server sync', () => {
    it('should sync events to server', async () => {
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 1,
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(15);

      // Allow multiple async operations to complete
      // processActivity -> syncToServer -> checkAuthentication -> fetch
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/activity/batch',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
      );
    });

    it('should not sync when server sync is disabled', () => {
      tracker = new ActivityTracker({
        enableServerSync: false,
        debounceMs: 10,
      });

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not sync when no session ID', async () => {
      mockGetSessionId.mockReturnValue(null);
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 1,
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);
      await Promise.resolve();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'activity',
        'Cannot sync events: no session ID',
      );
    });

    it('should skip sync when not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 1,
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);
      await Promise.resolve();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'activity',
        'Skipping sync - user not authenticated',
      );
    });

    it('should handle 401 response', async () => {
      mockFetch.mockResolvedValueOnce(createMockAuthFailureResponse());

      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 1,
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(15);

      // Multiple promise resolutions for:
      // processActivity -> syncToServer -> checkAuthentication -> fetch -> processSyncResponse
      for (let i = 0; i < 6; i++) {
        await Promise.resolve();
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'activity',
        'Authentication failed, clearing event queue',
      );
    });

    it('should handle error response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchErrorResponse(500, 'Internal Server Error'),
      );

      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 1,
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(15);

      // Multiple promise resolutions for async chain
      for (let i = 0; i < 8; i++) {
        await Promise.resolve();
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'activity',
        expect.stringContaining('Failed to sync activities: 500'),
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 1,
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(15);

      // Multiple promise resolutions for async chain
      for (let i = 0; i < 8; i++) {
        await Promise.resolve();
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'activity',
        'Failed to sync events to server',
        expect.objectContaining({
          error: 'Network error',
        }),
      );
    });

    it('should handle partially failed sync', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFetchResponse({ ingested_count: 3, failed_count: 2 }),
      );

      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 5,
        debounceMs: 10,
      });
      tracker.startTracking();

      // Fire multiple events
      for (let i = 0; i < 5; i++) {
        const clickEvent = new MouseEvent('click', {
          clientX: i * 10,
          clientY: i * 10,
        });
        document.dispatchEvent(clickEvent);
        jest.advanceTimersByTime(15);
      }

      // Multiple promise resolutions for async chain
      for (let i = 0; i < 8; i++) {
        await Promise.resolve();
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'activity',
        'Some events failed to sync',
        expect.objectContaining({
          failedCount: 2,
        }),
      );
    });

    it('should trigger periodic sync', async () => {
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncIntervalMs: 1000,
        syncBatchSize: 100, // High to prevent auto-sync on batch
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(15);

      // Wait for debounce processing
      await Promise.resolve();

      // Clear initial calls
      mockFetch.mockClear();

      // Add another event
      document.dispatchEvent(clickEvent);
      jest.advanceTimersByTime(15);

      // Wait for debounce processing
      await Promise.resolve();

      // Advance to periodic sync interval
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      for (let i = 0; i < 8; i++) {
        await Promise.resolve();
      }

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('flushToServer', () => {
    it('should manually flush events', async () => {
      tracker = new ActivityTracker({
        enableServerSync: true,
        syncBatchSize: 100, // High batch size to prevent auto-sync
        debounceMs: 10,
      });
      tracker.startTracking();

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);
      mockFetch.mockClear();

      await tracker.flushToServer();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should not flush when server sync is disabled', async () => {
      tracker = new ActivityTracker({
        enableServerSync: false,
        debounceMs: 10,
      });

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);

      await tracker.flushToServer();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('element identifier', () => {
    it('should identify element by id', () => {
      const listener = jest.fn();
      tracker = new ActivityTracker();
      tracker.startTracking();
      tracker.addActivityListener(listener);

      const button = document.createElement('button');
      button.id = 'test-button';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          element: '#test-button',
        }),
      );

      button.remove();
    });

    it('should identify element by class', () => {
      const listener = jest.fn();
      tracker = new ActivityTracker();
      tracker.startTracking();
      tracker.addActivityListener(listener);

      const button = document.createElement('button');
      button.className = 'btn primary';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          element: '.btn',
        }),
      );

      button.remove();
    });

    it('should identify element by tag name', () => {
      const listener = jest.fn();
      tracker = new ActivityTracker();
      tracker.startTracking();
      tracker.addActivityListener(listener);

      const button = document.createElement('button');
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          element: 'button',
        }),
      );

      button.remove();
    });
  });

  describe('cleanup timer', () => {
    it('should clean up old events after 1 minute', () => {
      tracker = new ActivityTracker({ debounceMs: 10 });
      tracker.startTracking();

      // Add event
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);

      let summary = tracker.getActivitySummary();
      expect(summary.eventCount).toBe(1);

      // Advance time by more than 1 minute
      jest.advanceTimersByTime(70000);

      summary = tracker.getActivitySummary();
      expect(summary.eventCount).toBe(0);
    });
  });

  describe('listener error handling', () => {
    it('should catch and log errors in listeners', () => {
      tracker = new ActivityTracker({ debounceMs: 10 });
      tracker.startTracking();

      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      tracker.addActivityListener(errorListener);

      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
      });
      document.dispatchEvent(clickEvent);

      jest.advanceTimersByTime(20);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'activity',
        'Error in activity listener:',
        expect.any(Object),
      );
    });
  });
});
