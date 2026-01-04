/**
 * Tests for timezone utilities
 */

import { getBrowserTimezone, validateUserTimezone } from '@/lib/utils/datetime';

describe('timezone utilities', () => {
  describe('getBrowserTimezone()', () => {
    it('should return a timezone string', () => {
      const tz = getBrowserTimezone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });

    it('should return a valid IANA timezone', () => {
      const tz = getBrowserTimezone();
      // Should be in format like "Europe/Bucharest" or "America/New_York"
      expect(tz).toMatch(/^[A-Z][a-z]+\/[A-Z][a-z_]+$/);
    });
  });

  describe('validateUserTimezone()', () => {
    it('should validate valid timezone', () => {
      expect(validateUserTimezone('Europe/Bucharest')).toBe(true);
      expect(validateUserTimezone('America/New_York')).toBe(true);
      expect(validateUserTimezone('UTC')).toBe(true);
    });

    it('should reject invalid timezone', () => {
      expect(validateUserTimezone('Invalid/Timezone')).toBe(false);
      expect(validateUserTimezone('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validateUserTimezone(null as any)).toBe(false);
      expect(validateUserTimezone(undefined as any)).toBe(false);
    });
  });
});
