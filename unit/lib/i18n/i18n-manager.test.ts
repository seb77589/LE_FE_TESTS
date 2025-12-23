/**
 * @jest-environment jsdom
 */

/**
 * Tests for i18n InternationalizationManager Class
 *
 * @description Tests the synchronous methods of the InternationalizationManager
 * class that don't require async initialization.
 */

// Mock logger before importing
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Store original globals
const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;

// Mock fetch globally
beforeAll(() => {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          meta: { name: 'English', direction: 'ltr' },
          translations: {
            welcome: { title: 'Welcome', message: 'Hello {{name}}!' },
            items: {
              zero: 'No items',
              one: '{{count}} item',
              other: '{{count}} items',
            },
          },
        }),
    }),
  ) as jest.Mock;

  // Mock localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
    configurable: true,
  });

  // Mock navigator
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages: ['en-US'], language: 'en-US' },
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});

// Import after mocks are set up
import { i18n } from '@/lib/i18n';

describe('InternationalizationManager Synchronous Methods', () => {
  describe('getCurrentLocale', () => {
    it('returns default locale (en)', () => {
      expect(i18n.getCurrentLocale()).toBe('en');
    });

    it('returns string type', () => {
      expect(typeof i18n.getCurrentLocale()).toBe('string');
    });

    it('returns non-empty string', () => {
      expect(i18n.getCurrentLocale().length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedLocales', () => {
    it('returns array', () => {
      expect(Array.isArray(i18n.getSupportedLocales())).toBe(true);
    });

    it('includes English', () => {
      expect(i18n.getSupportedLocales()).toContain('en');
    });

    it('includes Romanian', () => {
      expect(i18n.getSupportedLocales()).toContain('ro');
    });

    it('includes Spanish', () => {
      expect(i18n.getSupportedLocales()).toContain('es');
    });

    it('includes French', () => {
      expect(i18n.getSupportedLocales()).toContain('fr');
    });

    it('includes German', () => {
      expect(i18n.getSupportedLocales()).toContain('de');
    });

    it('includes Italian', () => {
      expect(i18n.getSupportedLocales()).toContain('it');
    });

    it('includes Portuguese', () => {
      expect(i18n.getSupportedLocales()).toContain('pt');
    });

    it('includes Polish', () => {
      expect(i18n.getSupportedLocales()).toContain('pl');
    });

    it('returns 8 supported locales', () => {
      expect(i18n.getSupportedLocales().length).toBe(8);
    });

    it('returns array copy (not same reference)', () => {
      const locales1 = i18n.getSupportedLocales();
      const locales2 = i18n.getSupportedLocales();
      expect(locales1).not.toBe(locales2);
      expect(locales1).toEqual(locales2);
    });
  });

  describe('getLoadedLocales', () => {
    it('returns array', () => {
      expect(Array.isArray(i18n.getLoadedLocales())).toBe(true);
    });

    it('returns array of strings', () => {
      const loaded = i18n.getLoadedLocales();
      expect(loaded.every((l: string) => typeof l === 'string')).toBe(true);
    });
  });

  describe('isRTL', () => {
    it('returns boolean', () => {
      expect(typeof i18n.isRTL()).toBe('boolean');
    });

    it('returns false for English', () => {
      expect(i18n.isRTL()).toBe(false);
    });
  });

  describe('translate', () => {
    it('returns key when translation not found', () => {
      expect(i18n.translate('nonexistent.key')).toBe('nonexistent.key');
    });

    it('returns string type', () => {
      expect(typeof i18n.translate('any.key')).toBe('string');
    });

    it('handles empty key', () => {
      expect(typeof i18n.translate('')).toBe('string');
    });

    it('handles key with dots', () => {
      expect(typeof i18n.translate('nested.deep.key')).toBe('string');
    });

    it('handles key with special characters', () => {
      expect(typeof i18n.translate('key.with-special_chars')).toBe('string');
    });

    it('returns key for missing nested translation', () => {
      expect(i18n.translate('a.b.c.d.e.f')).toBe('a.b.c.d.e.f');
    });

    it('handles whitespace key', () => {
      expect(typeof i18n.translate('   ')).toBe('string');
    });

    it('handles unicode in key', () => {
      expect(typeof i18n.translate('こんにちは.世界')).toBe('string');
    });

    it('handles very long key', () => {
      const longKey = 'a'.repeat(500);
      expect(i18n.translate(longKey)).toBe(longKey);
    });
  });

  describe('translatePlural', () => {
    it('returns string for count 0', () => {
      expect(typeof i18n.translatePlural('items', 0)).toBe('string');
    });

    it('returns string for count 1', () => {
      expect(typeof i18n.translatePlural('items', 1)).toBe('string');
    });

    it('returns string for count > 1', () => {
      expect(typeof i18n.translatePlural('items', 5)).toBe('string');
    });

    it('returns string for large count', () => {
      expect(typeof i18n.translatePlural('items', 1000000)).toBe('string');
    });

    it('handles negative count', () => {
      expect(typeof i18n.translatePlural('items', -5)).toBe('string');
    });

    it('handles decimal count', () => {
      expect(typeof i18n.translatePlural('items', 1.5)).toBe('string');
    });
  });

  describe('formatNumber', () => {
    it('formats integer with thousands separator', () => {
      expect(i18n.formatNumber(1000)).toBe('1,000');
    });

    it('formats large number', () => {
      expect(i18n.formatNumber(1234567)).toBe('1,234,567');
    });

    it('formats decimal', () => {
      const result = i18n.formatNumber(1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('formats zero', () => {
      expect(i18n.formatNumber(0)).toBe('0');
    });

    it('formats negative numbers', () => {
      const result = i18n.formatNumber(-1234);
      expect(result).toContain('1,234');
    });

    it('accepts options parameter', () => {
      const result = i18n.formatNumber(1234.5, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(typeof result).toBe('string');
    });

    it('handles very large numbers', () => {
      expect(typeof i18n.formatNumber(999999999999)).toBe('string');
    });

    it('handles Infinity', () => {
      expect(typeof i18n.formatNumber(Infinity)).toBe('string');
    });

    it('handles NaN', () => {
      expect(typeof i18n.formatNumber(Number.NaN)).toBe('string');
    });

    it('handles very small decimals', () => {
      expect(typeof i18n.formatNumber(0.0000001)).toBe('string');
    });

    it('handles negative zero', () => {
      expect(typeof i18n.formatNumber(-0)).toBe('string');
    });
  });

  describe('formatCurrency', () => {
    it('formats with default currency (USD)', () => {
      const result = i18n.formatCurrency(99.99);
      expect(result).toContain('99');
    });

    it('formats with EUR', () => {
      expect(typeof i18n.formatCurrency(99.99, 'EUR')).toBe('string');
    });

    it('formats with GBP', () => {
      expect(typeof i18n.formatCurrency(99.99, 'GBP')).toBe('string');
    });

    it('formats with JPY', () => {
      expect(typeof i18n.formatCurrency(1000, 'JPY')).toBe('string');
    });

    it('handles zero', () => {
      expect(i18n.formatCurrency(0)).toContain('0');
    });

    it('handles negative amounts', () => {
      expect(typeof i18n.formatCurrency(-50)).toBe('string');
    });

    it('handles very large amounts', () => {
      expect(typeof i18n.formatCurrency(999999999)).toBe('string');
    });

    it('handles small amounts', () => {
      expect(typeof i18n.formatCurrency(0.01)).toBe('string');
    });
  });

  describe('updateConfig', () => {
    it('does not throw when updating defaultLocale', () => {
      expect(() => i18n.updateConfig({ defaultLocale: 'es' })).not.toThrow();
    });

    it('does not throw when updating detectBrowserLanguage', () => {
      expect(() => i18n.updateConfig({ detectBrowserLanguage: false })).not.toThrow();
    });

    it('does not throw when updating interpolation', () => {
      expect(() =>
        i18n.updateConfig({
          interpolation: { prefix: '${', suffix: '}' },
        }),
      ).not.toThrow();
    });

    it('does not throw when updating persistLocale', () => {
      expect(() => i18n.updateConfig({ persistLocale: false })).not.toThrow();
    });

    it('accepts empty config', () => {
      expect(() => i18n.updateConfig({})).not.toThrow();
    });
  });
});

describe('i18n Concurrent Operations', () => {
  it('handles concurrent translate calls', () => {
    const results = Array.from({ length: 100 }, (_, i) => i18n.translate(`key.${i}`));
    expect(results.every((r) => typeof r === 'string')).toBe(true);
    expect(results.length).toBe(100);
  });

  it('handles concurrent formatNumber calls', () => {
    const results = Array.from({ length: 100 }, (_, i) => i18n.formatNumber(i * 1000));
    expect(results.every((r) => typeof r === 'string')).toBe(true);
    expect(results.length).toBe(100);
  });

  it('handles concurrent formatCurrency calls', () => {
    const results = Array.from({ length: 100 }, (_, i) => i18n.formatCurrency(i * 10));
    expect(results.every((r) => typeof r === 'string')).toBe(true);
  });

  it('handles concurrent getSupportedLocales calls', () => {
    const results = Array.from({ length: 100 }, () => i18n.getSupportedLocales());
    expect(results.every((r) => Array.isArray(r))).toBe(true);
    expect(results.every((r) => r.length === 8)).toBe(true);
  });
});

describe('i18n Edge Cases', () => {
  describe('translate edge cases', () => {
    it('handles key with only dots', () => {
      expect(typeof i18n.translate('...')).toBe('string');
    });

    it('handles key with numbers', () => {
      expect(typeof i18n.translate('key.123.value')).toBe('string');
    });

    it('handles key with hyphens', () => {
      expect(typeof i18n.translate('key-with-hyphens')).toBe('string');
    });

    it('handles key with underscores', () => {
      expect(typeof i18n.translate('key_with_underscores')).toBe('string');
    });

    it('handles mixed special characters', () => {
      expect(typeof i18n.translate('key-with_mixed.123')).toBe('string');
    });
  });

  describe('formatNumber edge cases', () => {
    it('formats 1', () => {
      expect(i18n.formatNumber(1)).toBe('1');
    });

    it('formats 10', () => {
      expect(i18n.formatNumber(10)).toBe('10');
    });

    it('formats 100', () => {
      expect(i18n.formatNumber(100)).toBe('100');
    });

    it('formats 1000', () => {
      expect(i18n.formatNumber(1000)).toBe('1,000');
    });

    it('formats 10000', () => {
      expect(i18n.formatNumber(10000)).toBe('10,000');
    });

    it('formats negative Infinity', () => {
      expect(typeof i18n.formatNumber(-Infinity)).toBe('string');
    });
  });

  describe('translatePlural edge cases', () => {
    it('handles zero', () => {
      expect(typeof i18n.translatePlural('items', 0)).toBe('string');
    });

    it('handles one', () => {
      expect(typeof i18n.translatePlural('items', 1)).toBe('string');
    });

    it('handles two', () => {
      expect(typeof i18n.translatePlural('items', 2)).toBe('string');
    });

    it('handles few (3)', () => {
      expect(typeof i18n.translatePlural('items', 3)).toBe('string');
    });

    it('handles many (100)', () => {
      expect(typeof i18n.translatePlural('items', 100)).toBe('string');
    });
  });
});
