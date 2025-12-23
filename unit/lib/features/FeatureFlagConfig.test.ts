/**
 * @jest-environment jsdom
 */

/**
 * Tests for FeatureFlagConfig module
 *
 * Tests getFeatureFlags() and getFeatureFlag() functions covering:
 * - Default flag loading based on environment
 * - Environment variable parsing
 * - Boolean flag handling
 * - User allowlist checking
 * - Role-based access
 * - Percentage-based rollouts
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

import { getFeatureFlags, getFeatureFlag } from '@/lib/features/FeatureFlagConfig';
import type { FeatureFlagConfig } from '@/lib/features/types';
import logger from '@/lib/logging';

describe('FeatureFlagConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment using Object.defineProperty to bypass readonly
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Helper to set NODE_ENV (TypeScript workaround)
  const setNodeEnv = (value: string) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      writable: true,
      configurable: true,
    });
  };

  describe('getFeatureFlags', () => {
    describe('default flags by environment', () => {
      it('returns development defaults when NODE_ENV is development', () => {
        setNodeEnv('development');

        const flags = getFeatureFlags();

        expect(flags.new_dashboard).toBe(true);
        expect(flags.dark_mode).toBe(true);
        expect(flags.document_analytics).toBe(true);
        expect(flags.experimental_features).toBe(false);
      });

      it('returns production defaults when NODE_ENV is production', () => {
        setNodeEnv('production');

        const flags = getFeatureFlags();

        expect(flags.new_dashboard).toBe(false);
        expect(flags.dark_mode).toBe(false);
        expect(flags.document_analytics).toBe(false);
        expect(flags.experimental_features).toBe(false);
      });

      it('returns test defaults when NODE_ENV is test', () => {
        setNodeEnv('test');

        const flags = getFeatureFlags();

        expect(flags.new_dashboard).toBe(false);
        expect(flags.dark_mode).toBe(false);
        expect(flags.advanced_search).toBe(true);
        expect(flags.email_notifications).toBe(true);
      });

      it('always returns advanced_search and email_notifications as true', () => {
        const environments = ['development', 'production', 'test'];

        for (const env of environments) {
          setNodeEnv(env);
          const flags = getFeatureFlags();
          expect(flags.advanced_search).toBe(true);
          expect(flags.email_notifications).toBe(true);
        }
      });
    });

    describe('environment variable parsing', () => {
      it('parses NEXT_PUBLIC_FEATURE_FLAGS JSON', () => {
        setNodeEnv('production');
        process.env.NEXT_PUBLIC_FEATURE_FLAGS = JSON.stringify({
          new_dashboard: true,
          custom_flag: true,
        });

        const flags = getFeatureFlags();

        expect(flags.new_dashboard).toBe(true);
        expect(flags.custom_flag).toBe(true);
      });

      it('merges environment flags with defaults', () => {
        setNodeEnv('production');
        process.env.NEXT_PUBLIC_FEATURE_FLAGS = JSON.stringify({
          new_dashboard: true,
        });

        const flags = getFeatureFlags();

        // Override from env
        expect(flags.new_dashboard).toBe(true);
        // Default preserved
        expect(flags.advanced_search).toBe(true);
        expect(flags.email_notifications).toBe(true);
      });

      it('logs warning and returns defaults on invalid JSON', () => {
        setNodeEnv('production');
        process.env.NEXT_PUBLIC_FEATURE_FLAGS = 'invalid json {';

        const flags = getFeatureFlags();

        expect(logger.warn).toHaveBeenCalledWith(
          'general',
          'Failed to parse NEXT_PUBLIC_FEATURE_FLAGS, using defaults',
          expect.any(Object),
        );
        // Returns defaults
        expect(flags.new_dashboard).toBe(false);
        expect(flags.advanced_search).toBe(true);
      });

      it('handles empty string environment variable', () => {
        setNodeEnv('development');
        process.env.NEXT_PUBLIC_FEATURE_FLAGS = '';

        const flags = getFeatureFlags();

        // Returns defaults when empty
        expect(flags.new_dashboard).toBe(true);
      });

      it('handles complex flag configurations', () => {
        process.env.NEXT_PUBLIC_FEATURE_FLAGS = JSON.stringify({
          new_dashboard: {
            enabled: true,
            rolloutPercentage: 50,
            allowedUsers: ['user-123'],
            allowedRoles: ['admin'],
          },
        });

        const flags = getFeatureFlags();

        expect(flags.new_dashboard).toEqual({
          enabled: true,
          rolloutPercentage: 50,
          allowedUsers: ['user-123'],
          allowedRoles: ['admin'],
        });
      });
    });
  });

  describe('getFeatureFlag', () => {
    describe('boolean flags', () => {
      it('returns true for boolean flag set to true', () => {
        const flags: FeatureFlagConfig = {
          test_flag: true,
        };

        expect(getFeatureFlag(flags, 'test_flag')).toBe(true);
      });

      it('returns false for boolean flag set to false', () => {
        const flags: FeatureFlagConfig = {
          test_flag: false,
        };

        expect(getFeatureFlag(flags, 'test_flag')).toBe(false);
      });

      it('returns false for undefined flag', () => {
        const flags: FeatureFlagConfig = {};

        expect(getFeatureFlag(flags, 'nonexistent_flag')).toBe(false);
      });
    });

    describe('complex flag configurations', () => {
      it('returns false when enabled is false', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: false,
            allowedUsers: ['user-123'],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', 'user-123')).toBe(false);
      });

      it('returns enabled value when no other conditions', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
          },
        };

        expect(getFeatureFlag(flags, 'test_flag')).toBe(true);
      });
    });

    describe('user allowlist', () => {
      it('returns true when user is in allowedUsers', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedUsers: ['user-123', 'user-456'],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', 'user-123')).toBe(true);
      });

      it('returns false when user is not in allowedUsers', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: false,
            allowedUsers: ['user-123'],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', 'user-999')).toBe(false);
      });

      it('handles empty allowedUsers array', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedUsers: [],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', 'user-123')).toBe(true);
      });

      it('handles undefined userId', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedUsers: ['user-123'],
          },
        };

        // Without userId, falls through to enabled value
        expect(getFeatureFlag(flags, 'test_flag')).toBe(true);
      });
    });

    describe('role-based access', () => {
      it('returns true when user role is in allowedRoles', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedRoles: ['admin', 'manager'],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', undefined, 'admin')).toBe(true);
      });

      it('returns false when user role is not in allowedRoles', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedRoles: ['admin'],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', undefined, 'user')).toBe(false);
      });

      it('handles empty allowedRoles array', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedRoles: [],
          },
        };

        expect(getFeatureFlag(flags, 'test_flag', undefined, 'admin')).toBe(false);
      });

      it('handles undefined userRole', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedRoles: ['admin'],
          },
        };

        // Without role, falls through to enabled
        expect(getFeatureFlag(flags, 'test_flag')).toBe(true);
      });

      it('user allowlist takes precedence over role check', () => {
        const flags: FeatureFlagConfig = {
          test_flag: {
            enabled: true,
            allowedUsers: ['user-123'],
            allowedRoles: ['admin'],
          },
        };

        // User in allowlist returns true even with non-matching role
        expect(getFeatureFlag(flags, 'test_flag', 'user-123', 'basic')).toBe(true);
      });
    });

    // Percentage-based rollout tests (flattened to reduce nesting - fixes S2004)
    it('rollout - uses deterministic hash for userId-based rollout', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 50,
        },
      };

      // Same userId should always produce same result
      const result1 = getFeatureFlag(flags, 'test_flag', 'user-abc');
      const result2 = getFeatureFlag(flags, 'test_flag', 'user-abc');

      expect(result1).toBe(result2);
    });

    it('rollout - returns true when rollout is 100%', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 100,
        },
      };

      // Any userId should get true
      expect(getFeatureFlag(flags, 'test_flag', 'user-123')).toBe(true);
      expect(getFeatureFlag(flags, 'test_flag', 'user-456')).toBe(true);
    });

    it('rollout - returns false when rollout is 0%', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 0,
        },
      };

      // Any userId should get false
      expect(getFeatureFlag(flags, 'test_flag', 'user-123')).toBe(false);
      expect(getFeatureFlag(flags, 'test_flag', 'user-456')).toBe(false);
    });

    it('rollout - uses random for anonymous users (no userId)', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 50,
        },
      };

      // Mock Math.random to test both cases
      const originalRandom = Math.random;

      Math.random = jest.fn().mockReturnValue(0.3); // 30% - under threshold
      expect(getFeatureFlag(flags, 'test_flag')).toBe(true);

      Math.random = jest.fn().mockReturnValue(0.7); // 70% - over threshold
      expect(getFeatureFlag(flags, 'test_flag')).toBe(false);

      Math.random = originalRandom;
    });

    it('rollout - handles boundary cases for rollout percentage', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 1,
        },
      };

      // With 1% rollout, most users should be excluded
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(getFeatureFlag(flags, 'test_flag', `user-${i}`));
      }

      // Very few should be true (roughly 1%)
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBeLessThan(10); // Allow some variance
    });

    // Edge cases tests (flattened to reduce nesting - fixes S2004)
    it('edge case - handles null flag configuration', () => {
      const flags: FeatureFlagConfig = {
        test_flag: null as unknown as boolean,
      };

      expect(getFeatureFlag(flags, 'test_flag')).toBe(false);
    });

    it('edge case - handles special characters in userId', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 50,
        },
      };

      // Should not throw with special characters - call and verify no exception
      getFeatureFlag(flags, 'test_flag', 'user@example.com');
      getFeatureFlag(flags, 'test_flag', 'user-with-émojis-🎉');
      // If we reach here, no exception was thrown
      expect(true).toBe(true);
    });

    it('edge case - handles empty string userId', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          allowedUsers: ['user-123'],
        },
      };

      expect(getFeatureFlag(flags, 'test_flag', '')).toBe(true);
    });

    it('edge case - handles very long userId', () => {
      const flags: FeatureFlagConfig = {
        test_flag: {
          enabled: true,
          rolloutPercentage: 50,
        },
      };

      const longUserId = 'u'.repeat(10000);
      // Call and verify no exception is thrown
      getFeatureFlag(flags, 'test_flag', longUserId);
      expect(true).toBe(true);
    });
  });
});
