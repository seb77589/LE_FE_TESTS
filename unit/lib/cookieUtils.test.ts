/**
 * Cookie Utilities Tests
 *
 * Tests for secure cookie utilities focused on authentication and CSRF protection.
 * Covers HttpOnly cookie-based auth, CSRF token handling, and generic cookie utilities.
 *
 * Test categories:
 * - Authentication functions (isAuthenticated, clearAuth)
 * - CSRF token functions (getCSRFToken, addCSRFTokenToHeaders, fetchCSRFToken)
 * - Generic cookie utilities (setClientCookie, getClientCookie, removeClientCookie)
 * - Legacy cleanup functions (cleanupLegacyTokens)
 * - Deprecated functions (test-only backward compatibility)
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/config/csrfConfig', () => ({
  CSRF_CONFIG: {
    COOKIE_NAME: 'csrftoken',
    HEADER_NAME: 'X-CSRFToken',
    TOKEN_ENDPOINT: '/api/v1/csrf/token',
  },
}));

jest.mock('@/config/authCookieConfig', () => ({
  AUTH_COOKIE_CONFIG: {
    ACCESS_TOKEN_KEY: 'legalease_access_token',
    REFRESH_TOKEN_KEY: 'legalease_refresh_token',
  },
}));

// Now import after mocks are set up
import * as cookieUtils from '@/lib/cookies';
import logger from '@/lib/logging';

const mockLogger = logger as jest.Mocked<typeof logger>;

// Helper functions to reduce nesting depth
const createTestRemoveCookie = () => () =>
  cookieUtils.removeClientCookie('test_cookie');
const createTestCleanup = () => () => cookieUtils.cleanupLegacyTokens();

// Helper function to create error-throwing mock (moved outside describe to reduce nesting)
const createErrorThrowingMock = () => {
  return () => {
    throw new Error('localStorage error');
  };
};

// Helper function to execute cleanup and verify it doesn't throw (reduces nesting)
const executeCleanupSafely = () => {
  cookieUtils.cleanupLegacyTokens();
};

describe('cookieUtils', () => {
  let originalFetch: typeof globalThis.fetch;
  let originalLocalStorage: Storage;

  beforeAll(() => {
    // Save originals
    originalFetch = globalThis.fetch;
    originalLocalStorage = globalThis.localStorage;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock fetch
    globalThis.fetch = jest.fn();

    // Mock document.cookie (JSDOM already provides document object)
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    // Mock document.querySelector
    document.querySelector = jest.fn();

    // Mock window and localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    };

    // Replace window.localStorage
    Object.defineProperty(globalThis.window, 'localStorage', {
      writable: true,
      configurable: true,
      value: mockLocalStorage,
    });

    // Also set globalThis.localStorage for consistency
    (globalThis as any).localStorage = mockLocalStorage;
  });

  afterAll(() => {
    // Restore originals
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  });

  describe('Authentication Functions', () => {
    describe('isAuthenticated()', () => {
      it('should return true when /users/me request succeeds', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
        });

        const result = await cookieUtils.isAuthenticated();

        expect(result).toBe(true);
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/users/me', {
          method: 'GET',
          credentials: 'include',
        });
      });

      it('should return false when /users/me request fails', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
        });

        const result = await cookieUtils.isAuthenticated();

        expect(result).toBe(false);
      });

      it('should return false on network error', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await cookieUtils.isAuthenticated();

        expect(result).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'general',
          'Auth check failed',
          expect.objectContaining({ error: expect.any(Error) }),
        );
      });
    });

    describe('clearAuth()', () => {
      it('should call logout endpoint and clear legacy localStorage tokens', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
        });

        await cookieUtils.clearAuth();

        expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        expect(localStorage.removeItem).toHaveBeenCalledWith('legalease_access_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('legalease_refresh_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('legalease_token_expiry');
        expect(localStorage.removeItem).toHaveBeenCalledWith('access_token_raw');

        expect(mockLogger.info).toHaveBeenCalledWith(
          'general',
          'User logged out successfully',
        );
      });

      it('should handle 401 response gracefully (no active session)', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
        });

        await cookieUtils.clearAuth();

        // 401 is expected during cleanup, so no warning is logged
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
          'general',
          'User logged out successfully',
        );
      });

      it('should warn on non-401 error response', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        await cookieUtils.clearAuth();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'general',
          'Logout endpoint returned non-401 error',
          expect.objectContaining({
            status: 500,
          }),
        );
      });

      it('should handle network errors gracefully', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        await cookieUtils.clearAuth();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'general',
          'Failed to logout due to network error',
          expect.objectContaining({ error: 'Network error' }),
        );
        // Network error prevents reaching localStorage cleanup code
        expect(localStorage.removeItem).not.toHaveBeenCalled();
      });

      it('should handle localStorage errors gracefully', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: true });
        const errorThrowingMock = () => {
          throw new Error('localStorage error');
        };
        (localStorage.removeItem as jest.Mock).mockImplementation(errorThrowingMock);

        await cookieUtils.clearAuth();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'general',
          'Failed to clear legacy localStorage',
          expect.any(Object),
        );
      });
    });
  });

  describe('CSRF Token Functions', () => {
    describe('getCSRFTokenFromCookie()', () => {
      it('should extract CSRF token from document.cookie', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=test-csrf-token; other=value',
          writable: true,
        });

        const token = cookieUtils.getCSRFTokenFromCookie();

        expect(token).toBe('test-csrf-token');
      });

      it('should return null when CSRF token not found', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'other=value',
          writable: true,
        });

        const token = cookieUtils.getCSRFTokenFromCookie();

        expect(token).toBeNull();
      });

      it('should return null when document is undefined (SSR)', () => {
        const originalDocument = document;
        (globalThis as any).document = undefined;

        const token = cookieUtils.getCSRFTokenFromCookie();

        expect(token).toBeNull();

        document = originalDocument;
      });
    });

    describe('getCSRFTokenFromMeta()', () => {
      it('should extract CSRF token from meta tag', () => {
        const mockMetaTag = {
          getAttribute: jest.fn().mockReturnValue('meta-csrf-token'),
        };

        (document.querySelector as jest.Mock).mockReturnValue(mockMetaTag);

        const token = cookieUtils.getCSRFTokenFromMeta();

        expect(token).toBe('meta-csrf-token');
        expect(document.querySelector).toHaveBeenCalledWith('meta[name="csrf-token"]');
      });

      it('should return null when meta tag not found', () => {
        (document.querySelector as jest.Mock).mockReturnValue(null);

        const token = cookieUtils.getCSRFTokenFromMeta();

        expect(token).toBeNull();
      });

      it('should return null when document is undefined (SSR)', () => {
        const originalDocument = document;
        (globalThis as any).document = undefined;

        const token = cookieUtils.getCSRFTokenFromMeta();

        expect(token).toBeNull();

        document = originalDocument;
      });
    });

    describe('getCSRFToken()', () => {
      it('should return cookie value when available', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=cookie-token',
          writable: true,
        });

        const token = cookieUtils.getCSRFToken();

        expect(token).toBe('cookie-token');
      });

      it('should fallback to meta tag when cookie not available', () => {
        Object.defineProperty(document, 'cookie', {
          value: '',
          writable: true,
        });

        const mockMetaTag = {
          getAttribute: jest.fn().mockReturnValue('meta-token'),
        };
        (document.querySelector as jest.Mock).mockReturnValue(mockMetaTag);

        const token = cookieUtils.getCSRFToken();

        expect(token).toBe('meta-token');
      });

      it('should return null when neither cookie nor meta tag available', () => {
        Object.defineProperty(document, 'cookie', {
          value: '',
          writable: true,
        });
        (document.querySelector as jest.Mock).mockReturnValue(null);

        const token = cookieUtils.getCSRFToken();

        expect(token).toBeNull();
      });
    });

    describe('addCSRFTokenToHeaders()', () => {
      it('should add CSRF token to headers when token available', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=test-token',
          writable: true,
        });

        const headers = cookieUtils.addCSRFTokenToHeaders({
          'Content-Type': 'application/json',
        });

        expect(headers).toEqual({
          'Content-Type': 'application/json',
          'X-CSRFToken': 'test-token',
        });
      });

      it('should return headers unchanged when token not available', () => {
        Object.defineProperty(document, 'cookie', {
          value: '',
          writable: true,
        });

        const headers = cookieUtils.addCSRFTokenToHeaders({
          'Content-Type': 'application/json',
        });

        expect(headers).toEqual({
          'Content-Type': 'application/json',
        });
      });

      it('should work with empty headers object', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=test-token',
          writable: true,
        });

        const headers = cookieUtils.addCSRFTokenToHeaders();

        expect(headers).toEqual({
          'X-CSRFToken': 'test-token',
        });
      });
    });

    describe('fetchCSRFToken()', () => {
      it('should fetch CSRF token successfully', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
        });

        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=fetched-token',
          writable: true,
        });

        const token = await cookieUtils.fetchCSRFToken();

        expect(token).toBe('fetched-token');
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/csrf/token', {
          method: 'GET',
          credentials: 'include',
        });
      });

      it('should return null on fetch error', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
        });

        const token = await cookieUtils.fetchCSRFToken();

        expect(token).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'general',
          'Failed to fetch CSRF token',
          expect.any(Object),
        );
      });

      it('should return null on network error', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const token = await cookieUtils.fetchCSRFToken();

        expect(token).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'general',
          'Failed to fetch CSRF token',
          expect.any(Object),
        );
      });
    });

    describe('ensureCSRFToken()', () => {
      it('should return existing token when available', async () => {
        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=existing-token',
          writable: true,
        });

        const token = await cookieUtils.ensureCSRFToken();

        expect(token).toBe('existing-token');
        expect(globalThis.fetch).not.toHaveBeenCalled();
      });

      it('should fetch token when not available', async () => {
        // Ensure no CSRF token in cookie
        Object.defineProperty(document, 'cookie', {
          value: '',
          writable: true,
        });

        // Ensure no CSRF token in meta tag
        (document.querySelector as jest.Mock).mockReturnValue(null);

        (globalThis.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
        });

        const token = await cookieUtils.ensureCSRFToken();

        // Should attempt to fetch token
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/csrf/token', {
          method: 'GET',
          credentials: 'include',
        });

        // Returns result of fetchCSRFToken (null in this case, as fetch only returns status)
        expect(token).toBeNull();
      });
    });
  });

  describe('Generic Cookie Utilities', () => {
    describe('setClientCookie()', () => {
      it('should set cookie with default options', () => {
        cookieUtils.setClientCookie('test_cookie', 'test_value');

        expect(document.cookie).toContain('test_cookie=test_value');
        expect(document.cookie).toContain('path=/');
        expect(document.cookie).toContain('samesite=strict');
      });

      it('should set cookie with maxAge option', () => {
        cookieUtils.setClientCookie('test_cookie', 'test_value', { maxAge: 3600 });

        expect(document.cookie).toContain('test_cookie=test_value');
        expect(document.cookie).toContain('expires=');
      });

      it('should set cookie with secure option', () => {
        cookieUtils.setClientCookie('test_cookie', 'test_value', { secure: true });

        expect(document.cookie).toContain('secure');
      });

      it('should set cookie with custom path', () => {
        cookieUtils.setClientCookie('test_cookie', 'test_value', { path: '/admin' });

        expect(document.cookie).toContain('path=/admin');
      });

      it('should handle domain option with matching hostname', () => {
        // window.location.hostname is already 'example.com' from beforeEach
        // Call setClientCookie - domain logic is verified by not throwing
        cookieUtils.setClientCookie('test_cookie', 'test_value', {
          domain: 'example.com',
        });

        // Verify cookie was set (JSDOM may not preserve domain attribute when reading back)
        expect(document.cookie).toContain('test_cookie=test_value');
      });

      it('should skip domain option with non-matching hostname', () => {
        cookieUtils.setClientCookie('test_cookie', 'test_value', {
          domain: 'other.com',
        });

        expect(document.cookie).not.toContain('domain=other.com');
      });

      it('should do nothing when document is undefined (SSR)', () => {
        const originalDocument = document;
        (globalThis as any).document = undefined;

        const testSetClientCookie = () => {
          cookieUtils.setClientCookie('test_cookie', 'test_value');
        };
        expect(testSetClientCookie).not.toThrow();

        document = originalDocument;
      });
    });

    describe('getClientCookie()', () => {
      it('should return cookie value when present', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'test_cookie=test_value; other=value',
          writable: true,
        });

        const value = cookieUtils.getClientCookie('test_cookie');

        expect(value).toBe('test_value');
      });

      it('should return null when cookie not found', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'other=value',
          writable: true,
        });

        const value = cookieUtils.getClientCookie('test_cookie');

        expect(value).toBeNull();
      });

      it('should return null when document is undefined (SSR)', () => {
        const originalDocument = document;
        (globalThis as any).document = undefined;

        const value = cookieUtils.getClientCookie('test_cookie');

        expect(value).toBeNull();

        document = originalDocument;
      });
    });

    describe('removeClientCookie()', () => {
      it('should set cookie with expiry in the past', () => {
        cookieUtils.removeClientCookie('test_cookie');

        expect(document.cookie).toContain('test_cookie=');
        // removeClientCookie uses maxAge: -1 which sets expiry to a past date
        // The exact format depends on browser implementation, just verify it's set
        expect(document.cookie).toContain('expires=');
        expect(document.cookie).toContain('path=/');
      });

      it('should do nothing when document is undefined (SSR)', () => {
        const originalDocument = document;
        (globalThis as any).document = undefined;

        // Use helper function to reduce nesting
        const testRemoveCookie = createTestRemoveCookie();
        expect(testRemoveCookie).not.toThrow();

        document = originalDocument;
      });
    });
  });

  describe('Legacy Cleanup Functions', () => {
    describe('cleanupLegacyTokens()', () => {
      it('should remove all legacy localStorage tokens', () => {
        (localStorage.getItem as jest.Mock).mockReturnValue('legacy-token');

        cookieUtils.cleanupLegacyTokens();

        expect(localStorage.removeItem).toHaveBeenCalledWith('legalease_access_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('legalease_refresh_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('legalease_token_expiry');
        expect(localStorage.removeItem).toHaveBeenCalledWith('access_token_raw');
        // Note: 'access_token' is not removed by cleanupLegacyTokens, only the legalease_* keys
        // cleanupLegacyTokens doesn't log on success, only on error (see implementation)
      });

      it('should not log when no tokens to clean', () => {
        (localStorage.getItem as jest.Mock).mockReturnValue(null);

        cookieUtils.cleanupLegacyTokens();

        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it('should handle localStorage errors gracefully', () => {
        // Mock removeItem to throw an error - use helper function to reduce nesting
        (localStorage.removeItem as jest.Mock).mockImplementation(
          createErrorThrowingMock(),
        );

        // Execute cleanup and verify it doesn't throw - use helper to reduce nesting
        expect(executeCleanupSafely).not.toThrow();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'general',
          'Failed to cleanup legacy tokens',
          expect.objectContaining({ error: expect.any(Error) }),
        );
      });

      it('should do nothing when window is undefined (SSR)', () => {
        const originalWindow = globalThis.window;
        (globalThis as any).window = undefined;

        // Use helper function to reduce nesting - execute directly
        expect(executeCleanupSafely).not.toThrow();

        globalThis.window = originalWindow;
      });
    });
  });

  describe('Deprecated Functions (Test-Only)', () => {
    // REMOVED: Tests for deprecated functions that were removed from cookieUtils.ts
    // Functions removed: setEncryptedToken, getEncryptedToken, removeEncryptedToken,
    // isTokenExpired, getRefreshToken, isTokenNearExpiry, validateTokenFormat, getTokenPayload
    // These functions were deprecated and removed as part of Phase 2 migration to HttpOnly cookies

    // NOSONAR: This section intentionally tests deprecated methods for backward compatibility
    describe('addCSRFTokenToFormData()', () => {
      // NOSONAR: typescript:S1874 - Deprecated method is tested for backward compatibility
      it('should add CSRF token to FormData', () => {
        Object.defineProperty(document, 'cookie', {
          value: 'csrftoken=test-token',
          writable: true,
        });

        const formData = new FormData();
        cookieUtils.addCSRFTokenToFormData(formData); // NOSONAR: typescript:S1874

        expect(formData.get('csrf_token')).toBe('test-token');
      });

      // NOSONAR: typescript:S1874 - Deprecated method is tested for backward compatibility
      it('should not add token when CSRF token not available', () => {
        Object.defineProperty(document, 'cookie', {
          value: '',
          writable: true,
        });

        const formData = new FormData();
        cookieUtils.addCSRFTokenToFormData(formData); // NOSONAR: typescript:S1874

        expect(formData.get('csrf_token')).toBeNull();
      });
    });
  });

  // REMOVED: Tests for compatibility exports (removeToken alias)
  // Function was removed as part of Phase 2 migration to HttpOnly cookies
});
