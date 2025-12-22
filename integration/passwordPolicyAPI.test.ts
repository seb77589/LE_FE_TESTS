/**
 * Integration tests for password policy API client
 *
 * Tests cover:
 * - API communication with backend
 * - Password policy fetching
 * - Password validation API
 * - Caching behavior
 * - Error handling
 *
 * References: Phase 2.1 - Password Validation Consolidation
 */

import {
  fetchPasswordPolicy,
  validatePasswordWithAPI,
  fetchPasswordStrengthLevels,
  clearPasswordPolicyCache,
  getStrengthColor,
} from '@/lib/api/passwordPolicy';
import { FRONTEND_TEST_DATA } from '../test-credentials';

// Mock fetch globally
globalThis.fetch = jest.fn();

const mockFetch = globalThis.fetch as jest.MockedFunction<typeof fetch>;

describe('Password Policy API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPasswordPolicyCache(); // Clear cache before each test
  });

  describe('fetchPasswordPolicy', () => {
    const mockPolicy = {
      min_length: 8,
      max_length: 128,
      recommended_min_length: 12,
      require_lowercase: true,
      require_uppercase: true,
      require_numbers: true,
      require_special_chars: true,
      disallow_repeating: true,
      disallow_sequential: true,
      prevent_common_passwords: true,
      prevent_user_info: true,
      special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      strength_requirements: {
        minimum_score: 60,
        recommended_score: 80,
      },
    };

    it('should fetch password policy successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPolicy,
      } as Response);

      const policy = await fetchPasswordPolicy();

      expect(policy).toEqual(mockPolicy);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/password-policy'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should cache password policy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPolicy,
      } as Response);

      // First call
      const policy1 = await fetchPasswordPolicy();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const policy2 = await fetchPasswordPolicy();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call

      expect(policy1).toEqual(policy2);
    });

    it('should return default policy on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const policy = await fetchPasswordPolicy();

      // Should return default policy
      expect(policy.min_length).toBe(8);
      expect(policy.max_length).toBe(128);
      expect(policy.require_lowercase).toBe(true);
    });

    it('should return default policy on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const policy = await fetchPasswordPolicy();

      // Should return default policy
      expect(policy.min_length).toBe(8);
      expect(policy.max_length).toBe(128);
    });

    it('should handle concurrent fetch requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPolicy,
      } as Response);

      // Make multiple concurrent requests
      const promises = [
        fetchPasswordPolicy(),
        fetchPasswordPolicy(),
        fetchPasswordPolicy(),
      ];

      const results = await Promise.all(promises);

      // Should only make one API call
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // All results should be the same
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    it('should clear cache correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPolicy,
      } as Response);

      // First call
      await fetchPasswordPolicy();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearPasswordPolicyCache();

      // Next call should fetch again
      await fetchPasswordPolicy();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('validatePasswordWithAPI', () => {
    const mockValidationResult = {
      valid: true,
      errors: [] as any[],
      warnings: [] as any[],
      strength_score: 85,
      strength_level: 'strong' as const,
      passed_rules: [
        'min_length',
        'lowercase',
        'uppercase',
        'numbers',
        'special_chars',
      ],
      failed_rules: [] as any[],
      suggestions: [] as any[],
      estimated_crack_time: 'Years',
    };

    it('should validate password successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      } as Response);

      const result = await validatePasswordWithAPI('MyStr0ng!P@ssw0rd');

      expect(result).toEqual(mockValidationResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/validate-password'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: 'MyStr0ng!P@ssw0rd',
            user_info: null,
          }),
        }),
      );
    });

    it('should validate password with user info', async () => {
      const userInfo = {
        email: FRONTEND_TEST_DATA.EMAIL.VALID,
        full_name: 'Test User',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockValidationResult,
          valid: false,
          errors: ['Password should not contain parts of your name'],
          failed_rules: ['no_user_info'],
        }),
      } as Response);

      const result = await validatePasswordWithAPI(
        FRONTEND_TEST_DATA.PASSWORD.VALID,
        userInfo,
      );

      expect(result.valid).toBe(false);
      expect(result.failed_rules).toContain('no_user_info');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/validate-password'),
        expect.objectContaining({
          body: JSON.stringify({
            password: FRONTEND_TEST_DATA.PASSWORD.VALID,
            user_info: userInfo,
          }),
        }),
      );
    });

    it('should handle validation API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(validatePasswordWithAPI('test')).rejects.toThrow('Network error');
    });

    it('should handle HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      await expect(validatePasswordWithAPI('test')).rejects.toThrow(
        'Password validation failed: Bad Request',
      );
    });
  });

  describe('fetchPasswordStrengthLevels', () => {
    const mockLevels = {
      levels: [
        {
          level: 'very-weak',
          score_range: [0, 19],
          color: '#dc2626',
          description: 'Very weak password',
        },
        {
          level: 'weak',
          score_range: [20, 39],
          color: '#ea580c',
          description: 'Weak password',
        },
        {
          level: 'fair',
          score_range: [40, 59],
          color: '#d97706',
          description: 'Fair password',
        },
        {
          level: 'good',
          score_range: [60, 79],
          color: '#65a30d',
          description: 'Good password',
        },
        {
          level: 'strong',
          score_range: [80, 94],
          color: '#16a34a',
          description: 'Strong password',
        },
        {
          level: 'very-strong',
          score_range: [95, 100],
          color: '#059669',
          description: 'Very strong password',
        },
      ],
      minimum_acceptable_score: 60,
      recommended_score: 80,
    };

    it('should fetch strength levels successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLevels,
      } as Response);

      const levels = await fetchPasswordStrengthLevels();

      expect(levels).toEqual(mockLevels);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/password-strength-levels'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should handle fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchPasswordStrengthLevels()).rejects.toThrow('Network error');
    });

    it('should handle HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(fetchPasswordStrengthLevels()).rejects.toThrow(
        'Failed to fetch password strength levels',
      );
    });
  });

  describe('getStrengthColor', () => {
    it('should return correct colors for each strength level', () => {
      expect(getStrengthColor('very-weak')).toBe('#dc2626');
      expect(getStrengthColor('weak')).toBe('#ea580c');
      expect(getStrengthColor('fair')).toBe('#d97706');
      expect(getStrengthColor('good')).toBe('#65a30d');
      expect(getStrengthColor('strong')).toBe('#16a34a');
      expect(getStrengthColor('very-strong')).toBe('#059669');
    });

    it('should return fallback color for unknown strength', () => {
      expect(getStrengthColor('unknown' as any)).toBe('#6b7280');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient network errors', async () => {
      const mockPolicy = {
        min_length: 8,
        max_length: 128,
        recommended_min_length: 12,
        require_lowercase: true,
        require_uppercase: true,
        require_numbers: true,
        require_special_chars: true,
        disallow_repeating: true,
        disallow_sequential: true,
        prevent_common_passwords: true,
        prevent_user_info: true,
        special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        strength_requirements: {
          minimum_score: 60,
          recommended_score: 80,
        },
      };

      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const policy1 = await fetchPasswordPolicy();
      expect(policy1.min_length).toBe(8); // Default policy

      // Clear cache
      clearPasswordPolicyCache();

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPolicy,
      } as Response);

      const policy2 = await fetchPasswordPolicy();
      expect(policy2).toEqual(mockPolicy);
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        headers: new Headers(),
        redirected: false,
        status: 200,
        statusText: 'OK',
        type: 'basic',
        url: '',
        clone: () => ({}) as Response,
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        text: async () => '',
        bytes: async () => new Uint8Array(),
      } as unknown as Response);

      const policy = await fetchPasswordPolicy();

      // Should return default policy on JSON parse error
      expect(policy.min_length).toBe(8);
    });
  });

  describe('Integration with Real API', () => {
    it('should construct correct API URLs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      // Test policy endpoint
      await fetchPasswordPolicy();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/password-policy'),
        expect.any(Object),
      );

      // Test validation endpoint
      await validatePasswordWithAPI('test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/validate-password'),
        expect.any(Object),
      );

      // Test strength levels endpoint
      try {
        await fetchPasswordStrengthLevels();
      } catch {
        // May fail but URL should be correct
      }
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/password-strength-levels'),
        expect.any(Object),
      );
    });
  });
});
