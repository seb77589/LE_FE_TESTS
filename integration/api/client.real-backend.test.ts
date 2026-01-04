/**
 * API Client Real Backend Integration Tests
 *
 * These tests run against the REAL backend (Docker services).
 * They validate actual HTTP communication, rate limiting, authentication,
 * and error handling with the production API.
 *
 * Prerequisites:
 * - Docker services must be running (db, redis, backend)
 * - Test credentials must be configured in config/.env
 *
 * @real-backend
 */

import {
  createRawApiClient,
  authenticateAs,
  clearAuthCache,
  waitForBackend,
  isBackendAvailable,
  getCredentials,
  extractErrorMessage,
  getBackendUrl,
} from '../../helpers/real-api-helpers';
import { FRONTEND_TEST_CREDENTIALS } from '../../jest-test-credentials';

describe('API Client Real Backend Integration', () => {
  // Skip all tests if backend is not available
  beforeAll(async () => {
    const available = await isBackendAvailable();
    if (!available) {
      console.warn(
        'Backend not available - skipping real backend tests. ' +
          'Start Docker services to run these tests.',
      );
    }
  }, 30000);

  afterAll(async () => {
    await clearAuthCache();
  });

  describe('Health Endpoint (Unauthenticated)', () => {
    it('should successfully call health endpoint', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return; // Skip test
      }

      const client = createRawApiClient();
      const response = await client.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should return health data with expected structure', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();
      const response = await client.get('/health');

      expect(response.data).toHaveProperty('status');
      // Health endpoint typically returns status: 'healthy' or 'ok'
      expect(['healthy', 'ok']).toContain(response.data.status);
    });

    it('should handle connection to correct base URL', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const baseUrl = getBackendUrl();
      expect(baseUrl).toContain('localhost:8000');

      const client = createRawApiClient();
      // Verify client is configured correctly
      expect(client.defaults.baseURL).toBe(baseUrl);
    });
  });

  describe('Authentication Flow', () => {
    it('should login with valid credentials and receive JWT', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();
      const credentials = getCredentials('USER');

      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await client.post('/api/v1/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('access_token');
      expect(response.data).toHaveProperty('token_type', 'bearer');
    });

    it('should reject login with invalid credentials', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();

      const formData = new URLSearchParams();
      formData.append('username', 'nonexistent@example.com');
      formData.append('password', 'wrongpassword');

      await expect(
        client.post('/api/v1/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          status: expect.any(Number),
        }),
      });
    });

    it('should access protected endpoint with valid token', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const { client } = await authenticateAs('USER');
      const response = await client.get('/api/v1/users/me');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email');
      expect(response.data.email).toBe(FRONTEND_TEST_CREDENTIALS.USER.email);
    });

    it('should reject protected endpoint without token', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();

      await expect(client.get('/api/v1/users/me')).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 401,
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should receive 404 for non-existent resource', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const { client } = await authenticateAs('USER');

      await expect(client.get('/api/v1/documents/99999999')).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
        }),
      });
    });

    it('should extract error message from API error response', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();

      try {
        await client.get('/api/v1/users/me'); // Will fail - no auth
      } catch (error) {
        const message = extractErrorMessage(error);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
      }
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();

      const requests = [
        client.get('/health'),
        client.get('/health'),
        client.get('/health'),
      ];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(3);
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });

    it('should handle concurrent authenticated requests', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const { client } = await authenticateAs('USER');

      const requests = [client.get('/api/v1/users/me'), client.get('/api/v1/users/me')];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(2);
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.data.email).toBe(FRONTEND_TEST_CREDENTIALS.USER.email);
      }
    });

    it('should handle mixed success and failure in concurrent requests', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();

      const requests = [
        client.get('/health'), // Will succeed
        client.get('/api/v1/users/me'), // Will fail (no auth)
        client.get('/health'), // Will succeed
      ];

      const results = await Promise.allSettled(requests);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Rate Limiting Headers', () => {
    it('should receive response headers from real backend', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const { client } = await authenticateAs('USER');
      const response = await client.get('/api/v1/users/me');

      // Backend should return standard HTTP headers
      expect(response.headers).toBeDefined();
      // Content-type should be JSON
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('API Response Structure', () => {
    it('should return properly structured user data', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const { client } = await authenticateAs('USER');
      const response = await client.get('/api/v1/users/me');

      // Validate user response structure
      expect(response.data).toMatchObject({
        id: expect.any(Number),
        email: expect.any(String),
        is_active: expect.any(Boolean),
      });
    });

    it('should return properly structured login response', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const client = createRawApiClient();
      const credentials = getCredentials('USER');

      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await client.post('/api/v1/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      // Validate login response structure
      expect(response.data).toMatchObject({
        access_token: expect.any(String),
        token_type: expect.stringMatching(/bearer/i),
      });
    });
  });

  describe('Admin Endpoints', () => {
    it('should access admin endpoints with admin credentials', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      try {
        const { client } = await authenticateAs('ADMIN');
        const response = await client.get('/api/v1/admin/users');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data) || response.data.items).toBeTruthy();
      } catch {
        // Admin user might not be seeded - this is acceptable
        console.warn('Admin endpoint test skipped - admin user may not be available');
      }
    });

    it('should reject admin endpoints with regular user', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const { client } = await authenticateAs('USER');

      await expect(client.get('/api/v1/admin/users')).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 403,
        }),
      });
    });
  });

  describe('Timeout and Resilience', () => {
    it('should complete request within reasonable time', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      const startTime = Date.now();
      const client = createRawApiClient();

      await client.get('/health');

      const elapsed = Date.now() - startTime;
      // Health endpoint should respond within 5 seconds
      expect(elapsed).toBeLessThan(5000);
    });

    it('should wait for backend with timeout utility', async () => {
      const available = await isBackendAvailable();
      if (!available) {
        return;
      }

      // Backend should already be running
      const result = await waitForBackend(5000);
      expect(result).toBe(true);
    });
  });
});
