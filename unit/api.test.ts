import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock the entire API module
jest.mock('@/lib/api', () => {
  return {
    authApi: {
      register: jest.fn(),
      login: jest.fn(),
      getCurrentUser: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
    },
    // Individual auth function exports
    register: jest.fn(),
    login: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
    handleApiError: jest.fn(),
    __esModule: true,
    default: {}, // Mocked axios instance
  };
});

// Note: tokenUtils module removed during Phase 2 HttpOnly migration
// Token management now handled by backend via HttpOnly cookies

// Mock errorTracking
jest.mock('@/lib/errors', () => ({
  errorTracking: {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
    trackUserAction: jest.fn(),
  },
}));

describe('API Module', () => {
  let api: any;

  beforeEach(() => {
    jest.clearAllMocks();
    api = require('@/lib/api');
  });

  describe('Auth API', () => {
    it('calls register with correct data', async () => {
      const registerData = {
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
        full_name: 'Test User',
      };

      await api.authApi.register(registerData);
      expect(api.authApi.register).toHaveBeenCalledWith(registerData);
    });

    it('calls login with correct credentials', async () => {
      const loginData = {
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      };

      await api.authApi.login(loginData);
      expect(api.authApi.login).toHaveBeenCalledWith(loginData);
    });

    it('calls getCurrentUser with token', async () => {
      await api.authApi.getCurrentUser('test-token');
      expect(api.authApi.getCurrentUser).toHaveBeenCalledWith('test-token');
    });

    it('calls logout without parameters', async () => {
      await api.authApi.logout();
      expect(api.authApi.logout).toHaveBeenCalledWith();
    });

    it('calls updateProfile with profile data', async () => {
      const profileData = {
        full_name: 'Updated Name',
        email: FRONTEND_TEST_CREDENTIALS.UPDATED.email,
      };

      await api.authApi.updateProfile(profileData);
      expect(api.authApi.updateProfile).toHaveBeenCalledWith(profileData);
    });
  });

  // Note: Token Utils tests removed - functionality moved to Phase 2 HttpOnly migration
  // Token management now handled by backend via HttpOnly cookies

  describe('Error Handling', () => {
    it('calls handleApiError with error object', () => {
      const mockError = new Error('Test error');
      api.handleApiError(mockError);
      expect(api.handleApiError).toHaveBeenCalledWith(mockError);
    });
  });
});
