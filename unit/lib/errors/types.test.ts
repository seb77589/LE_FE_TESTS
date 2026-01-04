/**
 * Tests for errors/types module
 *
 * Tests covering:
 * - ErrorSeverity and ErrorCategory enums
 * - ErrorFactory static methods (all create* methods)
 * - ErrorFactory.fromHttpError method
 * - ErrorFactory.fromError method
 * - ErrorUtils utility methods
 * - Backward compatibility error classes
 * - parseAuthError function
 * - Auth error helper functions
 */

// Mock logger before imports
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  ErrorSeverity,
  ErrorCategory,
  ErrorFactory,
  ErrorUtils,
  ERROR_CODES,
  AuthenticationError,
  ValidationError,
  NetworkError,
  ServerError,
  AuthErrorCode,
  parseAuthError,
  getErrorActionText,
  shouldShowRetryButton,
  getWaitTimeMessage,
  isEmailVerificationError,
  isCredentialError,
  isAccountLockedError,
  isRateLimitError,
  isSessionExpiredError,
  isAccountDisabledError,
  extractErrorCode,
} from '@/lib/errors/types';
import type {
  ValidationErrorData,
  NetworkErrorDetails,
  RateLimitErrorDetails,
  AuthErrorDetails,
} from '@/lib/errors/types';

describe('errors/types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ErrorSeverity enum', () => {
    it('has LOW severity', () => {
      expect(ErrorSeverity.LOW).toBe('low');
    });

    it('has MEDIUM severity', () => {
      expect(ErrorSeverity.MEDIUM).toBe('medium');
    });

    it('has HIGH severity', () => {
      expect(ErrorSeverity.HIGH).toBe('high');
    });

    it('has CRITICAL severity', () => {
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('ErrorCategory enum', () => {
    it('has AUTHENTICATION category', () => {
      expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
    });

    it('has AUTHORIZATION category', () => {
      expect(ErrorCategory.AUTHORIZATION).toBe('authorization');
    });

    it('has VALIDATION category', () => {
      expect(ErrorCategory.VALIDATION).toBe('validation');
    });

    it('has NETWORK category', () => {
      expect(ErrorCategory.NETWORK).toBe('network');
    });

    it('has SERVER category', () => {
      expect(ErrorCategory.SERVER).toBe('server');
    });

    it('has CLIENT category', () => {
      expect(ErrorCategory.CLIENT).toBe('client');
    });

    it('has RATE_LIMIT category', () => {
      expect(ErrorCategory.RATE_LIMIT).toBe('rate_limit');
    });

    it('has all expected categories', () => {
      expect(ErrorCategory.PERMISSION).toBe('permission');
      expect(ErrorCategory.NOT_FOUND).toBe('not_found');
      expect(ErrorCategory.FORM).toBe('form');
      expect(ErrorCategory.FILE_UPLOAD).toBe('file_upload');
      expect(ErrorCategory.SYSTEM).toBe('system');
      expect(ErrorCategory.UNKNOWN).toBe('unknown');
    });
  });

  describe('ErrorFactory', () => {
    describe('createAuthenticationError', () => {
      it('creates error with correct structure', () => {
        const error = ErrorFactory.createAuthenticationError('Login failed');

        expect(error.code).toBe('AUTH_FAILED');
        expect(error.message).toBe('Login failed');
        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.retryable).toBe(true);
        expect(error.id).toMatch(/^error_\d+_/);
        expect(error.timestamp).toBeInstanceOf(Date);
      });

      it('includes lockout info when provided', () => {
        const error = ErrorFactory.createAuthenticationError('Locked', {
          lockoutInfo: { remainingAttempts: 2 },
        });

        expect(error.lockoutInfo).toEqual({ remainingAttempts: 2 });
      });

      it('includes context when provided', () => {
        const context = { component: 'LoginForm', action: 'submit' };
        const error = ErrorFactory.createAuthenticationError(
          'Failed',
          undefined,
          context,
        );

        expect(error.context).toEqual(context);
      });

      it('provides helpful suggestions', () => {
        const error = ErrorFactory.createAuthenticationError('Failed');

        expect(error.suggestions).toContain(
          'Verify your email and password are correct',
        );
        expect(error.suggestions?.length).toBeGreaterThan(0);
      });
    });

    describe('createAuthorizationError', () => {
      it('creates error with correct structure', () => {
        const error = ErrorFactory.createAuthorizationError('Access denied');

        expect(error.code).toBe('AUTH_FORBIDDEN');
        expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.retryable).toBe(false);
      });
    });

    describe('createValidationError', () => {
      it('creates error with validation errors', () => {
        const validationErrors: ValidationErrorData[] = [
          { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
        ];
        const error = ErrorFactory.createValidationError(
          'Validation failed',
          validationErrors,
        );

        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.validationErrors).toEqual(validationErrors);
        expect(error.retryable).toBe(true);
      });
    });

    describe('createNetworkError', () => {
      it('creates error for offline state', () => {
        const details: NetworkErrorDetails = {
          url: '/api/test',
          method: 'GET',
          offline: true,
        };
        const error = ErrorFactory.createNetworkError('Offline', details);

        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.category).toBe(ErrorCategory.NETWORK);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.userMessage).toContain('offline');
      });

      it('creates error for timeout', () => {
        const details: NetworkErrorDetails = {
          url: '/api/test',
          method: 'GET',
          timeout: true,
        };
        const error = ErrorFactory.createNetworkError('Timeout', details);

        expect(error.userMessage).toContain('timed out');
      });

      it('creates error for server error', () => {
        const details: NetworkErrorDetails = {
          url: '/api/test',
          method: 'GET',
          statusCode: 503,
        };
        const error = ErrorFactory.createNetworkError('Server error', details);

        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.userMessage).toContain('server');
        expect(error.statusCode).toBe(503);
      });

      it('creates error for regular network error', () => {
        const details: NetworkErrorDetails = {
          url: '/api/test',
          method: 'POST',
        };
        const error = ErrorFactory.createNetworkError('Network failed', details);

        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.retryable).toBe(true);
      });
    });

    describe('createRateLimitError', () => {
      it('creates error with rate limit details', () => {
        const details: RateLimitErrorDetails = {
          limit: 100,
          remaining: 0,
          resetTime: new Date(Date.now() + 60000),
          retryAfter: 60000,
        };
        const error = ErrorFactory.createRateLimitError('Rate limited', details);

        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.category).toBe(ErrorCategory.RATE_LIMIT);
        expect(error.resetTime).toBeInstanceOf(Date);
        expect(error.userMessage).toContain('60');
      });
    });

    describe('createServerError', () => {
      it('creates error with status code', () => {
        const error = ErrorFactory.createServerError('Internal error', 500);

        expect(error.code).toBe('SERVER_ERROR');
        expect(error.category).toBe(ErrorCategory.SERVER);
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.statusCode).toBe(500);
        expect(error.retryable).toBe(true);
      });

      it('marks 4xx as not retryable', () => {
        const error = ErrorFactory.createServerError('Bad request', 400);

        expect(error.retryable).toBe(false);
      });

      it('includes 503 specific suggestion', () => {
        const error = ErrorFactory.createServerError('Service unavailable', 503);

        expect(error.suggestions).toContainEqual(
          expect.stringContaining('temporarily unavailable'),
        );
      });
    });

    describe('createClientError', () => {
      it('creates error with original error', () => {
        const originalError = new Error('Original');
        const error = ErrorFactory.createClientError('Client error', originalError);

        expect(error.code).toBe('CLIENT_ERROR');
        expect(error.category).toBe(ErrorCategory.CLIENT);
        expect(error.originalError).toBe(originalError);
      });
    });

    describe('createFormError', () => {
      it('creates error with field errors', () => {
        const fieldErrors: ValidationErrorData[] = [
          { field: 'password', message: 'Too short', code: 'MIN_LENGTH' },
        ];
        const error = ErrorFactory.createFormError('Form invalid', fieldErrors);

        expect(error.code).toBe('FORM_ERROR');
        expect(error.category).toBe(ErrorCategory.FORM);
        expect(error.validationErrors).toEqual(fieldErrors);
      });
    });

    describe('createFileUploadError', () => {
      it('creates error with file context', () => {
        const context = { fileName: 'test.pdf', fileSize: 10000, fileType: 'pdf' };
        const error = ErrorFactory.createFileUploadError('Upload failed', context);

        expect(error.code).toBe('FILE_UPLOAD_ERROR');
        expect(error.category).toBe(ErrorCategory.FILE_UPLOAD);
        expect(error.context).toMatchObject(context);
      });
    });

    describe('createNotFoundError', () => {
      it('creates error with correct structure', () => {
        const error = ErrorFactory.createNotFoundError('Resource not found');

        expect(error.code).toBe('NOT_FOUND');
        expect(error.category).toBe(ErrorCategory.NOT_FOUND);
        expect(error.retryable).toBe(false);
      });
    });

    describe('fromHttpError', () => {
      it('creates validation error for 400', () => {
        const error = ErrorFactory.fromHttpError(400, 'Bad Request');

        expect(error.category).toBe(ErrorCategory.VALIDATION);
      });

      it('creates authentication error for 401', () => {
        const error = ErrorFactory.fromHttpError(401, 'Unauthorized');

        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      });

      it('creates authorization error for 403', () => {
        const error = ErrorFactory.fromHttpError(403, 'Forbidden');

        expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
      });

      it('creates not found error for 404', () => {
        const error = ErrorFactory.fromHttpError(404, 'Not Found');

        expect(error.category).toBe(ErrorCategory.NOT_FOUND);
      });

      it('creates rate limit error for 429', () => {
        const responseData = { limit: 100, remaining: 0, retryAfter: 30000 };
        const error = ErrorFactory.fromHttpError(
          429,
          'Too Many Requests',
          responseData,
        );

        expect(error.category).toBe(ErrorCategory.RATE_LIMIT);
      });

      it('creates validation error for 422', () => {
        const responseData = {
          errors: [{ field: 'email', message: 'Invalid', code: 'ERR' }],
        };
        const error = ErrorFactory.fromHttpError(
          422,
          'Unprocessable Entity',
          responseData,
        );

        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.validationErrors).toHaveLength(1);
      });

      it('creates server error for 5xx', () => {
        const error = ErrorFactory.fromHttpError(500, 'Internal Server Error');

        expect(error.category).toBe(ErrorCategory.SERVER);
      });

      it('creates client error for other 4xx', () => {
        const error = ErrorFactory.fromHttpError(418, "I'm a teapot");

        expect(error.category).toBe(ErrorCategory.CLIENT);
      });
    });

    describe('fromError', () => {
      it('creates error from generic Error', () => {
        const originalError = new Error('Something broke');
        const error = ErrorFactory.fromError(originalError);

        expect(error.code).toBe('GENERIC_ERROR');
        expect(error.message).toBe('Something broke');
        expect(error.originalError).toBe(originalError);
        expect(error.category).toBe(ErrorCategory.CLIENT);
      });

      it('accepts custom category', () => {
        const originalError = new Error('Network issue');
        const error = ErrorFactory.fromError(
          originalError,
          undefined,
          ErrorCategory.NETWORK,
        );

        expect(error.category).toBe(ErrorCategory.NETWORK);
      });

      it('includes context', () => {
        const originalError = new Error('Error');
        const context = { component: 'Test' };
        const error = ErrorFactory.fromError(originalError, context);

        expect(error.context).toEqual(context);
      });
    });
  });

  describe('ErrorUtils', () => {
    describe('isRetryableError', () => {
      it('returns true for retryable error', () => {
        const error = ErrorFactory.createNetworkError('Network', {
          url: '/api',
          method: 'GET',
        });

        expect(ErrorUtils.isRetryableError(error)).toBe(true);
      });

      it('returns false for non-retryable error', () => {
        const error = ErrorFactory.createNotFoundError('Not found');

        expect(ErrorUtils.isRetryableError(error)).toBe(false);
      });
    });

    describe('shouldAutoRetry', () => {
      it('returns true for network errors', () => {
        const error = ErrorFactory.createNetworkError('Network', {
          url: '/api',
          method: 'GET',
        });

        expect(ErrorUtils.shouldAutoRetry(error)).toBe(true);
      });

      it('returns true for server errors', () => {
        const error = ErrorFactory.createServerError('Server error', 503);

        expect(ErrorUtils.shouldAutoRetry(error)).toBe(true);
      });

      it('returns false for critical errors', () => {
        const error = ErrorFactory.createServerError('Server error', 500);
        error.severity = ErrorSeverity.CRITICAL;

        expect(ErrorUtils.shouldAutoRetry(error)).toBe(false);
      });

      it('returns false for client errors', () => {
        const error = ErrorFactory.createClientError('Client error');

        expect(ErrorUtils.shouldAutoRetry(error)).toBe(false);
      });
    });

    describe('getRetryDelay', () => {
      it('calculates exponential backoff', () => {
        expect(ErrorUtils.getRetryDelay(0)).toBe(1000);
        expect(ErrorUtils.getRetryDelay(1)).toBe(2000);
        expect(ErrorUtils.getRetryDelay(2)).toBe(4000);
        expect(ErrorUtils.getRetryDelay(3)).toBe(8000);
      });

      it('caps at 30 seconds', () => {
        expect(ErrorUtils.getRetryDelay(10)).toBe(30000);
        expect(ErrorUtils.getRetryDelay(100)).toBe(30000);
      });
    });

    describe('formatErrorForUser', () => {
      it('returns user message for simple error', () => {
        const error = ErrorFactory.createNetworkError('Network', {
          url: '/api',
          method: 'GET',
        });

        expect(ErrorUtils.formatErrorForUser(error)).toBe(error.userMessage);
      });

      it('includes validation errors in message', () => {
        const error = ErrorFactory.createValidationError('Invalid', [
          { field: 'email', message: 'Invalid email', code: 'INVALID' },
        ]);

        const formatted = ErrorUtils.formatErrorForUser(error);
        expect(formatted).toContain('email');
        expect(formatted).toContain('Invalid email');
      });
    });

    describe('categorizeError', () => {
      it('categorizes network errors', () => {
        const error = new Error('Network request failed');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.NETWORK);
      });

      it('categorizes fetch errors', () => {
        const error = new Error('Failed to fetch data');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.NETWORK);
      });

      it('categorizes authentication errors', () => {
        const error = new Error('Unauthorized access');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.AUTHENTICATION);
      });

      it('categorizes permission errors', () => {
        const error = new Error('Permission denied');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.AUTHORIZATION);
      });

      it('categorizes validation errors', () => {
        const error = new Error('Validation failed');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.VALIDATION);
      });

      it('categorizes not found errors', () => {
        const error = new Error('Resource not found');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.NOT_FOUND);
      });

      it('categorizes rate limit errors', () => {
        const error = new Error('Rate limit exceeded');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.RATE_LIMIT);
      });

      it('defaults to client category', () => {
        const error = new Error('Something happened');
        expect(ErrorUtils.categorizeError(error)).toBe(ErrorCategory.CLIENT);
      });
    });

    describe('getSeverityFromStatusCode', () => {
      it('returns HIGH for 5xx errors', () => {
        expect(ErrorUtils.getSeverityFromStatusCode(500)).toBe(ErrorSeverity.HIGH);
        expect(ErrorUtils.getSeverityFromStatusCode(503)).toBe(ErrorSeverity.HIGH);
      });

      it('returns MEDIUM for 429', () => {
        expect(ErrorUtils.getSeverityFromStatusCode(429)).toBe(ErrorSeverity.MEDIUM);
      });

      it('returns HIGH for 401 and 403', () => {
        expect(ErrorUtils.getSeverityFromStatusCode(401)).toBe(ErrorSeverity.HIGH);
        expect(ErrorUtils.getSeverityFromStatusCode(403)).toBe(ErrorSeverity.HIGH);
      });

      it('returns MEDIUM for other 4xx', () => {
        expect(ErrorUtils.getSeverityFromStatusCode(400)).toBe(ErrorSeverity.MEDIUM);
        expect(ErrorUtils.getSeverityFromStatusCode(404)).toBe(ErrorSeverity.MEDIUM);
      });

      it('returns LOW for success codes', () => {
        expect(ErrorUtils.getSeverityFromStatusCode(200)).toBe(ErrorSeverity.LOW);
        expect(ErrorUtils.getSeverityFromStatusCode(302)).toBe(ErrorSeverity.LOW);
      });
    });

    describe('shouldShowToUser', () => {
      it('returns true for normal errors', () => {
        const error = ErrorFactory.createNetworkError('Network', {
          url: '/api',
          method: 'GET',
        });

        expect(ErrorUtils.shouldShowToUser(error)).toBe(true);
      });

      it('returns false for internal codes', () => {
        const error = ErrorFactory.createNetworkError('Network', {
          url: '/api',
          method: 'GET',
        });
        error.code = 'CSRF_TOKEN_MISSING';

        expect(ErrorUtils.shouldShowToUser(error)).toBe(false);
      });

      it('returns false for SESSION_EXPIRED', () => {
        const error = ErrorFactory.createAuthenticationError('Expired');
        error.code = 'SESSION_EXPIRED';

        expect(ErrorUtils.shouldShowToUser(error)).toBe(false);
      });
    });

    describe('createErrorContext', () => {
      it('creates context with timestamp', () => {
        const context = ErrorUtils.createErrorContext();

        expect(context.timestamp).toBeInstanceOf(Date);
      });

      it('includes component and action', () => {
        const context = ErrorUtils.createErrorContext('LoginForm', 'submit');

        expect(context.component).toBe('LoginForm');
        expect(context.action).toBe('submit');
      });

      it('includes additional data', () => {
        const context = ErrorUtils.createErrorContext('Form', 'save', {
          userId: '123',
        });

        expect(context.userId).toBe('123');
      });

      it('includes URL and userAgent in browser', () => {
        // jsdom provides window
        const context = ErrorUtils.createErrorContext();

        expect(context.url).toBeDefined();
        expect(context.userAgent).toBeDefined();
      });
    });
  });

  describe('ERROR_CODES', () => {
    it('has authentication codes', () => {
      expect(ERROR_CODES.AUTHENTICATION_FAILED).toBe('AUTH_FAILED');
      expect(ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    });

    it('has permission codes', () => {
      expect(ERROR_CODES.PERMISSION_DENIED).toBe('AUTH_FORBIDDEN');
    });

    it('has validation codes', () => {
      expect(ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    });

    it('has network codes', () => {
      expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });
  });

  describe('Backward compatibility error classes', () => {
    describe('AuthenticationError', () => {
      it('creates error with message', () => {
        const error = new AuthenticationError('Auth failed');

        expect(error.message).toBe('Auth failed');
        expect(error.name).toBe('AuthenticationError');
        expect(error.code).toBe(ERROR_CODES.AUTHENTICATION_FAILED);
        expect(error.timestamp).toBeDefined();
      });

      it('includes lockout info', () => {
        const error = new AuthenticationError('Locked', 'password', {
          remainingAttempts: 0,
        });

        expect(error.authType).toBe('password');
        expect(error.lockoutInfo).toEqual({ remainingAttempts: 0 });
      });
    });

    describe('ValidationError', () => {
      it('creates error with field info', () => {
        const error = new ValidationError('Invalid email', 'email', 'format');

        expect(error.message).toBe('Invalid email');
        expect(error.name).toBe('ValidationError');
        expect(error.field).toBe('email');
        expect(error.validationRule).toBe('format');
      });
    });

    describe('NetworkError', () => {
      it('creates error with network details', () => {
        const error = new NetworkError('Timeout', 408, '/api/test', false, true);

        expect(error.message).toBe('Timeout');
        expect(error.name).toBe('NetworkError');
        expect(error.statusCode).toBe(408);
        expect(error.url).toBe('/api/test');
        expect(error.isOffline).toBe(false);
        expect(error.isTimeout).toBe(true);
      });
    });

    describe('ServerError', () => {
      it('creates error with status code', () => {
        const error = new ServerError('Internal error', 500, 'req-123');

        expect(error.message).toBe('Internal error');
        expect(error.name).toBe('ServerError');
        expect(error.statusCode).toBe(500);
        expect(error.requestId).toBe('req-123');
      });

      it('defaults to 500 status', () => {
        const error = new ServerError('Error');

        expect(error.statusCode).toBe(500);
      });
    });
  });

  describe('AuthErrorCode enum', () => {
    it('has expected codes', () => {
      expect(AuthErrorCode.EMAIL_NOT_VERIFIED).toBe('email_not_verified');
      expect(AuthErrorCode.INVALID_CREDENTIALS).toBe('invalid_credentials');
      expect(AuthErrorCode.ACCOUNT_LOCKED).toBe('account_locked');
      expect(AuthErrorCode.RATE_LIMITED).toBe('rate_limited');
      expect(AuthErrorCode.SESSION_EXPIRED).toBe('session_expired');
    });
  });

  describe('parseAuthError', () => {
    it('parses email not verified error', () => {
      const error = {
        response: {
          data: { code: AuthErrorCode.EMAIL_NOT_VERIFIED },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('validation');
      expect(result.code).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
      expect(result.retryable).toBe(false);
    });

    it('parses invalid credentials error', () => {
      const error = {
        response: {
          data: { code: AuthErrorCode.INVALID_CREDENTIALS },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authentication');
      expect(result.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(result.action).toBe('check_credentials');
    });

    it('parses account locked error', () => {
      const error = {
        response: {
          data: {
            code: AuthErrorCode.ACCOUNT_LOCKED,
            detail: { lockout_until: '2024-01-01T00:00:00Z' },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authorization');
      expect(result.code).toBe(AuthErrorCode.ACCOUNT_LOCKED);
      expect(result.action).toBe('contact_support');
    });

    it('parses rate limited error', () => {
      const error = {
        response: {
          data: {
            code: AuthErrorCode.RATE_LIMITED,
            detail: { retry_after: 60 },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('rate_limit');
      expect(result.action).toBe('wait');
    });

    it('parses session expired error', () => {
      const error = {
        response: { data: { code: AuthErrorCode.SESSION_EXPIRED } },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authentication');
      expect(result.action).toBe('retry');
    });

    it('parses account disabled error', () => {
      const error = {
        response: { data: { code: AuthErrorCode.ACCOUNT_DISABLED } },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authorization');
      expect(result.retryable).toBe(false);
    });

    it('parses HTTP 400 without error code', () => {
      const error = {
        response: { status: 400 },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('validation');
      expect(result.action).toBe('check_credentials');
    });

    it('parses HTTP 401 with remaining attempts', () => {
      const error = {
        response: {
          status: 401,
          data: { detail: { remaining_attempts: 2 } },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authentication');
      expect(result.details).toContain('2 attempts');
    });

    it('parses HTTP 403', () => {
      const error = {
        response: { status: 403 },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authorization');
    });

    it('parses HTTP 422 with array detail', () => {
      const error = {
        response: {
          status: 422,
          data: { detail: [{ msg: 'Invalid email' }] },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('validation');
      // The message may use the array content or a default message
      expect(result.action).toBe('check_credentials');
    });

    it('parses HTTP 429', () => {
      const error = {
        response: { status: 429 },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('rate_limit');
      expect(result.action).toBe('wait');
    });

    it('parses HTTP 5xx', () => {
      const error = {
        response: { status: 500 },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('server');
      expect(result.retryable).toBe(true);
    });

    it('parses network error', () => {
      const error = {
        code: 'NETWORK_ERROR',
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('parses fetch error message', () => {
      const error = {
        message: 'Failed to fetch',
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('network');
    });

    it('handles null error', () => {
      const result = parseAuthError(null);

      expect(result.type).toBe('unknown');
    });

    it('handles undefined error', () => {
      const result = parseAuthError(undefined);

      expect(result.type).toBe('unknown');
    });
  });

  describe('Auth error helper functions', () => {
    describe('getErrorActionText', () => {
      it('returns correct text for retry', () => {
        expect(getErrorActionText('retry')).toBe('Try Again');
      });

      it('returns correct text for contact_support', () => {
        expect(getErrorActionText('contact_support')).toBe('Contact Support');
      });

      it('returns correct text for wait', () => {
        expect(getErrorActionText('wait')).toBe('Please Wait');
      });

      it('returns correct text for check_credentials', () => {
        expect(getErrorActionText('check_credentials')).toBe('Check Credentials');
      });

      it('defaults to Try Again', () => {
        expect(getErrorActionText()).toBe('Try Again');
        expect(getErrorActionText('unknown')).toBe('Try Again');
      });
    });

    describe('shouldShowRetryButton', () => {
      it('returns true for retryable non-wait errors', () => {
        const details: AuthErrorDetails = {
          type: 'authentication',
          message: 'Error',
          retryable: true,
          action: 'retry',
        };

        expect(shouldShowRetryButton(details)).toBe(true);
      });

      it('returns false for wait action', () => {
        const details: AuthErrorDetails = {
          type: 'rate_limit',
          message: 'Error',
          retryable: true,
          action: 'wait',
        };

        expect(shouldShowRetryButton(details)).toBe(false);
      });

      it('returns false for non-retryable errors', () => {
        const details: AuthErrorDetails = {
          type: 'authorization',
          message: 'Error',
          retryable: false,
        };

        expect(shouldShowRetryButton(details)).toBe(false);
      });
    });

    describe('getWaitTimeMessage', () => {
      it('returns message for rate_limit', () => {
        expect(getWaitTimeMessage('rate_limit')).toBe(
          'Please wait 15 minutes before attempting to login again.',
        );
      });

      it('returns null for other types', () => {
        expect(getWaitTimeMessage('authentication')).toBeNull();
        expect(getWaitTimeMessage('network')).toBeNull();
      });
    });

    describe('error type checkers', () => {
      it('isEmailVerificationError works correctly', () => {
        expect(
          isEmailVerificationError({
            type: 'validation',
            message: '',
            retryable: false,
            code: AuthErrorCode.EMAIL_NOT_VERIFIED,
          }),
        ).toBe(true);
        expect(
          isEmailVerificationError({
            type: 'authentication',
            message: '',
            retryable: true,
            code: AuthErrorCode.INVALID_CREDENTIALS,
          }),
        ).toBe(false);
      });

      it('isCredentialError works correctly', () => {
        expect(
          isCredentialError({
            type: 'authentication',
            message: '',
            retryable: true,
            code: AuthErrorCode.INVALID_CREDENTIALS,
          }),
        ).toBe(true);
      });

      it('isAccountLockedError works correctly', () => {
        expect(
          isAccountLockedError({
            type: 'authorization',
            message: '',
            retryable: false,
            code: AuthErrorCode.ACCOUNT_LOCKED,
          }),
        ).toBe(true);
      });

      it('isRateLimitError works correctly', () => {
        expect(
          isRateLimitError({
            type: 'rate_limit',
            message: '',
            retryable: true,
            code: AuthErrorCode.RATE_LIMITED,
          }),
        ).toBe(true);
      });

      it('isSessionExpiredError works correctly', () => {
        expect(
          isSessionExpiredError({
            type: 'authentication',
            message: '',
            retryable: true,
            code: AuthErrorCode.SESSION_EXPIRED,
          }),
        ).toBe(true);
      });

      it('isAccountDisabledError works correctly', () => {
        expect(
          isAccountDisabledError({
            type: 'authorization',
            message: '',
            retryable: false,
            code: AuthErrorCode.ACCOUNT_DISABLED,
          }),
        ).toBe(true);
        expect(
          isAccountDisabledError({
            type: 'authorization',
            message: '',
            retryable: false,
            code: AuthErrorCode.ACCOUNT_SUSPENDED,
          }),
        ).toBe(true);
      });
    });

    describe('extractErrorCode', () => {
      it('extracts code from response data', () => {
        const error = {
          response: { data: { code: 'TEST_CODE' } },
        };

        expect(extractErrorCode(error)).toBe('TEST_CODE');
      });

      it('extracts code from detail', () => {
        const error = {
          response: { data: { detail: { code: 'DETAIL_CODE' } } },
        };

        expect(extractErrorCode(error)).toBe('DETAIL_CODE');
      });

      it('extracts code from direct data', () => {
        const error = {
          data: { code: 'DIRECT_CODE' },
        };

        expect(extractErrorCode(error)).toBe('DIRECT_CODE');
      });

      it('returns undefined when no code', () => {
        expect(extractErrorCode({})).toBeUndefined();
        expect(extractErrorCode(null)).toBeUndefined();
      });
    });
  });
});
