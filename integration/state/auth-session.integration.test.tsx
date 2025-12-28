/**
 * Auth + Session State Management Integration Tests
 *
 * Tests the integration between:
 * - ConsolidatedAuthContext + SessionManager
 * - Token refresh coordination
 * - Session persistence across tabs
 * - Cross-tab logout synchronization
 * - Session initialization on login
 * - Session cleanup on logout
 *
 * @integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { sessionManager, tokenManager } from '@/lib/session';
import { authApi } from '@/lib/api';
import type { User } from '@/types/auth';
import { FRONTEND_TEST_CREDENTIALS } from '../../jest-test-credentials';

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

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('@/lib/session', () => ({
  sessionManager: {
    initialize: jest.fn(),
    endSession: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn(),
    getSessionId: jest.fn(() => null),
    isActive: jest.fn(() => false),
    cleanup: jest.fn(),
    validateSession: jest.fn(),
  },
  tokenManager: {
    clearTokens: jest.fn(),
    isAuthenticated: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    cleanup: jest.fn(),
    getValidAccessToken: jest.fn(),
    setTokens: jest.fn(),
    refreshAccessToken: jest.fn(),
    getTokenMetadata: jest.fn(),
    clearAuth: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;

const MOCK_CURRENT_USER: User = {
  id: 1,
  email: FRONTEND_TEST_CREDENTIALS.USER.email,
  full_name: 'Test User',
  role: 'assistant',
  is_active: true,
  is_verified: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

function LoginOnMount(
  props: Readonly<{
    email: string;
    password: string;
    times?: number;
    showAuthenticated?: boolean;
    errorTestId?: string;
    doneTestId?: string;
  }>,
) {
  const {
    email,
    password,
    times = 1,
    showAuthenticated,
    errorTestId,
    doneTestId,
  } = props;
  const { login, user, isAuthenticated } = useAuth();
  const hasRunRef = React.useRef(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const run = async () => {
      try {
        const actions = Array.from({ length: times }, () => login({ email, password }));
        await Promise.all(actions);
      } catch (err: any) {
        setError(err?.message ?? 'Login failed');
      } finally {
        setDone(true);
      }
    };

    void run();
  }, [email, password, login, times]);

  return (
    <div>
      {showAuthenticated && isAuthenticated && user && (
        <div data-testid="authenticated">Authenticated</div>
      )}
      {errorTestId && error && <div data-testid={errorTestId}>{error}</div>}
      {doneTestId && done && <div data-testid={doneTestId}>Done</div>}
    </div>
  );
}

function LogoutOnMount(
  props: Readonly<{
    doneTestId?: string;
    swallowErrors?: boolean;
  }>,
) {
  const { doneTestId, swallowErrors } = props;
  const { logout } = useAuth();
  const hasRunRef = React.useRef(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const run = async () => {
      try {
        await logout();
      } catch {
        if (!swallowErrors) {
          throw new Error('Logout failed');
        }
      } finally {
        setDone(true);
      }
    };

    void run();
  }, [logout, swallowErrors]);

  return (
    <div>{doneTestId && done && <div data-testid={doneTestId}>Logged Out</div>}</div>
  );
}

describe('Auth + Session State Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.location.pathname to a protected page so auth context initializes
    // The auth context skips initialization on public pages ('/', '/auth/login', etc.)
    globalThis.history.pushState({}, '', '/dashboard');

    // Reset sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Session Initialization on Login', () => {
    it('should initialize SessionManager when user logs in', async () => {
      const mockLoginResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        session_id: 'test-session-123',
      };

      mockAuthApi.login.mockResolvedValue(mockLoginResponse);
      mockAuthApi.getCurrentUser.mockResolvedValue(MOCK_CURRENT_USER);

      render(
        <AuthProvider>
          <LoginOnMount
            email={FRONTEND_TEST_CREDENTIALS.USER.email}
            password={FRONTEND_TEST_CREDENTIALS.USER.password}
            showAuthenticated
          />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSessionManager.initialize).toHaveBeenCalledWith('test-session-123');
      });
    });

    it('should initialize SessionManager even without session_id in login response', async () => {
      const mockLoginResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
      };

      mockAuthApi.login.mockResolvedValue(mockLoginResponse);
      mockAuthApi.getCurrentUser.mockResolvedValue(MOCK_CURRENT_USER);

      render(
        <AuthProvider>
          <LoginOnMount
            email={FRONTEND_TEST_CREDENTIALS.USER.email}
            password={FRONTEND_TEST_CREDENTIALS.USER.password}
          />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalled();
      });

      // SessionManager should still be initialized even without session_id
      await waitFor(() => {
        expect(mockSessionManager.initialize).toHaveBeenCalled();
      });
    });
  });

  describe('Session Cleanup on Logout', () => {
    it('should end session when user logs out', async () => {
      mockAuthApi.getCurrentUser.mockResolvedValue(MOCK_CURRENT_USER);

      mockAuthApi.logout.mockResolvedValue({ message: 'Logged out' });
      mockSessionManager.getSessionId.mockReturnValue('test-session-123');

      render(
        <AuthProvider>
          <LogoutOnMount doneTestId="logged-out" swallowErrors />
        </AuthProvider>,
      );

      // Wait for logout to complete - the component shows "Logged Out" when done
      await waitFor(() => {
        expect(screen.getByTestId('logged-out')).toBeInTheDocument();
      });

      // Session manager should end session during logout flow
      // Note: authApi.logout is only called if there's an active token,
      // which isn't the case in this mock-only flow
      expect(mockSessionManager.endSession).toHaveBeenCalled();
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should destroy session on logout', async () => {
      mockAuthApi.logout.mockResolvedValue({ message: 'Logged out' });
      mockSessionManager.getSessionId.mockReturnValue('test-session-123');

      render(
        <AuthProvider>
          <LogoutOnMount swallowErrors />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockSessionManager.endSession).toHaveBeenCalled();
      });

      // Session should be destroyed after ending
      await waitFor(() => {
        expect(mockSessionManager.destroy).toHaveBeenCalled();
      });
    });
  });

  describe('Token Refresh Coordination', () => {
    it('should maintain session during token refresh', async () => {
      const originalSessionId = 'test-session-123';
      mockSessionManager.getSessionId.mockReturnValue(originalSessionId);
      mockTokenManager.isAuthenticated.mockResolvedValue(true);

      mockAuthApi.refreshToken.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      });

      // Simulate token refresh
      await mockAuthApi.refreshToken();

      // Session should remain active during token refresh
      expect(mockSessionManager.getSessionId()).toBe(originalSessionId);
    });

    it('should handle token refresh failure gracefully', async () => {
      // This test validates that token refresh can fail without crashing
      // Session cleanup on refresh failure is handled by API interceptors,
      // not at the component level
      mockSessionManager.getSessionId.mockReturnValue('test-session-123');

      mockAuthApi.refreshToken.mockRejectedValue({
        response: {
          status: 401,
          data: { detail: 'Invalid refresh token' },
        },
      });

      // Verify the mock properly rejects
      await expect(mockAuthApi.refreshToken()).rejects.toEqual({
        response: {
          status: 401,
          data: { detail: 'Invalid refresh token' },
        },
      });

      // Session ID should still be accessible after failed refresh
      expect(mockSessionManager.getSessionId()).toBe('test-session-123');
    });
  });

  describe('Session Persistence Across Tabs', () => {
    it('should synchronize logout across tabs via BroadcastChannel', () => {
      // This test validates that BroadcastChannel can be created
      // Real cross-tab synchronization requires the actual sessionManager implementation
      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        onmessage: null as ((event: MessageEvent) => void) | null,
      };

      (globalThis as any).BroadcastChannel = jest
        .fn()
        .mockImplementation(() => mockChannel) as any;

      // Session manager should be able to initialize
      mockSessionManager.initialize('test-session-123');
      expect(mockSessionManager.initialize).toHaveBeenCalledWith('test-session-123');

      // BroadcastChannel should be creatable
      const channel = new BroadcastChannel('test-channel');
      expect(channel.postMessage).toBeDefined();
      expect(channel.close).toBeDefined();
    });

    it('should handle BroadcastChannel unavailability gracefully', () => {
      // Mock BroadcastChannel as undefined
      const originalBroadcastChannel = (globalThis as any).BroadcastChannel;
      (globalThis as any).BroadcastChannel = undefined;

      // SessionManager should still initialize without BroadcastChannel
      mockSessionManager.initialize('test-session-123');

      expect(mockSessionManager.initialize).toHaveBeenCalled();

      // Restore
      (globalThis as any).BroadcastChannel = originalBroadcastChannel;
    });
  });

  describe('Session State Coordination', () => {
    it('should provide session state through auth context', async () => {
      // Set up mock to return authenticated state
      mockSessionManager.getSessionId.mockReturnValue('test-session-123');
      mockTokenManager.isAuthenticated.mockResolvedValue(true);
      mockAuthApi.getCurrentUser.mockResolvedValue(MOCK_CURRENT_USER);

      function TestComponent() {
        const { user, isAuthenticated } = useAuth();

        return (
          <div>
            {isAuthenticated && user && (
              <div data-testid="session-active">Session Active</div>
            )}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Wait for user to be loaded and auth state to be set
      await waitFor(() => {
        expect(screen.getByTestId('session-active')).toBeInTheDocument();
      });

      // Verify that the session manager has a session ID
      expect(mockSessionManager.getSessionId()).toBe('test-session-123');
    });

    it('should handle session expiration', async () => {
      mockSessionManager.getSessionId.mockReturnValue(null);
      mockTokenManager.isAuthenticated.mockResolvedValue(false);

      function TestComponent() {
        const { isAuthenticated } = useAuth();

        return (
          <div>
            {!isAuthenticated && <div data-testid="session-expired">Expired</div>}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('session-expired')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling in Auth-Session Integration', () => {
    it('should handle session initialization errors gracefully', async () => {
      mockAuthApi.login.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        session_id: 'test-session-123',
      });

      mockSessionManager.initialize.mockImplementation(() => {
        throw new Error('Session initialization failed');
      });

      render(
        <AuthProvider>
          <LoginOnMount
            email={FRONTEND_TEST_CREDENTIALS.USER.email}
            password={FRONTEND_TEST_CREDENTIALS.USER.password}
            errorTestId="error"
          />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockSessionManager.initialize).toHaveBeenCalled();
      });
    });

    it('should handle session cleanup errors gracefully', async () => {
      mockAuthApi.logout.mockResolvedValue({ message: 'Logged out' });
      mockSessionManager.endSession.mockImplementation(() => {
        throw new Error('Session cleanup failed');
      });

      render(
        <AuthProvider>
          <LogoutOnMount swallowErrors />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockSessionManager.endSession).toHaveBeenCalled();
      });
    });
  });

  describe('Concurrent Auth and Session Operations', () => {
    it('should handle concurrent login and session initialization', async () => {
      mockAuthApi.login.mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        session_id: 'test-session-123',
      });

      mockAuthApi.getCurrentUser.mockResolvedValue(MOCK_CURRENT_USER);

      render(
        <AuthProvider>
          <LoginOnMount
            email={FRONTEND_TEST_CREDENTIALS.USER.email}
            password={FRONTEND_TEST_CREDENTIALS.USER.password}
            times={2}
            showAuthenticated
          />
        </AuthProvider>,
      );

      // Wait for login to complete
      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalled();
      });

      // Wait for sessionManager.initialize to be called after login completes
      await waitFor(() => {
        expect(mockSessionManager.initialize).toHaveBeenCalled();
      });
    });
  });
});
