/**
 * Validation Helper Tests
 *
 * @description Unit tests for schema validation helper functions.
 * Tests safe validation, logging behavior, and specific validators.
 */

import { z } from 'zod';
import {
  safeValidate,
  validateAuthResponse,
  validateTokenResponse,
  validateUser,
  strictValidate,
  UserSchema,
} from '@/lib/schemas';
import logger from '@/lib/logging';

// Mock logger to verify logging behavior
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Validation Helpers', () => {
  const validUser = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'MANAGER',
    is_active: true,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const validAuthResponse = {
    access_token: 'test-token',
    token_type: 'bearer',
    user: validUser,
  };

  const validTokenResponse = {
    access_token: 'test-token',
    token_type: 'bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== safeValidate ====================
  describe('safeValidate', () => {
    it('should return success: true for valid data', () => {
      const result = safeValidate(UserSchema, validUser, 'TestUser');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('test@example.com');
      expect(result.error).toBeUndefined();
      expect(result.message).toBeUndefined();
    });

    it('should return success: false for invalid data', () => {
      const invalidData = { id: 'not-a-number' };
      const result = safeValidate(UserSchema, invalidData, 'TestUser');

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should not throw on validation failure', () => {
      const invalidData = null;

      expect(() => {
        safeValidate(UserSchema, invalidData, 'TestUser');
      }).not.toThrow();
    });

    it('should include error details in result', () => {
      const invalidData = {
        id: 1,
        email: 'invalid-email', // Invalid email format
      };
      const result = safeValidate(UserSchema, invalidData, 'TestUser');

      expect(result.success).toBe(false);
      expect(result.message).toContain('email');
    });

    it('should log warnings for failures', () => {
      const invalidData = { bad: 'data' };
      safeValidate(UserSchema, invalidData, 'TestContext');

      expect(logger.warn).toHaveBeenCalledWith(
        'validation',
        expect.stringContaining('Schema validation failed for TestContext'),
        expect.objectContaining({
          errors: expect.any(Array),
          receivedFields: expect.any(Array),
        }),
      );
    });

    it('should not log for successful validation', () => {
      safeValidate(UserSchema, validUser, 'TestUser');

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should handle non-object data gracefully', () => {
      const result = safeValidate(UserSchema, 'string-data', 'TestUser');

      expect(result.success).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ==================== validateAuthResponse ====================
  describe('validateAuthResponse', () => {
    it('should validate standard login response', () => {
      const result = validateAuthResponse(validAuthResponse);

      expect(result.success).toBe(true);
      expect(result.data?.access_token).toBe('test-token');
      expect(result.data?.user.email).toBe('test@example.com');
    });

    it('should detect malformed login response', () => {
      const malformed = {
        some_field: 'value',
        // Missing: access_token, token_type, user
      };
      const result = validateAuthResponse(malformed);

      expect(result.success).toBe(false);
      expect(result.message).toContain('access_token');
    });

    it('should log warning for malformed response', () => {
      const malformed = { some_field: 'value' };
      validateAuthResponse(malformed);

      expect(logger.warn).toHaveBeenCalledWith(
        'validation',
        expect.stringContaining('AuthResponse'),
        expect.any(Object),
      );
    });

    it('should detect missing user in auth response', () => {
      const noUser = {
        access_token: 'token',
        token_type: 'bearer',
        // Missing: user
      };
      const result = validateAuthResponse(noUser);

      expect(result.success).toBe(false);
      expect(result.message).toContain('user');
    });
  });

  // ==================== validateTokenResponse ====================
  describe('validateTokenResponse', () => {
    it('should validate token refresh response', () => {
      const result = validateTokenResponse(validTokenResponse);

      expect(result.success).toBe(true);
      expect(result.data?.access_token).toBe('test-token');
    });

    it('should detect missing access_token', () => {
      const noToken = { token_type: 'bearer' };
      const result = validateTokenResponse(noToken);

      expect(result.success).toBe(false);
    });
  });

  // ==================== validateUser ====================
  describe('validateUser', () => {
    it('should validate user object', () => {
      const result = validateUser(validUser);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(1);
    });

    it('should detect invalid user', () => {
      const invalidUser = { id: 'not-a-number' };
      const result = validateUser(invalidUser);

      expect(result.success).toBe(false);
    });
  });

  // ==================== strictValidate ====================
  describe('strictValidate', () => {
    it('should return parsed data on success', () => {
      const result = strictValidate(UserSchema, validUser, 'TestUser');

      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('MANAGER');
    });

    it('should throw ZodError on validation failure', () => {
      const invalidData = { bad: 'data' };

      expect(() => {
        strictValidate(UserSchema, invalidData, 'TestUser');
      }).toThrow();
    });

    it('should log error on validation failure', () => {
      const invalidData = { bad: 'data' };

      try {
        strictValidate(UserSchema, invalidData, 'TestUser');
      } catch {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        'validation',
        expect.stringContaining('Strict validation failed'),
        expect.any(Object),
      );
    });
  });

  // ==================== Edge Cases ====================
  describe('Edge Cases', () => {
    it('should handle undefined data', () => {
      const result = safeValidate(UserSchema, undefined, 'TestUser');
      expect(result.success).toBe(false);
    });

    it('should handle null data', () => {
      const result = safeValidate(UserSchema, null, 'TestUser');
      expect(result.success).toBe(false);
    });

    it('should handle empty object', () => {
      const result = safeValidate(UserSchema, {}, 'TestUser');
      expect(result.success).toBe(false);
    });

    it('should handle array instead of object', () => {
      const result = safeValidate(UserSchema, [validUser], 'TestUser');
      expect(result.success).toBe(false);
    });

    it('should use default context when not provided', () => {
      const result = safeValidate(UserSchema, { bad: 'data' });

      expect(result.success).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'validation',
        expect.stringContaining('unknown'),
        expect.any(Object),
      );
    });
  });
});
