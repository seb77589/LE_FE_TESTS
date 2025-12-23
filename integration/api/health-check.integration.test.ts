/**
 * Health Check API Integration Tests (Real Backend)
 *
 * Tests the integration between:
 * - Health check API endpoint (real Docker backend)
 * - API client interceptors
 * - Error handling for health operations
 *
 * Coverage:
 * - Health check API integration
 * - Error handling for health operations
 * - Real backend validation
 *
 * @integration
 * @jest-environment node
 */

import type { AxiosError } from 'axios';
import api, { handleApiError } from '@/lib/api/client';
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

describe('Health Check API Integration Tests (Real Backend)', () => {
  // Cleanup after each test to prevent session pollution
  afterEach(async () => {
    await cleanupTestSession();
  });

  describe('Health Check API', () => {
    it('should fetch health status successfully from real backend', async () => {
      const endpoint = '/health';
      const response = await api.get(endpoint);

      // Validate real backend response structure
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('healthy');
    });

    it('should include service name in response', async () => {
      const endpoint = '/health';
      const response = await api.get(endpoint);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('service');
      expect(response.data.service).toBe('legalease-backend');
    });

    it('should include timestamp in response', async () => {
      const endpoint = '/health';
      const response = await api.get(endpoint);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('timestamp');

      // Validate timestamp format (ISO 8601 with timezone)
      const timestamp = response.data.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(timestamp)).toBeInstanceOf(Date);
    });

    it('should return consistent response structure', async () => {
      const endpoint = '/health';
      const response = await api.get(endpoint);

      expect(response.status).toBe(200);
      expect(Object.keys(response.data).sort((a, b) => a.localeCompare(b))).toEqual(
        ['service', 'status', 'timestamp'].sort((a, b) => a.localeCompare(b)),
      );
    });
  });

  describe('Error Message Extraction', () => {
    it('should handle API errors with error message extraction', () => {
      // Test error message extraction utility (unit test - no backend call needed)
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(mockError);
      expect(errorMessage).toBeTruthy();
      expect(typeof errorMessage).toBe('string');
    });

    it('should handle errors without response data', () => {
      // Test error message extraction utility (unit test - no backend call needed)
      const mockError = {
        message: 'Network Error',
        isAxiosError: true,
      } as AxiosError;

      const errorMessage = handleApiError(mockError);
      expect(errorMessage).toBeTruthy();
      expect(typeof errorMessage).toBe('string');
    });
  });
});
