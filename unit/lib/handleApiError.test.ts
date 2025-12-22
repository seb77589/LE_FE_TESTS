/**
 * Unit tests for handleApiError function
 *
 * Tests the updated implementation that properly extracts error messages
 * from structured error objects without using JSON.stringify
 */

import { describe, it, expect } from '@jest/globals';

// Import the actual function (not mocked)
import { handleApiError } from '@/lib/api';

describe('handleApiError', () => {
  describe('string detail handling', () => {
    it('should extract message from string detail', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { detail: 'Email not verified' },
        },
        message: 'Request failed with status code 401',
      };

      const result = handleApiError(error);
      expect(result).toBe('Email not verified');
    });

    it('should handle simple string error', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { detail: 'Account locked' },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Account locked');
    });
  });

  describe('object detail handling', () => {
    it('should extract message from object detail with message property', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              message: 'Incorrect password',
              remaining_attempts: 2,
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Incorrect password');
    });

    it('should extract message from object detail with msg property', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              msg: 'Validation failed',
              code: 'VALIDATION_ERROR',
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Validation failed');
    });

    it('should NOT use JSON.stringify on objects', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              message: 'Test error',
              code: 'TEST_ERROR',
              extra_field: 'extra_value',
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Test error');
      // Verify it doesn't contain JSON syntax
      expect(result).not.toContain('{');
      expect(result).not.toContain('}');
      expect(result).not.toContain('code');
      expect(result).not.toContain('extra_field');
    });

    it('should handle object with multiple string values', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              error: 'Something went wrong',
              info: 'Please try again',
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      // Should return primary error field, not concatenate metadata
      // This prevents exposing internal metadata in user-facing messages
      expect(result).toBe('Something went wrong');
    });

    it('should handle nested error structures', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              message: 'Account locked due to failed attempts',
              account_locked: true,
              lockout_until: '2025-10-30T12:00:00Z',
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Account locked due to failed attempts');
    });
  });

  describe('array detail handling (validation errors)', () => {
    it('should handle array validation errors', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'Invalid email' },
              { loc: ['body', 'password'], msg: 'Too short' },
            ],
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('email: Invalid email, password: Too short');
    });

    it('should handle array with string items', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: ['Error 1', 'Error 2', 'Error 3'],
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Error 1, Error 2, Error 3');
    });

    it('should handle validation errors without loc property', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: [{ msg: 'General validation error' }],
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Field: General validation error');
    });

    it('should use safe string conversion instead of JSON.stringify', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: [
              { loc: ['body', 'field'], msg: 'Invalid', extra: { nested: 'data' } },
            ],
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toContain('field: Invalid');
      // Should not show JSON stringify for extra fields
      expect(result).not.toMatch(/\{.*\}/);
    });
  });

  describe('fallback handling', () => {
    it('should return error.message for non-Axios errors', () => {
      const error = new Error('Network error');

      const result = handleApiError(error);
      expect(result).toBe('Network error');
    });

    it('should return default message for empty object', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {},
        },
        message: 'Something went wrong',
      };

      const result = handleApiError(error);
      expect(result).toBe('Something went wrong');
    });

    it('should handle null detail', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: null as any,
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Request failed');
    });

    it('should handle undefined detail', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {},
        },
        message: 'An error occurred',
      };

      const result = handleApiError(error);
      expect(result).toBe('An error occurred');
    });

    it('should return default for completely unknown errors', () => {
      const error = {};

      const result = handleApiError(error);
      expect(result).toBe('An unexpected error occurred');
    });
  });

  describe('real-world error scenarios', () => {
    it('should handle email not verified error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            detail: {
              code: 'email_not_verified',
              message: 'Email not verified. Please check your inbox.',
            },
          },
        },
        message: 'Request failed with status code 401',
      };

      const result = handleApiError(error);
      expect(result).toBe('Email not verified. Please check your inbox.');
      expect(result).not.toBe('[object Object]');
    });

    it('should handle invalid credentials error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            detail: {
              message: 'Incorrect email or password',
              remaining_attempts: 2,
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Incorrect email or password');
    });

    it('should handle account lockout error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 423,
          data: {
            detail: {
              message: 'Account locked due to too many failed attempts',
              account_locked: true,
              lockout_until: '2025-10-30T15:30:00Z',
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Account locked due to too many failed attempts');
    });

    it('should handle rate limiting error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            detail: {
              message: 'Too many login attempts',
              enhanced_protection_active: true,
              remaining_time: 300,
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('Too many login attempts');
    });

    it('should handle registration validation errors', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'Invalid email format',
                type: 'value_error.email',
              },
              {
                loc: ['body', 'password'],
                msg: 'Password too weak',
                type: 'string_too_short',
              },
            ],
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toContain('email: Invalid email format');
      expect(result).toContain('password: Password too weak');
    });
  });

  describe('edge cases', () => {
    it('should handle errors with both response and data', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: 'Response error',
          },
        },
        data: {
          detail: 'Direct data error',
        },
        message: 'Request failed',
      };

      // Should prefer response.data
      const result = handleApiError(error);
      expect(result).toBe('Response error');
    });

    it('should handle non-string message values', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              message: 123,
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);
      expect(result).toBe('123');
    });

    it('should handle circular references safely', () => {
      const error: any = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              message: 'Circular error',
            },
          },
        },
        message: 'Request failed',
      };
      error.response.circular = error;

      expect(() => handleApiError(error)).not.toThrow();
      const result = handleApiError(error);
      expect(result).toBe('Circular error');
    });

    it('should not display [object Object] in any scenario', () => {
      const scenarios = [
        {
          isAxiosError: true,
          response: {
            data: { detail: { message: 'Test 1', code: 'ERR1', extra: 'data' } },
          },
          message: 'Failed',
        },
        {
          isAxiosError: true,
          response: { data: { detail: { msg: 'Test 2', nested: { deep: 'value' } } } },
          message: 'Failed',
        },
        {
          isAxiosError: true,
          response: { data: { detail: { message: 'Test 3', array: [1, 2, 3] } } },
          message: 'Failed',
        },
      ];

      for (const error of scenarios) {
        const result = handleApiError(error);
        expect(result).not.toBe('[object Object]');
        expect(result).not.toContain('[object');
        expect(result).toBeTruthy();
      }
    });
  });

  describe('comparison with old implementation', () => {
    it('NEW: extracts message from object (OLD would stringify)', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: {
              message: 'Email not verified',
              code: 'email_not_verified',
            },
          },
        },
        message: 'Request failed',
      };

      const result = handleApiError(error);

      // NEW BEHAVIOR: Extracts message
      expect(result).toBe('Email not verified');

      // OLD BEHAVIOR PREVENTED: Would have been JSON string
      expect(result).not.toBe(
        '{"message":"Email not verified","code":"email_not_verified"}',
      );
      expect(result).not.toContain('{');
      expect(result).not.toContain('code');
    });

    it('NEW: safe string conversion (OLD used JSON.stringify)', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: [
              {
                loc: ['body', 'field'],
                msg: 'Error',
                complexObject: { nested: 'data' },
              },
            ],
          },
        },
        message: 'Failed',
      };

      const result = handleApiError(error);

      // NEW BEHAVIOR: Safe string conversion
      expect(result).toContain('field: Error');

      // OLD BEHAVIOR PREVENTED: Would have stringified entire object
      expect(result).not.toMatch(/\{.*nested.*\}/);
    });
  });
});
