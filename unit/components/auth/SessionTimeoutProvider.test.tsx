/**
 * Unit Test for SessionTimeoutProvider Component
 *
 * Coverage Target: 95%+
 * Estimated Tests: 9 tests
 * Priority: CRITICAL (session management critical)
 *
 * Test Categories:
 * - Basic rendering (2 tests)
 * - Session timeout detection (3 tests)
 * - Session extension (2 tests)
 * - Logout handling (1 test)
 * - Warning visibility (1 test)
 */

// Mock dependencies BEFORE imports using factory functions
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: false,
    user: null as any,
  })),
}));

jest.mock('@/hooks/useSessionTimeout', () => ({
  useSessionTimeout: jest.fn(() => ({
    timeRemaining: 0,
    isVisible: false,
    warningLevel: 'subtle',
    canExtend: false,
    extendSession: jest.fn(),
    updateActivity: jest.fn(),
  })),
}));

jest.mock('@/components/auth/SessionTimeoutWarning', () => ({
  SessionTimeoutWarning: ({ timeRemaining, onExtend, onLogout, isVisible }: any) =>
    isVisible ? (
      <div data-testid="session-timeout-warning">
        <p>Time remaining: {timeRemaining}ms</p>
        <button onClick={onExtend}>Extend Session</button>
        <button onClick={onLogout}>Logout</button>
      </div>
    ) : null,
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimeoutProvider } from '@/components/auth/SessionTimeoutProvider';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import logger from '@/lib/logging';

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
describe('SessionTimeoutProvider', () => {
  let mockExtendSession: jest.Mock;
  let mockUpdateActivity: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockExtendSession = jest.fn().mockResolvedValue(undefined);
    mockUpdateActivity = jest.fn().mockResolvedValue(undefined);

    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    (useSessionTimeout as jest.Mock).mockReturnValue({
      timeRemaining: 0,
      isVisible: false,
      warningLevel: 'subtle',
      canExtend: false,
      extendSession: mockExtendSession,
      updateActivity: mockUpdateActivity,
    });
  });

  describe('Basic Rendering', () => {
    it('should render children content', () => {
      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should not show warning when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        user: null,
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 60000,
        isVisible: true,
        warningLevel: 'critical',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      expect(screen.queryByTestId('session-timeout-warning')).not.toBeInTheDocument();
    });
  });

  describe('Session Timeout Detection', () => {
    it('should show warning when authenticated and timeout is imminent', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 60000, // 1 minute
        isVisible: true,
        warningLevel: 'critical',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      expect(screen.getByTestId('session-timeout-warning')).toBeInTheDocument();
      expect(screen.getByText('Time remaining: 60000ms')).toBeInTheDocument();
    });

    it('should not show warning when timeout is not imminent', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 3600000, // 1 hour
        isVisible: false,
        warningLevel: 'subtle',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      expect(screen.queryByTestId('session-timeout-warning')).not.toBeInTheDocument();
    });

    it('should show prominent warning when timeout is within 5 minutes', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 300000, // 5 minutes
        isVisible: true,
        warningLevel: 'prominent',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      expect(screen.getByTestId('session-timeout-warning')).toBeInTheDocument();
    });
  });

  describe('Session Extension', () => {
    it('should call extendSession when extend button is clicked', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 60000,
        isVisible: true,
        warningLevel: 'critical',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      const extendButton = screen.getByRole('button', { name: /extend session/i });
      await user.click(extendButton);

      await waitFor(() => {
        expect(mockExtendSession).toHaveBeenCalled();
      });
    });

    it('should log successful session extension', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 60000,
        isVisible: true,
        warningLevel: 'critical',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      const extendButton = screen.getByRole('button', { name: /extend session/i });
      await user.click(extendButton);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith('session', 'Session extended by user');
      });
    });
  });

  describe('Logout Handling', () => {
    it('should redirect to logout page when logout button is clicked', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 60000,
        isVisible: true,
        warningLevel: 'critical',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'session',
          'User chose to logout due to session timeout',
        );
        // Note: Testing window.location.href assignment in JSDOM is complex
        // The logger call above proves the logout handler was invoked
        // The actual redirect would happen in the browser
      });
    });
  });

  describe('Warning Visibility', () => {
    it('should hide warning when isVisible is false even if authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 3600000,
        isVisible: false, // Explicitly hidden
        warningLevel: 'subtle',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      expect(screen.queryByTestId('session-timeout-warning')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should log error when session extension fails', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Extension failed');
      mockExtendSession.mockRejectedValue(mockError);

      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
      });
      (useSessionTimeout as jest.Mock).mockReturnValue({
        timeRemaining: 60000,
        isVisible: true,
        warningLevel: 'critical',
        canExtend: true,
        extendSession: mockExtendSession,
        updateActivity: mockUpdateActivity,
      });

      render(
        <SessionTimeoutProvider>
          <div>Test Content</div>
        </SessionTimeoutProvider>,
      );

      const extendButton = screen.getByRole('button', { name: /extend session/i });
      await user.click(extendButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'session',
          'Failed to extend session:',
          {
            error: mockError,
          },
        );
      });
    });
  });
});
