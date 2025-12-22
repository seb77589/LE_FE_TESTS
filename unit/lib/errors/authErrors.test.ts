/**
 * Unit Tests for Authentication Error Handling (Phase 3)
 *
 * Tests the centralized error parsing and type-safe error code detection.
 * Ensures error code-based detection works correctly and prevents false positives.
 *
 * @see frontend/src/lib/errors/authErrors.ts
 * @see docs/development/FRONTEND_ERROR_HANDLING.md
 */

import {
  parseAuthError,
  AuthErrorCode,
  AuthErrorDetails,
  isEmailVerificationError,
  isCredentialError,
  isSessionExpiredError,
  isAccountDisabledError,
  extractErrorCode,
} from '@/lib/errors';
import { isAccountLockedError, isRateLimitError } from '@/lib/errors/types';

describe('parseAuthError - Error Code Detection', () => {
  describe('Email Verification Error', () => {
    it('should detect email_not_verified error code', () => {
      const error = {
        response: {
          status: 401,
          data: {
            detail: {
              code: 'email_not_verified',
              message: 'Email not verified. Please check your inbox.',
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('validation');
      expect(result.code).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
      expect(result.message).toContain('Email not verified');
      expect(result.retryable).toBe(false);
      expect(result.action).toBe('contact_support');
    });

    it('should NOT trigger on "Incorrect email or password" message (false positive prevention)', () => {
      const error = {
        response: {
          status: 401,
          data: {
            detail: {
              code: 'invalid_credentials', // Explicit code
              message: 'Incorrect email or password', // Contains "email" but not verification error
            },
          },
        },
      };

      const result = parseAuthError(error);

      // Should be credential error, NOT email verification error
      expect(result.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(result.type).toBe('authentication');
      expect(result.code).not.toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
    });
  });

  describe('Invalid Credentials Error', () => {
    it('should detect invalid_credentials error code', () => {
      const error = {
        response: {
          status: 401,
          data: {
            detail: {
              code: 'invalid_credentials',
              message: 'Incorrect email or password.',
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authentication');
      expect(result.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(result.message).toContain('Incorrect email or password');
      expect(result.retryable).toBe(true);
      expect(result.action).toBe('check_credentials');
    });
  });

  describe('Account Locked Error', () => {
    it('should detect account_locked error code', () => {
      const error = {
        response: {
          status: 423,
          data: {
            detail: {
              code: 'account_locked',
              message: 'Account locked due to multiple failed login attempts.',
              lockout_until: '2025-11-15T12:00:00Z',
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authorization');
      expect(result.code).toBe(AuthErrorCode.ACCOUNT_LOCKED);
      expect(result.message).toContain('Account locked');
      expect(result.retryable).toBe(false);
      expect(result.action).toBe('contact_support');
      expect(result.details).toContain('2025-11-15T12:00:00Z');
    });
  });

  describe('Rate Limited Error', () => {
    it('should detect rate_limited error code', () => {
      const error = {
        response: {
          status: 429,
          data: {
            detail: {
              code: 'rate_limited',
              message: 'Too many login attempts.',
              retry_after: 60,
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('rate_limit');
      expect(result.code).toBe(AuthErrorCode.RATE_LIMITED);
      expect(result.message).toContain('Too many');
      expect(result.retryable).toBe(true);
      expect(result.action).toBe('wait');
      expect(result.details).toContain('60 seconds');
    });
  });

  describe('Session Expired Error', () => {
    it('should detect session_expired error code', () => {
      const error = {
        response: {
          status: 401,
          data: {
            detail: {
              code: 'session_expired',
              message: 'Your session has expired.',
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authentication');
      expect(result.code).toBe(AuthErrorCode.SESSION_EXPIRED);
      expect(result.message).toContain('session has expired');
      expect(result.retryable).toBe(true);
      expect(result.action).toBe('retry');
    });
  });

  describe('Account Disabled/Suspended Error', () => {
    it('should detect account_disabled error code', () => {
      const error = {
        response: {
          status: 403,
          data: {
            detail: {
              code: 'account_disabled',
              message: 'Your account has been disabled.',
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authorization');
      expect(result.code).toBe(AuthErrorCode.ACCOUNT_DISABLED);
      expect(result.message).toContain('disabled');
      expect(result.retryable).toBe(false);
      expect(result.action).toBe('contact_support');
    });

    it('should detect account_suspended error code', () => {
      const error = {
        response: {
          status: 403,
          data: {
            detail: {
              code: 'account_suspended',
              message: 'Your account has been suspended.',
            },
          },
        },
      };

      const result = parseAuthError(error);

      expect(result.type).toBe('authorization');
      expect(result.code).toBe(AuthErrorCode.ACCOUNT_SUSPENDED);
      expect(result.message).toContain('suspended');
      expect(result.retryable).toBe(false);
      expect(result.action).toBe('contact_support');
    });
  });
});

describe('parseAuthError - HTTP Status Code Fallback', () => {
  it('should fallback to HTTP 401 handling when no error code provided', () => {
    const error = {
      response: {
        status: 401,
        data: {
          detail: {
            message: 'Invalid credentials',
            // No code field
          },
        },
      },
    };

    const result = parseAuthError(error);

    expect(result.type).toBe('authentication');
    expect(result.message).toContain('Invalid credentials');
    expect(result.retryable).toBe(true);
    expect(result.action).toBe('check_credentials');
  });

  it('should fallback to HTTP 403 handling when no error code provided', () => {
    const error = {
      response: {
        status: 403,
        data: {
          detail: {
            message: 'Access denied',
            // No code field
          },
        },
      },
    };

    const result = parseAuthError(error);

    expect(result.type).toBe('authorization');
    expect(result.message).toContain('Access denied');
    expect(result.retryable).toBe(false);
    expect(result.action).toBe('contact_support');
  });

  it('should fallback to HTTP 429 handling when no error code provided', () => {
    const error = {
      response: {
        status: 429,
      },
    };

    const result = parseAuthError(error);

    expect(result.type).toBe('rate_limit');
    expect(result.message).toContain('Too many');
    expect(result.retryable).toBe(true);
    expect(result.action).toBe('wait');
  });
});

describe('parseAuthError - Edge Cases', () => {
  it('should handle null error gracefully', () => {
    const result = parseAuthError(null);

    expect(result.type).toBe('unknown');
    expect(result.message).toBeTruthy();
    expect(result.retryable).toBe(true);
  });

  it('should handle undefined error gracefully', () => {
    const result = parseAuthError(undefined);

    expect(result.type).toBe('unknown');
    expect(result.message).toBeTruthy();
    expect(result.retryable).toBe(true);
  });

  it('should handle error without response object', () => {
    const error = {
      message: 'Network error',
    };

    const result = parseAuthError(error);

    expect(result.type).toBe('unknown');
    expect(result.message).toContain('Network error');
  });

  it('should handle network errors (no status code)', () => {
    const error = {
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch',
    };

    const result = parseAuthError(error);

    expect(result.type).toBe('network');
    expect(result.message).toContain('Unable to connect');
    expect(result.retryable).toBe(true);
    expect(result.action).toBe('retry');
  });

  it('should handle error code in alternative location (errorData.code)', () => {
    const error = {
      response: {
        status: 401,
        data: {
          code: 'invalid_credentials', // Code at top level
          message: 'Invalid credentials',
        },
      },
    };

    const result = parseAuthError(error);

    expect(result.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(result.type).toBe('authentication');
  });

  it('should handle Axios-style error structure', () => {
    const error = {
      response: {
        status: 401,
        data: {
          detail: {
            code: 'invalid_credentials',
            message: 'Wrong password',
          },
        },
      },
    };

    const result = parseAuthError(error);

    expect(result.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });

  it('should handle fetch-style error structure', () => {
    const error = {
      status: 401,
      data: {
        detail: {
          code: 'invalid_credentials',
          message: 'Wrong password',
        },
      },
    };

    const result = parseAuthError(error);

    expect(result.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });
});

describe('Type-Safe Helper Functions', () => {
  const emailVerificationError: AuthErrorDetails = {
    type: 'validation',
    message: 'Email not verified',
    retryable: false,
    action: 'contact_support',
    code: AuthErrorCode.EMAIL_NOT_VERIFIED,
  };

  const credentialError: AuthErrorDetails = {
    type: 'authentication',
    message: 'Invalid credentials',
    retryable: true,
    action: 'check_credentials',
    code: AuthErrorCode.INVALID_CREDENTIALS,
  };

  const accountLockedError: AuthErrorDetails = {
    type: 'authorization',
    message: 'Account locked',
    retryable: false,
    action: 'contact_support',
    code: AuthErrorCode.ACCOUNT_LOCKED,
  };

  const rateLimitError: AuthErrorDetails = {
    type: 'rate_limit',
    message: 'Rate limited',
    retryable: true,
    action: 'wait',
    code: AuthErrorCode.RATE_LIMITED,
  };

  const sessionExpiredError: AuthErrorDetails = {
    type: 'authentication',
    message: 'Session expired',
    retryable: true,
    action: 'retry',
    code: AuthErrorCode.SESSION_EXPIRED,
  };

  const accountDisabledError: AuthErrorDetails = {
    type: 'authorization',
    message: 'Account disabled',
    retryable: false,
    action: 'contact_support',
    code: AuthErrorCode.ACCOUNT_DISABLED,
  };

  describe('isEmailVerificationError', () => {
    it('should return true for email verification errors', () => {
      expect(isEmailVerificationError(emailVerificationError)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isEmailVerificationError(credentialError)).toBe(false);
      expect(isEmailVerificationError(accountLockedError)).toBe(false);
    });
  });

  describe('isCredentialError', () => {
    it('should return true for credential errors', () => {
      expect(isCredentialError(credentialError)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isCredentialError(emailVerificationError)).toBe(false);
      expect(isCredentialError(accountLockedError)).toBe(false);
    });
  });

  describe('isAccountLockedError', () => {
    it('should return true for account locked errors', () => {
      expect(isAccountLockedError(accountLockedError)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isAccountLockedError(emailVerificationError)).toBe(false);
      expect(isAccountLockedError(credentialError)).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for rate limit errors', () => {
      expect(isRateLimitError(rateLimitError)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isRateLimitError(emailVerificationError)).toBe(false);
      expect(isRateLimitError(credentialError)).toBe(false);
    });
  });

  describe('isSessionExpiredError', () => {
    it('should return true for session expired errors', () => {
      expect(isSessionExpiredError(sessionExpiredError)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isSessionExpiredError(emailVerificationError)).toBe(false);
      expect(isSessionExpiredError(credentialError)).toBe(false);
    });
  });

  describe('isAccountDisabledError', () => {
    it('should return true for account disabled errors', () => {
      expect(isAccountDisabledError(accountDisabledError)).toBe(true);
    });

    it('should return true for account suspended errors', () => {
      const suspendedError: AuthErrorDetails = {
        ...accountDisabledError,
        code: AuthErrorCode.ACCOUNT_SUSPENDED,
      };
      expect(isAccountDisabledError(suspendedError)).toBe(true);
    });

    it('should return false for other error types', () => {
      expect(isAccountDisabledError(emailVerificationError)).toBe(false);
      expect(isAccountDisabledError(credentialError)).toBe(false);
    });
  });
});

describe('extractErrorCode', () => {
  it('should extract error code from errorData.code', () => {
    const error = {
      response: {
        data: {
          code: 'invalid_credentials',
        },
      },
    };

    expect(extractErrorCode(error)).toBe('invalid_credentials');
  });

  it('should extract error code from errorDetail.code', () => {
    const error = {
      response: {
        data: {
          detail: {
            code: 'email_not_verified',
          },
        },
      },
    };

    expect(extractErrorCode(error)).toBe('email_not_verified');
  });

  it('should extract error code from fetch-style error', () => {
    const error = {
      data: {
        detail: {
          code: 'account_locked',
        },
      },
    };

    expect(extractErrorCode(error)).toBe('account_locked');
  });

  it('should return undefined for errors without code', () => {
    const error = {
      response: {
        status: 401,
        data: {
          message: 'Unauthorized',
        },
      },
    };

    expect(extractErrorCode(error)).toBeUndefined();
  });

  it('should return undefined for null error', () => {
    expect(extractErrorCode(null)).toBeUndefined();
  });

  it('should return undefined for undefined error', () => {
    expect(extractErrorCode(undefined)).toBeUndefined();
  });
});
