/**
 * Unit Tests for lib/errors/index.ts (Barrel Export)
 *
 * Tests cover:
 * - All named exports are accessible from barrel
 * - Error handling utility exports
 * - Error classification exports
 * - Error recovery exports
 * - Legacy backward compatibility exports
 * - Type exports accessibility
 *
 * @module __tests__/unit/lib/errors/index
 */

import {
  // Core error utilities from errors.ts
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
  // Recovery utilities
  retryWithBackoff,
  withFallback,
  networkMonitor,
  errorRecoveryHandling,
  // Legacy exports
  extractErrorMessageLegacy,
  extractErrorContextLegacy,
  isAuthErrorLegacy,
  isValidationErrorLegacy,
  isRateLimitErrorLegacy,
  isAccountLockedErrorLegacy,
  // Auth error parsing from types
  parseAuthError,
  getErrorActionText,
  shouldShowRetryButton,
  getWaitTimeMessage,
  isEmailVerificationError,
  isCredentialError,
  isAccountLockedErrorFromTypes,
  isRateLimitErrorFromTypes,
  isSessionExpiredError,
  isAccountDisabledError,
  extractErrorCode,
  AuthErrorCode,
  // Legacy recovery exports
  errorRecoveryLegacy,
  useErrorRecovery,
  withErrorRecovery,
  networkMonitorLegacy,
  // Error tracking
  ErrorTrackingService,
  errorTracking,
} from '@/lib/errors';

// Type imports (verify they compile)
import type {
  ErrorDetails,
  ErrorHandlerOptions,
  ErrorBoundaryState,
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  AppError,
  AuthErrorDetails,
} from '@/lib/errors';

describe('lib/errors/index.ts barrel exports', () => {
  describe('Core Error Utilities (from errors.ts)', () => {
    it('should export ERROR_CODES constant', () => {
      expect(ERROR_CODES).toBeDefined();
      expect(typeof ERROR_CODES).toBe('object');
    });

    it('should export extractErrorMessage function', () => {
      expect(extractErrorMessage).toBeDefined();
      expect(typeof extractErrorMessage).toBe('function');
      
      // Verify it works
      const message = extractErrorMessage(new Error('test error'));
      expect(message).toBe('test error');
    });

    it('should export extractErrorContext function', () => {
      expect(extractErrorContext).toBeDefined();
      expect(typeof extractErrorContext).toBe('function');
    });

    it('should export isAuthError function', () => {
      expect(isAuthError).toBeDefined();
      expect(typeof isAuthError).toBe('function');
    });

    it('should export isValidationError function', () => {
      expect(isValidationError).toBeDefined();
      expect(typeof isValidationError).toBe('function');
    });

    it('should export isRateLimitError function', () => {
      expect(isRateLimitError).toBeDefined();
      expect(typeof isRateLimitError).toBe('function');
    });

    it('should export isAccountLockedError function', () => {
      expect(isAccountLockedError).toBeDefined();
      expect(typeof isAccountLockedError).toBe('function');
    });

    it('should export ErrorType enum', () => {
      expect(ErrorType).toBeDefined();
      expect(typeof ErrorType).toBe('object');
    });

    it('should export classifyError function', () => {
      expect(classifyError).toBeDefined();
      expect(typeof classifyError).toBe('function');
    });

    it('should export normalizeError function', () => {
      expect(normalizeError).toBeDefined();
      expect(typeof normalizeError).toBe('function');
    });

    it('should export getUserFriendlyMessage function', () => {
      expect(getUserFriendlyMessage).toBeDefined();
      expect(typeof getUserFriendlyMessage).toBe('function');
    });

    it('should export handleError function', () => {
      expect(handleError).toBeDefined();
      expect(typeof handleError).toBe('function');
    });

    it('should export errorRecovery utility', () => {
      expect(errorRecovery).toBeDefined();
    });

    it('should export swrErrorConfig', () => {
      expect(swrErrorConfig).toBeDefined();
      expect(typeof swrErrorConfig).toBe('object');
    });
  });

  describe('Error Recovery Utilities (from recovery.ts)', () => {
    it('should export retryWithBackoff function', () => {
      expect(retryWithBackoff).toBeDefined();
      expect(typeof retryWithBackoff).toBe('function');
    });

    it('should export withFallback function', () => {
      expect(withFallback).toBeDefined();
      expect(typeof withFallback).toBe('function');
    });

    it('should export networkMonitor', () => {
      expect(networkMonitor).toBeDefined();
    });

    it('should export errorRecoveryHandling alias object', () => {
      expect(errorRecoveryHandling).toBeDefined();
      expect(errorRecoveryHandling.withRetry).toBe(retryWithBackoff);
      expect(errorRecoveryHandling.withFallback).toBe(withFallback);
    });
  });

  describe('Legacy Backward Compatibility Exports', () => {
    it('should export extractErrorMessageLegacy as alias', () => {
      expect(extractErrorMessageLegacy).toBeDefined();
      expect(extractErrorMessageLegacy).toBe(extractErrorMessage);
    });

    it('should export extractErrorContextLegacy as alias', () => {
      expect(extractErrorContextLegacy).toBeDefined();
      expect(extractErrorContextLegacy).toBe(extractErrorContext);
    });

    it('should export isAuthErrorLegacy as alias', () => {
      expect(isAuthErrorLegacy).toBeDefined();
      expect(isAuthErrorLegacy).toBe(isAuthError);
    });

    it('should export isValidationErrorLegacy as alias', () => {
      expect(isValidationErrorLegacy).toBeDefined();
      expect(isValidationErrorLegacy).toBe(isValidationError);
    });

    it('should export isRateLimitErrorLegacy as alias', () => {
      expect(isRateLimitErrorLegacy).toBeDefined();
      expect(isRateLimitErrorLegacy).toBe(isRateLimitError);
    });

    it('should export isAccountLockedErrorLegacy as alias', () => {
      expect(isAccountLockedErrorLegacy).toBeDefined();
      expect(isAccountLockedErrorLegacy).toBe(isAccountLockedError);
    });
  });

  describe('Auth Error Parsing (from types.ts)', () => {
    it('should export parseAuthError function', () => {
      expect(parseAuthError).toBeDefined();
      expect(typeof parseAuthError).toBe('function');
    });

    it('should export getErrorActionText function', () => {
      expect(getErrorActionText).toBeDefined();
      expect(typeof getErrorActionText).toBe('function');
    });

    it('should export shouldShowRetryButton function', () => {
      expect(shouldShowRetryButton).toBeDefined();
      expect(typeof shouldShowRetryButton).toBe('function');
    });

    it('should export getWaitTimeMessage function', () => {
      expect(getWaitTimeMessage).toBeDefined();
      expect(typeof getWaitTimeMessage).toBe('function');
    });

    it('should export isEmailVerificationError function', () => {
      expect(isEmailVerificationError).toBeDefined();
      expect(typeof isEmailVerificationError).toBe('function');
    });

    it('should export isCredentialError function', () => {
      expect(isCredentialError).toBeDefined();
      expect(typeof isCredentialError).toBe('function');
    });

    it('should export isAccountLockedErrorFromTypes function', () => {
      expect(isAccountLockedErrorFromTypes).toBeDefined();
      expect(typeof isAccountLockedErrorFromTypes).toBe('function');
    });

    it('should export isRateLimitErrorFromTypes function', () => {
      expect(isRateLimitErrorFromTypes).toBeDefined();
      expect(typeof isRateLimitErrorFromTypes).toBe('function');
    });

    it('should export isSessionExpiredError function', () => {
      expect(isSessionExpiredError).toBeDefined();
      expect(typeof isSessionExpiredError).toBe('function');
    });

    it('should export isAccountDisabledError function', () => {
      expect(isAccountDisabledError).toBeDefined();
      expect(typeof isAccountDisabledError).toBe('function');
    });

    it('should export extractErrorCode function', () => {
      expect(extractErrorCode).toBeDefined();
      expect(typeof extractErrorCode).toBe('function');
    });

    it('should export AuthErrorCode enum', () => {
      expect(AuthErrorCode).toBeDefined();
      expect(typeof AuthErrorCode).toBe('object');
    });
  });

  describe('Legacy Error Recovery Exports (from ErrorRecovery component)', () => {
    it('should export errorRecoveryLegacy', () => {
      expect(errorRecoveryLegacy).toBeDefined();
    });

    it('should export useErrorRecovery hook', () => {
      expect(useErrorRecovery).toBeDefined();
      expect(typeof useErrorRecovery).toBe('function');
    });

    it('should export withErrorRecovery HOC', () => {
      expect(withErrorRecovery).toBeDefined();
      expect(typeof withErrorRecovery).toBe('function');
    });

    it('should export networkMonitorLegacy', () => {
      expect(networkMonitorLegacy).toBeDefined();
    });
  });

  describe('Error Tracking Exports', () => {
    it('should export ErrorTrackingService class', () => {
      expect(ErrorTrackingService).toBeDefined();
      expect(typeof ErrorTrackingService).toBe('function');
    });

    it('should export errorTracking instance', () => {
      expect(errorTracking).toBeDefined();
      expect(errorTracking).toBeInstanceOf(ErrorTrackingService);
    });
  });

  describe('Type Exports (compile-time verification)', () => {
    it('should allow using ErrorDetails type', () => {
      const details: ErrorDetails = {
        message: 'test',
        code: 'TEST_ERROR',
      };
      expect(details.message).toBe('test');
    });

    it('should allow using ErrorHandlerOptions type', () => {
      const options: ErrorHandlerOptions = {
        silent: true,
      };
      expect(options.silent).toBe(true);
    });

    it('should allow using ErrorBoundaryState type', () => {
      const state: ErrorBoundaryState = {
        hasError: false,
        error: null,
      };
      expect(state.hasError).toBe(false);
    });

    it('should allow using ErrorSeverity type', () => {
      const severity: ErrorSeverity = 'error';
      expect(severity).toBe('error');
    });

    it('should allow using ErrorCategory type', () => {
      const category: ErrorCategory = 'auth';
      expect(category).toBe('auth');
    });

    it('should allow using ErrorContext type', () => {
      const context: ErrorContext = {
        timestamp: Date.now(),
        url: '/test',
      };
      expect(context.url).toBe('/test');
    });

    it('should allow using AppError type', () => {
      const appError: AppError = {
        message: 'App error',
        code: 'APP_ERROR',
        severity: 'error',
        category: 'unknown',
        timestamp: Date.now(),
      };
      expect(appError.message).toBe('App error');
    });

    it('should allow using AuthErrorDetails type', () => {
      const authDetails: AuthErrorDetails = {
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      };
      expect(authDetails.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });
  });

  describe('Integration - Export Consistency', () => {
    it('should have consistent error classification functions', () => {
      const testError = { status: 401 };
      
      // Both main and legacy exports should work identically
      expect(isAuthError(testError)).toBe(isAuthErrorLegacy(testError));
      expect(isValidationError(testError)).toBe(isValidationErrorLegacy(testError));
      expect(isRateLimitError(testError)).toBe(isRateLimitErrorLegacy(testError));
      expect(isAccountLockedError(testError)).toBe(isAccountLockedErrorLegacy(testError));
    });

    it('should have working errorRecoveryHandling alias', async () => {
      // Both direct export and alias should reference same functions
      expect(errorRecoveryHandling.withRetry).toBe(retryWithBackoff);
      expect(errorRecoveryHandling.withFallback).toBe(withFallback);
    });

    it('should export all required error codes', () => {
      // Verify ERROR_CODES has essential error codes
      expect(ERROR_CODES).toHaveProperty('VALIDATION_FAILED');
      expect(ERROR_CODES).toHaveProperty('INVALID_CREDENTIALS');
    });

    it('should export functional swrErrorConfig', () => {
      expect(swrErrorConfig).toHaveProperty('onError');
      expect(typeof swrErrorConfig.onError).toBe('function');
    });
  });
});
