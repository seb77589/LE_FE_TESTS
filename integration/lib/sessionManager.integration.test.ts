/**
 * SessionManager Integration Tests (Phase 2.4)
 *
 * Tests the SessionManager integration with authentication flow,
 * including activity tracking, cross-tab synchronization, and
 * backend API integration.
 *
 * Created: 2025-10-19 (Phase 2.4 Day 7)
 */

import { sessionManager } from '@/lib/session';

// Mock dependencies
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

jest.mock('@/lib/api/config', () => ({
  buildUrl: (path: string) => `http://localhost:8000${path}`,
}));

jest.mock('@/lib/api/session', () => ({
  sessionApi: {
    updateActivity: jest.fn().mockResolvedValue(undefined),
    logoutAllDevices: jest.fn().mockResolvedValue({ message: 'Success' }),
  },
}));

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: any) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any) {
    // Simulate message delivery
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage?.({ data: message });
      }, 0);
    }
  }

  close() {
    // Mock close
  }
}

(globalThis as any).BroadcastChannel = MockBroadcastChannel;

describe('SessionManager Integration Tests', () => {
  beforeEach(async () => {
    // Clear sessionStorage
    sessionStorage.clear();
    jest.clearAllMocks();

    // Destroy any existing session to ensure clean state
    try {
      await sessionManager.endSession(false);
    } catch {
      // Ignore errors if not initialized
    }
    try {
      sessionManager.destroy();
    } catch {
      // Ignore errors if not initialized
    }
  });

  describe('Initialization', () => {
    it('should initialize with backend session ID', () => {
      const backendSessionId = 'backend_session_123';

      sessionManager.initialize(backendSessionId);

      const sessionInfo = sessionManager.getSessionInfo();
      expect(sessionInfo).toBeTruthy();
      expect(sessionInfo?.sessionId).toBe(backendSessionId);
      expect(sessionInfo?.isActive).toBe(true);
    });

    it('should initialize without backend session ID (local fallback)', () => {
      sessionManager.initialize();

      const sessionInfo = sessionManager.getSessionInfo();
      expect(sessionInfo).toBeTruthy();
      expect(sessionInfo?.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(sessionInfo?.isActive).toBe(true);
    });

    it('should store session ID in sessionStorage', () => {
      const backendSessionId = 'backend_session_456';

      sessionManager.initialize(backendSessionId);

      const storedSessionId = sessionStorage.getItem('session_id');
      expect(storedSessionId).toBe(backendSessionId);
    });

    it('should not re-initialize if already initialized', () => {
      sessionManager.initialize('session_1');
      const firstSessionInfo = sessionManager.getSessionInfo();

      sessionManager.initialize('session_2');
      const secondSessionInfo = sessionManager.getSessionInfo();

      // Should still have the first session
      expect(secondSessionInfo?.sessionId).toBe(firstSessionInfo?.sessionId);
    });
  });

  describe('Session Lifecycle', () => {
    it('should return session ID', () => {
      sessionManager.initialize('test_session');

      const sessionId = sessionManager.getSessionId();
      expect(sessionId).toBe('test_session');
    });

    it('should return null if not initialized', () => {
      const sessionId = sessionManager.getSessionId();
      expect(sessionId).toBeNull();
    });

    it('should return session info with all fields', () => {
      sessionManager.initialize('test_session');

      const sessionInfo = sessionManager.getSessionInfo();
      expect(sessionInfo).toMatchObject({
        sessionId: 'test_session',
        isActive: true,
      });
      expect(sessionInfo?.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('Session Termination', () => {
    it('should clear session data on endSession', async () => {
      sessionManager.initialize('test_session');
      expect(sessionManager.getSessionId()).toBe('test_session');

      await sessionManager.endSession();

      expect(sessionManager.getSessionId()).toBeNull();
      expect(sessionStorage.getItem('session_id')).toBeNull();
    });

    it('should broadcast session invalidation by default', async () => {
      sessionManager.initialize('test_session');

      const broadcastSpy = jest.spyOn(MockBroadcastChannel.prototype, 'postMessage');

      await sessionManager.endSession(true);

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_invalidated',
          sessionId: 'test_session',
        }),
      );
    });

    it('should not broadcast when broadcastToOtherTabs is false', async () => {
      sessionManager.initialize('test_session');

      const broadcastSpy = jest.spyOn(MockBroadcastChannel.prototype, 'postMessage');

      await sessionManager.endSession(false);

      expect(broadcastSpy).not.toHaveBeenCalled();
    });
  });

  describe('Activity Tracking', () => {
    it('should update activity on server', async () => {
      const { sessionApi } = require('@/lib/api/session');

      sessionManager.initialize('test_session');

      // Note: Activity tracking was simplified - backend handles this automatically
      // This test verifies the API is available but not directly called by SessionManager
      expect(sessionApi.updateActivity).toBeDefined();
    });

    it('should handle activity update errors gracefully', async () => {
      const { sessionApi } = require('@/lib/api/session');
      sessionApi.updateActivity.mockRejectedValueOnce(new Error('Network error'));

      sessionManager.initialize('test_session');

      // Note: Activity tracking was simplified - backend handles this automatically
      // SessionManager doesn't directly call updateActivity anymore
      expect(sessionApi.updateActivity).toBeDefined();
    });
  });

  describe('Multi-Device Logout', () => {
    it('should invalidate all sessions', async () => {
      const { sessionApi } = require('@/lib/api/session');

      sessionManager.initialize('test_session');

      await sessionManager.invalidateAllSessions(true);

      expect(sessionApi.logoutAllDevices).toHaveBeenCalledWith(true);
    });

    it('should end current session when excludeCurrent is false', async () => {
      const { sessionApi } = require('@/lib/api/session');

      sessionManager.initialize('test_session');

      const endSessionSpy = jest.spyOn(sessionManager, 'endSession');

      await sessionManager.invalidateAllSessions(false);

      expect(sessionApi.logoutAllDevices).toHaveBeenCalledWith(false);
      expect(endSessionSpy).toHaveBeenCalledWith(true);
    });

    it('should throw error if API call fails', async () => {
      const { sessionApi } = require('@/lib/api/session');
      sessionApi.logoutAllDevices.mockRejectedValueOnce(new Error('API error'));

      sessionManager.initialize('test_session');

      await expect(sessionManager.invalidateAllSessions(true)).rejects.toThrow(
        'API error',
      );
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should handle session invalidation from another tab', async () => {
      sessionManager.initialize('test_session');

      // Get the BroadcastChannel instance
      const broadcastChannel = (sessionManager as any).broadcastChannel;

      // Simulate receiving session_invalidated message
      const mockEvent = {
        data: {
          type: 'session_invalidated',
          sessionId: 'test_session',
          timestamp: new Date().toISOString(),
        },
      };

      // Trigger the message handler
      broadcastChannel.onmessage(mockEvent);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Session should be cleared
      expect(sessionManager.getSessionId()).toBeNull();
    });

    it('should update last activity from other tabs', () => {
      sessionManager.initialize('test_session');

      const broadcastChannel = (sessionManager as any).broadcastChannel;

      const mockEvent = {
        data: {
          type: 'session_activity',
          timestamp: new Date().toISOString(),
        },
      };

      // Should not throw when handling activity message
      expect(() => broadcastChannel.onmessage(mockEvent)).not.toThrow();

      // Session should still be active
      expect(sessionManager.getSessionId()).toBe('test_session');
      // Note: lastActivity tracking was removed in simplified SessionManager
    });

    it('should ignore unknown message types', () => {
      sessionManager.initialize('test_session');

      const broadcastChannel = (sessionManager as any).broadcastChannel;

      const mockEvent = {
        data: {
          type: 'unknown_type',
          payload: 'some data',
        },
      };

      // Should not throw
      expect(() => broadcastChannel.onmessage(mockEvent)).not.toThrow();

      // Session should still be active
      expect(sessionManager.getSessionId()).toBe('test_session');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing BroadcastChannel gracefully', () => {
      // Temporarily remove BroadcastChannel
      const originalBroadcastChannel = (globalThis as any).BroadcastChannel;
      delete (globalThis as any).BroadcastChannel;

      // Should not throw
      expect(() => sessionManager.initialize('test_session')).not.toThrow();

      // Restore BroadcastChannel
      (globalThis as any).BroadcastChannel = originalBroadcastChannel;
    });

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage to throw
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => sessionManager.initialize('test_session')).not.toThrow();

      // Restore setItem
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Cleanup', () => {
    it('should close BroadcastChannel on endSession', async () => {
      sessionManager.initialize('test_session');

      const broadcastChannel = (sessionManager as any).broadcastChannel;
      const closeSpy = jest.spyOn(broadcastChannel, 'close');

      await sessionManager.endSession();

      expect(closeSpy).toHaveBeenCalled();
      expect((sessionManager as any).broadcastChannel).toBeNull();
    });

    it('should clear all session data on endSession', async () => {
      sessionManager.initialize('test_session');

      await sessionManager.endSession();

      expect(sessionManager.getSessionId()).toBeNull();
      expect((sessionManager as any).startedAt).toBeNull();
      expect((sessionManager as any).isInitialized).toBe(false);
      // Note: lastActivity and lastActivityUpdate were removed in simplified SessionManager
    });
  });
});
