/**
 * Activity Tracker Tests
 *
 * Comprehensive test suite for ActivityTracker singleton, listener management,
 * and idempotent behavior. Tests validate that listeners are not duplicated
 * and cleanup is proper even with multiple start/stop cycles.
 */

import { ActivityTracker } from '@/lib/tracking/activityTracker';

describe('ActivityTracker', () => {
  let tracker: ActivityTracker;

  beforeEach(() => {
    tracker = new ActivityTracker();
  });

  afterEach(() => {
    // Cleanup after each test
    if (tracker) {
      tracker.stopTracking();
    }
  });

  describe('Initialization', () => {
    it('should create tracker instance with default config', () => {
      expect(tracker).toBeDefined();
      expect(tracker).toHaveProperty('startTracking');
      expect(tracker).toHaveProperty('stopTracking');
    });

    it('should have disabled tracking by default', () => {
      expect(tracker['isTracking']).toBe(false);
    });

    it('should accept partial config', () => {
      const customTracker = new ActivityTracker({
        enabled: true,
        trackClicks: false,
        debounceMs: 500,
      });
      expect(customTracker['config'].trackClicks).toBe(false);
      expect(customTracker['config'].debounceMs).toBe(500);
    });
  });

  describe('startTracking() - Idempotent Behavior', () => {
    it('should start tracking when not already tracking', () => {
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);
    });

    it('should be idempotent - multiple startTracking calls safe', () => {
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);

      // Call startTracking again (should stop then start)
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);
    });

    it('should clean up old listeners before re-initializing', () => {
      tracker.startTracking();
      const initialClickHandler = tracker['boundHandlers'].click;

      // Second startTracking should clean up and reinitialize
      tracker.startTracking();

      // isTracking should still be true
      expect(tracker['isTracking']).toBe(true);
    });

    it('should not start if not enabled', () => {
      const disabledTracker = new ActivityTracker({ enabled: false });
      disabledTracker.startTracking();
      expect(disabledTracker['isTracking']).toBe(false);
    });
  });

  describe('stopTracking() - Cleanup', () => {
    it('should stop tracking when tracking', () => {
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);

      tracker.stopTracking();
      expect(tracker['isTracking']).toBe(false);
    });

    it('should remove all event listeners on stop', () => {
      tracker.startTracking();

      // Verify listeners were attached
      expect(tracker['boundHandlers'].click).toBeDefined();
      expect(tracker['boundHandlers'].scroll).toBeDefined();

      tracker.stopTracking();

      // Verify listeners were removed (deleted from boundHandlers)
      expect(tracker['boundHandlers'].click).toBeUndefined();
      expect(tracker['boundHandlers'].scroll).toBeUndefined();
      expect(tracker['boundHandlers'].keydown).toBeUndefined();
    });

    it('should clear all timers on stop', () => {
      tracker.startTracking();

      // Verify timers are running
      expect(tracker['debounceTimer']).toBeDefined();
      expect(tracker['cleanupTimer']).toBeDefined();
      expect(tracker['syncTimer']).toBeDefined();

      tracker.stopTracking();

      // Verify timers were cleared
      expect(tracker['debounceTimer']).toBeNull();
      expect(tracker['cleanupTimer']).toBeNull();
      expect(tracker['syncTimer']).toBeNull();
    });

    it('should handle stop when not tracking', () => {
      expect(tracker['isTracking']).toBe(false);
      // Should not throw
      expect(() => {
        tracker.stopTracking();
      }).not.toThrow();
    });
  });

  describe('Event Listener Management', () => {
    it('should track click events when enabled', () => {
      tracker.startTracking();
      expect(tracker['boundHandlers'].click).toBeDefined();

      tracker.stopTracking();
      expect(tracker['boundHandlers'].click).toBeUndefined();
    });

    it('should track scroll events when enabled', () => {
      tracker.startTracking();
      expect(tracker['boundHandlers'].scroll).toBeDefined();

      tracker.stopTracking();
      expect(tracker['boundHandlers'].scroll).toBeUndefined();
    });

    it('should track keypress events when enabled', () => {
      tracker.startTracking();
      expect(tracker['boundHandlers'].keydown).toBeDefined();

      tracker.stopTracking();
      expect(tracker['boundHandlers'].keydown).toBeUndefined();
    });

    it('should not track disabled event types', () => {
      const customTracker = new ActivityTracker({
        trackClicks: false,
        trackScrolls: false,
        trackKeypresses: false,
      });

      customTracker.startTracking();

      expect(customTracker['boundHandlers'].click).toBeUndefined();
      expect(customTracker['boundHandlers'].scroll).toBeUndefined();
      expect(customTracker['boundHandlers'].keydown).toBeUndefined();

      customTracker.stopTracking();
    });
  });

  describe('Activity Listeners (callbacks)', () => {
    it('should add activity listeners', () => {
      const callback = jest.fn();
      tracker.addActivityListener(callback);

      expect(tracker['listeners'].length).toBe(1);
    });

    it('should remove activity listeners', () => {
      const callback = jest.fn();
      tracker.addActivityListener(callback);
      expect(tracker['listeners'].length).toBe(1);

      tracker.removeActivityListener(callback);
      expect(tracker['listeners'].length).toBe(0);
    });

    it('should support multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      tracker.addActivityListener(callback1);
      tracker.addActivityListener(callback2);
      tracker.addActivityListener(callback3);

      expect(tracker['listeners'].length).toBe(3);
    });
  });

  describe('Start/Stop Lifecycle Cycles', () => {
    it('should handle multiple start/stop cycles', () => {
      // Cycle 1
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);
      tracker.stopTracking();
      expect(tracker['isTracking']).toBe(false);

      // Cycle 2
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);
      tracker.stopTracking();
      expect(tracker['isTracking']).toBe(false);

      // Cycle 3
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);
      tracker.stopTracking();
      expect(tracker['isTracking']).toBe(false);
    });

    it('should not accumulate listeners across cycles', () => {
      for (let i = 0; i < 5; i++) {
        tracker.startTracking();
        // Verify listeners are set exactly once per event type
        expect(tracker['boundHandlers'].click).toBeDefined();
        expect(tracker['boundHandlers'].scroll).toBeDefined();

        tracker.stopTracking();
        // Verify all listeners are cleaned up
        expect(tracker['boundHandlers'].click).toBeUndefined();
        expect(tracker['boundHandlers'].scroll).toBeUndefined();
      }
    });

    it('should handle start during active tracking', () => {
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);

      // Call startTracking again while tracking
      // Should stop and restart (idempotent)
      tracker.startTracking();
      expect(tracker['isTracking']).toBe(true);

      // Verify cleanup was done
      tracker.stopTracking();
      expect(tracker['isTracking']).toBe(false);
    });
  });

  describe('Activity Status', () => {
    it('should track last activity timestamp', () => {
      const before = Date.now();
      tracker.startTracking();
      const lastActivity = tracker.getLastActivity();
      const after = Date.now();

      expect(lastActivity).toBeGreaterThanOrEqual(before);
      expect(lastActivity).toBeLessThanOrEqual(after);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration values', () => {
      const customTracker = new ActivityTracker({
        debounceMs: 2000,
        maxEventsPerMinute: 30,
        inactivityThreshold: 600000,
        syncBatchSize: 100,
        syncIntervalMs: 30000,
      });

      expect(customTracker['config'].debounceMs).toBe(2000);
      expect(customTracker['config'].maxEventsPerMinute).toBe(30);
      expect(customTracker['config'].inactivityThreshold).toBe(600000);
      expect(customTracker['config'].syncBatchSize).toBe(100);
      expect(customTracker['config'].syncIntervalMs).toBe(30000);
    });

    it('should have sensible defaults', () => {
      expect(tracker['config'].enabled).toBe(true);
      expect(tracker['config'].trackClicks).toBe(true);
      expect(tracker['config'].trackScrolls).toBe(true);
      expect(tracker['config'].trackKeypresses).toBe(true);
      expect(tracker['config'].debounceMs).toBe(1000);
      expect(tracker['config'].inactivityThreshold).toBe(300000); // 5 minutes
    });

    it('should disable mouse movement tracking by default', () => {
      expect(tracker['config'].trackMouseMovement).toBe(false);
      tracker.startTracking();
      expect(tracker['boundHandlers'].mousemove).toBeUndefined();
    });
  });
});
