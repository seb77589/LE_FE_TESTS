/**
 * Tests for CSRF token hook and utilities
 *
 * @description
 * Updated to use centralized CSRF configuration constants
 * @see docs/CLEAN-UP/_Declog_CSRF_001.md
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCSRFToken, addCSRFToken } from '@/hooks/useCSRFToken';
import { CSRF_CONFIG } from '@/config/csrfConfig';

// Mock fetch
globalThis.fetch = jest.fn();

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('useCSRFToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
    (fetch as jest.Mock).mockClear();
  });

  test('should initialize with null token and loading true when no cookie exists', () => {
    const { result } = renderHook(() => useCSRFToken());

    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(true); // Loading should be true initially when fetching
    expect(result.current.error).toBeNull();
  });

  test('should use existing token from cookie if available', () => {
    // Set cookie with CSRF token using centralized cookie name
    document.cookie = `${CSRF_CONFIG.COOKIE_NAME}=existing-token-123; path=/`;

    const { result } = renderHook(() => useCSRFToken());

    expect(result.current.token).toBe('existing-token-123');
    expect(result.current.loading).toBe(false);
  });

  test('should fetch token if not in cookie', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'CSRF token set in cookie',
        token_name: 'csrftoken',
      }),
    });

    const { result } = renderHook(() => useCSRFToken());

    // Initially loading should be true
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      `${process.env.NEXT_PUBLIC_API_URL}${CSRF_CONFIG.TOKEN_ENDPOINT}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  test('should handle fetch error', async () => {
    // Mock fetch to reject on all retry attempts
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCSRFToken());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // When fetch fails, the error is caught and set directly
    // The error message comes from the fetch error
    expect(result.current.error).toBe('Network error');
    expect(result.current.token).toBeNull();
  });

  test('should handle non-ok response', async () => {
    // Mock fetch to return non-ok response on all retry attempts
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCSRFToken());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // When fetch returns non-ok, the error message is set from the thrown error
    expect(result.current.error).toBe('Failed to fetch CSRF token: 500');
  });

  test('should refresh token on demand', async () => {
    // Set up mock to simulate cookie being set after fetch
    (fetch as jest.Mock).mockImplementation(async () => {
      // Simulate the backend setting a cookie
      document.cookie = `${CSRF_CONFIG.COOKIE_NAME}=refresh-token-123; path=/`;
      return {
        ok: true,
        json: async () => ({ message: 'CSRF token set in cookie' }),
      };
    });

    const { result } = renderHook(() => useCSRFToken());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock and set up for refresh
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockImplementation(async () => {
      // Reset document.cookie completely and set new cookie (simulates backend replacing cookie)
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `${CSRF_CONFIG.COOKIE_NAME}=new-refresh-token-456; path=/`,
      });
      return {
        ok: true,
        json: async () => ({ message: 'CSRF token set in cookie' }),
      };
    });

    await result.current.refreshToken();

    // Wait for React state to update with new token
    await waitFor(() => {
      expect(result.current.token).toBe('new-refresh-token-456');
    });

    // With cookie sync, fetch should be called and cookie detected
    // May be called 1-3 times depending on cookie detection timing
    expect(fetch).toHaveBeenCalled();
  });
});

describe('addCSRFToken', () => {
  beforeEach(() => {
    document.cookie = '';
  });

  test('should add CSRF token to headers if cookie exists', () => {
    document.cookie = `${CSRF_CONFIG.COOKIE_NAME}=test-token-456; path=/`;

    const headers = addCSRFToken({ 'Content-Type': 'application/json' });

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      [CSRF_CONFIG.HEADER_NAME]: 'test-token-456',
    });
  });

  test('should return original headers if no CSRF token in cookie', () => {
    const originalHeaders = { 'Content-Type': 'application/json' };
    const headers = addCSRFToken(originalHeaders);

    expect(headers).toEqual(originalHeaders);
  });

  test('should handle empty headers object', () => {
    document.cookie = `${CSRF_CONFIG.COOKIE_NAME}=test-token-789; path=/`;

    const headers = addCSRFToken();

    expect(headers).toEqual({
      [CSRF_CONFIG.HEADER_NAME]: 'test-token-789',
    });
  });

  test('should handle URL encoded cookie values', () => {
    document.cookie = `${CSRF_CONFIG.COOKIE_NAME}=test%20token%20with%20spaces; path=/`;

    const headers = addCSRFToken();

    // Note: getCSRFTokenFromCookie() does NOT decode URL-encoded values
    // This matches browser cookie behavior - values are stored as-is
    expect(headers).toEqual({
      [CSRF_CONFIG.HEADER_NAME]: 'test%20token%20with%20spaces',
    });
  });

  test('should handle multiple cookies', () => {
    document.cookie = `othercookie=value; ${CSRF_CONFIG.COOKIE_NAME}=correct-token; anothercookie=value2`;

    const headers = addCSRFToken();

    expect(headers).toEqual({
      [CSRF_CONFIG.HEADER_NAME]: 'correct-token',
    });
  });
});

describe('Server-side rendering compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
  });

  test('addCSRFToken should handle SSR environment', () => {
    // Mock typeof document === 'undefined' by temporarily hiding it
    const originalDocument = globalThis.document;
    // @ts-ignore
    delete globalThis.document;

    try {
      // Clear module cache and import fresh
      jest.resetModules();
      const { addCSRFToken } = require('../../hooks/useCSRFToken');
      const headers = addCSRFToken({ 'Content-Type': 'application/json' });
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    } finally {
      globalThis.document = originalDocument;
    }
  });
});
