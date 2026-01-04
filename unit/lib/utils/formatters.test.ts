/**
 * Tests for formatter utilities
 */

import { formatRole, formatStatus } from '@/lib/utils/formatters';

describe('formatters', () => {
  describe('formatRole()', () => {
    it('should format USER role', () => {
      expect(formatRole('USER')).toBe('User');
    });

    it('should format ADMIN role', () => {
      expect(formatRole('ADMIN')).toBe('Admin');
    });

    it('should format SUPERADMIN role', () => {
      expect(formatRole('SUPERADMIN')).toBe('Superadmin');
    });

    it('should handle lowercase input', () => {
      expect(formatRole('user')).toBe('User');
      expect(formatRole('admin')).toBe('Admin');
    });

    it('should handle mixed case input', () => {
      expect(formatRole('UsEr')).toBe('User');
      expect(formatRole('AdMiN')).toBe('Admin');
    });

    it('should return default for null', () => {
      expect(formatRole(null)).toBe('User');
    });

    it('should return default for undefined', () => {
      expect(formatRole(undefined)).toBe('User');
    });

    it('should return default for empty string', () => {
      expect(formatRole('')).toBe('User');
    });

    it('should handle single character', () => {
      expect(formatRole('A')).toBe('A');
    });
  });

  describe('formatStatus()', () => {
    it('should format active status', () => {
      expect(formatStatus('active')).toBe('Active');
    });

    it('should format inactive status', () => {
      expect(formatStatus('inactive')).toBe('Inactive');
    });

    it('should handle uppercase input', () => {
      expect(formatStatus('ACTIVE')).toBe('Active');
      expect(formatStatus('INACTIVE')).toBe('Inactive');
    });

    it('should handle mixed case input', () => {
      expect(formatStatus('AcTiVe')).toBe('Active');
    });

    it('should return Unknown for null', () => {
      expect(formatStatus(null)).toBe('Unknown');
    });

    it('should return Unknown for undefined', () => {
      expect(formatStatus(undefined)).toBe('Unknown');
    });

    it('should return Unknown for empty string', () => {
      expect(formatStatus('')).toBe('Unknown');
    });

    it('should handle single character', () => {
      expect(formatStatus('a')).toBe('A');
    });
  });
});
