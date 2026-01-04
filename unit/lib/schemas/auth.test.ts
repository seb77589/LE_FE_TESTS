/**
 * Auth Schema Tests
 *
 * @description Unit tests for authentication-related Zod schemas.
 * Validates that schemas correctly accept valid data and reject invalid data.
 */

import {
  UserRoleSchema,
  UserSchema,
  AuthResponseSchema,
  TokenResponseSchema,
  MessageResponseSchema,
  ApiErrorSchema,
} from '@/lib/schemas';

describe('Auth Schemas', () => {
  // ==================== UserRoleSchema ====================
  describe('UserRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(UserRoleSchema.safeParse('ASSISTANT').success).toBe(true);
      expect(UserRoleSchema.safeParse('MANAGER').success).toBe(true);
      expect(UserRoleSchema.safeParse('SUPERADMIN').success).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(UserRoleSchema.safeParse('ADMIN').success).toBe(false);
      expect(UserRoleSchema.safeParse('USER').success).toBe(false);
      expect(UserRoleSchema.safeParse('admin').success).toBe(false);
      expect(UserRoleSchema.safeParse('').success).toBe(false);
      expect(UserRoleSchema.safeParse(null).success).toBe(false);
    });
  });

  // ==================== UserSchema ====================
  describe('UserSchema', () => {
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

    it('should validate a complete user object', () => {
      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.role).toBe('MANAGER');
      }
    });

    it('should accept user with optional last_login', () => {
      const userWithLastLogin = {
        ...validUser,
        last_login: '2025-01-15T10:30:00Z',
      };
      const result = UserSchema.safeParse(userWithLastLogin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.last_login).toBe('2025-01-15T10:30:00Z');
      }
    });

    it('should reject user with missing required fields', () => {
      const incompleteUser = {
        id: 1,
        email: 'test@example.com',
        // Missing: full_name, role, is_active, is_verified, created_at, updated_at
      };
      const result = UserSchema.safeParse(incompleteUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod 4 uses .issues instead of .errors
        const paths = result.error.issues.map((e) => e.path.join('.'));
        expect(paths).toContain('full_name');
        expect(paths).toContain('role');
      }
    });

    it('should reject user with invalid email format', () => {
      const userWithBadEmail = {
        ...validUser,
        email: 'not-an-email',
      };
      const result = UserSchema.safeParse(userWithBadEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod 4 uses .issues instead of .errors
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject user with invalid role', () => {
      const userWithBadRole = {
        ...validUser,
        role: 'INVALID_ROLE',
      };
      const result = UserSchema.safeParse(userWithBadRole);
      expect(result.success).toBe(false);
    });

    it('should reject user with wrong field types', () => {
      const userWithWrongTypes = {
        ...validUser,
        id: 'not-a-number',
        is_active: 'yes',
      };
      const result = UserSchema.safeParse(userWithWrongTypes);
      expect(result.success).toBe(false);
    });
  });

  // ==================== AuthResponseSchema ====================
  describe('AuthResponseSchema', () => {
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
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      refresh_token: 'refresh-token-value',
      token_type: 'bearer',
      session_id: 'session-123',
      user: validUser,
    };

    it('should validate a complete auth response', () => {
      const result = AuthResponseSchema.safeParse(validAuthResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.access_token).toBeTruthy();
        expect(result.data.user.email).toBe('test@example.com');
      }
    });

    it('should accept response with optional refresh_token', () => {
      const responseWithoutRefresh = {
        access_token: 'token',
        token_type: 'bearer',
        user: validUser,
      };
      const result = AuthResponseSchema.safeParse(responseWithoutRefresh);
      expect(result.success).toBe(true);
    });

    it('should reject response without access_token', () => {
      const responseWithoutToken = {
        token_type: 'bearer',
        user: validUser,
      };
      const result = AuthResponseSchema.safeParse(responseWithoutToken);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod 4 uses .issues instead of .errors
        const paths = result.error.issues.map((e) => e.path.join('.'));
        expect(paths).toContain('access_token');
      }
    });

    it('should reject response with empty access_token', () => {
      const responseWithEmptyToken = {
        access_token: '',
        token_type: 'bearer',
        user: validUser,
      };
      const result = AuthResponseSchema.safeParse(responseWithEmptyToken);
      expect(result.success).toBe(false);
    });

    it('should reject response with invalid user object', () => {
      const responseWithBadUser = {
        access_token: 'token',
        token_type: 'bearer',
        user: { id: 1, email: 'test@example.com' }, // Missing required fields
      };
      const result = AuthResponseSchema.safeParse(responseWithBadUser);
      expect(result.success).toBe(false);
    });

    it('should reject completely malformed response', () => {
      const malformedResponse = {
        some_field: 'value',
        another_field: 123,
      };
      const result = AuthResponseSchema.safeParse(malformedResponse);
      expect(result.success).toBe(false);
    });
  });

  // ==================== TokenResponseSchema ====================
  describe('TokenResponseSchema', () => {
    const validTokenResponse = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      refresh_token: 'refresh-token-value',
      token_type: 'bearer',
      session_id: 'session-123',
    };

    it('should validate a complete token response', () => {
      const result = TokenResponseSchema.safeParse(validTokenResponse);
      expect(result.success).toBe(true);
    });

    it('should accept response with optional fields', () => {
      const minimalResponse = {
        access_token: 'token',
        token_type: 'bearer',
      };
      const result = TokenResponseSchema.safeParse(minimalResponse);
      expect(result.success).toBe(true);
    });

    it('should reject response without access_token', () => {
      const responseWithoutToken = {
        token_type: 'bearer',
      };
      const result = TokenResponseSchema.safeParse(responseWithoutToken);
      expect(result.success).toBe(false);
    });
  });

  // ==================== MessageResponseSchema ====================
  describe('MessageResponseSchema', () => {
    it('should validate a message response', () => {
      const result = MessageResponseSchema.safeParse({ message: 'Success' });
      expect(result.success).toBe(true);
    });

    it('should reject response without message', () => {
      const result = MessageResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ==================== ApiErrorSchema ====================
  describe('ApiErrorSchema', () => {
    it('should validate an API error', () => {
      const result = ApiErrorSchema.safeParse({
        detail: 'Invalid credentials',
        status_code: 401,
      });
      expect(result.success).toBe(true);
    });

    it('should accept error without status_code', () => {
      const result = ApiErrorSchema.safeParse({
        detail: 'Error message',
      });
      expect(result.success).toBe(true);
    });

    it('should reject error without detail', () => {
      const result = ApiErrorSchema.safeParse({
        status_code: 500,
      });
      expect(result.success).toBe(false);
    });
  });
});
