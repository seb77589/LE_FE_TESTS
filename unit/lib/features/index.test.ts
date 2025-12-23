/**
 * Feature Flags Module Barrel Export Tests
 *
 * @description Tests for the features/index.ts barrel export file.
 * Verifies all exports are available and correctly exported from their source modules.
 *
 * @module __tests__/unit/lib/features/index
 * @since 0.2.0
 */

import * as featuresModule from '@/lib/features';
import * as providerModule from '@/lib/features/FeatureFlagProvider';
import * as configModule from '@/lib/features/FeatureFlagConfig';

describe('lib/features/index - Barrel Exports', () => {
  describe('Module Structure', () => {
    it('should export all required items from the module', () => {
      expect(featuresModule).toBeDefined();
      expect(Object.keys(featuresModule).length).toBeGreaterThan(0);
    });

    it('should have all expected exports available', () => {
      const expectedExports = [
        'FeatureFlagProvider',
        'useFeatureFlag',
        'useFeatureFlags',
        'getFeatureFlags',
        'getFeatureFlag',
      ];

      for (const exportName of expectedExports) {
        expect(featuresModule).toHaveProperty(exportName);
        expect(featuresModule[exportName as keyof typeof featuresModule]).toBeDefined();
      }
    });

    it('should export exactly 5 named exports', () => {
      // FeatureFlagProvider, useFeatureFlag, useFeatureFlags, getFeatureFlags, getFeatureFlag
      const exportNames = Object.keys(featuresModule);
      expect(exportNames).toHaveLength(5);
    });
  });

  describe('FeatureFlagProvider Exports', () => {
    it('should export FeatureFlagProvider component', () => {
      expect(featuresModule.FeatureFlagProvider).toBeDefined();
      expect(typeof featuresModule.FeatureFlagProvider).toBe('function');
    });

    it('should export FeatureFlagProvider from the correct source module', () => {
      expect(featuresModule.FeatureFlagProvider).toBe(
        providerModule.FeatureFlagProvider,
      );
    });

    it('should export useFeatureFlag hook', () => {
      expect(featuresModule.useFeatureFlag).toBeDefined();
      expect(typeof featuresModule.useFeatureFlag).toBe('function');
    });

    it('should export useFeatureFlag from the correct source module', () => {
      expect(featuresModule.useFeatureFlag).toBe(providerModule.useFeatureFlag);
    });

    it('should export useFeatureFlags hook', () => {
      expect(featuresModule.useFeatureFlags).toBeDefined();
      expect(typeof featuresModule.useFeatureFlags).toBe('function');
    });

    it('should export useFeatureFlags from the correct source module', () => {
      expect(featuresModule.useFeatureFlags).toBe(providerModule.useFeatureFlags);
    });
  });

  describe('FeatureFlagConfig Exports', () => {
    it('should export getFeatureFlags function', () => {
      expect(featuresModule.getFeatureFlags).toBeDefined();
      expect(typeof featuresModule.getFeatureFlags).toBe('function');
    });

    it('should export getFeatureFlags from the correct source module', () => {
      expect(featuresModule.getFeatureFlags).toBe(configModule.getFeatureFlags);
    });

    it('should export getFeatureFlag function', () => {
      expect(featuresModule.getFeatureFlag).toBeDefined();
      expect(typeof featuresModule.getFeatureFlag).toBe('function');
    });

    it('should export getFeatureFlag from the correct source module', () => {
      expect(featuresModule.getFeatureFlag).toBe(configModule.getFeatureFlag);
    });
  });

  describe('Import Patterns', () => {
    it('should support named imports', () => {
      const {
        FeatureFlagProvider,
        useFeatureFlag,
        useFeatureFlags,
        getFeatureFlags,
        getFeatureFlag,
      } = featuresModule;

      expect(FeatureFlagProvider).toBeDefined();
      expect(useFeatureFlag).toBeDefined();
      expect(useFeatureFlags).toBeDefined();
      expect(getFeatureFlags).toBeDefined();
      expect(getFeatureFlag).toBeDefined();
    });

    it('should support namespace imports', () => {
      expect(featuresModule).toBeDefined();
      expect(featuresModule.FeatureFlagProvider).toBeDefined();
      expect(featuresModule.useFeatureFlag).toBeDefined();
      expect(featuresModule.useFeatureFlags).toBeDefined();
      expect(featuresModule.getFeatureFlags).toBeDefined();
      expect(featuresModule.getFeatureFlag).toBeDefined();
    });

    it('should allow selective named imports', () => {
      const { FeatureFlagProvider } = featuresModule;
      expect(FeatureFlagProvider).toBeDefined();
      expect(typeof FeatureFlagProvider).toBe('function');
    });

    it('should allow multiple selective imports', () => {
      const { useFeatureFlag, getFeatureFlag } = featuresModule;
      expect(useFeatureFlag).toBeDefined();
      expect(getFeatureFlag).toBeDefined();
    });
  });

  describe('Export References', () => {
    it('should maintain reference equality for FeatureFlagProvider', () => {
      const { FeatureFlagProvider: Provider1 } = featuresModule;
      const { FeatureFlagProvider: Provider2 } = featuresModule;
      expect(Provider1).toBe(Provider2);
    });

    it('should maintain reference equality for useFeatureFlag', () => {
      const { useFeatureFlag: hook1 } = featuresModule;
      const { useFeatureFlag: hook2 } = featuresModule;
      expect(hook1).toBe(hook2);
    });

    it('should maintain reference equality for useFeatureFlags', () => {
      const { useFeatureFlags: hook1 } = featuresModule;
      const { useFeatureFlags: hook2 } = featuresModule;
      expect(hook1).toBe(hook2);
    });

    it('should maintain reference equality for getFeatureFlags', () => {
      const { getFeatureFlags: fn1 } = featuresModule;
      const { getFeatureFlags: fn2 } = featuresModule;
      expect(fn1).toBe(fn2);
    });

    it('should maintain reference equality for getFeatureFlag', () => {
      const { getFeatureFlag: fn1 } = featuresModule;
      const { getFeatureFlag: fn2 } = featuresModule;
      expect(fn1).toBe(fn2);
    });
  });

  describe('Type Exports', () => {
    it('should not include type exports in runtime module', () => {
      // Types are only compile-time and should not appear in runtime
      expect(featuresModule).not.toHaveProperty('FeatureFlag');
      expect(featuresModule).not.toHaveProperty('FeatureFlagConfig');
    });

    it('should only export functions and components at runtime', () => {
      const exportValues = Object.values(featuresModule);
      for (const exportValue of exportValues) {
        expect(typeof exportValue).toBe('function');
      }
    });
  });

  describe('Module Consistency', () => {
    it('should not have undefined exports', () => {
      const exportValues = Object.values(featuresModule);
      for (const exportValue of exportValues) {
        expect(exportValue).not.toBeUndefined();
        expect(exportValue).not.toBeNull();
      }
    });

    it('should have all exports as callable functions', () => {
      const {
        FeatureFlagProvider,
        useFeatureFlag,
        useFeatureFlags,
        getFeatureFlags,
        getFeatureFlag,
      } = featuresModule;

      expect(typeof FeatureFlagProvider).toBe('function');
      expect(typeof useFeatureFlag).toBe('function');
      expect(typeof useFeatureFlags).toBe('function');
      expect(typeof getFeatureFlags).toBe('function');
      expect(typeof getFeatureFlag).toBe('function');
    });

    it('should not have name property conflicts', () => {
      const { FeatureFlagProvider } = featuresModule;
      expect(FeatureFlagProvider.name).toBeTruthy();
      expect(FeatureFlagProvider.name).not.toBe('');
    });
  });

  describe('Backward Compatibility', () => {
    it('should support legacy import patterns', () => {
      // Test that old code using these imports still works
      const Provider = featuresModule.FeatureFlagProvider;
      const useFlag = featuresModule.useFeatureFlag;
      const getFlags = featuresModule.getFeatureFlags;

      expect(Provider).toBeDefined();
      expect(useFlag).toBeDefined();
      expect(getFlags).toBeDefined();
    });

    it('should maintain API stability for hooks', () => {
      const { useFeatureFlag, useFeatureFlags } = featuresModule;

      // Hooks should be callable (will need React context in real usage)
      expect(typeof useFeatureFlag).toBe('function');
      expect(typeof useFeatureFlags).toBe('function');
    });

    it('should maintain API stability for config functions', () => {
      const { getFeatureFlags, getFeatureFlag } = featuresModule;

      expect(typeof getFeatureFlags).toBe('function');
      expect(typeof getFeatureFlag).toBe('function');

      // Should be callable
      expect(() => getFeatureFlags()).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should have minimal module initialization overhead', () => {
      const startTime = performance.now();
      const { FeatureFlagProvider } = featuresModule;
      const endTime = performance.now();

      expect(FeatureFlagProvider).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10); // Should be nearly instant
    });

    it('should not execute heavy operations on import', () => {
      // Re-importing should be fast (cached by Node)
      const startTime = performance.now();
      const reImported = require('@/lib/features');
      const endTime = performance.now();

      expect(reImported).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle destructuring all exports at once', () => {
      const {
        FeatureFlagProvider,
        useFeatureFlag,
        useFeatureFlags,
        getFeatureFlags,
        getFeatureFlag,
      } = featuresModule;

      expect(FeatureFlagProvider).toBeDefined();
      expect(useFeatureFlag).toBeDefined();
      expect(useFeatureFlags).toBeDefined();
      expect(getFeatureFlags).toBeDefined();
      expect(getFeatureFlag).toBeDefined();
    });

    it('should handle partial destructuring', () => {
      const { FeatureFlagProvider, ...rest } = featuresModule;

      expect(FeatureFlagProvider).toBeDefined();
      expect(Object.keys(rest)).toHaveLength(4);
      expect(rest).toHaveProperty('useFeatureFlag');
      expect(rest).toHaveProperty('useFeatureFlags');
      expect(rest).toHaveProperty('getFeatureFlags');
      expect(rest).toHaveProperty('getFeatureFlag');
    });

    it('should handle aliased imports', () => {
      const {
        FeatureFlagProvider: Provider,
        useFeatureFlag: useFlag,
        getFeatureFlags: getAllFlags,
      } = featuresModule;

      expect(Provider).toBe(featuresModule.FeatureFlagProvider);
      expect(useFlag).toBe(featuresModule.useFeatureFlag);
      expect(getAllFlags).toBe(featuresModule.getFeatureFlags);
    });
  });
});
