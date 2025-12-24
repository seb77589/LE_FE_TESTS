/**
 * @fileoverview Comprehensive unit tests for rateLimiter utility
 *
 * Tests cover:
 * - isRateLimited: both legacy and new API patterns
 * - recordAttempt: attempt recording with auto-cleanup
 * - getRateLimitStatus: detailed status including reset time
 * - resetRateLimit / resetRateLimiter: rate limit clearing
 * - Edge cases: expiration, cleanup, configuration merging
 *
 * @module tests/rateLimiter.test
 * @since 0.2.0
 */

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
import {
  isRateLimited,
  recordAttempt,
  getRateLimitStatus,
  resetRateLimit,
  resetRateLimiter,
} from '@/lib/network/rateLimiter';

// ==============================================================================
// Test Setup
// ==============================================================================

// Mock Math.random for deterministic cleanup testing
const originalRandom = Math.random;

beforeEach(() => {
  // Reset rate limiter storage between tests
  resetRateLimit('test');
  resetRateLimit('login');
  resetRateLimit('action');
  resetRateLimit('test:user123');
  resetRateLimit(`login:${FRONTEND_TEST_CREDENTIALS.USER.email}`);
  resetRateLimit('action:undefined');
  resetRateLimit('action:');
  resetRateLimit('key:with:colons');
  resetRateLimit('special!@#$%^&*()');
  // Restore original Math.random
  Math.random = originalRandom;
});

afterEach(() => {
  Math.random = originalRandom;
});

// ==============================================================================
// Test Suites
// ==============================================================================

describe('rateLimiter', () => {
  // ==========================================================================
  // isRateLimited Tests
  // ==========================================================================
  describe('isRateLimited', () => {
    describe('legacy API (key-based)', () => {
      it('should return false for a new key (no previous attempts)', () => {
        expect(isRateLimited('new_action')).toBe(false);
      });

      it('should return false when under max attempts', () => {
        recordAttempt('test_action', { maxAttempts: 5, timeWindowMs: 60000 });
        expect(
          isRateLimited('test_action', { maxAttempts: 5, timeWindowMs: 60000 }),
        ).toBe(false);
      });

      it('should return true when at max attempts', () => {
        const config = { maxAttempts: 3, timeWindowMs: 60000 };
        for (let i = 0; i < 3; i++) {
          recordAttempt('limited_action', config);
        }
        expect(isRateLimited('limited_action', config)).toBe(true);
      });

      it('should return true when over max attempts', () => {
        const config = { maxAttempts: 2, timeWindowMs: 60000 };
        for (let i = 0; i < 5; i++) {
          recordAttempt('over_limit', config);
        }
        expect(isRateLimited('over_limit', config)).toBe(true);
      });

      it('should use default config when none provided', () => {
        // Default config: maxAttempts: 5, timeWindowMs: 15 * 60 * 1000
        for (let i = 0; i < 5; i++) {
          recordAttempt('default_config');
        }
        expect(isRateLimited('default_config')).toBe(true);
      });

      it('should support windowMs alias for timeWindowMs', () => {
        const config = { maxAttempts: 2, windowMs: 60000 };
        recordAttempt('alias_test', config);
        recordAttempt('alias_test', config);
        expect(isRateLimited('alias_test', config)).toBe(true);
      });
    });

    describe('new API (action-based with identifier)', () => {
      it('should return false for a new action with identifier', () => {
        expect(isRateLimited('login', 'user123')).toBe(false);
      });

      it('should track actions separately per identifier', () => {
        const config = { maxAttempts: 2, timeWindowMs: 60000 };

        // Max out user1
        recordAttempt('login', 'user1', config);
        recordAttempt('login', 'user1', config);

        // user1 should be limited, user2 should not
        expect(isRateLimited('login', 'user1', config)).toBe(true);
        expect(isRateLimited('login', 'user2', config)).toBe(false);
      });

      it('should return true when identifier reaches limit', () => {
        const config = { maxAttempts: 3, timeWindowMs: 60000 };
        recordAttempt('api_call', 'ip:192.168.1.1', config);
        recordAttempt('api_call', 'ip:192.168.1.1', config);
        recordAttempt('api_call', 'ip:192.168.1.1', config);

        expect(isRateLimited('api_call', 'ip:192.168.1.1', config)).toBe(true);
      });
    });

    describe('expiration behavior', () => {
      it('should return false after time window expires', () => {
        jest.useFakeTimers();

        const config = { maxAttempts: 1, timeWindowMs: 1000 }; // 1 second window
        recordAttempt('expiring_action', config);

        expect(isRateLimited('expiring_action', config)).toBe(true);

        // Advance time past window
        jest.advanceTimersByTime(1500);

        expect(isRateLimited('expiring_action', config)).toBe(false);

        jest.useRealTimers();
      });

      it('should reset count after window expires', () => {
        jest.useFakeTimers();

        const config = { maxAttempts: 2, timeWindowMs: 1000 };
        recordAttempt('reset_test', config);
        recordAttempt('reset_test', config);

        expect(isRateLimited('reset_test', config)).toBe(true);

        // Advance time past window
        jest.advanceTimersByTime(1500);

        // Should be able to make new attempts
        recordAttempt('reset_test', config);
        expect(isRateLimited('reset_test', config)).toBe(false);

        jest.useRealTimers();
      });
    });
  });

  // ==========================================================================
  // recordAttempt Tests
  // ==========================================================================
  describe('recordAttempt', () => {
    describe('legacy API', () => {
      it('should create new attempt record for new key', () => {
        recordAttempt('new_record');
        const status = getRateLimitStatus('new_record');
        expect(status.remaining).toBe(4); // Default 5 - 1
      });

      it('should increment count for existing key', () => {
        recordAttempt('increment_test');
        recordAttempt('increment_test');
        recordAttempt('increment_test');

        const status = getRateLimitStatus('increment_test');
        expect(status.remaining).toBe(2); // Default 5 - 3
      });
    });

    describe('new API', () => {
      it('should record attempt with action and identifier', () => {
        recordAttempt('login', FRONTEND_TEST_CREDENTIALS.USER.email, {
          maxAttempts: 5,
          timeWindowMs: 60000,
        });

        const status = getRateLimitStatus('login', FRONTEND_TEST_CREDENTIALS.USER.email, {
          maxAttempts: 5,
          timeWindowMs: 60000,
        });
        expect(status.remaining).toBe(4);
      });

      it('should track different identifiers separately', () => {
        const config = { maxAttempts: 5, timeWindowMs: 60000 };

        recordAttempt('action', 'id1', config);
        recordAttempt('action', 'id1', config);
        recordAttempt('action', 'id2', config);

        expect(getRateLimitStatus('action', 'id1', config).remaining).toBe(3);
        expect(getRateLimitStatus('action', 'id2', config).remaining).toBe(4);
      });
    });

    describe('cleanup behavior', () => {
      it('should trigger cleanup with 10% probability', () => {
        // Force cleanup to always run
        Math.random = jest.fn().mockReturnValue(0.05);

        // Create an expired entry
        jest.useFakeTimers();
        recordAttempt('old_entry', { maxAttempts: 5, timeWindowMs: 1000 });

        // Advance past window
        jest.advanceTimersByTime(2000);

        // New attempt should trigger cleanup
        recordAttempt('new_entry', { maxAttempts: 5, timeWindowMs: 1000 });

        jest.useRealTimers();
      });

      it('should not cleanup with 90% probability', () => {
        Math.random = jest.fn().mockReturnValue(0.5); // > 0.1, no cleanup

        recordAttempt('no_cleanup');
        // Should not throw or cause issues
        expect(isRateLimited('no_cleanup')).toBe(false);
      });
    });

    describe('window expiration on record', () => {
      it('should reset count when recording after window expires', () => {
        jest.useFakeTimers();

        const config = { maxAttempts: 5, timeWindowMs: 1000 };
        recordAttempt('expire_on_record', config);
        recordAttempt('expire_on_record', config);
        recordAttempt('expire_on_record', config);

        // Advance past window
        jest.advanceTimersByTime(1500);

        // New attempt should start fresh
        recordAttempt('expire_on_record', config);

        const status = getRateLimitStatus('expire_on_record', undefined, config);
        expect(status.remaining).toBe(4); // Fresh count: 5 - 1

        jest.useRealTimers();
      });
    });
  });

  // ==========================================================================
  // getRateLimitStatus Tests
  // ==========================================================================
  describe('getRateLimitStatus', () => {
    it('should return allowed=true for new action', () => {
      const status = getRateLimitStatus('new_status_action');
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(5); // Default maxAttempts
      expect(status.message).toBeUndefined();
    });

    it('should return correct remaining count', () => {
      const config = { maxAttempts: 10, timeWindowMs: 60000 };
      recordAttempt('count_test', undefined, config);
      recordAttempt('count_test', undefined, config);
      recordAttempt('count_test', undefined, config);

      const status = getRateLimitStatus('count_test', undefined, config);
      expect(status.remaining).toBe(7); // 10 - 3
    });

    it('should return allowed=false when rate limited', () => {
      const config = { maxAttempts: 2, timeWindowMs: 60000 };
      recordAttempt('limited_status', undefined, config);
      recordAttempt('limited_status', undefined, config);

      const status = getRateLimitStatus('limited_status', undefined, config);
      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);
      expect(status.message).toBeDefined();
      expect(status.message).toContain('Rate limit exceeded');
    });

    it('should include reset time in status', () => {
      const now = Date.now();
      const config = { maxAttempts: 5, timeWindowMs: 60000 };
      recordAttempt('reset_time_test', undefined, config);

      const status = getRateLimitStatus('reset_time_test', undefined, config);
      expect(status.resetTime).toBeGreaterThan(now);
      expect(status.resetTime).toBeLessThanOrEqual(now + 60000 + 100); // Small buffer
    });

    it('should format time in error message', () => {
      const config = { maxAttempts: 1, timeWindowMs: 60000 };
      recordAttempt('format_test', undefined, config);

      const status = getRateLimitStatus('format_test', undefined, config);
      expect(status.message).toMatch(/Try again after/);
    });

    it('should work with identifiers', () => {
      const config = { maxAttempts: 3, timeWindowMs: 60000 };
      recordAttempt('identified', 'user:123', config);
      recordAttempt('identified', 'user:123', config);

      const status = getRateLimitStatus('identified', 'user:123', config);
      expect(status.remaining).toBe(1);
    });

    it('should return full remaining for expired attempts', () => {
      jest.useFakeTimers();

      const config = { maxAttempts: 5, timeWindowMs: 1000 };
      recordAttempt('expired_status', undefined, config);
      recordAttempt('expired_status', undefined, config);

      // Advance past window
      jest.advanceTimersByTime(1500);

      const status = getRateLimitStatus('expired_status', undefined, config);
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(5); // Full count after expiration

      jest.useRealTimers();
    });
  });

  // ==========================================================================
  // resetRateLimit / resetRateLimiter Tests
  // ==========================================================================
  describe('resetRateLimit', () => {
    it('should clear rate limit for a key', () => {
      const config = { maxAttempts: 2, timeWindowMs: 60000 };
      recordAttempt('reset_clear', undefined, config);
      recordAttempt('reset_clear', undefined, config);

      expect(isRateLimited('reset_clear', undefined, config)).toBe(true);

      resetRateLimit('reset_clear');

      expect(isRateLimited('reset_clear', undefined, config)).toBe(false);
    });

    it('should clear rate limit for action with identifier', () => {
      const config = { maxAttempts: 2, timeWindowMs: 60000 };
      recordAttempt('action', 'user123', config);
      recordAttempt('action', 'user123', config);

      expect(isRateLimited('action', 'user123', config)).toBe(true);

      resetRateLimit('action', 'user123');

      expect(isRateLimited('action', 'user123', config)).toBe(false);
    });

    it('should not affect other keys when resetting', () => {
      const config = { maxAttempts: 2, timeWindowMs: 60000 };

      recordAttempt('key1', undefined, config);
      recordAttempt('key1', undefined, config);
      recordAttempt('key2', undefined, config);
      recordAttempt('key2', undefined, config);

      resetRateLimit('key1');

      expect(isRateLimited('key1', undefined, config)).toBe(false);
      expect(isRateLimited('key2', undefined, config)).toBe(true);
    });

    it('should handle resetting non-existent key gracefully', () => {
      // Should not throw
      expect(() => resetRateLimit('nonexistent_key')).not.toThrow();
    });
  });

  describe('resetRateLimiter (alias)', () => {
    it('should be an alias for resetRateLimit', () => {
      expect(resetRateLimiter).toBe(resetRateLimit);
    });

    it('should work the same as resetRateLimit', () => {
      const config = { maxAttempts: 2, timeWindowMs: 60000 };
      recordAttempt('alias_reset', undefined, config);
      recordAttempt('alias_reset', undefined, config);

      expect(isRateLimited('alias_reset', undefined, config)).toBe(true);

      resetRateLimiter('alias_reset');

      expect(isRateLimited('alias_reset', undefined, config)).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases and Integration Tests
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle rapid sequential attempts', () => {
      const config = { maxAttempts: 100, timeWindowMs: 60000 };

      for (let i = 0; i < 50; i++) {
        recordAttempt('rapid', undefined, config);
      }

      const status = getRateLimitStatus('rapid', undefined, config);
      expect(status.remaining).toBe(50);
    });

    it('should handle very short time windows', () => {
      jest.useFakeTimers();

      const config = { maxAttempts: 5, timeWindowMs: 100 }; // 100ms window
      recordAttempt('short_window', undefined, config);

      jest.advanceTimersByTime(150);

      expect(isRateLimited('short_window', undefined, config)).toBe(false);

      jest.useRealTimers();
    });

    it('should handle very long time windows', () => {
      const config = { maxAttempts: 5, timeWindowMs: 24 * 60 * 60 * 1000 }; // 24 hours
      recordAttempt('long_window', undefined, config);

      const status = getRateLimitStatus('long_window', undefined, config);
      expect(status.remaining).toBe(4);
    });

    it('should handle maxAttempts of 1', () => {
      const config = { maxAttempts: 1, timeWindowMs: 60000 };
      recordAttempt('one_attempt', undefined, config);

      expect(isRateLimited('one_attempt', undefined, config)).toBe(true);
    });

    it('should handle special characters in keys', () => {
      const config = { maxAttempts: 5, timeWindowMs: 60000 };
      const specialKey = 'action:user@domain.com/path?query=1';

      recordAttempt(specialKey, undefined, config);

      const status = getRateLimitStatus(specialKey, undefined, config);
      expect(status.remaining).toBe(4);
    });

    it('should handle empty string identifier', () => {
      const config = { maxAttempts: 5, timeWindowMs: 60000 };

      recordAttempt('action', '', config);

      const status = getRateLimitStatus('action', '', config);
      expect(status.remaining).toBe(4);
    });

    it('should handle undefined identifier in new API', () => {
      const config = { maxAttempts: 5, timeWindowMs: 60000 };

      recordAttempt('action', undefined, config);

      const status = getRateLimitStatus('action', undefined, config);
      expect(status.remaining).toBe(4);
    });
  });
});
