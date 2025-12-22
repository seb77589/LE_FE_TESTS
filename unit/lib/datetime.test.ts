/**
 * Datetime Utilities Tests
 *
 * Tests for unified datetime formatting utilities focused on localization and timezone handling.
 * Covers date/time formatting, relative time, duration formatting, and utility functions.
 *
 * Test categories:
 * - Date formatting (formatDate, formatDateTime, formatTime)
 * - Relative time (formatRelativeTime)
 * - Duration formatting (formatDuration, formatMilliseconds)
 * - Utility functions (parseDateTime, isWithinRange, nowInBucharest)
 * - SSR safety (undefined window handling)
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/i18n', () => ({
  i18n: {
    getCurrentLocale: jest.fn(() => 'ro-RO'),
  },
}));

// Now import after mocks are set up
import * as datetime from '@/lib/utils';
import { i18n } from '@/lib/i18n';

const mockI18n = i18n as jest.Mocked<typeof i18n>;

// Store original navigator and localStorage
const originalNavigator = globalThis.navigator;
const originalLocalStorage = globalThis.localStorage;

describe('datetime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock navigator.language to return Romanian locale
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...originalNavigator, language: 'ro-RO' },
      writable: true,
      configurable: true,
    });
    // Mock localStorage to return null (so it falls back to navigator.language)
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
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('formatDate()', () => {
    it('should format date in Romanian locale by default', () => {
      const result = datetime.formatDate('2025-10-20T14:30:00Z');
      // Should use Bucharest timezone and Romanian locale
      expect(result).toMatch(/20 octombrie 2025|20 oct\. 2025/i);
    });

    it('should format date with custom locale', () => {
      const result = datetime.formatDate('2025-10-20T14:30:00Z', 'en-US');
      expect(result).toContain('October');
      expect(result).toContain('20');
      expect(result).toContain('2025');
    });

    it('should handle null date', () => {
      expect(datetime.formatDate(null)).toBe('N/A');
    });

    it('should handle undefined date', () => {
      expect(datetime.formatDate(undefined)).toBe('N/A');
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-10-20T14:30:00Z');
      const result = datetime.formatDate(date);
      expect(result).toMatch(/20 octombrie 2025|20 oct\. 2025/i);
    });

    it('should fallback gracefully on invalid date format', () => {
      const result = datetime.formatDate('invalid-date');
      // Should not throw, returns fallback format
      expect(result).toBeTruthy();
    });

    it('should apply Bucharest timezone', () => {
      // 14:30 UTC is 17:30 in Bucharest (UTC+3 in summer)
      const result = datetime.formatDate('2025-06-20T14:30:00Z');
      // Date should be based on Bucharest time, not UTC
      expect(result).toContain('20');
    });
  });

  describe('formatDateTime()', () => {
    it('should format datetime in Romanian locale by default', () => {
      const result = datetime.formatDateTime('2025-10-20T14:30:00Z');
      // Should include both date and time
      expect(result).toMatch(/20.*2025/);
      expect(result).toMatch(/\d{2}:\d{2}/); // HH:MM format
    });

    it('should format datetime with custom locale', () => {
      const result = datetime.formatDateTime('2025-10-20T14:30:00Z', 'en-US');
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time portion
    });

    it('should handle null datetime', () => {
      expect(datetime.formatDateTime(null)).toBe('N/A');
    });

    it('should handle undefined datetime', () => {
      expect(datetime.formatDateTime(undefined)).toBe('N/A');
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-10-20T14:30:00Z');
      const result = datetime.formatDateTime(date);
      expect(result).toMatch(/20.*2025/);
    });

    it('should include time in Bucharest timezone', () => {
      // 14:30 UTC should be 17:30 Bucharest (UTC+3 in summer)
      const result = datetime.formatDateTime('2025-06-20T14:30:00Z');
      // Time should be adjusted for Bucharest timezone
      expect(result).toMatch(/17:30/);
    });

    it('should fallback gracefully on invalid datetime format', () => {
      const result = datetime.formatDateTime('invalid-datetime');
      expect(result).toBeTruthy();
    });
  });

  describe('formatTime()', () => {
    it('should format time only (no date)', () => {
      const result = datetime.formatTime('2025-10-20T14:30:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/); // HH:MM format
      expect(result).not.toContain('2025'); // No year
      expect(result).not.toContain('Oct'); // No month
    });

    it('should format time with custom locale', () => {
      const result = datetime.formatTime('2025-10-20T14:30:00Z', 'en-US');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time format
    });

    it('should include seconds when requested', () => {
      const result = datetime.formatTime('2025-10-20T14:30:45Z', undefined, {
        includeSeconds: true,
      });
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/); // HH:MM:SS format
    });

    it('should not include seconds by default', () => {
      const result = datetime.formatTime('2025-10-20T14:30:45Z');
      // Should be HH:MM, not HH:MM:SS
      const colonCount = (result.match(/:/g) || []).length;
      expect(colonCount).toBe(1);
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-10-20T14:30:00Z');
      const result = datetime.formatTime(date);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should apply Bucharest timezone', () => {
      // 14:30 UTC should be 17:30 Bucharest
      const result = datetime.formatTime('2025-06-20T14:30:00Z');
      expect(result).toMatch(/17:30/);
    });

    it('should fallback gracefully on invalid time format', () => {
      const result = datetime.formatTime('invalid-time');
      expect(result).toBeTruthy();
    });
  });

  describe('formatRelativeTime()', () => {
    it('should format recent past (seconds/minutes)', () => {
      // Use a very recent date (last minute)
      const now = new Date();
      const date = new Date(now.getTime() - 30000); // 30 seconds ago
      const result = datetime.formatRelativeTime(date);
      // Should contain some relative time indicator
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should format older dates with absolute format', () => {
      // Use a date over 30 days old
      const now = new Date();
      const date = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      const result = datetime.formatRelativeTime(date);
      // Should return absolute date format (contains year)
      expect(result).toMatch(/\d{4}/); // Contains year
    });

    it('should format future time', () => {
      const now = new Date();
      const date = new Date(now.getTime() + 60000); // 1 minute from now
      const result = datetime.formatRelativeTime(date);
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should use custom locale', () => {
      const now = new Date();
      const date = new Date(now.getTime() - 300000); // 5 minutes ago
      const result = datetime.formatRelativeTime(date, 'en-US');
      expect(result).toBeTruthy();
      expect(result).not.toContain('N/A');
    });

    it('should fallback gracefully on formatting error', () => {
      const result = datetime.formatRelativeTime('invalid-date');
      // Should fallback to formatDate
      expect(result).toBeTruthy();
    });
  });

  describe('formatDuration()', () => {
    it('should format seconds only when under 60', () => {
      expect(datetime.formatDuration(45)).toBe('45s');
      expect(datetime.formatDuration(5)).toBe('5s');
      expect(datetime.formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(datetime.formatDuration(65)).toBe('1m 5s');
      expect(datetime.formatDuration(125)).toBe('2m 5s');
    });

    it('should format minutes only when no remaining seconds', () => {
      expect(datetime.formatDuration(60)).toBe('1m');
      expect(datetime.formatDuration(120)).toBe('2m');
    });

    it('should format hours and minutes', () => {
      expect(datetime.formatDuration(3665)).toBe('1h 1m');
      expect(datetime.formatDuration(7325)).toBe('2h 2m');
    });

    it('should format hours only when no remaining minutes', () => {
      expect(datetime.formatDuration(3600)).toBe('1h');
      expect(datetime.formatDuration(7200)).toBe('2h');
    });

    it('should round seconds correctly', () => {
      expect(datetime.formatDuration(65.8)).toBe('1m 6s');
      expect(datetime.formatDuration(59.4)).toBe('59s');
    });
  });

  describe('formatMilliseconds()', () => {
    it('should format milliseconds when under 1000', () => {
      expect(datetime.formatMilliseconds(150)).toBe('150ms');
      expect(datetime.formatMilliseconds(500)).toBe('500ms');
      expect(datetime.formatMilliseconds(999)).toBe('999ms');
    });

    it('should format seconds when over 1000', () => {
      expect(datetime.formatMilliseconds(1000)).toBe('1.0s');
      expect(datetime.formatMilliseconds(1500)).toBe('1.5s');
      expect(datetime.formatMilliseconds(2345)).toBe('2.3s');
    });

    it('should round to 1 decimal place', () => {
      expect(datetime.formatMilliseconds(1234)).toBe('1.2s');
      expect(datetime.formatMilliseconds(1987)).toBe('2.0s');
    });

    it('should round milliseconds when under 1000', () => {
      expect(datetime.formatMilliseconds(150.8)).toBe('151ms');
      expect(datetime.formatMilliseconds(500.4)).toBe('500ms');
    });
  });

  describe('parseDateTime()', () => {
    it('should parse valid ISO datetime string', () => {
      const result = datetime.parseDateTime('2025-10-20T14:30:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2025-10-20T14:30:00.000Z');
    });

    it('should parse date without time', () => {
      const result = datetime.parseDateTime('2025-10-20');
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw on invalid datetime string', () => {
      expect(() => datetime.parseDateTime('invalid-date')).toThrow(TypeError);
      expect(() => datetime.parseDateTime('invalid-date')).toThrow(
        /Invalid ISO datetime string/,
      );
    });

    it('should throw on empty string', () => {
      expect(() => datetime.parseDateTime('')).toThrow(TypeError);
    });

    it('should parse datetime with milliseconds', () => {
      const result = datetime.parseDateTime('2025-10-20T14:30:00.123Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCMilliseconds()).toBe(123);
    });
  });

  describe('isWithinRange()', () => {
    it('should return true when date is within range', () => {
      const result = datetime.isWithinRange(
        '2025-10-20T12:00:00Z',
        '2025-10-20T10:00:00Z',
        '2025-10-20T14:00:00Z',
      );
      expect(result).toBe(true);
    });

    it('should return true when date equals start', () => {
      const result = datetime.isWithinRange(
        '2025-10-20T10:00:00Z',
        '2025-10-20T10:00:00Z',
        '2025-10-20T14:00:00Z',
      );
      expect(result).toBe(true);
    });

    it('should return true when date equals end', () => {
      const result = datetime.isWithinRange(
        '2025-10-20T14:00:00Z',
        '2025-10-20T10:00:00Z',
        '2025-10-20T14:00:00Z',
      );
      expect(result).toBe(true);
    });

    it('should return false when date is before start', () => {
      const result = datetime.isWithinRange(
        '2025-10-20T09:00:00Z',
        '2025-10-20T10:00:00Z',
        '2025-10-20T14:00:00Z',
      );
      expect(result).toBe(false);
    });

    it('should return false when date is after end', () => {
      const result = datetime.isWithinRange(
        '2025-10-20T15:00:00Z',
        '2025-10-20T10:00:00Z',
        '2025-10-20T14:00:00Z',
      );
      expect(result).toBe(false);
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-10-20T12:00:00Z');
      const start = new Date('2025-10-20T10:00:00Z');
      const end = new Date('2025-10-20T14:00:00Z');
      expect(datetime.isWithinRange(date, start, end)).toBe(true);
    });

    it('should handle mixed string and Date inputs', () => {
      const result = datetime.isWithinRange(
        new Date('2025-10-20T12:00:00Z'),
        '2025-10-20T10:00:00Z',
        new Date('2025-10-20T14:00:00Z'),
      );
      expect(result).toBe(true);
    });
  });

  describe('nowInBucharest()', () => {
    it('should return current time as string', () => {
      const result = datetime.nowInBucharest();
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });

    it('should return a valid datetime string', () => {
      const result = datetime.nowInBucharest();
      const parsed = new Date(result);
      expect(parsed).toBeInstanceOf(Date);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
    });

    it('should be close to current time', () => {
      const before = new Date();
      const result = datetime.nowInBucharest();
      const after = new Date();

      const parsed = new Date(result);
      expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(parsed.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('SSR Safety', () => {
    it('should handle getUserLocale when window is undefined', () => {
      const originalWindow = globalThis.window;
      // Simulating SSR environment
      delete (globalThis as any).window;

      // getUserLocale is private, but formatDate uses it
      const result = datetime.formatDate('2025-10-20T14:30:00Z');
      expect(result).toBeTruthy(); // Should not throw

      globalThis.window = originalWindow;
    });

    it('should use DEFAULT_LOCALE in SSR environment', () => {
      const originalWindow = globalThis.window;
      // Simulating SSR environment
      delete (globalThis as any).window;

      // Should fallback to ro-RO locale
      const result = datetime.formatDate('2025-10-20T14:30:00Z');
      expect(result).toMatch(/20 octombrie 2025|20 oct\. 2025/i);

      globalThis.window = originalWindow;
    });
  });

  describe('i18n Integration', () => {
    it('should use locale from navigator.language', () => {
      // Override navigator.language to en-US for this test
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, language: 'en-US' },
        writable: true,
        configurable: true,
      });

      const result = datetime.formatDate('2025-10-20T14:30:00Z');
      expect(result).toContain('October');
    });

    it('should fallback to ro-RO when i18n returns null', () => {
      mockI18n.getCurrentLocale.mockReturnValue(null as any);

      const result = datetime.formatDate('2025-10-20T14:30:00Z');
      expect(result).toMatch(/20 octombrie 2025|20 oct\. 2025/i);

      // Reset to default
      mockI18n.getCurrentLocale.mockReturnValue('ro-RO');
    });
  });
});
