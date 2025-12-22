/**
 * Extended tests for datetime utilities
 * Tests additional edge cases and error scenarios
 */

import * as datetime from '@/lib/utils/datetime';

describe('datetime utilities - extended tests', () => {
  describe('formatDate() - edge cases', () => {
    it('should handle empty string', () => {
      expect(datetime.formatDate('')).toBe('N/A');
    });

    it('should handle invalid date string gracefully', () => {
      const result = datetime.formatDate('not-a-date');
      expect(result).toBeTruthy();
      expect(result).not.toBe('N/A');
    });

    it('should handle very old dates', () => {
      const result = datetime.formatDate('1900-01-01T00:00:00Z');
      expect(result).toBeTruthy();
      expect(result).toMatch(/\d{4}/);
    });

    it('should handle future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      const result = datetime.formatDate(futureDate);
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateTime() - edge cases', () => {
    it('should handle midnight times', () => {
      const result = datetime.formatDateTime('2025-10-20T00:00:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle end of day times', () => {
      const result = datetime.formatDateTime('2025-10-20T23:59:59Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatTime() - edge cases', () => {
    it('should handle midnight', () => {
      const result = datetime.formatTime('2025-10-20T00:00:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle 23:59:59', () => {
      const result = datetime.formatTime('2025-10-20T23:59:59Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatRelativeTime() - edge cases', () => {
    it('should handle exactly 1 minute ago', () => {
      const now = new Date();
      const date = new Date(now.getTime() - 60000);
      const result = datetime.formatRelativeTime(date);
      expect(result).toBeTruthy();
    });

    it('should handle exactly 1 hour ago', () => {
      const now = new Date();
      const date = new Date(now.getTime() - 3600000);
      const result = datetime.formatRelativeTime(date);
      expect(result).toBeTruthy();
    });

    it('should handle exactly 1 day ago', () => {
      const now = new Date();
      const date = new Date(now.getTime() - 86400000);
      const result = datetime.formatRelativeTime(date);
      expect(result).toBeTruthy();
    });
  });

  describe('formatDuration() - edge cases', () => {
    it('should handle zero seconds', () => {
      expect(datetime.formatDuration(0)).toBe('0s');
    });

    it('should handle very large durations', () => {
      const result = datetime.formatDuration(86400); // 1 day
      expect(result).toMatch(/\d+h/);
    });

    it('should handle fractional seconds', () => {
      expect(datetime.formatDuration(0.5)).toBe('1s');
    });
  });

  describe('formatMilliseconds() - edge cases', () => {
    it('should handle zero milliseconds', () => {
      expect(datetime.formatMilliseconds(0)).toBe('0ms');
    });

    it('should handle exactly 1000ms', () => {
      expect(datetime.formatMilliseconds(1000)).toBe('1.0s');
    });

    it('should handle very large milliseconds', () => {
      const result = datetime.formatMilliseconds(3600000);
      expect(result).toMatch(/\d+\.\d+s/);
    });
  });

  describe('parseDateTime() - edge cases', () => {
    it('should parse datetime with timezone offset', () => {
      const result = datetime.parseDateTime('2025-10-20T14:30:00+03:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse datetime without Z suffix', () => {
      const result = datetime.parseDateTime('2025-10-20T14:30:00');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('isWithinRange() - edge cases', () => {
    it('should handle same start and end date', () => {
      const date = '2025-10-20T12:00:00Z';
      expect(datetime.isWithinRange(date, date, date)).toBe(true);
    });

    it('should handle very small range', () => {
      const start = '2025-10-20T12:00:00Z';
      const end = '2025-10-20T12:00:01Z';
      expect(datetime.isWithinRange(start, start, end)).toBe(true);
      expect(datetime.isWithinRange(end, start, end)).toBe(true);
    });
  });
});
