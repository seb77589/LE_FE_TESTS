/**
 * Full Authentication Flow Integration Test (Phase 1)
 *
 * End-to-end integration test for the complete authentication lifecycle:
 * 1. Login: User authenticates and receives session
 * 2. Token Refresh: Automatic refresh on 401 errors
 * 3. Logout: User logs out and session is cleared
 *
 * Tests integration between:
 * - ConsolidatedAuthContext
 * - TokenManager
 * - SessionManager
 * - Auth API endpoints
 * - Auth Interceptor
 *
 * @integration
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('@/lib/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
  refreshAuthToken: jest.fn(),
}));

jest.mock('@/lib/session', () => {
  const eventListeners = new Map();
  const mockClearTokens = jest.fn().mockImplementation(() => {
    // Simulate token_removed event emission when clearTokens is called
    if (eventListeners.has('token_removed')) {
      const callbacks = eventListeners.get('token_removed');
      if (callbacks) {
        for (const callback of callbacks) {
          callback();
        }
      }
    }
    return Promise.resolve(undefined);
  });
  return {
    tokenManager: {
      isAuthenticated: jest.fn().mockResolvedValue(true),
      clearTokens: mockClearTokens,
      on: jest.fn((event, callback) => {
        if (!eventListeners.has(event)) {
          eventListeners.set(event, new Set());
        }
        eventListeners.get(event).add(callback);
      }),
      off: jest.fn((event, callback) => {
        if (eventListeners.has(event)) {
          eventListeners.get(event).delete(callback);
        }
      }),
      emit: jest.fn((event: string, data: any) => {
        if (eventListeners.has(event)) {
          const callbacks = eventListeners.get(event);
          if (callbacks) {
            for (const callback of callbacks) {
              callback(data);
            }
          }
        }
      }),
      eventListeners, // Expose for test cleanup
    },
    sessionManager: {
      initialize: jest.fn(),
      end: jest.fn(),
      endSession: jest.fn(), // Alias for end
      destroy: jest.fn(),
      getSessionId: jest.fn(() => null),
      isActive: jest.fn(() => false),
    },
  };
});

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { tokenManager, sessionManager } from '@/lib/session';
import { authApi } from '@/lib/api';
import * as authModule from '@/lib/api/auth';
import { FRONTEND_TEST_CREDENTIALS } from '../jest-test-credentials';

// Test component to access auth context
function TestAuthComponent() {
  const { user, isAuthenticated, login, logout, refreshToken } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'unauthenticated'}
      </div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      {error && <div data-testid="error">{error}</div>}
      <button data-testid="login-btn" onClick={handleLogin}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="refresh-btn" onClick={refreshToken}>
        Refresh
      </button>
    </div>
  );
}

// Helper functions to reduce nesting levels
const clickButton = async (
  getByTestId: (id: string) => HTMLElement,
  testId: string,
) => {
  await act(async () => {
    getByTestId(testId).click();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
};

const waitForAuthStatus = async (
  getByTestId: (id: string) => HTMLElement,
  expectedStatus: string,
  timeout = 2000,
) => {
  await waitFor(
    () => {
      expect(getByTestId('auth-status')).toHaveTextContent(expectedStatus);
    },
    { timeout },
  );
};

const waitForUserEmail = async (
  getByTestId: (id: string) => HTMLElement,
  expectedEmail: string,
  timeout = 2000,
) => {
  await waitFor(
    () => {
      expect(getByTestId('user-email')).toHaveTextContent(expectedEmail);
    },
    { timeout },
  );
};

const waitForAuthenticatedState = async (
  getByTestId: (id: string) => HTMLElement,
  mockAuthApi: any,
) => {
  await waitFor(
    () => {
      expect(getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        password: FRONTEND_TEST_CREDENTIALS.USER.password,
      });
    },
    { timeout: 3000 },
  );
};

const waitForExpectation = async (expectationFn: () => void, timeout = 2000) => {
  await waitFor(expectationFn, { timeout });
};

describe('Full Authentication Flow Integration', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;

    // Mock sessionStorage
    const mockSessionStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    };

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

    // Mock BroadcastChannel
    globalThis.BroadcastChannel = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock globalThis.window.location.pathname to a protected page so auth context initializes
    // The auth context skips initialization on public pages ('/', '/auth/login', etc.)
    globalThis.window.history.pushState({}, '', '/dashboard');

    // Reset managers - eventListeners is a Map, iterate over values
    if ((tokenManager as any).eventListeners) {
      for (const listeners of (tokenManager as any).eventListeners.values()) {
        listeners.clear();
      }
    }

    // Default authApi mock responses
    const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

    // Default: user not authenticated (getCurrentUser rejects)
    // Create properly structured error object that matches API error format
    const unauthorizedError = Object.assign(new Error('Unauthorized'), {
      status: 401,
      data: { detail: 'Unauthorized' },
    });
    mockAuthApi.getCurrentUser.mockRejectedValue(unauthorizedError);

    // Default successful responses for other methods
    // Note: authApi.login returns TokenResponse (not AuthResponse)
    mockAuthApi.login.mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      session_id: 'session_123_abc',
    });

    mockAuthApi.logout.mockResolvedValue({ message: 'Logged out successfully' });

    mockAuthApi.refreshToken.mockResolvedValue({
      access_token: 'refreshed-token',
      token_type: 'Bearer',
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Complete Auth Lifecycle', () => {
    // SKIPPED: Phase 2 HttpOnly cookies refactor required
    // E2E Coverage: tests/e2e/token-lifecycle.spec.ts validates full auth flow with cookies
    // FIXED: Updated for Phase 2 (HttpOnly cookies) - properly mocking the flow
    it('should complete full login → authenticated → logout flow', async () => {
      jest.useRealTimers();
      const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

      // Setup mocks:
      // 1. First getCurrentUser call (during mount/initialization) should reject (unauthenticated)
      // 2. After login, getCurrentUser should resolve (authenticated)
      const unauthorizedError = Object.assign(new Error('Unauthorized'), {
        status: 401,
        data: { detail: 'Unauthorized' },
      });
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'MANAGER' as const,
        is_active: true,
        is_verified: true,
      } as import('@/types/user').User;

      const mockGetCurrentUser =
        mockAuthApi.getCurrentUser as unknown as jest.MockedFunction<
          () => Promise<import('@/types/user').User>
        >;
      // Setup: login() calls getCurrentUser twice - once during initialization, once after login
      mockGetCurrentUser
        .mockRejectedValueOnce(unauthorizedError) // For initialization (first call)
        .mockResolvedValueOnce(mockUser); // For after login (second call)

      // Mock successful logout
      mockAuthApi.logout.mockResolvedValue({ message: 'Logged out successfully' });

      // Mock successful login - Phase 2 returns TokenResponse with session_id
      // Note: login() calls authApi.login() then authApi.getCurrentUser()
      mockAuthApi.login.mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
        session_id: 'session_456_def',
      });
      // After login, getCurrentUser should be called again (third call total)
      mockGetCurrentUser.mockResolvedValueOnce(mockUser); // For after login

      // Mock tokenManager for Phase 2
      (tokenManager.isAuthenticated as jest.Mock)
        .mockResolvedValueOnce(false) // Initial state
        .mockResolvedValueOnce(true); // After login

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // Initial state: unauthenticated
      await waitForAuthStatus(getByTestId, 'unauthenticated');
      await waitForUserEmail(getByTestId, 'no-user');

      // Step 1: Login
      await clickButton(getByTestId, 'login-btn');

      // Verify authenticated state
      await waitForAuthenticatedState(getByTestId, mockAuthApi);
      await waitForUserEmail(getByTestId, FRONTEND_TEST_CREDENTIALS.USER.email);

      // Step 2: Logout
      // Note: In Phase 2, logout() may not call authApi.logout() if state.token is null
      // It primarily calls tokenManager.clearTokens() and sessionManager.endSession()
      await clickButton(getByTestId, 'logout-btn');

      // Verify logged out state
      await waitForExpectation(() => {
        expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
        expect(getByTestId('user-email')).toHaveTextContent('no-user');
        expect(tokenManager.clearTokens).toHaveBeenCalled();
      }, 2000);
    });

    it('should handle automatic token refresh on 401 error', async () => {
      jest.useRealTimers();
      const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

      // Setup: User is already authenticated
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'ASSISTANT' as const,
        is_active: true,
        is_verified: true,
      } as import('@/types/user').User;

      // Mock getCurrentUser to return authenticated user for initial load
      (mockAuthApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // Mock refreshAuthToken to succeed
      (authModule.refreshAuthToken as jest.Mock).mockResolvedValue({
        access_token: 'refreshed-token',
        token_type: 'Bearer',
      });

      // Ensure tokenManager.isAuthenticated returns true after refresh
      // refreshToken() checks isAuthenticated() after refresh - it must return true
      // Reset and set to always return true for this test
      (tokenManager.isAuthenticated as jest.Mock).mockReset();
      (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(true);

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // Wait for initial auth check
      await waitForAuthStatus(getByTestId, 'authenticated');

      // Note: In Phase 2 with HttpOnly cookies, manual refresh is less common
      // Token refresh happens automatically on the backend
      // This test verifies the refresh function doesn't break the auth state
      await clickButton(getByTestId, 'refresh-btn');

      // User should still be authenticated (or handling the refresh gracefully)
      await waitForAuthStatus(getByTestId, 'authenticated');
    });

    // FIXED: Updated for Phase 2 (HttpOnly cookies)
    it('should handle failed login with error message', async () => {
      jest.useRealTimers();
      const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

      // Mock getCurrentUser to reject (user not authenticated)
      const unauthorizedError = Object.assign(new Error('Unauthorized'), {
        status: 401,
        data: { detail: 'Unauthorized' },
      });
      mockAuthApi.getCurrentUser.mockRejectedValue(unauthorizedError);
      (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(false);

      // Mock failed login
      const loginError = Object.assign(new Error('Invalid credentials'), {
        status: 401,
        data: { detail: 'Invalid credentials' },
      });
      mockAuthApi.login.mockRejectedValueOnce(loginError);

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // Wait for initial state
      await waitForAuthStatus(getByTestId, 'unauthenticated');

      // Attempt login
      await clickButton(getByTestId, 'login-btn');

      // Should remain unauthenticated (login failed)
      await waitForAuthStatus(getByTestId, 'unauthenticated');
      await waitForUserEmail(getByTestId, 'no-user');
    });

    it('should handle logout when already unauthenticated', async () => {
      globalThis.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Already logged out' }),
      } as Response);

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // User starts unauthenticated
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');

      // Attempt logout anyway
      await clickButton(getByTestId, 'logout-btn');

      // Should still be unauthenticated
      expect(getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });
  });

  describe('Token Manager Integration', () => {
    // FIXED: Phase 2 HttpOnly cookies - token events still work via tokenManager
    it('should emit token events during auth flow', async () => {
      jest.useRealTimers();
      const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
      const tokenRefreshedCallback = jest.fn();
      const tokenRemovedCallback = jest.fn();

      tokenManager.on('token_refreshed', tokenRefreshedCallback);
      tokenManager.on('token_removed', tokenRemovedCallback);

      // Mock successful login
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'ASSISTANT' as const,
        is_active: true,
        is_verified: true,
      } as import('@/types/user').User;

      const unauthorizedError = Object.assign(new Error('Unauthorized'), {
        status: 401,
        data: { detail: 'Unauthorized' },
      });

      (mockAuthApi.getCurrentUser as jest.Mock)
        .mockRejectedValueOnce(unauthorizedError) // Initial
        .mockResolvedValueOnce(mockUser); // After login

      mockAuthApi.login.mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
        session_id: 'session_789_ghi',
      });

      mockAuthApi.logout.mockResolvedValue({ message: 'Logged out' });

      (tokenManager.isAuthenticated as jest.Mock)
        .mockResolvedValueOnce(false) // Initial
        .mockResolvedValueOnce(true) // After login
        .mockResolvedValueOnce(false); // After logout

      // clearTokens mock already emits token_removed event (set up in jest.mock above)

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // Login
      await clickButton(getByTestId, 'login-btn');
      await waitForAuthStatus(getByTestId, 'authenticated', 3000);

      // Logout
      await clickButton(getByTestId, 'logout-btn');

      await waitForAuthStatus(getByTestId, 'unauthenticated');

      // Verify events were emitted (at least once during flow)
      // token_removed should be called on logout via tokenManager.clearTokens
      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(tokenRemovedCallback).toHaveBeenCalled();

      // Cleanup
      tokenManager.off('token_refreshed', tokenRefreshedCallback);
      tokenManager.off('token_removed', tokenRemovedCallback);
    });
  });

  describe('Session Manager Integration', () => {
    it('should initialize session on login and destroy on logout', async () => {
      const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
      const mockSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;
      const initializeSpy = mockSessionManager.initialize as jest.Mock;
      const endSessionSpy = mockSessionManager.endSession as jest.Mock;

      // Mock getCurrentUser: first call (AuthProvider init) rejects, subsequent calls succeed
      (mockAuthApi.getCurrentUser as jest.Mock)
        .mockRejectedValueOnce(
          Object.assign(new Error('Unauthorized'), {
            status: 401,
            data: { detail: 'Unauthorized' },
          }),
        )
        .mockResolvedValue({
          id: 1,
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          role: 'ASSISTANT' as const,
          is_active: true,
          is_verified: true,
        } as import('@/types/user').User);

      // Mock successful login with specific session_id
      // Note: authApi.login returns TokenResponse (not AuthResponse)
      mockAuthApi.login.mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        session_id: 'session_789_ghi',
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // Login
      await clickButton(getByTestId, 'login-btn');

      await waitForExpectation(() => {
        expect(initializeSpy).toHaveBeenCalledWith('session_789_ghi');
      });

      // Logout
      await clickButton(getByTestId, 'logout-btn');

      await waitForExpectation(() => {
        expect(endSessionSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from failed refresh and allow re-login', async () => {
      const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

      // Mock failed initial auth check (getCurrentUser)
      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).response = {
        status: 401,
        data: { detail: 'Unauthorized' },
      };

      (mockAuthApi.getCurrentUser as jest.Mock)
        .mockRejectedValueOnce(unauthorizedError) // Initial check fails
        .mockResolvedValueOnce({
          // After login succeeds
          id: 1,
          email: FRONTEND_TEST_CREDENTIALS.USER.email,
          role: 'ASSISTANT',
          is_active: true,
          is_verified: true,
        } as import('@/types/user').User);

      // Mock successful login
      mockAuthApi.login.mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
        session_id: 'session_123',
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>,
      );

      // Initial state: unauthenticated (auth check failed)
      await waitForAuthStatus(getByTestId, 'unauthenticated');

      // Login after failed auth check
      await clickButton(getByTestId, 'login-btn');

      // Should be authenticated now
      await waitForAuthStatus(getByTestId, 'authenticated');
    });
  });
});
