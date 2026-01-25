/**
 * Unit Test for useCleanup (useGlobalCleanup) Hook
 *
 * Coverage Target: 95%+
 * Priority: MEDIUM (global cleanup utility)
 *
 * Test Categories:
 * - useGlobalCleanup hook (3 tests)
 * - cleanupAllServices function (4 tests)
 * - cleanupOnLogout function (2 tests)
 * - Error handling (3 tests)
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

jest.mock('@/lib/tracking/activityTracker', () => ({
  activityTracker: {
    stopTracking: jest.fn(),
  },
}));

jest.mock('@/lib/session', () => ({
  sessionManager: {
    destroy: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  errorTracking: {
    disable: jest.fn(),
  },
}));

import { renderHook } from '@testing-library/react';
import { useGlobalCleanup } from '@/hooks/useCleanup';
import { cleanupAllServices, cleanupOnLogout } from '@/lib/cleanup';
import { activityTracker } from '@/lib/tracking/activityTracker';
import { sessionManager } from '@/lib/session';
import { errorTracking } from '@/lib/errors';
import logger from '@/lib/logging';

describe('useCleanup (useGlobalCleanup)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGlobalCleanup Hook', () => {
    it('initializes without errors', () => {
      const { result } = renderHook(() => useGlobalCleanup());

      expect(result.current).toBeUndefined();
    });

    it('runs cleanup on unmount', () => {
      const { unmount } = renderHook(() => useGlobalCleanup());

      unmount();

      expect(activityTracker.stopTracking).toHaveBeenCalledTimes(1);
      expect(sessionManager.destroy).toHaveBeenCalledTimes(1);
      expect(errorTracking.disable).toHaveBeenCalledTimes(1);
    });

    it('logs cleanup operations', () => {
      const { unmount } = renderHook(() => useGlobalCleanup());

      unmount();

      expect(logger.info).toHaveBeenCalledWith('general', 'Manual cleanup triggered');
      expect(logger.info).toHaveBeenCalledWith('general', 'Manual cleanup completed');
    });
  });

  describe('cleanupAllServices Function', () => {
    it('stops activity tracker', () => {
      cleanupAllServices();

      expect(activityTracker.stopTracking).toHaveBeenCalledTimes(1);
    });

    it('destroys session manager', () => {
      cleanupAllServices();

      expect(sessionManager.destroy).toHaveBeenCalledTimes(1);
    });

    it('disables error tracking', () => {
      cleanupAllServices();

      expect(errorTracking.disable).toHaveBeenCalledTimes(1);
    });

    it('logs manual cleanup operations', () => {
      cleanupAllServices();

      expect(logger.info).toHaveBeenCalledWith('general', 'Manual cleanup triggered');
      expect(logger.info).toHaveBeenCalledWith('general', 'Manual cleanup completed');
    });
  });

  describe('cleanupOnLogout Function', () => {
    it('calls cleanupAllServices', () => {
      cleanupOnLogout();

      expect(activityTracker.stopTracking).toHaveBeenCalledTimes(1);
      expect(sessionManager.destroy).toHaveBeenCalledTimes(1);
      expect(errorTracking.disable).toHaveBeenCalledTimes(1);
    });

    it('logs logout cleanup', () => {
      cleanupOnLogout();

      expect(logger.info).toHaveBeenCalledWith('general', '🔒 Running logout cleanup');
      expect(logger.info).toHaveBeenCalledWith('general', '✅ Logout cleanup finished');
    });
  });

  describe('Error Handling', () => {
    it('continues cleanup if activity tracker fails', () => {
      (activityTracker.stopTracking as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Activity tracker error');
      });

      cleanupAllServices();

      expect(logger.error).toHaveBeenCalledWith(
        'general',
        'Error stopping activity tracker',
        expect.objectContaining({ error: expect.any(Error) }),
      );
      // Should still clean up other services
      expect(sessionManager.destroy).toHaveBeenCalledTimes(1);
      expect(errorTracking.disable).toHaveBeenCalledTimes(1);
    });

    it('continues cleanup if session manager fails', () => {
      (sessionManager.destroy as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Session manager error');
      });

      cleanupAllServices();

      expect(logger.error).toHaveBeenCalledWith(
        'general',
        'Error destroying session manager',
        expect.objectContaining({ error: expect.any(Error) }),
      );
      // Should still clean up other services
      expect(activityTracker.stopTracking).toHaveBeenCalledTimes(1);
      expect(errorTracking.disable).toHaveBeenCalledTimes(1);
    });

    it('continues cleanup if error tracking fails', () => {
      (errorTracking.disable as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Error tracking error');
      });

      cleanupAllServices();

      expect(logger.error).toHaveBeenCalledWith(
        'general',
        'Error disabling error tracking',
        expect.objectContaining({ error: expect.any(Error) }),
      );
      // Should still have attempted to clean up other services
      expect(activityTracker.stopTracking).toHaveBeenCalledTimes(1);
      expect(sessionManager.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
