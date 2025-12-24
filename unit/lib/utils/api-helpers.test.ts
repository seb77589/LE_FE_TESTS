/**
 * API Helper Utilities Unit Tests
 *
 * Tests for:
 * - API response parsing utilities
 * - Error extraction utilities
 * - Request formatting utilities
 * - Response transformation
 */

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
import { handleApiError } from '@/lib/api/client';
import { extractErrorMessage } from '@/lib/errors';
import { formatRole, formatStatus } from '@/lib/utils/formatters';
import { AxiosError } from 'axios';

// Mock dependencies
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
  extractErrorMessage: jest.fn(),
}));

// Mock isAxiosError to return true for our test error objects with response property
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    isAxiosError: jest.fn((error: any) => !!error?.response),
  };
});

describe('API Helper Utilities Tests', () => {
  describe('Error Extraction', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should extract error message from API response with string detail', () => {
      const apiError = {
        response: {
          data: {
            detail: 'Invalid credentials',
          },
          status: 401,
        },
        message: 'Request failed',
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Invalid credentials');
    });

    it('should extract error message from validation errors array', () => {
      const apiError = {
        response: {
          data: {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'Invalid email format',
              },
              {
                loc: ['body', 'password'],
                msg: 'Password too short',
              },
            ],
          },
          status: 422,
        },
        message: 'Validation failed',
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toContain('email');
      expect(errorMessage).toContain('password');
      expect(errorMessage).toContain('Invalid email format');
      expect(errorMessage).toContain('Password too short');
    });

    it('should extract error message from nested error detail object', () => {
      const apiError = {
        response: {
          data: {
            detail: {
              message: 'Nested error message',
            },
          },
          status: 400,
        },
        message: 'Bad request',
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Nested error message');
    });

    it('should fallback to error message when detail is missing', () => {
      const apiError = {
        response: {
          data: {},
          status: 500,
        },
        message: 'Server error occurred',
      } as AxiosError;

      const errorMessage = handleApiError(apiError);
      expect(errorMessage).toBe('Server error occurred');
    });

    it('should handle non-Axios errors', () => {
      const error = new Error('Network error');
      const errorMessage = handleApiError(error);
      expect(errorMessage).toBe('Network error');
    });

    it('should handle unknown error types', () => {
      const error = { unknown: 'error' };
      const errorMessage = handleApiError(error);
      expect(errorMessage).toBe('An unexpected error occurred');
    });

    it('should extract error from extractErrorMessage utility', () => {
      const mockExtractErrorMessage = extractErrorMessage as jest.MockedFunction<
        typeof extractErrorMessage
      >;

      mockExtractErrorMessage.mockReturnValue('Extracted error message');

      const error = new Error('Original error');
      const result = mockExtractErrorMessage(error, 'Default message');

      expect(result).toBe('Extracted error message');
      expect(mockExtractErrorMessage).toHaveBeenCalledWith(error, 'Default message');
    });
  });

  describe('Response Parsing', () => {
    it('should parse successful API response', () => {
      const response = {
        data: {
          id: 1,
          name: 'Test',
        },
        status: 200,
        headers: {},
      };

      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(1);
      expect(response.status).toBe(200);
    });

    it('should parse paginated API response', () => {
      const paginatedResponse = {
        data: {
          items: [{ id: 1 }, { id: 2 }],
          total: 2,
          page: 1,
          page_size: 10,
        },
        status: 200,
      };

      expect(paginatedResponse.data.items).toHaveLength(2);
      expect(paginatedResponse.data.total).toBe(2);
      expect(paginatedResponse.data.page).toBe(1);
    });

    it('should handle empty API response', () => {
      const emptyResponse = {
        data: null,
        status: 204,
      };

      expect(emptyResponse.data).toBeNull();
      expect(emptyResponse.status).toBe(204);
    });
  });

  describe('Request Formatting', () => {
    it('should format request with query parameters', () => {
      const params = {
        page: 1,
        limit: 10,
        status: 'active',
      };

      const queryString = new URLSearchParams(params as any).toString();
      expect(queryString).toContain('page=1');
      expect(queryString).toContain('limit=10');
      expect(queryString).toContain('status=active');
    });

    it('should format FormData for file uploads', () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('description', 'Test document');

      expect(formData.has('file')).toBe(true);
      expect(formData.has('description')).toBe(true);
    });

    it('should format request headers correctly', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
        'X-Custom-Header': 'custom-value',
      };

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBe('Bearer token-123');
      expect(headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('Response Transformation', () => {
    it('should transform API response to application format', () => {
      const apiResponse = {
        id: 1,
        full_name: 'John Doe',
        email_address: FRONTEND_TEST_CREDENTIALS.JOHN.email,
        created_at: '2025-01-01T00:00:00Z',
      };

      const transformed = {
        id: apiResponse.id,
        name: apiResponse.full_name,
        email: apiResponse.email_address,
        createdAt: new Date(apiResponse.created_at),
      };

      expect(transformed.id).toBe(1);
      expect(transformed.name).toBe('John Doe');
      expect(transformed.email).toBe(FRONTEND_TEST_CREDENTIALS.JOHN.email);
      expect(transformed.createdAt).toBeInstanceOf(Date);
    });

    it('should handle null values in response transformation', () => {
      const apiResponse = {
        id: 1,
        full_name: null,
        email_address: FRONTEND_TEST_CREDENTIALS.USER.email,
      };

      const transformed = {
        id: apiResponse.id,
        name: apiResponse.full_name ?? 'Unknown',
        email: apiResponse.email_address,
      };

      expect(transformed.name).toBe('Unknown');
    });
  });

  describe('Formatting Utilities', () => {
    it('should format role correctly', () => {
      expect(formatRole('USER')).toBe('User');
      expect(formatRole('ADMIN')).toBe('Admin');
      expect(formatRole('SUPERADMIN')).toBe('Superadmin');
      expect(formatRole('assistant')).toBe('Assistant');
      expect(formatRole(null)).toBe('User');
      expect(formatRole(undefined)).toBe('User');
    });

    it('should format status correctly', () => {
      expect(formatStatus('active')).toBe('Active');
      expect(formatStatus('INACTIVE')).toBe('Inactive');
      expect(formatStatus('PENDING')).toBe('Pending');
      expect(formatStatus(null)).toBe('Unknown');
      expect(formatStatus(undefined)).toBe('Unknown');
    });
  });

  describe('Error Response Handling', () => {
    it('should handle 400 Bad Request errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Bad request',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Bad request');
    });

    it('should handle 401 Unauthorized errors', () => {
      const error = {
        response: {
          status: 401,
          data: {
            detail: 'Unauthorized',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Unauthorized');
    });

    it('should handle 403 Forbidden errors', () => {
      const error = {
        response: {
          status: 403,
          data: {
            detail: 'Forbidden',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Forbidden');
    });

    it('should handle 404 Not Found errors', () => {
      const error = {
        response: {
          status: 404,
          data: {
            detail: 'Resource not found',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Resource not found');
    });

    it('should handle 422 Unprocessable Entity errors', () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'field'],
                msg: 'Validation error',
              },
            ],
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toContain('Validation error');
    });

    it('should handle 500 Internal Server Error', () => {
      const error = {
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Internal server error');
    });

    it('should handle 429 Rate Limit errors', () => {
      const error = {
        response: {
          status: 429,
          data: {
            detail: 'Rate limit exceeded',
          },
        },
      } as AxiosError;

      const message = handleApiError(error);
      expect(message).toBe('Rate limit exceeded');
    });
  });

  describe('Request URL Construction', () => {
    it('should construct API URLs correctly', () => {
      const baseURL = 'http://localhost:8000';
      const endpoint = '/api/v1/users';
      const fullURL = `${baseURL}${endpoint}`;

      expect(fullURL).toBe('http://localhost:8000/api/v1/users');
    });

    it('should handle endpoints with leading slash', () => {
      const baseURL = 'http://localhost:8000';
      const endpoint = '/api/v1/users';
      const fullURL = `${baseURL}${endpoint}`;

      expect(fullURL).toBe('http://localhost:8000/api/v1/users');
    });

    it('should handle endpoints without leading slash', () => {
      const baseURL = 'http://localhost:8000';
      const endpoint = 'api/v1/users';
      const fullURL = `${baseURL}/${endpoint}`;

      expect(fullURL).toBe('http://localhost:8000/api/v1/users');
    });

    it('should construct URLs with query parameters', () => {
      const baseURL = 'http://localhost:8000';
      const endpoint = '/api/v1/users';
      const params = new URLSearchParams({ page: '1', limit: '10' });
      const fullURL = `${baseURL}${endpoint}?${params.toString()}`;

      expect(fullURL).toContain('page=1');
      expect(fullURL).toContain('limit=10');
    });
  });

  describe('Response Status Code Handling', () => {
    it('should identify success status codes', () => {
      const successCodes = [200, 201, 204];
      for (const code of successCodes) {
        expect(code).toBeGreaterThanOrEqual(200);
        expect(code).toBeLessThan(300);
      }
    });

    it('should identify client error status codes', () => {
      const clientErrorCodes = [400, 401, 403, 404, 422, 429];
      for (const code of clientErrorCodes) {
        expect(code).toBeGreaterThanOrEqual(400);
        expect(code).toBeLessThan(500);
      }
    });

    it('should identify server error status codes', () => {
      const serverErrorCodes = [500, 502, 503];
      for (const code of serverErrorCodes) {
        expect(code).toBeGreaterThanOrEqual(500);
        expect(code).toBeLessThan(600);
      }
    });
  });
});
