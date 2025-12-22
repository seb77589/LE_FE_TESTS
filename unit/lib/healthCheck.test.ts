/**
 * Tests for healthCheck utilities
 *
 * @description Tests for health check and startup validation:
 * - runStartupValidation
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

import { runStartupValidation } from '@/lib/healthCheck';

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('runStartupValidation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return healthy status when backend is healthy', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    } as any);

    const result = await runStartupValidation();

    expect(result.overallStatus).toBe('healthy');
    expect(result.healthCheck.overall).toBe('healthy');
  });

  it('should return degraded status when backend returns non-ok response', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as any);

    const result = await runStartupValidation();

    // Non-ok response sets healthStatus to 'degraded' and adds issues
    // With issues.length > 0, overallStatus becomes 'degraded'
    expect(result.overallStatus).toBe('degraded');
    expect(result.healthCheck.overall).toBe('degraded');
    expect(result.environmentCheck.issues.length).toBeGreaterThan(0);
  });

  it('should return degraded status when backend request fails', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await runStartupValidation();

    // When fetch fails, healthStatus is 'unhealthy' but issues are added
    // With issues.length > 0, the logic sets overallStatus to 'degraded'
    expect(result.overallStatus).toBe('degraded');
    expect(result.healthCheck.overall).toBe('unhealthy');
    expect(result.environmentCheck.issues).toBeDefined();
    expect(result.environmentCheck.issues.length).toBeGreaterThan(0);
  });

  it('should include environment check results', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN = 'https://test@sentry.io/123';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    } as any);

    const result = await runStartupValidation();

    expect(result.environmentCheck).toBeDefined();
    expect(result.environmentCheck.valid).toBeDefined();
    expect(result.environmentCheck.issues).toBeDefined();
    expect(result.environmentCheck.recommendations).toBeDefined();
  });

  it('should handle timeout on health check', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    // Simulate an abort error (timeout)
    mockFetch.mockRejectedValueOnce(new Error('AbortError'));

    const result = await runStartupValidation();

    // Result should handle the error gracefully
    expect(result).toBeDefined();
    expect(result.overallStatus).toBeDefined();
  });

  it('should return proper structure for StartupValidationResult', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    } as any);

    const result = await runStartupValidation();

    // Verify structure matches interface
    expect(result).toHaveProperty('overallStatus');
    expect(result).toHaveProperty('environmentCheck');
    expect(result).toHaveProperty('healthCheck');
    expect(result.environmentCheck).toHaveProperty('valid');
    expect(result.environmentCheck).toHaveProperty('issues');
    expect(result.environmentCheck).toHaveProperty('recommendations');
    expect(result.healthCheck).toHaveProperty('overall');
  });

  it('should provide recommendations when backend fails', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await runStartupValidation();

    expect(result.environmentCheck.issues).toBeDefined();
    expect(result.environmentCheck.recommendations).toBeDefined();
    expect(Array.isArray(result.environmentCheck.recommendations)).toBe(true);
    expect(result.environmentCheck.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle missing API URL by using default', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    // When API URL is missing, it defaults to localhost:8000
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    } as any);

    const result = await runStartupValidation();

    expect(result).toBeDefined();
    expect(result.overallStatus).toBe('healthy');
  });

  it('should validate environment check structure', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    } as any);

    const result = await runStartupValidation();

    expect(typeof result.environmentCheck.valid).toBe('boolean');
    expect(Array.isArray(result.environmentCheck.issues)).toBe(true);
    expect(Array.isArray(result.environmentCheck.recommendations)).toBe(true);
  });

  it('should set valid to false when there are issues', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    mockFetch.mockRejectedValueOnce(new Error('Backend unavailable'));

    const result = await runStartupValidation();

    expect(result.environmentCheck.valid).toBe(false);
    expect(result.environmentCheck.issues.length).toBeGreaterThan(0);
  });
});
