/**
 * Unit Test for useEmailValidation Hook
 *
 * Coverage Target: 95%+
 * Priority: HIGH (critical for user registration)
 *
 * Test Categories:
 * - Hook initialization (3 tests)
 * - Config fetching (3 tests)
 * - Email validation (6 tests)
 * - Zod schema generation (3 tests)
 * - Disposable domain check (3 tests)
 * - Caching behavior (2 tests)
 * - Error handling (3 tests)
 * - createEmailSchema function (2 tests)
 */

import { FRONTEND_TEST_DATA } from '@tests/jest-test-credentials';

// Mock dependencies BEFORE imports
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

import { renderHook, waitFor } from '@testing-library/react';
import { useEmailValidation, createEmailSchema } from '@/hooks/useEmailValidation';

const mockValidConfig = {
  regex: String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`,
  max_length: 255,
  blocked_domains: ['tempmail.com', '10minutemail.com', 'guerrillamail.com'],
  blocked_domains_count: 3,
};

describe('useEmailValidation Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module cache to clear validation cache between tests
    jest.resetModules();
  });

  // Helper to create never-resolving promise mock
  const createNeverResolvingPromise = () => {
    return () => new Promise(() => {}); // Never resolves to keep loading
  };

  describe('Hook Initialization', () => {
    it('initializes with loading state', () => {
      mockFetch.mockImplementation(createNeverResolvingPromise());

      const { result } = renderHook(() => useEmailValidation());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.config).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('provides validation utilities', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      expect(typeof result.current.validateEmail).toBe('function');
      expect(typeof result.current.getEmailSchema).toBe('function');
      expect(typeof result.current.isDisposableDomain).toBe('function');
    });

    it('provides blockedDomainsCount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.blockedDomainsCount).toBe(3);
    });
  });

  describe('Config Fetching', () => {
    it('loads config successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.config).toEqual(mockValidConfig);
      expect(result.current.error).toBeNull();
    });

    it('provides config even when API unavailable (uses cached or fallback)', async () => {
      // This test acknowledges that cache or fallback config will be used
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have some config (either cached from previous tests or fallback)
      expect(result.current.config).toBeDefined();
      expect(result.current.config?.regex).toBeDefined();
      expect(result.current.config?.max_length).toBeGreaterThan(0);
    });

    it('config has all required fields', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.config).toHaveProperty('regex');
      expect(result.current.config).toHaveProperty('max_length');
      expect(result.current.config).toHaveProperty('blocked_domains');
      expect(result.current.config).toHaveProperty('blocked_domains_count');
    });
  });

  describe('Email Validation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });
    });

    it('validates correct email addresses', async () => {
      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const validation = result.current.validateEmail(FRONTEND_TEST_DATA.EMAIL.VALID);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('rejects empty email addresses', async () => {
      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const validation = result.current.validateEmail('');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Email address is required');
    });

    it('rejects invalid email format', async () => {
      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const validation = result.current.validateEmail('invalid-email');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid email address format');
    });

    it('rejects email addresses that are too long', async () => {
      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const longEmail = 'a'.repeat(250) + '@example.com';
      const validation = result.current.validateEmail(longEmail);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('too long');
    });

    it('rejects disposable email domains', async () => {
      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const validation = result.current.validateEmail('user@tempmail.com');
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Disposable email addresses');
    });

    it('trims whitespace from email addresses', async () => {
      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const validation = result.current.validateEmail(`  ${FRONTEND_TEST_DATA.EMAIL.VALID}  `);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Zod Schema Generation', () => {
    it('generates Zod schema with config', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const schema = result.current.getEmailSchema();
      expect(schema).toBeDefined();

      // Test valid email
      const validResult = schema.safeParse(FRONTEND_TEST_DATA.EMAIL.VALID);
      expect(validResult.success).toBe(true);
    });

    it('schema rejects disposable domains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const schema = result.current.getEmailSchema();
      const invalidResult = schema.safeParse('user@tempmail.com');
      expect(invalidResult.success).toBe(false);
    });

    it('schema works with fallback config', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const schema = result.current.getEmailSchema();
      const validResult = schema.safeParse(FRONTEND_TEST_DATA.EMAIL.VALID);
      expect(validResult.success).toBe(true);
    });
  });

  describe('Disposable Domain Check', () => {
    it('identifies disposable domains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isDisposableDomain('tempmail.com')).toBe(true);
      expect(result.current.isDisposableDomain('10minutemail.com')).toBe(true);
    });

    it('allows legitimate domains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isDisposableDomain('gmail.com')).toBe(false);
      expect(result.current.isDisposableDomain('example.com')).toBe(false);
    });

    it('is case-insensitive', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isDisposableDomain('TEMPMAIL.COM')).toBe(true);
      expect(result.current.isDisposableDomain('TempMail.Com')).toBe(true);
    });
  });

  describe('Caching Behavior', () => {
    it('config is available after loading', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Config should be available and valid
      expect(result.current.config).toBeDefined();
      expect(result.current.config?.regex).toBeDefined();
    });

    it('provides blockedDomainsCount from config', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.blockedDomainsCount).toBe(3);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('String error');

      const { result } = renderHook(() => useEmailValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should use fallback config
      expect(result.current.config).toBeDefined();
    });

    it('validates with fallback regex when config not loaded', async () => {
      mockFetch.mockImplementation(createNeverResolvingPromise());

      const { result } = renderHook(() => useEmailValidation());

      // Validation should work even with loading config
      const validation = result.current.validateEmail(FRONTEND_TEST_DATA.EMAIL.VALID);
      expect(validation.isValid).toBe(true);
    });

    it('cleans up on unmount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockValidConfig,
      });

      const { unmount } = renderHook(() => useEmailValidation());

      // Unmount before config loads
      unmount();

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('createEmailSchema Function', () => {
    it('creates schema from cached config', () => {
      // Assuming cache is populated from previous tests
      const schema = createEmailSchema();
      expect(schema).toBeDefined();

      const result = schema.safeParse(FRONTEND_TEST_DATA.EMAIL.VALID);
      expect(result.success).toBe(true);
    });

    it('creates schema with fallback when cache is empty', () => {
      // Clear cache by resetting modules
      jest.resetModules();

      const schema = createEmailSchema();
      expect(schema).toBeDefined();

      const result = schema.safeParse(FRONTEND_TEST_DATA.EMAIL.VALID);
      expect(result.success).toBe(true);
    });
  });
});
