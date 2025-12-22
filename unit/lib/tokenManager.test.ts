/**
 * Token Manager Tests (Phase 2: HttpOnly Migration)
 *
 * Comprehensive test suite for the TokenManager singleton that manages
 * authentication via HttpOnly cookies.
 *
 * Test Coverage:
 * - Singleton pattern
 * - Event system (on, off, emit)
 * - Authentication checks (delegates to cookieUtils)
 * - Token clearing (delegates to cookieUtils)
 * - Deprecated method warnings
 * - Event listener cleanup
 */

// Mock dependencies BEFORE imports - Jest hoists these
jest.mock('@/lib/cookies');

// Mock logger with proper factory function
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    Logger: jest.fn(() => mockLogger),
  };
});

import { TokenManager, tokenManager } from '@/lib/session/tokenManager';
import * as cookieUtils from '@/lib/cookies';
import logger from '@/lib/logging';

const mockCookieUtils = cookieUtils as jest.Mocked<typeof cookieUtils>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Helper function to reduce nesting depth
const createErrorThrowingFunction = () => {
  return () => {
    throw new Error('Listener error');
  };
};

describe('TokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported tokenManager', () => {
      const instance = TokenManager.getInstance();

      expect(instance).toBe(tokenManager);
    });

    it('should have initialized the singleton on module load', () => {
      // Singleton is initialized when the module is imported
      // We can verify the instance exists and is ready to use
      const instance = TokenManager.getInstance();

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(TokenManager);
    });
  });

  describe('clearTokens()', () => {
    it('should call clearAuth and emit token_removed event', async () => {
      mockCookieUtils.clearAuth.mockResolvedValue(undefined);

      const manager = TokenManager.getInstance();
      await manager.clearTokens('test_reason');

      expect(mockCookieUtils.clearAuth).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('general', 'Clearing tokens', {
        reason: 'test_reason',
      });
    });

    it('should emit token_removed event', async () => {
      mockCookieUtils.clearAuth.mockResolvedValue(undefined);
      const callback = jest.fn();

      const manager = TokenManager.getInstance();
      manager.on('token_removed', callback);
      await manager.clearTokens();

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true when cookieUtils.isAuthenticated returns true', async () => {
      mockCookieUtils.isAuthenticated.mockResolvedValue(true);

      const manager = TokenManager.getInstance();
      const result = await manager.isAuthenticated();

      expect(result).toBe(true);
      expect(mockCookieUtils.isAuthenticated).toHaveBeenCalled();
    });

    it('should return false when cookieUtils.isAuthenticated returns false', async () => {
      mockCookieUtils.isAuthenticated.mockResolvedValue(false);

      const manager = TokenManager.getInstance();
      const result = await manager.isAuthenticated();

      expect(result).toBe(false);
      expect(mockCookieUtils.isAuthenticated).toHaveBeenCalled();
    });

    it('should propagate error when isAuthenticated throws', async () => {
      const error = new Error('Network error');
      mockCookieUtils.isAuthenticated.mockRejectedValue(error);

      const manager = TokenManager.getInstance();
      // isAuthenticated() doesn't catch errors - it just delegates to cookies.isAuthenticated()
      await expect(manager.isAuthenticated()).rejects.toThrow('Network error');
    });
  });

  describe('clearAuth()', () => {
    it('should call clearTokens with explicit_logout reason', async () => {
      mockCookieUtils.clearAuth.mockResolvedValue(undefined);

      const manager = TokenManager.getInstance();
      await manager.clearAuth();

      expect(mockCookieUtils.clearAuth).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('general', 'Clearing tokens', {
        reason: 'explicit_logout',
      });
    });
  });

  describe('Deprecated Methods', () => {
    describe('getValidAccessToken()', () => {
      it('should return null and log warning', async () => {
        const manager = TokenManager.getInstance();
        const result = await manager.getValidAccessToken();

        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'general',
          'getValidAccessToken() is deprecated - tokens are HttpOnly cookies',
        );
      });
    });

    describe('setTokens()', () => {
      it('should log warning and emit token_refreshed event', async () => {
        const callback = jest.fn();
        const manager = TokenManager.getInstance();
        manager.on('token_refreshed', callback);

        await manager.setTokens('token', 'refresh');

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'general',
          'setTokens() is deprecated - tokens are set by backend',
        );
        expect(callback).toHaveBeenCalledWith({ hasToken: true });
      });
    });

    describe('refreshAccessToken()', () => {
      it('should return null and log warning', async () => {
        const manager = TokenManager.getInstance();
        const result = await manager.refreshAccessToken();

        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'general',
          'refreshAccessToken() is deprecated - backend handles refresh',
        );
      });
    });

    describe('getTokenMetadata()', () => {
      it('should return null and log warning', async () => {
        const manager = TokenManager.getInstance();
        const result = await manager.getTokenMetadata();

        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'general',
          'getTokenMetadata() is deprecated - tokens are HttpOnly cookies',
        );
      });
    });
  });

  describe('Event System', () => {
    describe('on() and emit()', () => {
      it('should register and call event listeners', () => {
        const callback = jest.fn();
        const manager = TokenManager.getInstance();

        manager.on('token_refreshed', callback);
        (manager as any).emit('token_refreshed', { hasToken: true });

        expect(callback).toHaveBeenCalledWith({ hasToken: true });
      });

      it('should handle multiple listeners for the same event', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        const manager = TokenManager.getInstance();

        manager.on('token_refreshed', callback1);
        manager.on('token_refreshed', callback2);
        (manager as any).emit('token_refreshed', { hasToken: true });

        expect(callback1).toHaveBeenCalledWith({ hasToken: true });
        expect(callback2).toHaveBeenCalledWith({ hasToken: true });
      });

      it('should handle errors in event listeners gracefully', () => {
        // Use helper function to reduce nesting
        const errorCallback = jest.fn(createErrorThrowingFunction());
        const successCallback = jest.fn();

        const manager = TokenManager.getInstance();
        manager.on('token_refreshed', errorCallback);
        manager.on('token_refreshed', successCallback);

        (manager as any).emit('token_refreshed', { hasToken: true });

        // Error should be logged but not stop other listeners
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'general',
          'Error in token event callback',
          expect.any(Object),
        );
        expect(successCallback).toHaveBeenCalled();
      });
    });

    describe('off()', () => {
      it('should remove a registered listener', () => {
        const callback = jest.fn();
        const manager = TokenManager.getInstance();

        manager.on('token_refreshed', callback);
        manager.off('token_refreshed', callback);
        (manager as any).emit('token_refreshed', { hasToken: true });

        expect(callback).not.toHaveBeenCalled();
      });

      it('should only remove the specified listener', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        const manager = TokenManager.getInstance();

        manager.on('token_refreshed', callback1);
        manager.on('token_refreshed', callback2);
        manager.off('token_refreshed', callback1);
        (manager as any).emit('token_refreshed', { hasToken: true });

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
      });
    });

    describe('cleanup()', () => {
      it('should clear all event listeners', () => {
        const callback = jest.fn();
        const manager = TokenManager.getInstance();
        manager.on('token_refreshed', callback);
        manager.cleanup();

        // Verify listeners are cleared (no log expected - cleanup doesn't log)
        const listeners = (manager as any).eventListeners.get('token_refreshed');
        expect(listeners.size).toBe(0);
      });
    });
  });
});
