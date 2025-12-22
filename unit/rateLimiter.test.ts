import {
  isRateLimited,
  recordAttempt,
  resetRateLimiter,
  getRateLimitStatus,
  resetRateLimit,
} from '@/lib/network';

// Test constants for better maintainability
const TEST_KEY = 'test_key';
const STANDARD_WINDOW_MS = 60000; // 1 minute
const SHORT_WINDOW_MS = 100; // 100ms for timing tests

describe('rateLimiter', () => {
  beforeEach(() => {
    // Reset all rate limiters before each test to ensure test isolation
    resetRateLimiter(TEST_KEY);
    resetRateLimiter('login_form');
    resetRateLimiter('register_form');
    resetRateLimiter('password_reset_form');
  });

  describe('isRateLimited', () => {
    it('should return false when no attempts have been made', () => {
      const result = isRateLimited(TEST_KEY, {
        maxAttempts: 5,
        windowMs: STANDARD_WINDOW_MS,
      });
      expect(result).toBe(false);
    });

    it('should return false when attempts are within limit', () => {
      const options = { maxAttempts: 3, windowMs: STANDARD_WINDOW_MS };

      // Record 2 attempts (under the limit of 3)
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);

      const result = isRateLimited(TEST_KEY, options);
      expect(result).toBe(false);
    });

    it('should return true when attempts exceed limit', () => {
      const options = { maxAttempts: 2, windowMs: STANDARD_WINDOW_MS };

      // Record 3 attempts (over the limit of 2)
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);

      const result = isRateLimited(TEST_KEY, options);
      expect(result).toBe(true);
    });

    it('should return true when attempts equal limit', () => {
      const options = { maxAttempts: 2, windowMs: STANDARD_WINDOW_MS };

      // Record exactly 2 attempts (at the limit)
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);

      const result = isRateLimited(TEST_KEY, options);
      expect(result).toBe(true);
    });

    it('should expire old attempts outside the time window', async () => {
      const options = { maxAttempts: 2, windowMs: SHORT_WINDOW_MS };

      // Record 2 attempts
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);

      // Should be rate limited initially
      expect(isRateLimited(TEST_KEY, options)).toBe(true);

      // Wait for the window to expire (wait 50% longer than globalThis.window)
      await new Promise((resolve) => setTimeout(resolve, SHORT_WINDOW_MS + 50));

      // Should no longer be rate limited after expiration
      expect(isRateLimited(TEST_KEY, options)).toBe(false);
    });

    it('should handle different keys independently', () => {
      const options = { maxAttempts: 2, windowMs: STANDARD_WINDOW_MS };

      // Record attempts for different keys
      recordAttempt('key1');
      recordAttempt('key1');
      recordAttempt('key2');

      // key1 should be rate limited, key2 should not
      expect(isRateLimited('key1', options)).toBe(true);
      expect(isRateLimited('key2', options)).toBe(false);
    });
  });

  describe('recordAttempt', () => {
    it('should record an attempt with current timestamp', () => {
      recordAttempt(TEST_KEY);

      // Should be rate limited after recording
      const result = isRateLimited(TEST_KEY, {
        maxAttempts: 1,
        windowMs: STANDARD_WINDOW_MS,
      });
      expect(result).toBe(true);
    });

    it('should allow multiple attempts for the same key', () => {
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);

      // Should be rate limited after 3 attempts with limit of 2
      const result = isRateLimited(TEST_KEY, {
        maxAttempts: 2,
        windowMs: STANDARD_WINDOW_MS,
      });
      expect(result).toBe(true);
    });
  });

  describe('resetRateLimiter', () => {
    it('should clear all attempts for a key', () => {
      const options = { maxAttempts: 2, windowMs: STANDARD_WINDOW_MS };

      // Record attempts
      recordAttempt(TEST_KEY);
      recordAttempt(TEST_KEY);

      // Should be rate limited
      expect(isRateLimited(TEST_KEY, options)).toBe(true);

      // Reset the rate limiter
      resetRateLimiter(TEST_KEY);

      // Should no longer be rate limited
      expect(isRateLimited(TEST_KEY, options)).toBe(false);
    });

    it('should not affect other keys when resetting one', () => {
      const options = { maxAttempts: 2, windowMs: STANDARD_WINDOW_MS };

      // Record attempts for both keys
      recordAttempt('key1');
      recordAttempt('key1');
      recordAttempt('key2');
      recordAttempt('key2');

      // Both should be rate limited
      expect(isRateLimited('key1', options)).toBe(true);
      expect(isRateLimited('key2', options)).toBe(true);

      // Reset only key1
      resetRateLimiter('key1');

      // key1 should no longer be rate limited, key2 should still be
      expect(isRateLimited('key1', options)).toBe(false);
      expect(isRateLimited('key2', options)).toBe(true);
    });

    it('should handle resetting non-existent keys gracefully', () => {
      expect(() => resetRateLimiter('non_existent_key')).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle login form rate limiting correctly', () => {
      const loginOptions = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }; // 5 attempts per 15 minutes

      // Simulate 5 login attempts
      for (let i = 0; i < 5; i++) {
        recordAttempt('login_form');
      }

      // Should be rate limited after 5 attempts
      expect(isRateLimited('login_form', loginOptions)).toBe(true);

      // Reset and should not be rate limited
      resetRateLimiter('login_form');
      expect(isRateLimited('login_form', loginOptions)).toBe(false);
    });

    it('should handle registration form rate limiting correctly', () => {
      const registerOptions = { maxAttempts: 3, windowMs: 60 * 60 * 1000 }; // 3 attempts per hour

      // Simulate 3 registration attempts
      for (let i = 0; i < 3; i++) {
        recordAttempt('register_form');
      }

      // Should be rate limited after 3 attempts
      expect(isRateLimited('register_form', registerOptions)).toBe(true);

      // Reset and should not be rate limited
      resetRateLimiter('register_form');
      expect(isRateLimited('register_form', registerOptions)).toBe(false);
    });

    it('should handle password reset form rate limiting correctly', () => {
      const resetOptions = { maxAttempts: 3, windowMs: 60 * 60 * 1000 }; // 3 attempts per hour

      // Simulate 3 password reset attempts
      for (let i = 0; i < 3; i++) {
        recordAttempt('password_reset_form');
      }

      // Should be rate limited after 3 attempts
      expect(isRateLimited('password_reset_form', resetOptions)).toBe(true);

      // Reset and should not be rate limited
      resetRateLimiter('password_reset_form');
      expect(isRateLimited('password_reset_form', resetOptions)).toBe(false);
    });
  });

  describe('New API with identifier', () => {
    beforeEach(() => {
      resetRateLimit('new_api_action');
      resetRateLimit('new_api_action', 'user1');
      resetRateLimit('new_api_action', 'user2');
    });

    it('should check rate limit with action and identifier using new API', () => {
      const config = { maxAttempts: 3, timeWindowMs: STANDARD_WINDOW_MS };

      // Not limited initially
      expect(isRateLimited('new_api_action', 'user1', config)).toBe(false);
    });

    it('should record attempts with action and identifier using new API', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      // Record attempts for user1
      recordAttempt('new_api_action', 'user1', config);
      recordAttempt('new_api_action', 'user1', config);

      // User1 should be rate limited
      expect(isRateLimited('new_api_action', 'user1', config)).toBe(true);
    });

    it('should isolate rate limits between different identifiers', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      // Record attempts for user1
      recordAttempt('new_api_action', 'user1', config);
      recordAttempt('new_api_action', 'user1', config);

      // Record one attempt for user2
      recordAttempt('new_api_action', 'user2', config);

      // User1 should be rate limited, user2 should not
      expect(isRateLimited('new_api_action', 'user1', config)).toBe(true);
      expect(isRateLimited('new_api_action', 'user2', config)).toBe(false);
    });

    it('should support timeWindowMs in config', () => {
      const config = { maxAttempts: 2, timeWindowMs: SHORT_WINDOW_MS };

      recordAttempt('new_api_action', 'user1', config);
      recordAttempt('new_api_action', 'user1', config);

      expect(isRateLimited('new_api_action', 'user1', config)).toBe(true);
    });

    it('should use default config when not provided', () => {
      // Record many attempts
      for (let i = 0; i < 6; i++) {
        recordAttempt('new_api_action', 'user1');
      }

      // Should be rate limited with default maxAttempts of 5
      expect(isRateLimited('new_api_action', 'user1')).toBe(true);
    });

    it('should reset rate limit for specific identifier', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      // Rate limit user1
      recordAttempt('new_api_action', 'user1', config);
      recordAttempt('new_api_action', 'user1', config);

      expect(isRateLimited('new_api_action', 'user1', config)).toBe(true);

      // Reset only user1
      resetRateLimit('new_api_action', 'user1');

      // User1 should no longer be limited
      expect(isRateLimited('new_api_action', 'user1', config)).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    beforeEach(() => {
      resetRateLimit('status_action');
      resetRateLimit('status_action', 'user1');
    });

    it('should return allowed status when no attempts made', () => {
      const config = { maxAttempts: 5, timeWindowMs: STANDARD_WINDOW_MS };
      const status = getRateLimitStatus('status_action', undefined, config);

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(5);
      expect(status.resetTime).toBeGreaterThan(Date.now());
      expect(status.message).toBeUndefined();
    });

    it('should return correct remaining attempts', () => {
      const config = { maxAttempts: 5, timeWindowMs: STANDARD_WINDOW_MS };

      // Record 2 attempts
      recordAttempt('status_action', undefined, config);
      recordAttempt('status_action', undefined, config);

      const status = getRateLimitStatus('status_action', undefined, config);

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(3); // 5 - 2
    });

    it('should return not allowed when rate limited', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      // Exceed the limit
      recordAttempt('status_action', undefined, config);
      recordAttempt('status_action', undefined, config);

      const status = getRateLimitStatus('status_action', undefined, config);

      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);
      expect(status.message).toBeDefined();
      expect(status.message).toContain('Rate limit exceeded');
    });

    it('should include reset time when rate limited', () => {
      const config = { maxAttempts: 1, timeWindowMs: STANDARD_WINDOW_MS };

      recordAttempt('status_action', undefined, config);

      const status = getRateLimitStatus('status_action', undefined, config);

      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    it('should work with identifier', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      recordAttempt('status_action', 'user1', config);

      const status = getRateLimitStatus('status_action', 'user1', config);

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(1);
    });

    it('should use default config when not provided', () => {
      const status = getRateLimitStatus('status_action');

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(5); // Default maxAttempts
    });

    it('should expire and return fresh status after time window', async () => {
      const config = { maxAttempts: 1, timeWindowMs: SHORT_WINDOW_MS };

      recordAttempt('status_action', undefined, config);
      expect(getRateLimitStatus('status_action', undefined, config).allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, SHORT_WINDOW_MS + 50));

      const status = getRateLimitStatus('status_action', undefined, config);
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(1);
    });
  });

  describe('resetRateLimit alias', () => {
    it('should be available as resetRateLimit', () => {
      expect(resetRateLimit).toBeDefined();
      expect(typeof resetRateLimit).toBe('function');
    });

    it('should reset rate limit same as resetRateLimiter', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      // Rate limit a key
      recordAttempt('alias_test');
      recordAttempt('alias_test');
      expect(isRateLimited('alias_test', config)).toBe(true);

      // Reset using resetRateLimit
      resetRateLimit('alias_test');
      expect(isRateLimited('alias_test', config)).toBe(false);
    });
  });

  describe('cleanup mechanism', () => {
    it('should handle cleanup during recordAttempt (probabilistic)', () => {
      // This test verifies cleanup doesn't cause errors
      // The 10% cleanup chance makes it probabilistic, so we just ensure no errors
      const config = { maxAttempts: 100, timeWindowMs: SHORT_WINDOW_MS };

      // Record many attempts to increase chance of triggering cleanup
      for (let i = 0; i < 20; i++) {
        expect(() => recordAttempt(`cleanup_test_${i}`, undefined, config)).not.toThrow();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle windowMs as legacy config property', () => {
      const config = { maxAttempts: 2, windowMs: STANDARD_WINDOW_MS };

      recordAttempt(TEST_KEY, config);
      recordAttempt(TEST_KEY, config);

      expect(isRateLimited(TEST_KEY, config)).toBe(true);
    });

    it('should handle timeWindowMs as modern config property', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      recordAttempt(TEST_KEY, config);
      recordAttempt(TEST_KEY, config);

      expect(isRateLimited(TEST_KEY, config)).toBe(true);
    });

    it('should handle empty identifier as undefined', () => {
      const config = { maxAttempts: 2, timeWindowMs: STANDARD_WINDOW_MS };

      recordAttempt('edge_action', '', config);
      recordAttempt('edge_action', '', config);

      // Empty string identifier creates key "edge_action:"
      expect(isRateLimited('edge_action', '', config)).toBe(true);
    });
  });
});
