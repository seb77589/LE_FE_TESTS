/**
 * @fileoverview Comprehensive unit tests for API configuration module
 *
 * Tests cover:
 * - URL resolution logic (client-side vs server-side)
 * - Environment variable handling
 * - API configuration creation
 * - Environment-specific configuration
 * - URL building utilities
 * - Configuration validation
 *
 * @module tests/config.test
 * @since 0.2.0
 */

// Store original environment values
const originalEnv = { ...process.env };
const originalWindow = globalThis.window;
const originalLocation = globalThis.location;
const originalNodeEnv = process.env.NODE_ENV;

// Helper to safely set NODE_ENV (it's read-only in some environments)
function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
  });
}

// ==============================================================================
// Test Setup & Mocks
// ==============================================================================

// Mock logger to prevent console output during tests
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('API Config Module', () => {
  // Reset environment before each test
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Reset window/location for consistent test environment
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_BASE_URL;
    delete process.env.API_URL;
    delete process.env.BACKEND_URL;
    delete process.env.HOST_IP;
    delete process.env.BACKEND_PORT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==========================================================================
  // createApiConfig Tests
  // ==========================================================================
  describe('createApiConfig', () => {
    it('should create config with all required properties', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';

      // Re-import to get fresh config
      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config).toHaveProperty('baseURL');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('retries');
      expect(config).toHaveProperty('retryDelay');
      expect(config).toHaveProperty('endpoints');
    });

    it('should set default timeout to 30000ms', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.timeout).toBe(300000);
    });

    it('should set default retries to 3', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.retries).toBe(3);
    });

    it('should set default retryDelay to 1000ms', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.retryDelay).toBe(1000);
    });
  });

  // ==========================================================================
  // Endpoints Tests
  // ==========================================================================
  describe('endpoints', () => {
    let config: any;

    beforeEach(async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';
      const configModule = await import('@/lib/api/config');
      config = configModule.createApiConfig();
    });

    describe('health endpoint', () => {
      it('should have correct health endpoint', () => {
        expect(config.endpoints.health).toBe('/health');
      });
    });

    describe('auth endpoints', () => {
      it('should have login endpoint', () => {
        expect(config.endpoints.auth.login).toBe('/api/v1/auth/login');
      });

      it('should have register endpoint', () => {
        expect(config.endpoints.auth.register).toBe('/api/v1/auth/register');
      });

      it('should have logout endpoint', () => {
        expect(config.endpoints.auth.logout).toBe('/api/v1/auth/logout');
      });

      it('should have refresh endpoint', () => {
        expect(config.endpoints.auth.refresh).toBe('/api/v1/auth/refresh');
      });

      it('should have me endpoint', () => {
        expect(config.endpoints.auth.me).toBe('/api/v1/users/me');
      });

      it('should have password reset endpoints', () => {
        expect(config.endpoints.auth.passwordReset).toBe('/api/v1/auth/password-reset');
        expect(config.endpoints.auth.passwordResetRequest).toBe(
          '/api/v1/auth/password-reset-request',
        );
        expect(config.endpoints.auth.changePassword).toBe(
          '/api/v1/auth/change-password',
        );
      });

      it('should have email verification endpoints', () => {
        expect(config.endpoints.auth.verifyEmail).toBe('/api/v1/auth/verify-email');
        expect(config.endpoints.auth.verifyEmailRequest).toBe(
          '/api/v1/auth/verify-email-request',
        );
      });
    });

    describe('users endpoints', () => {
      it('should have list endpoint', () => {
        expect(config.endpoints.users.list).toBe('/api/v1/users');
      });

      it('should have create endpoint', () => {
        expect(config.endpoints.users.create).toBe('/api/v1/users');
      });

      it('should build get endpoint with number id', () => {
        expect(config.endpoints.users.get(123)).toBe('/api/v1/users/123');
      });

      it('should build get endpoint with string id', () => {
        expect(config.endpoints.users.get('abc')).toBe('/api/v1/users/abc');
      });

      it('should build update endpoint', () => {
        expect(config.endpoints.users.update(456)).toBe('/api/v1/users/456');
      });

      it('should build delete endpoint', () => {
        expect(config.endpoints.users.delete(789)).toBe('/api/v1/users/789');
      });
    });

    describe('documents endpoints', () => {
      it('should have list endpoint with trailing slash', () => {
        expect(config.endpoints.documents.list).toBe('/api/v1/documents/');
      });

      it('should have create endpoint', () => {
        expect(config.endpoints.documents.create).toBe('/api/v1/documents/');
      });

      it('should build get endpoint', () => {
        expect(config.endpoints.documents.get(100)).toBe('/api/v1/documents/100');
      });

      it('should build update endpoint', () => {
        expect(config.endpoints.documents.update('doc-id')).toBe(
          '/api/v1/documents/doc-id',
        );
      });

      it('should build delete endpoint', () => {
        expect(config.endpoints.documents.delete(999)).toBe('/api/v1/documents/999');
      });
    });

    describe('admin endpoints', () => {
      it('should have stats endpoint', () => {
        expect(config.endpoints.admin.stats).toBe('/api/v1/admin/stats');
      });

      it('should have users endpoint', () => {
        expect(config.endpoints.admin.users).toBe('/api/v1/admin/users');
      });

      it('should have systemStatus endpoint', () => {
        expect(config.endpoints.admin.systemStatus).toBe('/api/v1/admin/system/status');
      });
    });

    describe('websocket endpoints', () => {
      it('should have status endpoint', () => {
        expect(config.endpoints.websocket.status).toBe('/api/v1/ws/status');
      });
    });
  });

  // ==========================================================================
  // environmentConfig Tests
  // ==========================================================================
  describe('environmentConfig', () => {
    it('should have development config with longer timeout', async () => {
      const { environmentConfig } = await import('@/lib/api/config');

      expect(environmentConfig.development.timeout).toBe(60000);
      expect(environmentConfig.development.retries).toBe(1);
    });

    it('should have production config with shorter timeout', async () => {
      const { environmentConfig } = await import('@/lib/api/config');

      expect(environmentConfig.production.timeout).toBe(15000);
      expect(environmentConfig.production.retries).toBe(3);
    });

    it('should have test config with minimal timeout', async () => {
      const { environmentConfig } = await import('@/lib/api/config');

      expect(environmentConfig.test.timeout).toBe(5000);
      expect(environmentConfig.test.retries).toBe(0);
    });
  });

  // ==========================================================================
  // getEnvironmentConfig Tests
  // ==========================================================================
  describe('getEnvironmentConfig', () => {
    it('should return development config in development mode', async () => {
      setNodeEnv('development');
      jest.resetModules();

      const { getEnvironmentConfig, environmentConfig } = await import(
        '@/lib/api/config'
      );
      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual(environmentConfig.development);
    });

    it('should return production config in production mode', async () => {
      setNodeEnv('production');
      process.env.NEXT_PUBLIC_API_URL = 'https://api.production.com';
      jest.resetModules();

      const { getEnvironmentConfig, environmentConfig } = await import(
        '@/lib/api/config'
      );
      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual(environmentConfig.production);
    });

    it('should return test config in test mode', async () => {
      setNodeEnv('test');
      jest.resetModules();

      const { getEnvironmentConfig, environmentConfig } = await import(
        '@/lib/api/config'
      );
      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual(environmentConfig.test);
    });

    it('should fallback to development config for unknown environment', async () => {
      setNodeEnv('staging');
      jest.resetModules();

      const { getEnvironmentConfig, environmentConfig } = await import(
        '@/lib/api/config'
      );
      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual(environmentConfig.development);
    });

    it('should fallback to development config when NODE_ENV is undefined', async () => {
      setNodeEnv(''); // Simulate undefined by setting empty
      jest.resetModules();

      const { getEnvironmentConfig, environmentConfig } = await import(
        '@/lib/api/config'
      );
      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual(environmentConfig.development);
    });
  });

  // ==========================================================================
  // buildUrl Tests
  // ==========================================================================
  describe('buildUrl', () => {
    // Note: These tests run in jsdom environment where window exists,
    // so buildUrl uses location.origin (http://localhost by default)

    it('should build URL with leading slash in endpoint', async () => {
      jest.resetModules();

      const { buildUrl } = await import('@/lib/api/config');
      const url = buildUrl('/api/v1/users/123');

      // In jsdom, uses location.origin which is http://localhost
      expect(url).toMatch(/^http:\/\/localhost.*\/api\/v1\/users\/123$/);
    });

    it('should build URL without leading slash in endpoint', async () => {
      jest.resetModules();

      const { buildUrl } = await import('@/lib/api/config');
      const url = buildUrl('api/v1/users/123');

      // Should add leading slash
      expect(url).toMatch(/\/api\/v1\/users\/123$/);
    });

    it('should handle endpoint with query parameters', async () => {
      jest.resetModules();

      const { buildUrl } = await import('@/lib/api/config');
      const url = buildUrl('/api/v1/users?page=1&limit=10');

      expect(url).toContain('/api/v1/users?page=1&limit=10');
    });

    it('should normalize endpoints with or without leading slash', async () => {
      jest.resetModules();

      const { buildUrl } = await import('@/lib/api/config');
      const urlWithSlash = buildUrl('/api/v1/users');
      const urlWithoutSlash = buildUrl('api/v1/users');

      // Both should have the same path part
      expect(urlWithSlash).toContain('/api/v1/users');
      expect(urlWithoutSlash).toContain('/api/v1/users');
    });

    it('should return URL with baseURL from apiConfig', async () => {
      jest.resetModules();

      const { buildUrl, apiConfig } = await import('@/lib/api/config');
      const url = buildUrl('/api/v1/test');

      // URL should start with the baseURL (with any trailing slash removed)
      const expectedPrefix = apiConfig.baseURL.replace(/\/$/, '');
      expect(url.startsWith(expectedPrefix)).toBe(true);
    });
  });

  // ==========================================================================
  // validateApiConfig Tests
  // ==========================================================================
  describe('validateApiConfig', () => {
    it('should return valid for properly configured API', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';
      jest.resetModules();

      const { validateApiConfig } = await import('@/lib/api/config');
      const result = validateApiConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for https URL', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://secure-api.com';
      jest.resetModules();

      const { validateApiConfig } = await import('@/lib/api/config');
      const result = validateApiConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for empty baseURL', async () => {
      // Force empty baseURL by mocking
      jest.resetModules();

      const { validateApiConfig, apiConfig } = await import('@/lib/api/config');
      // Temporarily override for test
      const originalBaseURL = apiConfig.baseURL;
      (apiConfig as any).baseURL = '';

      const result = validateApiConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API base URL is not configured');

      // Restore
      (apiConfig as any).baseURL = originalBaseURL;
    });

    it('should return error for non-http URL', async () => {
      jest.resetModules();

      const { validateApiConfig, apiConfig } = await import('@/lib/api/config');
      const originalBaseURL = apiConfig.baseURL;
      (apiConfig as any).baseURL = 'ftp://invalid-protocol.com';

      const result = validateApiConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'API base URL must start with http:// or https://',
      );

      (apiConfig as any).baseURL = originalBaseURL;
    });

    it('should return error for timeout less than 1000ms', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';
      jest.resetModules();

      const { validateApiConfig, apiConfig } = await import('@/lib/api/config');
      const originalTimeout = apiConfig.timeout;
      (apiConfig as any).timeout = 500;

      const result = validateApiConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API timeout should be at least 1000ms');

      (apiConfig as any).timeout = originalTimeout;
    });

    it('should collect multiple validation errors', async () => {
      jest.resetModules();

      const { validateApiConfig, apiConfig } = await import('@/lib/api/config');
      const originalBaseURL = apiConfig.baseURL;
      const originalTimeout = apiConfig.timeout;

      (apiConfig as any).baseURL = 'ftp://invalid.com';
      (apiConfig as any).timeout = 100;

      const result = validateApiConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);

      (apiConfig as any).baseURL = originalBaseURL;
      (apiConfig as any).timeout = originalTimeout;
    });
  });

  // ==========================================================================
  // debugApiConfig Tests
  // ==========================================================================
  describe('debugApiConfig', () => {
    it('should be a function', async () => {
      jest.resetModules();

      const { debugApiConfig } = await import('@/lib/api/config');

      expect(typeof debugApiConfig).toBe('function');
    });

    it('should not throw when called', async () => {
      jest.resetModules();
      setNodeEnv('development');

      const { debugApiConfig } = await import('@/lib/api/config');

      // Mock console.group and console.groupEnd to avoid output
      const originalGroup = console.group;
      const originalGroupEnd = console.groupEnd;
      console.group = jest.fn();
      console.groupEnd = jest.fn();

      expect(() => debugApiConfig()).not.toThrow();

      console.group = originalGroup;
      console.groupEnd = originalGroupEnd;
    });

    it('should do nothing in production mode', async () => {
      jest.resetModules();
      setNodeEnv('production');
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'; // Required in production

      const { debugApiConfig } = await import('@/lib/api/config');

      const groupSpy = jest.spyOn(console, 'group').mockImplementation();

      debugApiConfig();

      // In production, console.group should not be called
      expect(groupSpy).not.toHaveBeenCalled();

      groupSpy.mockRestore();
    });
  });

  // ==========================================================================
  // URL Resolution Tests (Client-Side in jsdom)
  // URL Resolution Tests (Client-Side in jsdom)
  // ==========================================================================
  describe('URL resolution (client-side)', () => {
    // Note: Tests run in jsdom which has window defined, so these test
    // the client-side URL resolution behavior (using location.origin)

    it('should use location.origin in browser context', async () => {
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      // In jsdom, location.origin is http://localhost
      expect(apiConfig.baseURL).toBe('http://localhost');
    });

    it('should have apiConfig as singleton', async () => {
      jest.resetModules();

      const config1 = await import('@/lib/api/config');
      // Note: Need to reset modules to get a fresh import
      // Without reset, same instance is returned
      const config2 = await import('@/lib/api/config');

      expect(config1.apiConfig).toBe(config2.apiConfig);
    });
  });

  // ==========================================================================
  // Server-Side URL Resolution Logic Tests
  // ==========================================================================
  describe('resolveServerSideUrl logic', () => {
    // These tests verify the URL resolution logic by testing createApiConfig
    // with environment variables. Note: In jsdom, window exists so client-side
    // resolution is used. We test the configuration values indirectly.

    it('should create config with baseURL property', async () => {
      jest.resetModules();

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.baseURL).toBeDefined();
      expect(typeof config.baseURL).toBe('string');
      expect(config.baseURL.startsWith('http')).toBe(true);
    });

    it('should create config with correct timeout', async () => {
      jest.resetModules();

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.timeout).toBe(300000);
    });

    it('should create config with retry settings', async () => {
      jest.resetModules();

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.retries).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });

    it('should create config with all endpoint groups', async () => {
      jest.resetModules();

      const { createApiConfig } = await import('@/lib/api/config');
      const config = createApiConfig();

      expect(config.endpoints.health).toBeDefined();
      expect(config.endpoints.auth).toBeDefined();
      expect(config.endpoints.users).toBeDefined();
      expect(config.endpoints.documents).toBeDefined();
      expect(config.endpoints.admin).toBeDefined();
      expect(config.endpoints.websocket).toBeDefined();
    });
  });

  // ==========================================================================
  // ApiConfig Interface Tests
  // ==========================================================================
  describe('ApiConfig interface', () => {
    it('should have correct structure', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      // Type checking - all properties should exist
      expect(typeof apiConfig.baseURL).toBe('string');
      expect(typeof apiConfig.timeout).toBe('number');
      expect(typeof apiConfig.retries).toBe('number');
      expect(typeof apiConfig.retryDelay).toBe('number');
      expect(typeof apiConfig.endpoints).toBe('object');

      // Endpoints structure
      expect(typeof apiConfig.endpoints.health).toBe('string');
      expect(typeof apiConfig.endpoints.auth).toBe('object');
      expect(typeof apiConfig.endpoints.users).toBe('object');
      expect(typeof apiConfig.endpoints.documents).toBe('object');
      expect(typeof apiConfig.endpoints.admin).toBe('object');
      expect(typeof apiConfig.endpoints.websocket).toBe('object');
    });

    it('should have callable endpoint builders for users', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      expect(typeof apiConfig.endpoints.users.get).toBe('function');
      expect(typeof apiConfig.endpoints.users.update).toBe('function');
      expect(typeof apiConfig.endpoints.users.delete).toBe('function');
    });

    it('should have callable endpoint builders for documents', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://test-api.com';
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      expect(typeof apiConfig.endpoints.documents.get).toBe('function');
      expect(typeof apiConfig.endpoints.documents.update).toBe('function');
      expect(typeof apiConfig.endpoints.documents.delete).toBe('function');
    });
  });

  // ==========================================================================
  // Default Export Tests
  // ==========================================================================
  describe('default export', () => {
    it('should export apiConfig as default', async () => {
      jest.resetModules();

      const defaultExport = (await import('@/lib/api/config')).default;
      const { apiConfig } = await import('@/lib/api/config');

      expect(defaultExport).toBe(apiConfig);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    // Note: These tests run in jsdom (client-side), so URL resolution
    // uses location.origin. We test general config behavior.

    it('should have valid baseURL format', async () => {
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      // baseURL should be a valid URL
      expect(apiConfig.baseURL).toMatch(/^https?:\/\/.+/);
    });

    it('should have non-empty endpoint paths', async () => {
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      // Check key endpoints exist and are non-empty strings
      expect(apiConfig.endpoints.health.length).toBeGreaterThan(0);
      expect(apiConfig.endpoints.auth.login.length).toBeGreaterThan(0);
      expect(apiConfig.endpoints.users.list.length).toBeGreaterThan(0);
    });

    it('should have valid timeout values', async () => {
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      expect(apiConfig.timeout).toBeGreaterThan(0);
      expect(apiConfig.retryDelay).toBeGreaterThan(0);
      expect(apiConfig.retries).toBeGreaterThanOrEqual(0);
    });

    it('should have endpoint functions that return strings', async () => {
      jest.resetModules();

      const { apiConfig } = await import('@/lib/api/config');

      // Test dynamic endpoint builders
      expect(typeof apiConfig.endpoints.users.get(1)).toBe('string');
      expect(typeof apiConfig.endpoints.users.update(1)).toBe('string');
      expect(typeof apiConfig.endpoints.users.delete(1)).toBe('string');
      expect(typeof apiConfig.endpoints.documents.get(1)).toBe('string');
    });
  });
});
