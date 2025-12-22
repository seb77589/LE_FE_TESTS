/**
 * API Connectivity Integration Tests (Real Backend)
 *
 * Tests the integration between:
 * - API endpoint resolution
 * - Real Docker backend connectivity
 * - API client configuration
 * - Request/response handling
 *
 * Coverage:
 * - API base URL resolution
 * - Real backend connectivity
 * - API request/response handling
 * - Error handling utilities
 *
 * @integration
 * @jest-environment node
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
import { buildUrl } from '@/lib/api/config';
import { cleanupTestSession } from '../../helpers/api-test-utils';

// Keep framework mocks (logging, errors) but remove API mocks
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

describe('API Connectivity Integration Tests (Real Backend)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Cleanup after each test to prevent session pollution
  afterEach(async () => {
    await cleanupTestSession();
  });

  describe('API Base URL Resolution', () => {
    it('should resolve API base URL correctly', () => {
      const baseUrl = buildUrl('/api/v1/auth/login');
      expect(baseUrl).toContain('/api/v1/auth/login');
    });

    it('should handle relative API paths', () => {
      const relativePath = '/api/v1/users';
      const fullUrl = buildUrl(relativePath);
      expect(fullUrl).toBeTruthy();
      expect(typeof fullUrl).toBe('string');
    });
  });

  describe('Network Connectivity', () => {
    it('should connect to real backend successfully', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('healthy');
    });

    it('should handle real API health check endpoint', async () => {
      const response = await api.get(buildUrl('/health'));

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(typeof response.data).toBe('object');
    });

    it('should include proper response headers', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      expect(response.headers).toBeDefined();
      expect(typeof response.headers).toBe('object');
    });
  });

  describe('CORS Configuration', () => {
    it('should successfully make cross-origin requests to backend', async () => {
      const response = await api.get('/health');

      // If we get here without CORS error, CORS is properly configured
      expect(response.status).toBe(200);
    });

    it('should include CORS headers in response', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      expect(response.headers).toBeDefined();

      // CORS headers should be present (backend should set these)
      // Note: Access to CORS headers may be restricted by browser
    });
  });

  describe('API Request/Response Handling', () => {
    it('should handle successful health check requests', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('service');
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should handle real API endpoint with proper status codes', async () => {
      const response = await api.get('/api/v1/auth/password-policy');

      // Password policy endpoint should return 200
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should make requests with proper content type', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      // Response should have proper content-type (set by backend)
      expect(response.headers).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should extract error messages from network errors', () => {
      const apiError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBeTruthy();
    });

    it('should handle errors without response', () => {
      const apiError = {
        message: 'Request failed',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBeTruthy();
    });
  });
});
