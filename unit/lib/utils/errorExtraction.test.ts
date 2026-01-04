/**
 * Unit tests for error extraction utility
 */

import {
  extractErrorMessage,
  extractErrorContext,
  isAuthError,
  isValidationError,
  isRateLimitError,
  isAccountLockedError,
} from '@/lib/errors';

describe('extractErrorMessage', () => {
  describe('string detail handling', () => {
    it('should extract message from string detail', () => {
      const error = {
        response: {
          data: { detail: 'Email not verified' },
        },
      };
      expect(extractErrorMessage(error)).toBe('Email not verified');
    });

    it('should handle nested detail as string', () => {
      const error = {
        response: {
          data: {
            detail: 'Account locked',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Account locked');
    });
  });

  describe('object detail handling', () => {
    it('should extract message from object detail with message property', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: 'Incorrect password',
              remaining_attempts: 2,
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Incorrect password');
    });

    it('should extract message from object detail with msg property', () => {
      const error = {
        response: {
          data: {
            detail: {
              msg: 'Validation failed',
              code: 'VALIDATION_ERROR',
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Validation failed');
    });

    it('should handle object with multiple string values', () => {
      const error = {
        response: {
          data: {
            detail: {
              error: 'Something went wrong',
              info: 'Please try again',
            },
          },
        },
      };
      const result = extractErrorMessage(error);
      expect(result).toContain('Something went wrong');
      expect(result).toContain('Please try again');
    });

    it('should NOT use JSON.stringify on objects', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: 'Test error',
              code: 'TEST_ERROR',
              extra_field: 'extra_value',
            },
          },
        },
      };
      const result = extractErrorMessage(error);
      expect(result).toBe('Test error');
      expect(result).not.toContain('{');
      expect(result).not.toContain('}');
      expect(result).not.toContain('code');
      expect(result).not.toContain('extra_field');
    });
  });

  describe('array detail handling (validation errors)', () => {
    it('should handle array validation errors', () => {
      const error = {
        response: {
          data: {
            detail: [
              { loc: ['body', 'email'], msg: 'Invalid email' },
              { loc: ['body', 'password'], msg: 'Too short' },
            ],
          },
        },
      };
      expect(extractErrorMessage(error)).toBe(
        'email: Invalid email, password: Too short',
      );
    });

    it('should handle array with string items', () => {
      const error = {
        response: {
          data: {
            detail: ['Error 1', 'Error 2', 'Error 3'],
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Error 1, Error 2, Error 3');
    });

    it('should handle array with mixed types', () => {
      const error = {
        response: {
          data: {
            detail: [
              'String error',
              { loc: ['body', 'field'], msg: 'Field error' },
              { msg: 'No location error' },
            ],
          },
        },
      };
      const result = extractErrorMessage(error);
      expect(result).toContain('String error');
      expect(result).toContain('field: Field error');
      expect(result).toContain('Field: No location error');
    });

    it('should handle validation errors without loc property', () => {
      const error = {
        response: {
          data: {
            detail: [{ msg: 'General validation error' }],
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Field: General validation error');
    });
  });

  describe('fallback handling', () => {
    it('should return fallback for null error', () => {
      expect(extractErrorMessage(null, 'Fallback message')).toBe('Fallback message');
    });

    it('should return fallback for undefined error', () => {
      expect(extractErrorMessage(undefined, 'Default fallback')).toBe(
        'Default fallback',
      );
    });

    it('should use default fallback when not provided', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
    });

    it('should return fallback for empty object', () => {
      const error = {};
      expect(extractErrorMessage(error, 'No error data')).toBe('No error data');
    });

    it('should return fallback for object with no extractable data', () => {
      const error = {
        response: {
          data: {
            detail: {
              code: 123,
              timestamp: Date.now(),
            },
          },
        },
      };
      expect(extractErrorMessage(error, 'Failed to extract')).toBe('Failed to extract');
    });
  });

  describe('error.message handling', () => {
    it('should extract error.message from Error objects', () => {
      const error = new Error('Standard error message');
      expect(extractErrorMessage(error)).toBe('Standard error message');
    });

    it('should prefer response.data.detail over error.message', () => {
      const error = {
        message: 'Generic error',
        response: {
          data: {
            detail: 'Specific API error',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Specific API error');
    });
  });

  describe('nested response structure', () => {
    it('should handle deeply nested response structure', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: 'Account locked',
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Account locked');
    });

    it('should handle response without data wrapper', () => {
      const error = {
        data: {
          detail: 'Direct data error',
        },
      };
      expect(extractErrorMessage(error)).toBe('Direct data error');
    });

    it('should handle top-level message property', () => {
      const error = {
        response: {
          data: {
            message: 'Top level message',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Top level message');
    });
  });

  describe('edge cases', () => {
    it('should handle circular references safely', () => {
      const error: any = {
        response: {
          data: {
            detail: {
              message: 'Circular error',
            },
          },
        },
      };
      error.response.circular = error; // Create circular reference

      expect(() => extractErrorMessage(error)).not.toThrow();
      expect(extractErrorMessage(error)).toBe('Circular error');
    });

    it('should handle non-string message values', () => {
      const error = {
        response: {
          data: {
            detail: {
              message: 123,
            },
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('123');
    });

    it('should handle boolean detail', () => {
      const error = {
        response: {
          data: {
            detail: true,
          },
        },
      };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });
  });
});

describe('extractErrorContext', () => {
  it('should extract full error context from auth error', () => {
    const error = {
      response: {
        status: 401,
        data: {
          detail: {
            code: 'email_not_verified',
            message: 'Email not verified',
            remaining_attempts: 3,
          },
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context).toEqual({
      message: 'Email not verified',
      code: 'email_not_verified',
      status: 401,
      remainingAttempts: 3,
    });
  });

  it('should extract account lockout context', () => {
    const error = {
      response: {
        status: 423,
        data: {
          detail: {
            message: 'Account locked',
            account_locked: true,
            lockout_until: '2025-10-30T12:00:00Z',
          },
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.message).toBe('Account locked');
    expect(context.status).toBe(423);
    expect(context.accountLocked).toBe(true);
    expect(context.lockoutUntil).toBe('2025-10-30T12:00:00Z');
  });

  it('should extract validation errors', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'Invalid format' },
            { loc: ['body', 'password'], msg: 'Too weak' },
          ],
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.status).toBe(422);
    expect(context.validationErrors).toEqual([
      { field: 'email', message: 'Invalid format' },
      { field: 'password', message: 'Too weak' },
    ]);
  });

  it('should extract rate limit context', () => {
    const error = {
      response: {
        status: 429,
        data: {
          detail: {
            message: 'Too many requests',
            code: 'rate_limit_exceeded',
          },
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.message).toBe('Too many requests');
    expect(context.status).toBe(429);
    expect(context.code).toBe('rate_limit_exceeded');
  });

  it('should handle error without response wrapper', () => {
    const error = {
      status: 500,
      data: {
        detail: {
          message: 'Internal server error',
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.message).toBe('Internal server error');
    expect(context.status).toBe(500);
  });

  it('should extract context from minimal error', () => {
    const error = {
      message: 'Network error',
    };

    const context = extractErrorContext(error);
    expect(context.message).toBe('Network error');
    expect(context.status).toBeUndefined();
    expect(context.code).toBeUndefined();
  });

  it('should handle validation errors with nested loc', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [{ loc: ['body', 'assistant', 'profile', 'email'], msg: 'Invalid' }],
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.validationErrors).toEqual([
      { field: 'assistant.profile.email', message: 'Invalid' },
    ]);
  });

  it('should handle validation errors without loc', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [{ msg: 'General validation error' }],
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.validationErrors).toEqual([
      { field: 'unknown', message: 'General validation error' },
    ]);
  });

  it('should not fail with null error', () => {
    const context = extractErrorContext(null);
    expect(context.message).toBe('An unexpected error occurred');
    expect(context.status).toBeUndefined();
  });
});

describe('Error type guards', () => {
  describe('isAuthError', () => {
    it('should identify 401 errors', () => {
      expect(isAuthError({ response: { status: 401 } })).toBe(true);
    });

    it('should identify 403 errors', () => {
      expect(isAuthError({ response: { status: 403 } })).toBe(true);
    });

    it('should not identify other status codes', () => {
      expect(isAuthError({ response: { status: 400 } })).toBe(false);
      expect(isAuthError({ response: { status: 404 } })).toBe(false);
      expect(isAuthError({ response: { status: 500 } })).toBe(false);
    });

    it('should handle errors without response wrapper', () => {
      expect(isAuthError({ status: 401 })).toBe(true);
      expect(isAuthError({ status: 403 })).toBe(true);
      expect(isAuthError({ status: 404 })).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should identify 422 errors', () => {
      expect(isValidationError({ response: { status: 422 } })).toBe(true);
    });

    it('should not identify other status codes', () => {
      expect(isValidationError({ response: { status: 400 } })).toBe(false);
      expect(isValidationError({ response: { status: 401 } })).toBe(false);
      expect(isValidationError({ response: { status: 500 } })).toBe(false);
    });

    it('should handle errors without response wrapper', () => {
      expect(isValidationError({ status: 422 })).toBe(true);
      expect(isValidationError({ status: 400 })).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify 429 errors', () => {
      expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
    });

    it('should not identify other status codes', () => {
      expect(isRateLimitError({ response: { status: 400 } })).toBe(false);
      expect(isRateLimitError({ response: { status: 401 } })).toBe(false);
      expect(isRateLimitError({ response: { status: 500 } })).toBe(false);
    });

    it('should handle errors without response wrapper', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError({ status: 400 })).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });

  describe('isAccountLockedError', () => {
    it('should identify 423 errors', () => {
      expect(isAccountLockedError({ response: { status: 423 } })).toBe(true);
    });

    it('should not identify other status codes', () => {
      expect(isAccountLockedError({ response: { status: 400 } })).toBe(false);
      expect(isAccountLockedError({ response: { status: 401 } })).toBe(false);
      expect(isAccountLockedError({ response: { status: 500 } })).toBe(false);
    });

    it('should handle errors without response wrapper', () => {
      expect(isAccountLockedError({ status: 423 })).toBe(true);
      expect(isAccountLockedError({ status: 400 })).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(isAccountLockedError(null)).toBe(false);
      expect(isAccountLockedError(undefined)).toBe(false);
    });
  });
});

describe('Integration scenarios', () => {
  it('should handle complete login failure scenario', () => {
    const error = {
      response: {
        status: 401,
        data: {
          detail: {
            code: 'invalid_credentials',
            message: 'Incorrect email or password',
            remaining_attempts: 2,
          },
        },
      },
    };

    const context = extractErrorContext(error);
    expect(context.message).toBe('Incorrect email or password');
    expect(isAuthError(error)).toBe(true);
    expect(context.remainingAttempts).toBe(2);
  });

  it('should handle complete registration validation scenario', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'Invalid email format' },
            { loc: ['body', 'password'], msg: 'Password too weak' },
          ],
        },
      },
    };

    const context = extractErrorContext(error);
    expect(isValidationError(error)).toBe(true);
    expect(context.validationErrors).toHaveLength(2);
    expect(context.message).toContain('email');
    expect(context.message).toContain('password');
  });

  it('should handle complete account lockout scenario', () => {
    const error = {
      response: {
        status: 423,
        data: {
          detail: {
            message: 'Account locked due to too many failed attempts',
            account_locked: true,
            lockout_until: '2025-10-30T15:30:00Z',
            code: 'account_locked',
          },
        },
      },
    };

    const context = extractErrorContext(error);
    expect(isAccountLockedError(error)).toBe(true);
    expect(context.accountLocked).toBe(true);
    expect(context.lockoutUntil).toBe('2025-10-30T15:30:00Z');
    expect(context.message).toContain('Account locked');
  });

  it('should handle rate limiting scenario', () => {
    const error = {
      response: {
        status: 429,
        data: {
          detail: {
            message: 'Too many login attempts',
            code: 'rate_limit_exceeded',
          },
        },
      },
    };

    const context = extractErrorContext(error);
    expect(isRateLimitError(error)).toBe(true);
    expect(context.message).toBe('Too many login attempts');
  });

  it('should ensure no "[object Object]" in any scenario', () => {
    const scenarios = [
      {
        response: {
          data: {
            detail: { message: 'Test error 1', code: 'ERR1', extra: 'data' },
          },
        },
      },
      {
        response: {
          data: {
            detail: { msg: 'Test error 2', nested: { deep: 'value' } },
          },
        },
      },
      {
        data: {
          detail: { message: 'Test error 3', array: [1, 2, 3] },
        },
      },
    ];

    for (const error of scenarios) {
      const message = extractErrorMessage(error);
      expect(message).not.toBe('[object Object]');
      expect(message).not.toContain('[object');
      expect(message).toBeTruthy();
    }
  });
});
