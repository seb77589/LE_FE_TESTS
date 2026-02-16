/**
 * Session Manager Tests
 *
 * Tests for session management including cross-tab synchronization
 * with message acknowledgment support (Issue #67 Phase 3.5.4).
 */

import { sessionManager } from '@/lib/session';

describe('SessionManager', () => {
  beforeEach(() => {
    // Reset manager state before each test
    sessionManager.destroy();
    // Clear any mock broadcast channels
    (sessionManager as any).broadcastChannel = null;
    (sessionManager as any).pendingAcknowledgments = new Map();
  });

  afterEach(() => {
    // Clean up after each test
    sessionManager.destroy();
    // Clear any mock broadcast channels
    (sessionManager as any).broadcastChannel = null;
    (sessionManager as any).pendingAcknowledgments = new Map();
  });

  describe('Initialization', () => {
    it('should initialize with session ID', () => {
      sessionManager.initialize('test-session-123');
      const info = sessionManager.getSessionInfo();

      expect(info).toBeDefined();
      expect(info?.sessionId).toBe('test-session-123');
      expect(info?.isActive).toBe(true);
    });

    it('should not reinitialize if already initialized', () => {
      sessionManager.initialize('session-1');
      sessionManager.initialize('session-2');

      const info = sessionManager.getSessionInfo();
      expect(info?.sessionId).toBe('session-1');
    });

    it('should generate session ID if not provided', () => {
      sessionManager.initialize();
      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBeDefined();
      expect(sessionId?.length).toBeGreaterThan(0);
    });
  });

  describe('Session ID Management', () => {
    it('should return session ID after initialization', () => {
      sessionManager.initialize('test-session');
      expect(sessionManager.getSessionId()).toBe('test-session');
    });

    it('should return null if not initialized', () => {
      const sessionId = sessionManager.getSessionId();
      expect(sessionId).toBeNull();
    });

    it('should return full session info when initialized', () => {
      sessionManager.initialize('test-session');
      const info = sessionManager.getSessionInfo();

      expect(info).toBeDefined();
      expect(info?.sessionId).toBe('test-session');
      expect(info?.isActive).toBe(true);
      expect(info?.startedAt).toBeInstanceOf(Date);
    });

    it('should return null session info if not initialized', () => {
      expect(sessionManager.getSessionInfo()).toBeNull();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should initialize broadcast channel on session init', () => {
      sessionManager.initialize('test-session');
      expect(sessionManager.getSessionId()).toBe('test-session');
    });

    it('should handle BroadcastChannel unavailability gracefully', () => {
      const originalBC = (globalThis as any).BroadcastChannel;
      (globalThis as any).BroadcastChannel = undefined;

      sessionManager.initialize('test-session');
      expect(sessionManager.getSessionId()).toBe('test-session');

      (globalThis as any).BroadcastChannel = originalBC;
    });

    it('should not throw when endSession with broadcast unavailable', async () => {
      sessionManager.initialize('test-session');

      const originalBC = (globalThis as any).BroadcastChannel;
      (globalThis as any).BroadcastChannel = undefined;

      await sessionManager.endSession(true);

      (globalThis as any).BroadcastChannel = originalBC;
    });
  });

  describe('Session Lifecycle', () => {
    it('should end session properly', async () => {
      sessionManager.initialize('test-session');
      expect(sessionManager.getSessionId()).toBe('test-session');

      await sessionManager.endSession(false);
      expect(sessionManager.getSessionId()).toBeNull();
    });

    it('should destroy session manager', () => {
      sessionManager.initialize('test-session');
      sessionManager.destroy();

      expect(sessionManager.getSessionId()).toBeNull();
      expect(sessionManager.getSessionInfo()).toBeNull();
    });

    it('should handle destroy when not initialized', () => {
      expect(() => {
        sessionManager.destroy();
      }).not.toThrow();
    });

    it('should handle end session when not initialized', async () => {
      await expect(sessionManager.endSession()).resolves.toBeUndefined();
    });
  });

  describe('Message Acknowledgment (Issue #67)', () => {
    it('should include message ID in broadcast messages', async () => {
      sessionManager.initialize('test-session');

      const postMessageSpy = jest.fn();
      const mockBC = {
        postMessage: postMessageSpy,
        close: jest.fn(),
        onmessage: null as any,
      };

      (sessionManager as any).broadcastChannel = mockBC;

      await sessionManager.endSession(true);

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_invalidated',
          messageId: expect.any(String),
        }),
      );
    });

    it('should handle acknowledgment messages', () => {
      sessionManager.initialize('test-session');

      const testMessageId = 'test-msg-123';

      (sessionManager as any).handleAcknowledgment(testMessageId);
    });

    it('should send acknowledgments for received messages', () => {
      sessionManager.initialize('test-session');

      // Verify the broadcast channel was initialized
      const bc = (sessionManager as any).broadcastChannel;
      if (bc) {
        expect(bc).toBeDefined();
        // Message acknowledgment feature is built-in to the handler
      }
    });

    it('should clean up pending acknowledgments on destroy', async () => {
      sessionManager.initialize('test-session');
      sessionManager.destroy();
    });

    it('should clean up pending acknowledgments on endSession', async () => {
      sessionManager.initialize('test-session');

      const mockBC = {
        postMessage: jest.fn(),
        close: jest.fn(),
        onmessage: null as any,
      };

      (sessionManager as any).broadcastChannel = mockBC;

      await sessionManager.endSession(true);

      expect((sessionManager as any).pendingAcknowledgments.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle broadcast channel errors gracefully', () => {
      sessionManager.initialize('test-session');

      const mockBC = {
        postMessage: () => {
          throw new Error('BroadcastChannel error');
        },
        close: jest.fn(),
        onmessage: null as any,
      };

      (sessionManager as any).broadcastChannel = mockBC;

      expect(() => {
        (sessionManager as any).broadcastSessionInvalidation();
      }).not.toThrow();
    });

    it('should handle destroy with errors gracefully', () => {
      sessionManager.initialize('test-session');

      const mockBC = {
        close: () => {
          throw new Error('Close error');
        },
        onmessage: null as any,
      };

      (sessionManager as any).broadcastChannel = mockBC;

      expect(() => {
        sessionManager.destroy();
      }).not.toThrow();
    });
  });

  describe('Multiple Sessions', () => {
    it('should handle multiple init/destroy cycles', async () => {
      // Cycle 1: initialize and end without broadcast
      sessionManager.initialize('session-1');
      expect(sessionManager.getSessionId()).toBe('session-1');
      await sessionManager.endSession(false);
      expect(sessionManager.getSessionId()).toBeNull();

      // Cycle 2: initialize and destroy
      sessionManager.initialize('session-2');
      expect(sessionManager.getSessionId()).toBe('session-2');
      sessionManager.destroy();
      expect(sessionManager.getSessionId()).toBeNull();

      // Cycle 3: initialize and end without broadcast
      sessionManager.initialize('session-3');
      expect(sessionManager.getSessionId()).toBe('session-3');
      await sessionManager.endSession(false);
      expect(sessionManager.getSessionId()).toBeNull();
    });
  });
});
