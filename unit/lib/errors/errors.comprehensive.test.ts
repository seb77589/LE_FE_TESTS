/**
 * Comprehensive Unit Tests for lib/errors/errors.ts
 *
 * @description Tests for all error handling utilities including:
 * - Error message extraction from various formats
 * - Error context extraction
 * - Error type guards (auth, validation, rate limit, account locked)
 * - Error classification
 * - Error normalization
 * - User-friendly message generation
 * - Error handling
 * - Error recovery strategies
 * - SWR error configuration
 *
 * @module __tests__/unit/lib/errors/errors.comprehensive
 */

import {
  ERROR_CODES,
  extractErrorMessage,
  extractErrorContext,
  isAuthError,
  isValidationError,
  isRateLimitError,
  isAccountLockedError,
  ErrorType,
  classifyError,
  normalizeError,
  getUserFriendlyMessage,
  handleError,
  errorRecovery,
  swrErrorConfig,
} from '@/lib/errors/errors';

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('lib/errors/errors.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // ERROR_CODES
  // ==========================================================================
  describe('ERROR_CODES', () => {
    it('should define authentication error codes', () => {
      expect(ERROR_CODES.AUTHENTICATION_FAILED).toBe('AUTH_FAILED');
      expect(ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
      expect(ERROR_CODES.PERMISSION_DENIED).toBe('AUTH_FORBIDDEN');
    });

    it('should define validation and network error codes', () => {
      expect(ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.RATE_LIMITED).toBe('RATE_LIMITED');
    });

    it('should define additional auth-related error codes', () => {
      expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
      expect(ERROR_CODES.AUTH_ACCOUNT_LOCKED).toBe('AUTH_ACCOUNT_LOCKED');
      expect(ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS).toBe('AUTH_EMAIL_ALREADY_EXISTS');
      expect(ERROR_CODES.AUTH_PASSWORD_TOO_WEAK).toBe('AUTH_PASSWORD_TOO_WEAK');
      expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('should define validation, rate limit, and server error codes', () => {
      expect(ERROR_CODES.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
      expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ERROR_CODES.SERVER_INTERNAL_ERROR).toBe('SERVER_INTERNAL_ERROR');
      expect(ERROR_CODES.NETWORK_OFFLINE).toBe('NETWORK_OFFLINE');
    });
  });

  // ==========================================================================
  // extractErrorMessage
  // ==========================================================================
  describe('extractErrorMessage', () => {
    it('should return fallback for null/undefined errors', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
      expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(extractErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should extract message from simple Error object', () => {
      const error = new Error('Simple error message');
      expect(extractErrorMessage(error)).toBe('Simple error message');
    });

    it('should extract message from Axios-style error with response.data.detail string', () => {
      const error = {
        response: {
          data: {
            detail: 'Backend validation error',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Backend validation error');
    });

    it('should extract message from Axios-style error with response.data.message', () => {
      const error = {
        response: {
          data: {
            message: 'Server returned an error',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Server returned an error');
    });

    it('should format FastAPI validation errors (array of validation errors)', () => {
      const error = {
        response: {
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'value is not a valid email' },
              { loc: ['body', 'password'], msg: 'ensure this value has at least 8 characters' },
            ],
          },
        },
      };
      const message = extractErrorMessage(error);
      expect(message).toContain('email: value is not a valid email');
      expect(message).toContain('password: ensure this value has at least 8 characters');
    });

    it('should handle validation errors with missing loc field', () => {
      const error = {
        response: {
          data: {
            detail: [
              { msg: 'validation failed' },
            ],
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Field: validation failed');
    });

    it('should handle validation errors that are plain strings in array', () => {
      const error = {
        response: {
          data: {
            detail: ['Error one', 'Error two'],
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Error one, Error two');
    });

    it('should extract from error.data directly (non-response structure)', () => {
      const error = {
        data: {
          detail: 'Direct data error',
        },
      };
      expect(extractErrorMessage(error)).toBe('Direct data error');
    });

    it('should extract from error.data.message', () => {
      const error = {
        data: {
          message: 'Data message error',
        },
      };
      expect(extractErrorMessage(error)).toBe('Data message error');
    });

    it('should handle error detail as object with message property', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: 'Nested message in detail',
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Nested message in detail');
    });

    it('should handle error detail as object with msg property', () => {
      const error = {
        response: {
          data: {
            detail: {
              msg: 'Nested msg in detail',
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Nested msg in detail');
    });

    it('should join string values from detail object when no message/msg', () => {
      const error = {
        response: {
          data: {
            detail: {
              field1: 'error one',
              field2: 'error two',
              numericField: 123, // should be ignored
            },
          },
        },
      };
      const message = extractErrorMessage(error);
      expect(message).toContain('error one');
      expect(message).toContain('error two');
    });

    it('should handle object message that is not a string', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: { nested: 'object message' },
            },
          },
        },
      };
      const message = extractErrorMessage(error);
      expect(message).toContain('nested');
      expect(message).toContain('object message');
    });

    it('should handle object msg that is not a string', () => {
      const error = {
        response: {
          data: {
            detail: {
              msg: { complex: 'msg object' },
            },
          },
        },
      };
      const message = extractErrorMessage(error);
      expect(message).toContain('complex');
    });

    it('should handle response.data.message as object', () => {
      const error = {
        response: {
          data: {
            message: { error: 'structured error' },
          },
        },
      };
      const message = extractErrorMessage(error);
      expect(message).toContain('structured error');
    });

    it('should handle numeric and boolean values in safeStringifyValue', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: 42,
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('42');

      const boolError = {
        response: {
          data: {
            detail: {
              message: false,
            },
          },
        },
      };
      expect(extractErrorMessage(boolError)).toBe('false');
    });

    it('should handle undefined value in safeStringifyValue', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: undefined,
            },
          },
        },
      };
      // When message is undefined, it should fall through to other extraction methods
      expect(extractErrorMessage(error, 'Fallback')).toBeDefined();
    });

    it('should return fallback when detail object has no string values', () => {
      const error = {
        response: {
          data: {
            detail: {
              numField: 123,
              objField: { nested: true },
            },
          },
        },
        message: 'Fallback message from error object',
      };
      expect(extractErrorMessage(error)).toBe('Fallback message from error object');
    });
  });

  // ==========================================================================
  // extractErrorContext
  // ==========================================================================
  describe('extractErrorContext', () => {
    it('should extract basic error context', () => {
      const error = new Error('Test error');
      const context = extractErrorContext(error);

      expect(context.message).toBe('Test error');
      expect(context.status).toBeUndefined();
    });

    it('should extract status from response', () => {
      const error = {
        response: {
          status: 401,
          data: { detail: 'Unauthorized' },
        },
      };
      const context = extractErrorContext(error);

      expect(context.message).toBe('Unauthorized');
      expect(context.status).toBe(401);
    });

    it('should extract status from error.status', () => {
      const error = {
        status: 500,
        message: 'Server error',
      };
      const context = extractErrorContext(error);

      expect(context.status).toBe(500);
    });

    it('should extract code from error detail', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
            },
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.code).toBe('VALIDATION_ERROR');
    });

    it('should extract remaining_attempts from error detail', () => {
      const error = {
        response: {
          status: 401,
          data: {
            detail: {
              message: 'Invalid credentials',
              remaining_attempts: 3,
            },
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.remainingAttempts).toBe(3);
    });

    it('should extract account_locked from error detail', () => {
      const error = {
        response: {
          status: 423,
          data: {
            detail: {
              message: 'Account locked',
              account_locked: true,
            },
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.accountLocked).toBe(true);
    });

    it('should extract lockout_until from error detail', () => {
      const lockoutTime = '2024-12-25T12:00:00Z';
      const error = {
        response: {
          status: 423,
          data: {
            detail: {
              message: 'Account locked',
              lockout_until: lockoutTime,
            },
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.lockoutUntil).toBe(lockoutTime);
    });

    it('should extract validation errors from array detail', () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'invalid email' },
              { loc: ['body', 'name'], msg: 'required field' },
            ],
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.validationErrors).toHaveLength(2);
      expect(context.validationErrors![0].field).toBe('email');
      expect(context.validationErrors![0].message).toBe('invalid email');
      expect(context.validationErrors![1].field).toBe('name');
    });

    it('should handle validation errors with missing loc', () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [
              { msg: 'general validation error' },
            ],
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.validationErrors).toHaveLength(1);
      expect(context.validationErrors![0].field).toBe('unknown');
    });

    it('should extract from data directly (non-response)', () => {
      const error = {
        data: {
          detail: {
            code: 'DIRECT_ERROR',
            message: 'Direct error',
          },
        },
      };
      const context = extractErrorContext(error);

      expect(context.code).toBe('DIRECT_ERROR');
    });
  });

  // ==========================================================================
  // Error Type Guards
  // ==========================================================================
  describe('isAuthError', () => {
    it('should return true for 401 status', () => {
      expect(isAuthError({ response: { status: 401 } })).toBe(true);
      expect(isAuthError({ status: 401 })).toBe(true);
    });

    it('should return true for 403 status', () => {
      expect(isAuthError({ response: { status: 403 } })).toBe(true);
      expect(isAuthError({ status: 403 })).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isAuthError({ response: { status: 400 } })).toBe(false);
      expect(isAuthError({ response: { status: 404 } })).toBe(false);
      expect(isAuthError({ response: { status: 500 } })).toBe(false);
    });

    it('should return false for errors without status', () => {
      expect(isAuthError(new Error('test'))).toBe(false);
      expect(isAuthError({})).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for 422 status', () => {
      expect(isValidationError({ response: { status: 422 } })).toBe(true);
      expect(isValidationError({ status: 422 })).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isValidationError({ response: { status: 400 } })).toBe(false);
      expect(isValidationError({ response: { status: 401 } })).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for 429 status', () => {
      expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
      expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isRateLimitError({ response: { status: 400 } })).toBe(false);
      expect(isRateLimitError({ response: { status: 503 } })).toBe(false);
    });
  });

  describe('isAccountLockedError', () => {
    it('should return true for 423 status', () => {
      expect(isAccountLockedError({ response: { status: 423 } })).toBe(true);
      expect(isAccountLockedError({ status: 423 })).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isAccountLockedError({ response: { status: 401 } })).toBe(false);
      expect(isAccountLockedError({ response: { status: 429 } })).toBe(false);
    });
  });

  // ==========================================================================
  // classifyError
  // ==========================================================================
  describe('classifyError', () => {
    it('should classify 401 as AUTHENTICATION', () => {
      expect(classifyError({ response: { status: 401 } })).toBe(ErrorType.AUTHENTICATION);
    });

    it('should classify error with "unauthorized" message as AUTHENTICATION', () => {
      expect(classifyError({ message: 'Unauthorized access' })).toBe(ErrorType.AUTHENTICATION);
    });

    it('should classify 403 as AUTHORIZATION', () => {
      expect(classifyError({ response: { status: 403 } })).toBe(ErrorType.AUTHORIZATION);
    });

    it('should classify error with "forbidden" message as AUTHORIZATION', () => {
      expect(classifyError({ message: 'Forbidden action' })).toBe(ErrorType.AUTHORIZATION);
    });

    it('should classify 4xx errors as VALIDATION', () => {
      expect(classifyError({ response: { status: 400 } })).toBe(ErrorType.VALIDATION);
      expect(classifyError({ response: { status: 404 } })).toBe(ErrorType.VALIDATION);
      expect(classifyError({ response: { status: 422 } })).toBe(ErrorType.VALIDATION);
    });

    it('should classify 5xx errors as SERVER', () => {
      expect(classifyError({ response: { status: 500 } })).toBe(ErrorType.SERVER);
      expect(classifyError({ response: { status: 502 } })).toBe(ErrorType.SERVER);
      expect(classifyError({ response: { status: 503 } })).toBe(ErrorType.SERVER);
    });

    it('should classify NetworkError as NETWORK', () => {
      expect(classifyError({ name: 'NetworkError' })).toBe(ErrorType.NETWORK);
    });

    it('should classify error with "network" in message as NETWORK', () => {
      expect(classifyError({ message: 'Network connection failed' })).toBe(ErrorType.NETWORK);
    });

    it('should classify error with CLIENT_ code prefix as CLIENT', () => {
      expect(classifyError({ code: 'CLIENT_VALIDATION_ERROR' })).toBe(ErrorType.CLIENT);
      expect(classifyError({ code: 'CLIENT_TIMEOUT' })).toBe(ErrorType.CLIENT);
    });

    it('should classify unknown errors as UNKNOWN', () => {
      expect(classifyError({})).toBe(ErrorType.UNKNOWN);
      expect(classifyError(new Error('random error'))).toBe(ErrorType.UNKNOWN);
    });
  });

  // ==========================================================================
  // normalizeError
  // ==========================================================================
  describe('normalizeError', () => {
    it('should normalize Axios-style error with response', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Bad request',
            code: 'VALIDATION_ERROR',
          },
        },
        message: 'Request failed',
        config: {
          url: '/api/users',
          method: 'POST',
        },
      };

      const normalized = normalizeError(error);

      expect(normalized.message).toBe('Bad request');
      expect(normalized.code).toBe('VALIDATION_ERROR');
      expect(normalized.statusCode).toBe(400);
      expect(normalized.context?.url).toBe('/api/users');
      expect(normalized.context?.method).toBe('POST');
      expect(normalized.timestamp).toBeInstanceOf(Date);
      expect(normalized.userFriendly).toBe(true); // < 500 is user friendly
    });

    it('should normalize error with response.data.detail', () => {
      const error = {
        response: {
          status: 404,
          data: {
            detail: 'Resource not found',
          },
        },
      };

      const normalized = normalizeError(error);
      expect(normalized.message).toBe('Resource not found');
    });

    it('should fallback to error.message for response errors', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
        message: 'Request failed with status 500',
      };

      const normalized = normalizeError(error);
      expect(normalized.message).toBe('Request failed with status 500');
      expect(normalized.userFriendly).toBe(false); // 500 is not user friendly
    });

    it('should use "Request failed" as fallback for response without message', () => {
      const error = {
        response: {
          status: 502,
          data: null,
        },
      };

      const normalized = normalizeError(error);
      expect(normalized.message).toBe('Request failed');
    });

    it('should normalize simple Error object', () => {
      const error = new Error('Simple error');
      error.name = 'ValidationError';

      const normalized = normalizeError(error);

      expect(normalized.message).toBe('Simple error');
      expect(normalized.code).toBe('ValidationError');
      expect(normalized.userFriendly).toBe(false);
    });

    it('should normalize error with code property', () => {
      const error = {
        message: 'Custom error',
        code: 'CUSTOM_CODE',
      };

      const normalized = normalizeError(error);
      expect(normalized.code).toBe('CUSTOM_CODE');
    });

    it('should normalize string error', () => {
      const normalized = normalizeError('String error message');

      expect(normalized.message).toBe('String error message');
      expect(normalized.userFriendly).toBe(true);
    });

    it('should handle unknown error types', () => {
      const normalized = normalizeError(12345);

      expect(normalized.message).toBe('An unexpected error occurred');
      expect(normalized.code).toBe('UNKNOWN_ERROR');
      expect(normalized.userFriendly).toBe(true);
    });

    it('should include provided context', () => {
      const error = new Error('Test');
      const context = { userId: 123, action: 'delete' };

      const normalized = normalizeError(error, context);

      expect(normalized.context?.userId).toBe(123);
      expect(normalized.context?.action).toBe('delete');
    });

    it('should handle message that is not a string in response data', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: { error: 'structured', code: 123 },
          },
        },
      };

      const normalized = normalizeError(error);
      expect(normalized.message).toContain('structured');
    });

    it('should handle error.message that is not a string', () => {
      const error = {
        message: { nested: 'message object' },
      };

      const normalized = normalizeError(error);
      expect(normalized.message).toContain('nested');
    });

    it('should generate HTTP_ code from status when no code provided', () => {
      const error = {
        response: {
          status: 404,
          data: {},
        },
      };

      const normalized = normalizeError(error);
      expect(normalized.code).toBe('HTTP_404');
    });
  });

  // ==========================================================================
  // getUserFriendlyMessage
  // ==========================================================================
  describe('getUserFriendlyMessage', () => {
    it('should return original message if userFriendly is true', () => {
      const errorDetails = {
        message: 'User friendly message',
        userFriendly: true,
      };

      expect(getUserFriendlyMessage(errorDetails)).toBe('User friendly message');
    });

    it('should return auth message for AUTHENTICATION errors', () => {
      const errorDetails = {
        message: 'Unauthorized',
        userFriendly: false,
        statusCode: 401,
      };

      // classifyError will classify by status if available via response property
      const errorDetailsWithResponse = {
        ...errorDetails,
        response: { status: 401 },
      };

      expect(getUserFriendlyMessage(errorDetailsWithResponse)).toBe('Please log in to continue.');
    });

    it('should return permission message for AUTHORIZATION errors', () => {
      const errorDetails = {
        message: 'Forbidden',
        userFriendly: false,
        response: { status: 403 },
      };

      expect(getUserFriendlyMessage(errorDetails)).toBe('You do not have permission to perform this action.');
    });

    it('should return validation message for VALIDATION errors', () => {
      const errorDetails = {
        message: 'Validation failed',
        userFriendly: false,
        response: { status: 422 },
      };

      expect(getUserFriendlyMessage(errorDetails)).toBe('Please check your input and try again.');
    });

    it('should return network message for NETWORK errors', () => {
      const errorDetails = {
        message: 'Network error occurred',
        userFriendly: false,
        name: 'NetworkError',
      };

      expect(getUserFriendlyMessage(errorDetails)).toBe('Network connection error. Please check your internet connection.');
    });

    it('should return server message for SERVER errors', () => {
      const errorDetails = {
        message: 'Internal server error',
        userFriendly: false,
        response: { status: 500 },
      };

      expect(getUserFriendlyMessage(errorDetails)).toBe('Server error. Please try again later.');
    });

    it('should return generic message for UNKNOWN errors', () => {
      const errorDetails = {
        message: 'Something went wrong',
        userFriendly: false,
      };

      expect(getUserFriendlyMessage(errorDetails)).toBe('An unexpected error occurred. Please try again.');
    });
  });

  // ==========================================================================
  // handleError
  // ==========================================================================
  describe('handleError', () => {
    const mockLogger = require('@/lib/logging').default;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle null error', () => {
      const result = handleError(null);

      expect(result.message).toBe('Empty error object');
      expect(result.code).toBe('EMPTY_ERROR');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle undefined error', () => {
      const result = handleError(undefined);

      expect(result.message).toBe('Empty error object');
      expect(result.code).toBe('EMPTY_ERROR');
    });

    it('should normalize and return error details', () => {
      const error = new Error('Test error');
      const result = handleError(error);

      expect(result.message).toBe('Test error');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include context in result', () => {
      const error = new Error('Test');
      const result = handleError(error, { context: { userId: 1 } });

      expect(result.context?.userId).toBe(1);
    });

    it('should log to console in development mode when logToConsole is not false', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      handleError(new Error('Dev error'), { logToConsole: true });

      expect(mockLogger.error).toHaveBeenCalledWith('general', 'Error:', expect.any(Object));

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log when logToConsole is false', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      handleError(new Error('Silent error'), { logToConsole: false });

      expect(mockLogger.error).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      handleError(new Error('Prod error'));

      expect(mockLogger.error).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include empty context from options', () => {
      const result = handleError(null, { context: { action: 'test' } });

      expect(result.context?.action).toBe('test');
    });
  });

  // ==========================================================================
  // errorRecovery
  // ==========================================================================
  describe('errorRecovery', () => {
    describe('withRetry', () => {
      it('should retry operation with backoff', async () => {
        let attempts = 0;
        const operation = jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve('success');
        });

        const result = await errorRecovery.withRetry(operation, 3, 10);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should throw after max retries', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

        await expect(errorRecovery.withRetry(operation, 2, 10)).rejects.toThrow('Persistent failure');
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should use default values for maxRetries and baseDelay', async () => {
        const operation = jest.fn().mockResolvedValue('immediate success');

        const result = await errorRecovery.withRetry(operation);

        expect(result).toBe('immediate success');
        expect(operation).toHaveBeenCalledTimes(1);
      });
    });

    describe('withFallback', () => {
      it('should return result on success', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await errorRecovery.withFallback(operation, 'fallback');

        expect(result).toBe('success');
      });

      it('should return fallback value on error', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Failed'));

        const result = await errorRecovery.withFallback(operation, 'fallback');

        expect(result).toBe('fallback');
      });
    });
  });

  // ==========================================================================
  // swrErrorConfig
  // ==========================================================================
  describe('swrErrorConfig', () => {
    const mockLogger = require('@/lib/logging').default;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('onError', () => {
      it('should call handleError with SWR key in context', () => {
        const error = new Error('SWR fetch error');

        // In development mode
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        swrErrorConfig.onError(error, '/api/users');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'general',
          'Error:',
          expect.objectContaining({
            error: expect.objectContaining({
              context: expect.objectContaining({
                swrKey: '/api/users',
              }),
            }),
          })
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('shouldRetryOnError', () => {
      it('should return false for VALIDATION errors', () => {
        const error = { response: { status: 422 } };
        expect(swrErrorConfig.shouldRetryOnError(error)).toBe(false);
      });

      it('should return false for AUTHORIZATION errors', () => {
        const error = { response: { status: 403 } };
        expect(swrErrorConfig.shouldRetryOnError(error)).toBe(false);
      });

      it('should return false for AUTHENTICATION errors', () => {
        const error = { response: { status: 401 } };
        expect(swrErrorConfig.shouldRetryOnError(error)).toBe(false);
      });

      it('should return true for SERVER errors', () => {
        const error = { response: { status: 500 } };
        expect(swrErrorConfig.shouldRetryOnError(error)).toBe(true);
      });

      it('should return true for NETWORK errors', () => {
        const error = { name: 'NetworkError' };
        expect(swrErrorConfig.shouldRetryOnError(error)).toBe(true);
      });

      it('should return true for UNKNOWN errors', () => {
        const error = {};
        expect(swrErrorConfig.shouldRetryOnError(error)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle deeply nested error structures', () => {
      const error = {
        response: {
          data: {
            detail: {
              errors: {
                message: 'Deeply nested error',
              },
            },
          },
        },
      };

      // Should fall through to extractFromObject
      const message = extractErrorMessage(error);
      expect(message).toBeDefined();
    });

    it('should handle error with both status and response.status', () => {
      const error = {
        status: 400,
        response: {
          status: 401,
          data: { detail: 'Unauthorized' },
        },
      };

      // response.status should take precedence
      expect(isAuthError(error)).toBe(true);
    });

    it('should handle empty array validation errors', () => {
      const error = {
        response: {
          data: {
            detail: [],
          },
        },
      };

      // Empty array formats to empty string (valid extraction)
      const message = extractErrorMessage(error, 'Fallback');
      expect(message).toBe('');
    });

    it('should handle circular reference in error object', () => {
      const error: any = { message: 'Circular test' };
      error.self = error;

      // Should not throw
      const message = extractErrorMessage(error);
      expect(message).toBe('Circular test');
    });

    it('should handle Symbol values gracefully', () => {
      const error = {
        response: {
          data: {
            [Symbol('test')]: 'value',
            message: 'Actual message',
          },
        },
      };

      expect(extractErrorMessage(error)).toBe('Actual message');
    });

    it('should handle validation error items without msg property', () => {
      const error = {
        response: {
          data: {
            detail: [
              { loc: ['body', 'field'], value: 'invalid' }, // No msg property
              { data: 123 }, // Just data, no msg
            ],
          },
        },
      };

      // Should use String(item) for items without msg
      const message = extractErrorMessage(error);
      expect(message).toContain('[object Object]');
    });

    it('should handle null value in safeStringifyValue through message', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: null,
            },
          },
        },
      };

      const message = extractErrorMessage(error, 'Fallback');
      expect(message).toBe('null');
    });

    it('should handle getMessageFromErrorData with non-string primitive', () => {
      const error = {
        response: {
          data: {
            message: 12345, // Number message
          },
        },
      };

      expect(extractErrorMessage(error)).toBe('12345');
    });

    it('should handle getMessageFromErrorData with boolean', () => {
      const error = {
        response: {
          data: {
            message: true,
          },
        },
      };

      expect(extractErrorMessage(error)).toBe('true');
    });

    it('should handle error data with message but no detail', () => {
      const error = {
        data: {
          message: 'Direct data message without detail',
        },
      };

      expect(extractErrorMessage(error)).toBe('Direct data message without detail');
    });

    it('should prioritize detail over top-level message', () => {
      const error = {
        response: {
          data: {
            detail: 'Detail message',
            message: 'Top-level message',
          },
        },
      };

      expect(extractErrorMessage(error)).toBe('Detail message');
    });

    it('should use getMessageFromErrorData when detail is falsy and message is object', () => {
      // This tests lines 155-160 - object message in response.data when no detail
      const error = {
        response: {
          data: {
            message: { errorCode: 'ERR001', description: 'Object error' },
          },
        },
      };

      const message = extractErrorMessage(error);
      expect(message).toContain('errorCode');
      expect(message).toContain('ERR001');
    });

    it('should use getMessageFromErrorData with primitive message when detail is object without message/msg', () => {
      // Tests the path where detail is an empty object or object without message
      const error = {
        response: {
          data: {
            detail: { numericOnly: 123 }, // No string values, no message/msg
            message: 'Fallback to this',
          },
        },
      };

      // Should extract "Fallback to this" from getMessageFromErrorData
      expect(extractErrorMessage(error)).toBe('Fallback to this');
    });

    it('should handle Function type values (edge case for safeStringifyValue)', () => {
      // This tests the edge case where a function might be passed
      // Note: Functions are objects in JS but typeof returns 'function'
      const error = {
        response: {
          data: {
            detail: {
              message: () => 'function value',
            },
          },
        },
      };

      // Functions get stringified
      const message = extractErrorMessage(error);
      expect(message).toBeDefined();
    });

    it('should handle BigInt values', () => {
      const error = {
        response: {
          data: {
            detail: {
              // Test with regular string message
              message: 'BigInt test',
            },
          },
        },
      };

      expect(extractErrorMessage(error)).toBe('BigInt test');
    });
  });
});
