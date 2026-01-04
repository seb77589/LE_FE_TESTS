/**
 * Tests for general utility functions
 *
 * Consolidated from:
 * - src/__tests__/unit/lib/utils/utils.test.ts
 * - src/__tests__/unit/utils.test.ts
 */

import { cn, capitalizeFirst, formatDate, formatDateTime } from '@/lib/utils';

describe('utils', () => {
  describe('cn()', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should concatenate class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
      expect(cn('class1', null, 'class2')).toBe('class1 class2');
      const showClass2 = false;
      const showClass3 = true;
      expect(cn('class1', showClass2 && 'class2', showClass3 && 'class3')).toBe(
        'class1 class3',
      );
      expect(cn({ 'conditional-class': true })).toBe('conditional-class');
      expect(cn({ 'conditional-class': false })).toBe('');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', null, 'baz')).toBe('foo baz');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toContain('px-4');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(cn(null, undefined, 'foo')).toBe('foo');
    });
  });

  describe('capitalizeFirst()', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
    });

    it('should capitalize the first letter of a string', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
      expect(capitalizeFirst('already Capitalized')).toBe('Already Capitalized');
      expect(capitalizeFirst('')).toBe('');
    });

    it('should handle already capitalized', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalizeFirst('h')).toBe('H');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(capitalizeFirst('123')).toBe('123');
    });

    it('should handle special characters', () => {
      expect(capitalizeFirst('!hello')).toBe('!hello');
    });
  });

  describe('formatDate', () => {
    it('should format date strings correctly', () => {
      // Mock Date to ensure consistent output across environments
      const originalDate = globalThis.Date;
      const mockDate = new Date('2025-01-15T12:00:00Z');

      globalThis.Date = jest.fn(() => mockDate) as any;
      globalThis.Date.UTC = originalDate.UTC;
      globalThis.Date.parse = originalDate.parse;
      globalThis.Date.now = originalDate.now;

      // Test with a string date
      expect(formatDate('2025-01-15')).toMatch(/January 15, 2025/);

      // Restore original Date
      globalThis.Date = originalDate;
    });

    it('should format Date objects correctly', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const result = formatDate(date);
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });
  });

  describe('formatDateTime', () => {
    it('should format date strings with time correctly', () => {
      // Create a specific date for testing
      const date = new Date(2025, 0, 15, 14, 30); // January 15, 2025, 2:30 PM
      const result = formatDateTime(date);

      // Check for date components
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2025');

      // Check for time components (this may vary by environment/locale)
      // The format might be "2:30 PM" or "14:30" depending on the environment
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Match any time format with hours and minutes
    });
  });
});
