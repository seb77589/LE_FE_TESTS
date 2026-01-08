/**
 * Unit tests for Session API Client
 *
 * @description Comprehensive tests for session API functions including session management,
 * extension, termination, activity tracking, and multi-device session control.
 *
 * Test Coverage:
 * - Session status retrieval
 * - Session extension with limits
 * - Multi-device session management
 * - Session termination (single and bulk)
 * - Activity tracking
 * - Token revocation
 * - CSRF token handling
 * - Error handling
 *
 * @module __tests__/unit/api/session
 */

import {
  sessionApi,
  SessionStatus,
  SessionExtensionResponse,
  SessionInfo,
} from '@/lib/api/session';
import api from '@/lib/api';
import logger from '@/lib/logging';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/logging');

const mockApi = api as jest.Mocked<typeof api>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('sessionApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset document.cookie for each test
    if (typeof document !== 'undefined') {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
    }
  });

  describe('getSessionStatus', () => {
    it('should fetch session status successfully', async () => {
      const mockStatus: SessionStatus = {
        sessionId: 'session-123',
        expiresAt: '2025-12-19T00:00:00Z',
        lastActivity: '2025-12-18T23:00:00Z',
        timeRemaining: 3600000, // 1 hour
        canExtend: true,
        maxExtensions: 5,
        extensionsUsed: 1,
      };

      mockApi.get.mockResolvedValueOnce({ data: mockStatus } as any);

      const result = await sessionApi.getSessionStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/auth/session/status');
      expect(result).toEqual(mockStatus);
    });

    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(sessionApi.getSessionStatus()).rejects.toThrow('Network error');
    });

    it('should handle session near expiration', async () => {
      const mockStatus: SessionStatus = {
        sessionId: 'session-123',
        expiresAt: '2025-12-18T23:05:00Z',
        lastActivity: '2025-12-18T23:00:00Z',
        timeRemaining: 300000, // 5 minutes
        canExtend: true,
        maxExtensions: 5,
        extensionsUsed: 3,
      };

      mockApi.get.mockResolvedValueOnce({ data: mockStatus } as any);

      const result = await sessionApi.getSessionStatus();

      expect(result.timeRemaining).toBe(300000);
      expect(result.canExtend).toBe(true);
    });

    it('should handle session with max extensions reached', async () => {
      const mockStatus: SessionStatus = {
        sessionId: 'session-123',
        expiresAt: '2025-12-18T23:30:00Z',
        lastActivity: '2025-12-18T23:00:00Z',
        timeRemaining: 1800000,
        canExtend: false,
        maxExtensions: 5,
        extensionsUsed: 5,
      };

      mockApi.get.mockResolvedValueOnce({ data: mockStatus } as any);

      const result = await sessionApi.getSessionStatus();

      expect(result.canExtend).toBe(false);
      expect(result.extensionsUsed).toBe(result.maxExtensions);
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const mockResponse: SessionExtensionResponse = {
        success: true,
        newExpiresAt: '2025-12-19T01:00:00Z',
        timeRemaining: 7200000, // 2 hours
        extensionsRemaining: 3,
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.extendSession();

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/session/extend');
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should handle extension failure when max extensions reached', async () => {
      const mockResponse: SessionExtensionResponse = {
        success: false,
        newExpiresAt: '2025-12-18T23:30:00Z',
        timeRemaining: 1800000,
        extensionsRemaining: 0,
        message: 'Maximum extensions reached',
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.extendSession();

      expect(result.success).toBe(false);
      expect(result.extensionsRemaining).toBe(0);
      expect(result.message).toBe('Maximum extensions reached');
    });

    it('should handle network errors during extension', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(sessionApi.extendSession()).rejects.toThrow('Network timeout');
    });

    it('should return correct new expiration time', async () => {
      const newExpiry = new Date('2025-12-19T00:00:00Z');

      const mockResponse: SessionExtensionResponse = {
        success: true,
        newExpiresAt: newExpiry.toISOString(),
        timeRemaining: 3600000, // 1 hour
        extensionsRemaining: 4,
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.extendSession();

      expect(result.newExpiresAt).toBe(newExpiry.toISOString());
      expect(result.timeRemaining).toBe(3600000);
    });
  });

  describe('getUserSessions', () => {
    it('should fetch all user sessions (array response)', async () => {
      const mockSessions: SessionInfo[] = [
        {
          id: 'session-1',
          device: 'Chrome on Windows',
          location: 'New York, US',
          lastActivity: '2025-12-18T23:00:00Z',
          isCurrent: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2025-12-18T20:00:00Z',
          expiresAt: '2025-12-19T00:00:00Z',
        },
        {
          id: 'session-2',
          device: 'Safari on iPhone',
          location: 'Los Angeles, US',
          lastActivity: '2025-12-18T22:30:00Z',
          isCurrent: false,
          ipAddress: '192.168.1.101',
          userAgent: 'Safari/605.1.15...',
          createdAt: '2025-12-18T19:00:00Z',
          expiresAt: '2025-12-18T23:30:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockSessions } as any);

      const result = await sessionApi.getUserSessions();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/auth/sessions');
      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
    });

    it('should handle object response with sessions property', async () => {
      const mockSessions: SessionInfo[] = [
        {
          id: 'session-1',
          device: 'Chrome on Windows',
          location: 'New York, US',
          lastActivity: '2025-12-18T23:00:00Z',
          isCurrent: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2025-12-18T20:00:00Z',
          expiresAt: '2025-12-19T00:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({
        data: {
          sessions: mockSessions,
          total: 1,
        },
      } as any);

      const result = await sessionApi.getUserSessions();

      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(1);
    });

    it('should handle backend response with active_sessions property', async () => {
      const mockSessions: SessionInfo[] = [
        {
          id: 'session-1',
          device: 'Unknown Device',
          location: 'Unknown Location',
          lastActivity: '2025-12-18T23:00:00Z',
          isCurrent: false,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2025-12-18T20:00:00Z',
          expiresAt: '',
        },
      ];

      mockApi.get.mockResolvedValueOnce({
        data: {
          active_sessions: mockSessions,
          session_count: 1,
          max_concurrent_sessions: 10,
        },
      } as any);

      const result = await sessionApi.getUserSessions();

      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for unexpected response structure', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { unexpected: 'format' } } as any);

      const result = await sessionApi.getUserSessions();

      expect(result).toEqual([]);
    });

    it('should return empty array for null response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: null } as any);

      const result = await sessionApi.getUserSessions();

      expect(result).toEqual([]);
    });

    it('should identify current session correctly', async () => {
      const mockSessions: SessionInfo[] = [
        {
          id: 'session-1',
          device: 'Chrome on Windows',
          location: 'New York, US',
          lastActivity: '2025-12-18T23:00:00Z',
          isCurrent: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2025-12-18T20:00:00Z',
          expiresAt: '2025-12-19T00:00:00Z',
        },
        {
          id: 'session-2',
          device: 'Safari on iPhone',
          location: 'Los Angeles, US',
          lastActivity: '2025-12-18T22:30:00Z',
          isCurrent: false,
          ipAddress: '192.168.1.101',
          userAgent: 'Safari/605.1.15...',
          createdAt: '2025-12-18T19:00:00Z',
          expiresAt: '2025-12-18T23:30:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockSessions } as any);

      const result = await sessionApi.getUserSessions();

      const currentSession = result.find((s) => s.isCurrent);
      const otherSessions = result.filter((s) => !s.isCurrent);

      expect(currentSession).toBeDefined();
      expect(currentSession?.id).toBe('session-1');
      expect(otherSessions).toHaveLength(1);
    });

    it('should handle API errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(sessionApi.getUserSessions()).rejects.toThrow('Unauthorized');
    });
  });

  describe('terminateSession', () => {
    it('should terminate specific session successfully', async () => {
      const mockResponse = { success: true, message: 'Session terminated' };

      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.terminateSession('session-123');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/auth/sessions/session-123');
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should handle termination failure', async () => {
      const mockResponse = { success: false, message: 'Session not found' };

      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.terminateSession('invalid-session');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session not found');
    });

    it('should handle network errors', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error('Network error'));

      await expect(sessionApi.terminateSession('session-123')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('terminateAllOtherSessions', () => {
    it('should terminate all other sessions successfully', async () => {
      const mockResponse = { success: true, terminatedCount: 3 };

      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.terminateAllOtherSessions();

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/auth/sessions/others');
      expect(result).toEqual(mockResponse);
      expect(result.terminatedCount).toBe(3);
    });

    it('should handle when no other sessions exist', async () => {
      const mockResponse = { success: true, terminatedCount: 0 };

      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.terminateAllOtherSessions();

      expect(result.terminatedCount).toBe(0);
    });

    it('should handle API errors', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error('Server error'));

      await expect(sessionApi.terminateAllOtherSessions()).rejects.toThrow(
        'Server error',
      );
    });
  });

  describe('updateActivity', () => {
    it('should update session activity successfully', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} } as any);

      await sessionApi.updateActivity();

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/session/activity');
    });

    it('should handle activity update errors silently', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(sessionApi.updateActivity()).rejects.toThrow('Network timeout');
    });

    it('should not return any value', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { updated: true } } as any);

      const result = await sessionApi.updateActivity();

      expect(result).toBeUndefined();
    });
  });

  describe('logoutAllDevices', () => {
    beforeEach(() => {
      // Mock fetch for CSRF token
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should logout from all devices except current', async () => {
      // Mock CSRF token in cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=test-csrf-token',
      });

      const mockResponse = { message: 'Logged out from 2 devices' };
      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.logoutAllDevices(true);

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/v1/auth/sessions',
        expect.objectContaining({
          headers: { 'X-CSRFToken': 'test-csrf-token' },
          params: { exclude_current: true },
        }),
      );
      expect(result.message).toBe('Logged out from 2 devices');
    });

    it('should logout from all devices including current', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=test-csrf-token',
      });

      const mockResponse = { message: 'Logged out from all devices' };
      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.logoutAllDevices(false);

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/v1/auth/sessions',
        expect.objectContaining({
          params: { exclude_current: false },
        }),
      );
      expect(result.message).toBe('Logged out from all devices');
    });

    // Note: CSRF token fetching via fetch() is tested in integration tests
    // Unit testing this behavior requires complex cookie mocking

    it('should handle missing CSRF token gracefully', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const mockResponse = { message: 'Logged out' };
      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.logoutAllDevices();

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/v1/auth/sessions',
        expect.objectContaining({
          headers: {},
          params: { exclude_current: true },
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle CSRF token fetch error', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });

      (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const mockResponse = { message: 'Logged out' };
      mockApi.delete.mockResolvedValueOnce({ data: mockResponse } as any);

      await sessionApi.logoutAllDevices();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'api',
        'Failed to get CSRF token',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe('revokeAllTokens', () => {
    beforeEach(() => {
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should revoke all tokens successfully', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=test-csrf-token',
      });

      const mockResponse = { message: 'All tokens revoked' };
      mockApi.post.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.revokeAllTokens();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/auth/revoke-all-tokens',
        null,
        expect.objectContaining({
          headers: { 'X-CSRFToken': 'test-csrf-token' },
        }),
      );
      expect(result.message).toBe('All tokens revoked');
    });

    it('should handle token revocation without CSRF token', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const mockResponse = { message: 'All tokens revoked' };
      mockApi.post.mockResolvedValueOnce({ data: mockResponse } as any);

      const result = await sessionApi.revokeAllTokens();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/auth/revoke-all-tokens',
        null,
        expect.objectContaining({
          headers: {},
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle revocation errors', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=test-csrf-token',
      });

      mockApi.post.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(sessionApi.revokeAllTokens()).rejects.toThrow('Unauthorized');
    });

    it('should decode URL-encoded CSRF token', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=abc%2Bdef%2F123',
      });

      const mockResponse = { message: 'All tokens revoked' };
      mockApi.post.mockResolvedValueOnce({ data: mockResponse } as any);

      await sessionApi.revokeAllTokens();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/auth/revoke-all-tokens',
        null,
        expect.objectContaining({
          headers: { 'X-CSRFToken': 'abc+def/123' },
        }),
      );
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle complete session lifecycle', async () => {
      // 1. Get session status
      const mockStatus: SessionStatus = {
        sessionId: 'session-123',
        expiresAt: '2025-12-18T23:30:00Z',
        lastActivity: '2025-12-18T23:00:00Z',
        timeRemaining: 1800000,
        canExtend: true,
        maxExtensions: 5,
        extensionsUsed: 0,
      };

      mockApi.get.mockResolvedValueOnce({ data: mockStatus } as any);

      const status = await sessionApi.getSessionStatus();
      expect(status.canExtend).toBe(true);

      // 2. Update activity
      mockApi.post.mockResolvedValueOnce({ data: {} } as any);
      await sessionApi.updateActivity();

      // 3. Extend session
      const mockExtension: SessionExtensionResponse = {
        success: true,
        newExpiresAt: '2025-12-19T00:00:00Z',
        timeRemaining: 3600000,
        extensionsRemaining: 4,
      };

      mockApi.post.mockResolvedValueOnce({ data: mockExtension } as any);

      const extension = await sessionApi.extendSession();
      expect(extension.success).toBe(true);

      // Verify all calls
      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledTimes(2);
    });

    it('should handle multi-device logout scenario', async () => {
      // 1. Get all sessions
      const mockSessions: SessionInfo[] = [
        {
          id: 'session-1',
          device: 'Chrome on Windows',
          location: 'New York, US',
          lastActivity: '2025-12-18T23:00:00Z',
          isCurrent: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2025-12-18T20:00:00Z',
          expiresAt: '2025-12-19T00:00:00Z',
        },
        {
          id: 'session-2',
          device: 'Safari on iPhone',
          location: 'Los Angeles, US',
          lastActivity: '2025-12-18T22:30:00Z',
          isCurrent: false,
          ipAddress: '192.168.1.101',
          userAgent: 'Safari/605.1.15...',
          createdAt: '2025-12-18T19:00:00Z',
          expiresAt: '2025-12-18T23:30:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockSessions } as any);

      const sessions = await sessionApi.getUserSessions();
      expect(sessions).toHaveLength(2);

      // 2. Terminate specific session
      mockApi.delete.mockResolvedValueOnce({
        data: { success: true, message: 'Session terminated' },
      } as any);

      await sessionApi.terminateSession('session-2');

      // 3. Verify remaining sessions
      mockApi.get.mockResolvedValueOnce({
        data: [sessions[0]], // Only current session remains
      } as any);

      const remainingSessions = await sessionApi.getUserSessions();
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].isCurrent).toBe(true);
    });

    it('should handle emergency security scenario', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=emergency-token',
      });

      // 1. Logout from all devices except current
      mockApi.delete.mockResolvedValueOnce({
        data: { message: 'Logged out from 3 devices' },
      } as any);

      await sessionApi.logoutAllDevices(true);

      // 2. Revoke all tokens (nuclear option)
      mockApi.post.mockResolvedValueOnce({
        data: { message: 'All tokens revoked' },
      } as any);

      await sessionApi.revokeAllTokens();

      // Verify security actions taken
      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/v1/auth/sessions',
        expect.objectContaining({
          headers: { 'X-CSRFToken': 'emergency-token' },
        }),
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/auth/revoke-all-tokens',
        null,
        expect.objectContaining({
          headers: { 'X-CSRFToken': 'emergency-token' },
        }),
      );
    });
  });
});
