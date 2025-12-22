/**
 * Session Manager Tests (Phase 2.4 Enhanced) - Simplified Version
 *
 * Focused test suite for SessionManager core functionality.
 * Tests complex timer/async behaviors are handled separately to avoid timeouts.
 *
 * Test Coverage:
 * - Session lifecycle (initialize, endSession, destroy)
 * - Session ID generation and validation
 * - SessionStorage integration
 * - Cross-tab sync setup
 * - Resource cleanup
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/api/session', () => ({
  sessionApi: {
    updateActivity: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<
      () => Promise<void>
    >,
    logoutAllDevices: jest
      .fn()
      .mockResolvedValue({ message: 'Success' }) as jest.MockedFunction<
      (excludeCurrent?: boolean) => Promise<{ message: string }>
    >,
  },
}));
jest.mock('@/lib/api/config', () => ({
  buildUrl: jest.fn((path: string) => `http://localhost:8000${path}`),
}));
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
// Don't mock @/lib/session - we want to test the real SessionManager
// Only mock its dependencies

// Now import after mocks are set up
import { sessionManager } from '@/lib/session';
import * as sessionApi from '@/lib/api/session';
import * as config from '@/lib/api/config';
import logger from '@/lib/logging';

const mockSessionApi = sessionApi as jest.Mocked<typeof sessionApi>;
const mockConfig = config as jest.Mocked<typeof config>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock global APIs
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

const mockBroadcastChannel = {
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  name: 'session_sync',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  onmessageerror: null as any,
};

describe('SessionManager', () => {
  let originalSessionStorage: Storage;
  let originalBroadcastChannel: typeof BroadcastChannel;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    // Save originals
    originalSessionStorage = globalThis.sessionStorage;
    originalBroadcastChannel = globalThis.BroadcastChannel;
    originalFetch = globalThis.fetch;

    // Mock sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

    // Mock BroadcastChannel - always return the same mock instance
    globalThis.BroadcastChannel = jest
      .fn()
      .mockImplementation(() => mockBroadcastChannel) as any;

    // Mock fetch
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockBroadcastChannel.postMessage.mockClear();
    mockBroadcastChannel.close.mockClear();
    mockBroadcastChannel.onmessage = null;

    // Reset BroadcastChannel constructor mock (in case any test changed it)
    globalThis.BroadcastChannel = jest
      .fn()
      .mockImplementation(() => mockBroadcastChannel) as any;

    // Reset fetch mock
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    // Reset sessionManager state completely
    try {
      // Clear any existing timers
      if ((sessionManager as any).activityTimer) {
        clearInterval((sessionManager as any).activityTimer);
      }

      // Close broadcastChannel if it exists
      if (
        (sessionManager as any).broadcastChannel &&
        typeof (sessionManager as any).broadcastChannel?.close === 'function'
      ) {
        try {
          (sessionManager as any).broadcastChannel.close();
        } catch {
          // Ignore close errors
        }
      }

      // Reset all internal state
      (sessionManager as any).isInitialized = false;
      (sessionManager as any).sessionId = null;
      (sessionManager as any).startedAt = null;
      (sessionManager as any).lastActivity = null;
      (sessionManager as any).activityTimer = null;
      (sessionManager as any).broadcastChannel = null;
      (sessionManager as any).lastActivityUpdate = 0;
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    // Restore originals
    globalThis.sessionStorage = originalSessionStorage;
    globalThis.BroadcastChannel = originalBroadcastChannel;
    globalThis.fetch = originalFetch;
  });

  describe('initialize()', () => {
    it('should initialize session with generated session ID', () => {
      sessionManager.initialize();

      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'session',
        'Session initialized',
        expect.objectContaining({
          sessionId: expect.any(String),
          hasBackendSession: false,
        }),
      );
    });

    it('should initialize session with provided session ID', () => {
      const providedId = 'session_12345_abc123';

      sessionManager.initialize(providedId);

      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBe(providedId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'session',
        'Session initialized',
        expect.objectContaining({
          sessionId: providedId,
          hasBackendSession: true,
        }),
      );
    });

    it('should not reinitialize if already initialized', () => {
      sessionManager.initialize('session_1_abc');
      jest.clearAllMocks();

      sessionManager.initialize('session_2_def');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'session',
        'SessionManager already initialized',
      );
    });

    it('should use existing session ID from sessionStorage', () => {
      const existingId = 'session_99999_xyz789';
      mockSessionStorage.getItem.mockReturnValue(existingId);

      sessionManager.initialize();

      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBe(existingId);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('session_id');
    });

    it('should create BroadcastChannel for cross-tab sync', () => {
      sessionManager.initialize();

      expect(globalThis.BroadcastChannel).toHaveBeenCalledWith('session_sync');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'session',
        'BroadcastChannel initialized',
      );
    });

    // Activity tracking was removed in simplified SessionManager
    // Backend handles activity tracking now

    it('should handle BroadcastChannel unavailable gracefully', () => {
      // Temporarily remove BroadcastChannel
      const originalBC = globalThis.BroadcastChannel;
      (globalThis as any).BroadcastChannel = undefined;

      sessionManager.initialize();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'session',
        'BroadcastChannel not available',
      );

      // Restore
      globalThis.BroadcastChannel = originalBC;
    });
  });

  describe('getSessionId()', () => {
    it('should return null if not initialized', () => {
      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'session',
        expect.stringContaining('not initialized'),
      );
    });

    it('should return session ID if initialized', () => {
      sessionManager.initialize('session_123_abc');

      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBe('session_123_abc');
    });
  });

  describe('getSessionInfo()', () => {
    it('should return null if not initialized', () => {
      const info = sessionManager.getSessionInfo();

      expect(info).toBeNull();
    });

    it('should return session info if initialized', () => {
      sessionManager.initialize('session_456_def');

      const info = sessionManager.getSessionInfo();

      expect(info).toMatchObject({
        sessionId: 'session_456_def',
        startedAt: expect.any(Date),
        isActive: true,
      });
    });
  });

  describe('endSession()', () => {
    it('should end session and clear data', async () => {
      sessionManager.initialize('session_789_ghi');

      await sessionManager.endSession();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('session_id');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('session_started_at');
      expect(sessionManager.getSessionId()).toBeNull();
    });

    it('should broadcast session invalidation to other tabs by default', async () => {
      sessionManager.initialize();

      await sessionManager.endSession();

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_invalidated',
        }),
      );
    });

    it('should NOT broadcast if broadcastToOtherTabs is false', async () => {
      sessionManager.initialize();

      await sessionManager.endSession(false);

      expect(mockBroadcastChannel.postMessage).not.toHaveBeenCalled();
    });

    it('should close BroadcastChannel', async () => {
      sessionManager.initialize();

      await sessionManager.endSession();

      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });

    it('should handle no active session gracefully', async () => {
      await expect(sessionManager.endSession()).resolves.not.toThrow();
    });

    // endSession no longer tracks session end on server - simplified implementation
    // Server tracking is handled separately by backend
  });

  describe('invalidateAllSessions()', () => {
    it('should call sessionApi.logoutAllDevices with excludeCurrent=true', async () => {
      sessionManager.initialize();

      await sessionManager.invalidateAllSessions(true);

      expect(mockSessionApi.sessionApi.logoutAllDevices).toHaveBeenCalledWith(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'session',
        'All sessions invalidated successfully',
      );
    });

    it('should end current session if excludeCurrent=false', async () => {
      sessionManager.initialize();
      const endSessionSpy = jest.spyOn(sessionManager, 'endSession');

      await sessionManager.invalidateAllSessions(false);

      expect(mockSessionApi.sessionApi.logoutAllDevices).toHaveBeenCalledWith(false);
      expect(endSessionSpy).toHaveBeenCalledWith(true);
    });

    it('should throw error if API call fails', async () => {
      const error = new Error('API error');
      (mockSessionApi.sessionApi.logoutAllDevices as jest.Mock).mockRejectedValueOnce(
        error,
      );

      sessionManager.initialize();

      await expect(sessionManager.invalidateAllSessions()).rejects.toThrow('API error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'session',
        'Failed to invalidate all sessions',
        expect.any(Object),
      );
    });
  });

  describe('destroy()', () => {
    it('should clean up all resources', () => {
      sessionManager.initialize();

      sessionManager.destroy();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('session_id');
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'session',
        'SessionManager destroyed successfully',
      );
    });

    it('should handle destroy when not initialized', () => {
      sessionManager.destroy();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'session',
        expect.stringContaining('not initialized'),
      );
    });

    it('should handle BroadcastChannel close error gracefully', () => {
      mockBroadcastChannel.close.mockImplementationOnce(() => {
        throw new Error('Close failed');
      });

      sessionManager.initialize();
      sessionManager.destroy();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'session',
        'Failed to close BroadcastChannel',
        expect.any(Object),
      );
    });
  });

  describe('Session ID generation and validation', () => {
    it('should generate valid session ID format', () => {
      sessionManager.initialize();

      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should reject invalid session ID format', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid_format');

      sessionManager.initialize();

      const sessionId = sessionManager.getSessionId();

      // Should generate new ID instead of using invalid one
      expect(sessionId).not.toBe('invalid_format');
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should store session ID in sessionStorage', () => {
      sessionManager.initialize();

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'session_id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
      );
    });

    it('should handle sessionStorage write failure gracefully', () => {
      mockSessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      sessionManager.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'session',
        expect.stringContaining('Failed to write'),
        expect.any(Object),
      );
    });
  });

  describe('Session start time handling', () => {
    it('should store session start time', () => {
      sessionManager.initialize();

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'session_started_at',
        expect.any(String),
      );
    });

    it('should use existing start time from sessionStorage', () => {
      const existingTime = new Date('2025-01-01T00:00:00Z').toISOString();
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'session_started_at') return existingTime;
        return null;
      });

      sessionManager.initialize();

      const info = sessionManager.getSessionInfo();

      expect(info?.startedAt.toISOString()).toBe(existingTime);
    });

    it('should handle invalid start time from storage', () => {
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'session_started_at') return 'invalid-date';
        return null;
      });

      sessionManager.initialize();

      const info = sessionManager.getSessionInfo();

      expect(info?.startedAt).toBeInstanceOf(Date);
      expect(info?.startedAt.getTime()).not.toBeNaN();
    });
  });

  describe('Error handling', () => {
    it('should handle sessionStorage read errors', () => {
      mockSessionStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      sessionManager.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'session',
        expect.stringContaining('Failed to read'),
        expect.any(Object),
      );
    });

    it('should handle BroadcastChannel initialization error', () => {
      globalThis.BroadcastChannel = jest.fn().mockImplementationOnce(() => {
        throw new Error('Channel creation failed');
      }) as any;

      sessionManager.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'session',
        expect.stringContaining('Failed to initialize BroadcastChannel'),
        expect.any(Object),
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle initialization and session ID retrieval', () => {
      // Initialize
      sessionManager.initialize();
      const sessionId = sessionManager.getSessionId();

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect((sessionManager as any).isInitialized).toBe(true);
    });

    it('should handle rapid initialize/destroy cycles', () => {
      sessionManager.initialize();
      sessionManager.destroy();
      sessionManager.initialize();
      sessionManager.destroy();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'session',
        'SessionManager destroyed successfully',
      );
    });
  });

  describe('Cross-Tab Synchronization (BroadcastChannel)', () => {
    describe('BroadcastChannel message handlers', () => {
      it('should handle session_invalidated message from another tab', () => {
        sessionManager.initialize('session_test_123');

        // Get the actual broadcastChannel instance
        const broadcastChannel = (sessionManager as any).broadcastChannel;
        const messageHandler = broadcastChannel?.onmessage;

        // Should have a message handler set
        expect(messageHandler).toBeTruthy();

        // Simulate another tab sending session_invalidated message
        const event = {
          data: {
            type: 'session_invalidated',
            sessionId: 'session_test_123',
            timestamp: new Date().toISOString(),
          },
        } as MessageEvent;

        messageHandler!(event);

        // Should log invalidation
        expect(mockLogger.info).toHaveBeenCalledWith(
          'session',
          'Session invalidated in another tab',
        );

        // Should clear session data
        expect((sessionManager as any).sessionId).toBeNull();
        expect((sessionManager as any).isInitialized).toBe(false);
      });

      // session_activity messages are no longer handled - simplified SessionManager
      // Only session_invalidated messages are processed

      it('should ignore unknown message types', () => {
        sessionManager.initialize('session_test_123');

        const broadcastChannel = (sessionManager as any).broadcastChannel;
        const messageHandler = broadcastChannel?.onmessage;
        const sessionIdBefore = sessionManager.getSessionId();

        // Simulate unknown message type
        const event = {
          data: {
            type: 'unknown_message',
            payload: 'some data',
          },
        } as MessageEvent;

        messageHandler!(event);

        // Session should remain unchanged
        expect(sessionManager.getSessionId()).toBe(sessionIdBefore);
      });
    });

    describe('Broadcasting messages to other tabs', () => {
      it('should broadcast session_invalidated when ending session', async () => {
        sessionManager.initialize('session_test_123');
        mockBroadcastChannel.postMessage.mockClear();

        await sessionManager.endSession(true);

        expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
          type: 'session_invalidated',
          sessionId: 'session_test_123',
          timestamp: expect.any(String),
        });
      });

      it('should NOT broadcast when broadcastToOtherTabs is false', async () => {
        sessionManager.initialize('session_test_123');
        mockBroadcastChannel.postMessage.mockClear();

        await sessionManager.endSession(false);

        expect(mockBroadcastChannel.postMessage).not.toHaveBeenCalled();
      });

      it('should handle broadcast failure gracefully', async () => {
        sessionManager.initialize('session_test_123');
        const errorThrowingMock = () => {
          throw new Error('Broadcast failed');
        };
        mockBroadcastChannel.postMessage.mockImplementationOnce(errorThrowingMock);

        await expect(sessionManager.endSession(true)).resolves.not.toThrow();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'session',
          'Failed to broadcast session invalidation',
          expect.any(Object),
        );
      });
    });

    // Activity broadcasting was removed - simplified SessionManager
    // Backend handles activity tracking, frontend only handles session invalidation

    describe('Multi-tab session invalidation flows', () => {
      it('should handle session invalidation in Tab A triggering cleanup in Tab B', () => {
        // Tab A: Initialize session
        sessionManager.initialize('session_shared_123');

        // Tab B receives invalidation message from Tab A
        const messageHandler = mockBroadcastChannel.onmessage;
        const event = {
          data: {
            type: 'session_invalidated',
            sessionId: 'session_shared_123',
            timestamp: new Date().toISOString(),
          },
        } as MessageEvent;

        messageHandler!(event);

        // Verify Tab B cleaned up properly
        expect((sessionManager as any).sessionId).toBeNull();
        expect((sessionManager as any).isInitialized).toBe(false);
        expect((sessionManager as any).activityTimer).toBeNull();
      });

      // Concurrent activity updates no longer handled - simplified SessionManager
      // Only session_invalidated messages are processed

      it('should handle invalidateAllSessions across all tabs', async () => {
        sessionManager.initialize('session_test_123');
        mockBroadcastChannel.postMessage.mockClear();

        // Call invalidateAllSessions with excludeCurrent=false
        await sessionManager.invalidateAllSessions(false);

        // Should call API
        expect(mockSessionApi.sessionApi.logoutAllDevices).toHaveBeenCalledWith(false);

        // Should broadcast invalidation
        expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
          type: 'session_invalidated',
          sessionId: 'session_test_123',
          timestamp: expect.any(String),
        });

        // Should end current session
        expect((sessionManager as any).sessionId).toBeNull();
      });
    });
  });

  // Activity Tracking was removed - simplified SessionManager
  // Backend handles all activity tracking, frontend only manages session lifecycle

  // REMOVED: Tests for Server Session Tracking functionality
  // Server Session Tracking was removed - simplified SessionManager
  // Backend handles session tracking, frontend only manages session lifecycle
});
