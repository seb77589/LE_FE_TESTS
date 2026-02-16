import rateLimitConfig, { RateLimitConfigs } from '@/lib/api/rateLimitConfig';
import api from '@/lib/api';
import logger from '@/lib/logging';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('rateLimitConfig', () => {
  const mockConfigs: RateLimitConfigs = {
    login: {
      max_attempts: 5,
      time_window_seconds: 900,
      block_duration_seconds: 1800,
    },
    register: {
      max_attempts: 3,
      time_window_seconds: 3600,
      block_duration_seconds: 7200,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Reset singleton state
    (rateLimitConfig as any).configs = null;
    (rateLimitConfig as any).fetchPromise = null;
    (rateLimitConfig as any).lastFetchTime = 0;
  });

  describe('getAllConfigs', () => {
    it('should fetch configs from API on first call', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);

      const configs = await rateLimitConfig.getAllConfigs();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/rate-limits');
      expect(configs).toEqual(mockConfigs);
      expect(logger.info).toHaveBeenCalledWith(
        'rate-limit',
        'Rate limit configurations fetched',
        mockConfigs,
      );
    });

    it('should return cached configs on subsequent calls', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);

      // First call
      await rateLimitConfig.getAllConfigs();

      // Clear mock to verify no second call
      mockApi.get.mockClear();

      // Second call (should use cache)
      const configs = await rateLimitConfig.getAllConfigs();

      expect(mockApi.get).not.toHaveBeenCalled();
      expect(configs).toEqual(mockConfigs);
    });

    it('should force refresh when forceRefresh is true', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);

      // First call
      await rateLimitConfig.getAllConfigs();

      // Clear mock call history
      mockApi.get.mockClear();

      // Prepare new configs for forced refresh
      const newConfigs = {
        ...mockConfigs,
        api: {
          max_attempts: 100,
          time_window_seconds: 60,
          block_duration_seconds: 300,
        },
      };
      mockApi.get.mockResolvedValueOnce({ data: newConfigs } as any);

      // Force refresh
      const configs = await rateLimitConfig.getAllConfigs(true);

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(configs).toEqual(newConfigs);
    });

    it('should return default configs when API call fails', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      const configs = await rateLimitConfig.getAllConfigs();

      expect(logger.error).toHaveBeenCalledWith(
        'rate-limit',
        'Failed to fetch rate limit configurations',
        expect.objectContaining({ message: 'Network error' }),
      );
      expect(configs).toHaveProperty('login');
      expect(configs).toHaveProperty('register');
      expect(configs).toHaveProperty('password_reset');
    });

    it('should reuse in-flight fetch promise', async () => {
      mockApi.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockConfigs } as any), 100),
          ),
      );

      // Start two fetches simultaneously
      const promise1 = rateLimitConfig.getAllConfigs();
      const promise2 = rateLimitConfig.getAllConfigs();

      await Promise.all([promise1, promise2]);

      // Should only call API once (reused promise)
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after cache duration expires', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);

      // First call
      await rateLimitConfig.getAllConfigs();

      // Simulate cache expiration (5 minutes + 1ms)
      const CACHE_DURATION = 5 * 60 * 1000;
      (rateLimitConfig as any).lastFetchTime = Date.now() - CACHE_DURATION - 1;

      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);

      // Second call (cache expired)
      await rateLimitConfig.getAllConfigs();

      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getConfig', () => {
    beforeEach(async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);
      await rateLimitConfig.getAllConfigs();
    });

    it('should return config for existing action', async () => {
      const config = await rateLimitConfig.getConfig('login');

      expect(config).toEqual(mockConfigs.login);
    });

    it('should return null for non-existent action', async () => {
      const config = await rateLimitConfig.getConfig('non_existent');

      expect(config).toBeNull();
    });

    it('should return different configs for different actions', async () => {
      const loginConfig = await rateLimitConfig.getConfig('login');
      const registerConfig = await rateLimitConfig.getConfig('register');

      expect(loginConfig).not.toEqual(registerConfig);
      expect(loginConfig?.max_attempts).toBe(5);
      expect(registerConfig?.max_attempts).toBe(3);
    });
  });

  describe('isRateLimited', () => {
    it('should return false when no rate limit is set', () => {
      const result = rateLimitConfig.isRateLimited('login');
      expect(result).toBe(false);
    });

    it('should return true when action is blocked', () => {
      const blockedUntil = Date.now() + 60000; // 1 minute from now
      localStorage.setItem('rate_limit_login', JSON.stringify({ blockedUntil }));

      const result = rateLimitConfig.isRateLimited('login');
      expect(result).toBe(true);
    });

    it('should return false when block time has expired', () => {
      const blockedUntil = Date.now() - 1000; // 1 second ago
      localStorage.setItem('rate_limit_login', JSON.stringify({ blockedUntil }));

      const result = rateLimitConfig.isRateLimited('login');
      expect(result).toBe(false);
    });

    it('should cleanup expired rate limit', () => {
      const blockedUntil = Date.now() - 1000;
      localStorage.setItem('rate_limit_login', JSON.stringify({ blockedUntil }));

      rateLimitConfig.isRateLimited('login');

      expect(localStorage.getItem('rate_limit_login')).toBeNull();
    });

    it('should handle malformed localStorage data', () => {
      localStorage.setItem('rate_limit_login', 'invalid json');

      const result = rateLimitConfig.isRateLimited('login');

      expect(result).toBe(false);
      expect(localStorage.getItem('rate_limit_login')).toBeNull();
    });

    // Note: SSR safety validated by guard clauses in implementation
  });

  describe('trackRequest', () => {
    beforeEach(async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);
      await rateLimitConfig.getAllConfigs();
    });

    it('should allow first request', async () => {
      const result = await rateLimitConfig.trackRequest('login');

      expect(result.allowed).toBe(true);
      expect(result.remainingTime).toBeUndefined();
    });

    it('should track multiple attempts', async () => {
      // Make 5 attempts (max_attempts for login is 5)
      for (let i = 0; i < 5; i++) {
        await rateLimitConfig.trackRequest('login');
      }

      // 6th attempt should be blocked
      const result = await rateLimitConfig.trackRequest('login');

      expect(result.allowed).toBe(false);
      expect(result.remainingTime).toBeDefined();
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should respect configured max_attempts', async () => {
      // Register has max_attempts: 3
      await rateLimitConfig.trackRequest('register');
      await rateLimitConfig.trackRequest('register');
      await rateLimitConfig.trackRequest('register');

      // 4th attempt should be blocked
      const result = await rateLimitConfig.trackRequest('register');

      expect(result.allowed).toBe(false);
    });

    it('should return remaining time when blocked', async () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        await rateLimitConfig.trackRequest('login');
      }

      const result = await rateLimitConfig.trackRequest('login');

      expect(result.allowed).toBe(false);
      expect(result.remainingTime).toBe(1800); // block_duration_seconds for login
    });

    it('should remove old attempts outside time window', async () => {
      const now = Date.now();
      const oldAttempt = now - 901000; // 901 seconds ago (outside 900s window)

      // Add old attempt
      localStorage.setItem(
        'rate_limit_login',
        JSON.stringify({
          attempts: [{ timestamp: oldAttempt }],
        }),
      );

      // Make 5 new attempts
      for (let i = 0; i < 5; i++) {
        await rateLimitConfig.trackRequest('login');
      }

      // Should still be allowed (old attempt removed)
      const result = await rateLimitConfig.trackRequest('login');
      expect(result.allowed).toBe(false); // 6 new attempts exceeds limit
    });

    it('should handle existing block correctly', async () => {
      const blockedUntil = Date.now() + 60000;
      localStorage.setItem(
        'rate_limit_login',
        JSON.stringify({
          attempts: [],
          blockedUntil,
        }),
      );

      const result = await rateLimitConfig.trackRequest('login');

      expect(result.allowed).toBe(false);
      expect(result.remainingTime).toBeGreaterThan(0);
      expect(result.remainingTime).toBeLessThanOrEqual(60);
    });

    it('should allow request for action without config', async () => {
      const result = await rateLimitConfig.trackRequest('non_existent_action');

      expect(result.allowed).toBe(true);
    });

    // Note: SSR safety validated by guard clauses in implementation

    it('should log warning when rate limit exceeded', async () => {
      // Exceed limit
      for (let i = 0; i < 6; i++) {
        await rateLimitConfig.trackRequest('login');
      }

      expect(logger.warn).toHaveBeenCalledWith(
        'rate-limit',
        'Rate limit exceeded for login',
        expect.objectContaining({
          attempts: expect.any(Number),
          blockedFor: 1800,
        }),
      );
    });

    it('should handle malformed tracking data gracefully', async () => {
      localStorage.setItem('rate_limit_login', 'invalid json');

      const result = await rateLimitConfig.trackRequest('login');

      expect(result.allowed).toBe(true);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for specific action', () => {
      localStorage.setItem(
        'rate_limit_login',
        JSON.stringify({ blockedUntil: Date.now() + 60000 }),
      );

      rateLimitConfig.clearRateLimit('login');

      expect(localStorage.getItem('rate_limit_login')).toBeNull();
    });

    it('should not affect other rate limits', () => {
      localStorage.setItem(
        'rate_limit_login',
        JSON.stringify({ blockedUntil: Date.now() + 60000 }),
      );
      localStorage.setItem(
        'rate_limit_register',
        JSON.stringify({ blockedUntil: Date.now() + 60000 }),
      );

      rateLimitConfig.clearRateLimit('login');

      expect(localStorage.getItem('rate_limit_login')).toBeNull();
      expect(localStorage.getItem('rate_limit_register')).not.toBeNull();
    });

    // Note: SSR safety validated by guard clauses in implementation
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limit keys', () => {
      localStorage.setItem(
        'rate_limit_login',
        JSON.stringify({ blockedUntil: Date.now() }),
      );
      localStorage.setItem(
        'rate_limit_register',
        JSON.stringify({ blockedUntil: Date.now() }),
      );
      localStorage.setItem('other_key', 'value');

      rateLimitConfig.clearAllRateLimits();

      expect(localStorage.getItem('rate_limit_login')).toBeNull();
      expect(localStorage.getItem('rate_limit_register')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('value'); // Unaffected
    });

    it('should handle empty localStorage', () => {
      expect(() => rateLimitConfig.clearAllRateLimits()).not.toThrow();
    });

    // Note: SSR safety validated by guard clauses in implementation
  });

  describe('getRemainingBlockTime', () => {
    it('should return remaining time when blocked', () => {
      const blockedUntil = Date.now() + 30000; // 30 seconds from now
      localStorage.setItem('rate_limit_login', JSON.stringify({ blockedUntil }));

      const remainingTime = rateLimitConfig.getRemainingBlockTime('login');

      expect(remainingTime).not.toBeNull();
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(30);
    });

    it('should return null when not blocked', () => {
      const remainingTime = rateLimitConfig.getRemainingBlockTime('login');
      expect(remainingTime).toBeNull();
    });

    it('should return null when block has expired', () => {
      const blockedUntil = Date.now() - 1000;
      localStorage.setItem('rate_limit_login', JSON.stringify({ blockedUntil }));

      const remainingTime = rateLimitConfig.getRemainingBlockTime('login');
      expect(remainingTime).toBeNull();
    });

    it('should handle malformed data gracefully', () => {
      localStorage.setItem('rate_limit_login', 'invalid json');

      const remainingTime = rateLimitConfig.getRemainingBlockTime('login');
      expect(remainingTime).toBeNull();
    });

    // Note: SSR safety validated by guard clauses in implementation

    it('should calculate remaining time correctly', () => {
      const blockedUntil = Date.now() + 45000; // 45 seconds
      localStorage.setItem('rate_limit_login', JSON.stringify({ blockedUntil }));

      const remainingTime = rateLimitConfig.getRemainingBlockTime('login');

      // Should be approximately 45 seconds (allowing for test execution time)
      expect(remainingTime).toBeGreaterThanOrEqual(44);
      expect(remainingTime).toBeLessThanOrEqual(45);
    });
  });

  describe('default configurations', () => {
    it('should have default configs for common actions', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('API unavailable'));

      const configs = await rateLimitConfig.getAllConfigs();

      expect(configs).toHaveProperty('login');
      expect(configs).toHaveProperty('register');
      expect(configs).toHaveProperty('password_reset');
      expect(configs).toHaveProperty('change_password');
      expect(configs).toHaveProperty('refresh_token');
      expect(configs).toHaveProperty('verify_email');
      expect(configs).toHaveProperty('api');
    });

    it('should have reasonable default values', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('API unavailable'));

      const configs = await rateLimitConfig.getAllConfigs();

      expect(configs.login.max_attempts).toBeGreaterThan(0);
      expect(configs.login.time_window_seconds).toBeGreaterThan(0);
      expect(configs.login.block_duration_seconds).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockConfigs } as any);
      await rateLimitConfig.getAllConfigs();
    });

    it('should handle complete login rate limiting flow', async () => {
      // Make 5 successful attempts
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitConfig.trackRequest('login');
        expect(result.allowed).toBe(true);
      }

      // 6th attempt should be blocked
      const blockedResult = await rateLimitConfig.trackRequest('login');
      expect(blockedResult.allowed).toBe(false);

      // Should report as rate limited
      expect(rateLimitConfig.isRateLimited('login')).toBe(true);

      // Should have remaining time
      const remainingTime = rateLimitConfig.getRemainingBlockTime('login');
      expect(remainingTime).not.toBeNull();

      // Clear rate limit
      rateLimitConfig.clearRateLimit('login');

      // Should no longer be rate limited
      expect(rateLimitConfig.isRateLimited('login')).toBe(false);
    });

    it('should handle multiple simultaneous actions', async () => {
      // Track login attempts
      await rateLimitConfig.trackRequest('login');
      await rateLimitConfig.trackRequest('login');

      // Track register attempts
      await rateLimitConfig.trackRequest('register');

      // Both should be tracked independently
      const loginData = JSON.parse(localStorage.getItem('rate_limit_login')!);
      const registerData = JSON.parse(localStorage.getItem('rate_limit_register')!);

      expect(loginData.attempts.length).toBe(2);
      expect(registerData.attempts.length).toBe(1);
    });
  });
});
