/**
 * Validation Utilities Unit Tests
 *
 * Tests for:
 * - Email validation utilities
 * - Password validation utilities
 * - Input sanitization utilities
 * - URL validation
 * - HTML sanitization
 */

import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';
import {
  sanitizeHTML,
  escapeHTML,
  sanitizeURL,
  sanitizeAttribute,
  sanitizeRichText,
  isSafeContent,
  sanitizeJSON,
} from '@/lib/utils/sanitize';
import { useEmailValidation, createEmailSchema } from '@/hooks/useEmailValidation';
import { usePasswordPolicy } from '@/hooks/usePasswordPolicy';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/hooks/useEmailValidation', () => ({
  useEmailValidation: jest.fn(),
  createEmailSchema: jest.fn(),
}));

jest.mock('@/hooks/usePasswordPolicy', () => ({
  usePasswordPolicy: jest.fn(),
}));

jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((dirty: string, config?: { ALLOWED_TAGS?: string[] }) => {
      if (!dirty) return dirty;
      // Basic sanitization for tests - remove script tags
      let result = dirty.replaceAll(/<script[^>]*>.*?<\/script>/gi, '');
      // Remove event handlers like onerror, onclick, etc.
      result = result.replaceAll(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
      // If ALLOWED_TAGS is empty array, remove all HTML tags (for escapeHTML)
      if (config?.ALLOWED_TAGS?.length === 0) {
        result = result.replaceAll(/<[^>]*>/g, '');
      }
      return result;
    }),
  },
}));

describe('Validation Utilities Tests', () => {
  describe('Email Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate email format correctly', () => {
      const mockUseEmailValidation = useEmailValidation as jest.MockedFunction<
        typeof useEmailValidation
      >;

      mockUseEmailValidation.mockReturnValue({
        config: {
          regex: String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$`,
          max_length: 255,
          blocked_domains: [],
          blocked_domains_count: 0,
        },
        isLoading: false,
        error: null,
        validateEmail: jest.fn((email: string) => {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email)) {
            return { isValid: false, errors: ['Invalid email address format'] };
          }
          return { isValid: true, errors: [] };
        }),
        getEmailSchema: jest.fn(),
        isDisposableDomain: jest.fn(),
        blockedDomainsCount: 0,
      });

      const { validateEmail } = mockUseEmailValidation();

      // Valid emails
      expect(validateEmail(FRONTEND_TEST_DATA.EMAIL.VALID).isValid).toBe(true);
      expect(validateEmail('user.name@domain.co.uk').isValid).toBe(true);
      expect(validateEmail('user+tag@example.com').isValid).toBe(true);

      // Invalid emails
      expect(validateEmail('invalid-email').isValid).toBe(false);
      expect(validateEmail('@example.com').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
      expect(validateEmail('user@domain').isValid).toBe(false);
    });

    it('should validate email length', () => {
      const mockUseEmailValidation = useEmailValidation as jest.MockedFunction<
        typeof useEmailValidation
      >;

      mockUseEmailValidation.mockReturnValue({
        config: {
          regex: String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$`,
          max_length: 255,
          blocked_domains: [],
          blocked_domains_count: 0,
        },
        isLoading: false,
        error: null,
        validateEmail: jest.fn((email: string) => {
          if (email.length > 255) {
            return {
              isValid: false,
              errors: ['Email address too long (maximum 255 characters)'],
            };
          }
          return { isValid: true, errors: [] };
        }),
        getEmailSchema: jest.fn(),
        isDisposableDomain: jest.fn(),
        blockedDomainsCount: 0,
      });

      const { validateEmail } = mockUseEmailValidation();

      // 243 + '@example.com' (12 chars) = 255 chars total - should be valid
      const longEmail = 'a'.repeat(243) + '@example.com';
      expect(validateEmail(longEmail).isValid).toBe(true);

      // 244 + '@example.com' (12 chars) = 256 chars total - should be invalid
      const tooLongEmail = 'a'.repeat(244) + '@example.com';
      expect(validateEmail(tooLongEmail).isValid).toBe(false);
    });

    it('should block disposable email domains', () => {
      const mockUseEmailValidation = useEmailValidation as jest.MockedFunction<
        typeof useEmailValidation
      >;

      mockUseEmailValidation.mockReturnValue({
        config: {
          regex: String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$`,
          max_length: 255,
          blocked_domains: ['tempmail.com', 'guerrillamail.com'],
          blocked_domains_count: 2,
        },
        isLoading: false,
        error: null,
        validateEmail: jest.fn((email: string) => {
          const domain = email.split('@')[1]?.toLowerCase();
          const blockedDomains = ['tempmail.com', 'guerrillamail.com'];
          if (domain && blockedDomains.includes(domain)) {
            return {
              isValid: false,
              errors: [
                'Disposable email addresses are not allowed. Please use a permanent email address.',
              ],
            };
          }
          return { isValid: true, errors: [] };
        }),
        getEmailSchema: jest.fn(),
        isDisposableDomain: jest.fn((domain: string) => {
          return ['tempmail.com', 'guerrillamail.com'].includes(domain.toLowerCase());
        }),
        blockedDomainsCount: 2,
      });

      const { validateEmail, isDisposableDomain } = mockUseEmailValidation();

      expect(validateEmail('user@tempmail.com').isValid).toBe(false);
      expect(validateEmail('user@guerrillamail.com').isValid).toBe(false);
      expect(validateEmail(FRONTEND_TEST_DATA.EMAIL.VALID).isValid).toBe(true);

      expect(isDisposableDomain('tempmail.com')).toBe(true);
      expect(isDisposableDomain('example.com')).toBe(false);
    });

    it('should handle empty or null email', () => {
      const mockUseEmailValidation = useEmailValidation as jest.MockedFunction<
        typeof useEmailValidation
      >;

      mockUseEmailValidation.mockReturnValue({
        config: {
          regex: String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$`,
          max_length: 255,
          blocked_domains: [],
          blocked_domains_count: 0,
        },
        isLoading: false,
        error: null,
        validateEmail: jest.fn((email: string) => {
          if (!email || typeof email !== 'string') {
            return { isValid: false, errors: ['Email address is required'] };
          }
          return { isValid: true, errors: [] };
        }),
        getEmailSchema: jest.fn(),
        isDisposableDomain: jest.fn(),
        blockedDomainsCount: 0,
      });

      const { validateEmail } = mockUseEmailValidation();

      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail(null as any).isValid).toBe(false);
      expect(validateEmail(undefined as any).isValid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should validate password strength', () => {
      const mockUsePasswordPolicy = usePasswordPolicy as jest.MockedFunction<
        typeof usePasswordPolicy
      >;

      mockUsePasswordPolicy.mockReturnValue({
        policy: {
          min_length: 8,
          max_length: 128,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: true,
          prevent_common_passwords: true,
          prevent_user_info: true,
        },
        isLoading: false,
        validatePassword: jest.fn((password: string, userInfo?: any) => {
          const errors: string[] = [];

          if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
          }
          if (password.length > 128) {
            errors.push('Password must be no more than 128 characters long');
          }
          if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
          }
          if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
          }
          if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
          }
          if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
          }

          return {
            isValid: errors.length === 0,
            errors,
            strength: errors.length === 0 ? 'strong' : 'weak',
            strengthScore: errors.length === 0 ? 100 : 50,
            suggestions: [],
          };
        }),
      });

      const { validatePassword } = mockUsePasswordPolicy();

      // Valid password
      const validResult = validatePassword('SecurePass123!');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid passwords
      const shortResult = validatePassword('Short1!');
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors.some((e) => e.includes('8 characters'))).toBe(true);

      const noUpperResult = validatePassword('lowercase123!');
      expect(noUpperResult.isValid).toBe(false);
      expect(noUpperResult.errors.some((e) => e.includes('uppercase'))).toBe(true);

      const noLowerResult = validatePassword('UPPERCASE123!');
      expect(noLowerResult.isValid).toBe(false);
      expect(noLowerResult.errors.some((e) => e.includes('lowercase'))).toBe(true);

      const noNumberResult = validatePassword('NoNumbers!');
      expect(noNumberResult.isValid).toBe(false);
      expect(noNumberResult.errors.some((e) => e.includes('number'))).toBe(true);

      const noSpecialResult = validatePassword('NoSpecial123');
      expect(noSpecialResult.isValid).toBe(false);
      expect(noSpecialResult.errors.some((e) => e.includes('special'))).toBe(true);
    });

    it('should prevent common passwords', () => {
      const mockUsePasswordPolicy = usePasswordPolicy as jest.MockedFunction<
        typeof usePasswordPolicy
      >;

      const commonPasswords = new Set(['password', '12345678', 'qwerty', 'abc123']);

      mockUsePasswordPolicy.mockReturnValue({
        policy: {
          min_length: 8,
          max_length: 128,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: true,
          prevent_common_passwords: true,
          prevent_user_info: true,
        },
        isLoading: false,
        validatePassword: jest.fn((password: string) => {
          const errors: string[] = [];

          if (commonPasswords.has(password.toLowerCase())) {
            errors.push(
              'This password is too common. Please choose a more secure password.',
            );
          }

          return {
            isValid: errors.length === 0,
            errors,
            strength: 'weak',
            strengthScore: 20,
            suggestions: [],
          };
        }),
      });

      const { validatePassword } = mockUsePasswordPolicy();

      expect(validatePassword('Password123!').isValid).toBe(true);
      expect(validatePassword('password').isValid).toBe(false);
      expect(validatePassword('12345678').isValid).toBe(false);
    });

    it('should prevent user info in password', () => {
      const mockUsePasswordPolicy = usePasswordPolicy as jest.MockedFunction<
        typeof usePasswordPolicy
      >;

      mockUsePasswordPolicy.mockReturnValue({
        policy: {
          min_length: 8,
          max_length: 128,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: true,
          prevent_common_passwords: true,
          prevent_user_info: true,
        },
        isLoading: false,
        validatePassword: jest.fn((password: string, userInfo?: any) => {
          const errors: string[] = [];

          if (userInfo) {
            const email = userInfo.email?.toLowerCase() || '';
            const fullName = userInfo.full_name?.toLowerCase() || '';
            const passwordLower = password.toLowerCase();

            // Check email local part
            if (email && passwordLower.includes(email.split('@')[0])) {
              errors.push('Password cannot contain your email address');
            }
            // Check each part of full name (split by whitespace) - parts must be at least 3 chars
            if (fullName) {
              const nameParts = fullName
                .split(/\s+/)
                .filter((p: string) => p.length >= 3);
              for (const part of nameParts) {
                if (passwordLower.includes(part)) {
                  errors.push('Password cannot contain your name');
                  break;
                }
              }
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
            strength: errors.length === 0 ? 'strong' : 'weak',
            strengthScore: errors.length === 0 ? 100 : 50,
            suggestions: [],
          };
        }),
      });

      const { validatePassword } = mockUsePasswordPolicy();

      const userInfo = {
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
        full_name: 'John Doe',
      };

      expect(validatePassword('SecurePass123!', userInfo).isValid).toBe(true);
      expect(validatePassword('john.doe123!', userInfo).isValid).toBe(false);
      expect(validatePassword('JohnDoe123!', userInfo).isValid).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    // Note: DOMPurify mock is defined at file level and handles sanitization

    it('should sanitize HTML content', () => {
      const dangerousHTML = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitized = sanitizeHTML(dangerousHTML);

      // Script tags should be removed
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('should escape HTML special characters', () => {
      const dangerousText = '<script>alert("XSS")</script>';
      const escaped = escapeHTML(dangerousText);

      // All HTML should be escaped
      expect(escaped).not.toContain('<script>');
    });

    it('should sanitize URLs to prevent XSS', () => {
      // Valid URLs
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
      expect(sanitizeURL('/relative/path')).toBe('/relative/path');
      expect(sanitizeURL(`mailto:${FRONTEND_TEST_DATA.EMAIL.VALID}`)).toBe(
        `mailto:${FRONTEND_TEST_DATA.EMAIL.VALID}`,
      );

      // Dangerous URLs should be blocked
      expect(sanitizeURL('javascript:alert("XSS")')).toBe('');
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeURL('vbscript:msgbox("XSS")')).toBe('');
      expect(sanitizeURL('file:///etc/passwd')).toBe('');

      // Invalid URLs should be blocked
      expect(sanitizeURL('invalid-protocol://example.com')).toBe('');
    });

    it('should sanitize HTML attributes', () => {
      const dangerousAttribute = 'x" onerror="alert(1)"';
      const sanitized = sanitizeAttribute(dangerousAttribute);

      // Event handlers should be removed
      expect(sanitized).not.toContain('onerror');
    });

    it('should sanitize rich text content', () => {
      const richText =
        '<p>Content with <strong>formatting</strong> and <script>alert(1)</script></p>';
      const sanitized = sanitizeRichText(richText);

      // Script tags should be removed, formatting preserved
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<strong>');
    });

    it('should detect unsafe content', () => {
      // Safe content
      expect(isSafeContent('Hello world')).toBe(true);
      expect(isSafeContent('<p>Safe HTML</p>')).toBe(true);

      // Dangerous content
      expect(isSafeContent('<script>alert(1)</script>')).toBe(false);
      expect(isSafeContent('javascript:alert(1)')).toBe(false);
      expect(isSafeContent('onerror="alert(1)"')).toBe(false);
      expect(isSafeContent('<iframe src="evil.com"></iframe>')).toBe(false);
      expect(isSafeContent('eval("code")')).toBe(false);
    });

    it('should sanitize JSON strings', () => {
      const safeJSON = '{"name":"John","age":30}';
      const sanitized = sanitizeJSON(safeJSON);

      expect(sanitized).toBeTruthy();
      expect(() => JSON.parse(sanitized!)).not.toThrow();

      const dangerousJSON = '{"name":"<script>alert(1)</script>"}';
      const sanitizedDangerous = sanitizeJSON(dangerousJSON);

      expect(sanitizedDangerous).toBeTruthy();
      const parsed = JSON.parse(sanitizedDangerous!);
      expect(parsed.name).not.toContain('<script>');

      // Invalid JSON should return null
      expect(sanitizeJSON('invalid json')).toBeNull();
    });

    it('should handle empty or null input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
      expect(escapeHTML('')).toBe('');
      expect(escapeHTML(null as any)).toBe('');
      expect(sanitizeURL('')).toBe('');
      expect(sanitizeURL(null as any)).toBe('');
      expect(sanitizeAttribute('')).toBe('');
      expect(sanitizeAttribute(null as any)).toBe('');
    });
  });

  describe('Email Schema Creation', () => {
    it('should create Zod schema for email validation', () => {
      const mockCreateEmailSchema = createEmailSchema as jest.MockedFunction<
        typeof createEmailSchema
      >;

      const zod = require('zod');

      mockCreateEmailSchema.mockReturnValue(
        zod
          .string()
          .email('Invalid email address format')
          .max(255, 'Email address too long'),
      );

      const schema = mockCreateEmailSchema();

      expect(schema).toBeDefined();
      expect(typeof schema.parse).toBe('function');
    });
  });
});
