import {
  parseRateLimitHeaders,
  updateRateLimitFromServer,
  getRateLimitInfo,
  RateLimitInfo,
} from '@/lib/api/rateLimitHeaderParser';
import logger from '@/lib/logging';

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('rateLimitHeaderParser', () => {
  // Helper to create mock headers
  const createHeaders = (
    overrides: Record<string, string> = {},
  ): Record<string, string> => ({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '50',
    'X-RateLimit-Reset': '1609459200', // Unix timestamp
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('parseRateLimitHeaders', () => {
    it('should parse valid rate limit headers', () => {
      const headers = createHeaders();
      const result = parseRateLimitHeaders(headers);

      expect(result).toEqual({
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        retryAfter: undefined,
        url: undefined,
      });
    });

    it('should parse headers with URL context', () => {
      const headers = createHeaders();
      const result = parseRateLimitHeaders(headers, '/api/v1/login');

      expect(result).toEqual({
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        retryAfter: undefined,
        url: '/api/v1/login',
      });
    });

    it('should parse headers with Retry-After', () => {
      const headers = createHeaders({
        'Retry-After': '60', // 60 seconds
      });
      const result = parseRateLimitHeaders(headers);

      expect(result).not.toBeNull();
      expect(result?.limit).toBe(100);
      expect(result?.remaining).toBe(50);
      expect(result?.retryAfter).toBe(60);
    });

    it('should handle case-insensitive header names', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'X-RATELIMIT-REMAINING': '50',
        'x-RateLimit-Reset': '1609459200',
      };
      const result = parseRateLimitHeaders(headers);

      expect(result).not.toBeNull();
      expect(result?.limit).toBe(100);
      expect(result?.remaining).toBe(50);
      expect(result?.reset).toBe(1609459200);
    });

    it('should return null when headers are undefined', () => {
      const result = parseRateLimitHeaders(undefined);
      expect(result).toBeNull();
    });

    it('should return null when limit header is missing', () => {
      const headers = {
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': '1609459200',
      };
      const result = parseRateLimitHeaders(headers);
      expect(result).toBeNull();
    });

    it('should return null when remaining header is missing', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Reset': '1609459200',
      };
      const result = parseRateLimitHeaders(headers);
      expect(result).toBeNull();
    });

    it('should return null when reset header is missing and no Retry-After', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
      };
      const result = parseRateLimitHeaders(headers);
      expect(result).toBeNull();
    });

    it('should handle invalid limit value', () => {
      const headers = createHeaders({
        'X-RateLimit-Limit': 'invalid',
      });
      const result = parseRateLimitHeaders(headers);

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'rate-limit',
        'Invalid rate limit header values',
        expect.objectContaining({
          limit: 'invalid',
          remaining: '50',
        }),
      );
    });

    it('should handle invalid remaining value', () => {
      const headers = createHeaders({
        'X-RateLimit-Remaining': 'invalid',
      });
      const result = parseRateLimitHeaders(headers);

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'rate-limit',
        'Invalid rate limit header values',
        expect.objectContaining({
          limit: '100',
          remaining: 'invalid',
        }),
      );
    });

    it('should calculate reset time from Retry-After when reset header is invalid', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': 'invalid',
        'Retry-After': '60',
      };
      const beforeParse = Math.floor(Date.now() / 1000);
      const result = parseRateLimitHeaders(headers);
      const afterParse = Math.floor(Date.now() / 1000);

      expect(result).not.toBeNull();
      expect(result?.reset).toBeGreaterThanOrEqual(beforeParse + 60);
      expect(result?.reset).toBeLessThanOrEqual(afterParse + 60);
    });

    it('should handle zero remaining attempts', () => {
      const headers = createHeaders({
        'X-RateLimit-Remaining': '0',
      });
      const result = parseRateLimitHeaders(headers);

      expect(result).not.toBeNull();
      expect(result?.remaining).toBe(0);
    });

    it('should handle large rate limits', () => {
      const headers = createHeaders({
        'X-RateLimit-Limit': '1000000',
        'X-RateLimit-Remaining': '999999',
      });
      const result = parseRateLimitHeaders(headers);

      expect(result).not.toBeNull();
      expect(result?.limit).toBe(1000000);
      expect(result?.remaining).toBe(999999);
    });
  });

  describe('updateRateLimitFromServer', () => {
    it('should store rate limit info in localStorage', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        url: '/api/v1/login',
      };

      updateRateLimitFromServer(rateLimitInfo);

      const stored = localStorage.getItem('rate_limit_info_/api/v1/login');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.limit).toBe(100);
      expect(parsed.remaining).toBe(50);
      expect(parsed.reset).toBe(1609459200);
      expect(parsed.updatedAt).toBeDefined();
    });

    it('should use global key when URL is not provided', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
      };

      updateRateLimitFromServer(rateLimitInfo);

      const stored = localStorage.getItem('rate_limit_info_global');
      expect(stored).not.toBeNull();
    });

    it('should store retryAfter when provided', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 100,
        remaining: 0,
        reset: 1609459200,
        retryAfter: 60,
        url: '/api/v1/login',
      };

      updateRateLimitFromServer(rateLimitInfo);

      const stored = localStorage.getItem('rate_limit_info_/api/v1/login');
      const parsed = JSON.parse(stored!);
      expect(parsed.retryAfter).toBe(60);
    });

    it('should log debug message on successful update', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        url: '/api/v1/login',
      };

      updateRateLimitFromServer(rateLimitInfo);

      expect(logger.debug).toHaveBeenCalledWith(
        'rate-limit',
        'Updated rate limit from server',
        expect.objectContaining({
          endpoint: '/api/v1/login',
          remaining: 50,
          limit: 100,
        }),
      );
    });

    it('should handle localStorage errors gracefully', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        url: '/api/v1/login',
      };

      // Mock localStorage.setItem to throw error
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('localStorage is full');
      });

      // Should not throw
      expect(() => updateRateLimitFromServer(rateLimitInfo)).not.toThrow();

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        'rate-limit',
        'Failed to update rate limit from server',
        expect.objectContaining({
          error: expect.any(Object),
          rateLimitInfo,
        }),
      );

      setItemSpy.mockRestore();
    });
  });

  describe('getRateLimitInfo', () => {
    it('should retrieve stored rate limit info', () => {
      const data = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        updatedAt: Date.now(),
      };

      localStorage.setItem('rate_limit_info_/api/v1/login', JSON.stringify(data));

      const result = getRateLimitInfo('/api/v1/login');

      expect(result).toEqual({
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        retryAfter: undefined,
        url: '/api/v1/login',
      });
    });

    it('should return null when no data is stored', () => {
      const result = getRateLimitInfo('/api/v1/login');
      expect(result).toBeNull();
    });

    it('should return null and cleanup when data is expired', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const data = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        updatedAt: oneHourAgo - 1000, // Expired
      };

      localStorage.setItem('rate_limit_info_/api/v1/login', JSON.stringify(data));

      const result = getRateLimitInfo('/api/v1/login');

      expect(result).toBeNull();
      expect(localStorage.getItem('rate_limit_info_/api/v1/login')).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      localStorage.setItem('rate_limit_info_/api/v1/login', 'invalid json');

      const result = getRateLimitInfo('/api/v1/login');

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'rate-limit',
        'Failed to get rate limit info',
        expect.objectContaining({
          error: expect.any(Object),
          endpoint: '/api/v1/login',
        }),
      );
    });

    it('should include retryAfter when present', () => {
      const data = {
        limit: 100,
        remaining: 0,
        reset: 1609459200,
        retryAfter: 60,
        updatedAt: Date.now(),
      };

      localStorage.setItem('rate_limit_info_/api/v1/login', JSON.stringify(data));

      const result = getRateLimitInfo('/api/v1/login');

      expect(result?.retryAfter).toBe(60);
    });

    it('should not return expired data even if within one hour', () => {
      const fiftyNineMinutesAgo = Date.now() - 59 * 60 * 1000;
      const data = {
        limit: 100,
        remaining: 50,
        reset: 1609459200,
        updatedAt: fiftyNineMinutesAgo,
      };

      localStorage.setItem('rate_limit_info_/api/v1/login', JSON.stringify(data));

      const result = getRateLimitInfo('/api/v1/login');

      expect(result).not.toBeNull();
      expect(result?.limit).toBe(100);
    });
  });

  // Note: SSR safety is validated by the guard clauses in the actual implementation
  // (typeof window === 'undefined'). Jest's JSDOM environment makes window non-configurable,
  // preventing proper SSR simulation in tests.
});
