/**
 * Audit Logger Tests
 *
 * Comprehensive test suite for admin action audit logging.
 *
 * Test Coverage:
 * - Core audit logging (logAdminAction)
 * - User management actions
 * - Bulk operations
 * - Data export logging
 * - System actions
 * - Unauthorized access tracking
 * - Admin login/logout
 * - Change formatting
 * - Sensitive data sanitization
 * - Batch logging (size and time-based flushing)
 * - Function wrapper decorator (withAuditLog)
 * - Error handling and fallback logging
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
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

// Now import after mocks
import {
  type AuditAction,
  type AuditSeverity,
  type AuditLogEntry,
  logAdminAction,
  logUserAction,
  logBulkOperation,
  logDataExport,
  logSystemAction,
  logUnauthorizedAccess,
  logAdminLogin,
  logAdminLogout,
  formatChanges,
  sanitizeForAudit,
  withAuditLog,
  auditBatcher,
} from '@/lib/security/auditLogger';
import logger from '@/lib/logging';
import api from '@/lib/api';

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockApi = api as jest.Mocked<typeof api>;

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset API mock to resolve by default
    mockApi.post.mockResolvedValue({ data: {} });
  });

  // Test users
  const adminUser = {
    id: 1,
    email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
    role: 'manager',
  };

  const targetUser = {
    id: 2,
    email: FRONTEND_TEST_CREDENTIALS.USER.email,
  };

  describe('logAdminAction()', () => {
    it('should log admin action with correct severity', async () => {
      await logAdminAction({
        action: 'user.create',
        user_id: adminUser.id,
        user_email: adminUser.email,
        user_role: adminUser.role,
        success: true,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'audit',
        'Admin action: user.create',
        expect.objectContaining({
          auditEntry: expect.objectContaining({
            action: 'user.create',
            severity: 'medium',
            user_id: adminUser.id,
            user_email: adminUser.email,
            user_role: adminUser.role,
            success: true,
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should send audit log to backend API', async () => {
      await logAdminAction({
        action: 'user.delete',
        user_id: adminUser.id,
        success: true,
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.delete',
          severity: 'high',
          user_id: adminUser.id,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle API failure with fallback logging', async () => {
      const apiError = new Error('Network error');
      mockApi.post.mockRejectedValueOnce(apiError);

      await logAdminAction({
        action: 'user.update',
        user_id: adminUser.id,
        success: true,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'audit',
        'Failed to send audit log to backend',
        expect.objectContaining({
          error: apiError,
          audit_entry: expect.any(Object),
        }),
      );
    });

    it('should assign correct severity for critical actions', async () => {
      await logAdminAction({
        action: 'system.config_change',
        user_id: adminUser.id,
        success: true,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'audit',
        expect.any(String),
        expect.objectContaining({
          auditEntry: expect.objectContaining({
            severity: 'critical',
          }),
        }),
      );
    });

    it('should assign correct severity for bulk delete', async () => {
      await logAdminAction({
        action: 'user.bulk_delete',
        user_id: adminUser.id,
        success: true,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'audit',
        expect.any(String),
        expect.objectContaining({
          auditEntry: expect.objectContaining({
            severity: 'critical',
          }),
        }),
      );
    });

    it('should include error message for failed actions', async () => {
      const errorMsg = 'Permission denied';

      await logAdminAction({
        action: 'user.delete',
        user_id: adminUser.id,
        success: false,
        error_message: errorMsg,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'audit',
        expect.any(String),
        expect.objectContaining({
          auditEntry: expect.objectContaining({
            success: false,
            error_message: errorMsg,
          }),
        }),
      );
    });
  });

  describe('logUserAction()', () => {
    it('should log user creation', async () => {
      await logUserAction('user.create', adminUser, targetUser, undefined, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.create',
          user_id: adminUser.id,
          user_email: adminUser.email,
          user_role: adminUser.role,
          target_user_id: targetUser.id,
          target_user_email: targetUser.email,
          resource_type: 'assistant',
          resource_id: targetUser.id,
          success: true,
        }),
      );
    });

    it('should log user update with changes', async () => {
      const changes = {
        role: { old: 'assistant', new: 'manager' },
        is_active: { old: false, new: true },
      };

      await logUserAction('user.update', adminUser, targetUser, changes, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.update',
          changes,
        }),
      );
    });

    it('should log user deletion', async () => {
      await logUserAction('user.delete', adminUser, targetUser, undefined, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.delete',
          severity: 'high',
        }),
      );
    });

    it('should log role change action', async () => {
      const changes = {
        role: { old: 'assistant', new: 'manager' },
      };

      await logUserAction('user.role_change', adminUser, targetUser, changes, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.role_change',
          severity: 'high',
          changes,
        }),
      );
    });

    it('should log failed user action with error message', async () => {
      const errorMsg = 'User not found';

      await logUserAction(
        'user.update',
        adminUser,
        targetUser,
        undefined,
        false,
        errorMsg,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          success: false,
          error_message: errorMsg,
        }),
      );
    });
  });

  describe('logBulkOperation()', () => {
    it('should log bulk update with affected users', async () => {
      const affectedUserIds = [1, 2, 3, 4, 5];

      await logBulkOperation('user.bulk_update', adminUser, 5, affectedUserIds, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.bulk_update',
          severity: 'high',
          metadata: {
            affected_count: 5,
            affected_user_ids: affectedUserIds,
          },
        }),
      );
    });

    it('should log bulk delete with critical severity', async () => {
      const affectedUserIds = [1, 2, 3];

      await logBulkOperation('user.bulk_delete', adminUser, 3, affectedUserIds, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.bulk_delete',
          severity: 'critical',
        }),
      );
    });

    it('should log failed bulk operation', async () => {
      const errorMsg = 'Database error during bulk operation';

      await logBulkOperation('user.bulk_update', adminUser, 0, [], false, errorMsg);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          success: false,
          error_message: errorMsg,
        }),
      );
    });
  });

  describe('logDataExport()', () => {
    it('should log user data export', async () => {
      await logDataExport('assistant', adminUser, 100, 'csv');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.export',
          severity: 'medium',
          metadata: {
            export_type: 'assistant',
            record_count: 100,
            format: 'csv',
          },
        }),
      );
    });

    it('should log activity export', async () => {
      await logDataExport('activity', adminUser, 500, 'json');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'data.export',
          metadata: {
            export_type: 'activity',
            record_count: 500,
            format: 'json',
          },
        }),
      );
    });

    it('should log PDF export', async () => {
      await logDataExport('health', adminUser, 50, 'pdf');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          metadata: expect.objectContaining({
            format: 'pdf',
          }),
        }),
      );
    });
  });

  describe('logSystemAction()', () => {
    it('should log system config change', async () => {
      const metadata = {
        config_key: 'max_upload_size',
        old_value: '10MB',
        new_value: '50MB',
      };

      await logSystemAction('system.config_change', adminUser, metadata, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'system.config_change',
          severity: 'critical',
          metadata,
        }),
      );
    });

    it('should log system restart', async () => {
      await logSystemAction('system.restart', adminUser, undefined, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'system.restart',
          severity: 'critical',
        }),
      );
    });

    it('should log health check', async () => {
      await logSystemAction('health.check', adminUser, undefined, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'health.check',
          severity: 'low',
        }),
      );
    });

    it('should log failed system action', async () => {
      const errorMsg = 'Insufficient permissions';

      await logSystemAction(
        'system.maintenance',
        adminUser,
        undefined,
        false,
        errorMsg,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          success: false,
          error_message: errorMsg,
        }),
      );
    });
  });

  describe('logUnauthorizedAccess()', () => {
    it('should log unauthorized access with user details', async () => {
      await logUnauthorizedAccess('delete_user', adminUser, 'user:123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'auth.unauthorized_access',
          severity: 'critical',
          user_id: adminUser.id,
          user_email: adminUser.email,
          user_role: adminUser.role,
          metadata: expect.objectContaining({
            attempted_action: 'delete_user',
            resource: 'user:123',
          }),
          success: false,
        }),
      );
    });

    it('should log unauthorized access from null user', async () => {
      await logUnauthorizedAccess('view_admin_panel', null, 'manager');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'auth.unauthorized_access',
          user_id: undefined,
          user_email: undefined,
          user_role: undefined,
          metadata: expect.objectContaining({
            attempted_action: 'view_admin_panel',
            resource: 'manager',
          }),
        }),
      );
    });

    it('should include additional metadata', async () => {
      const metadata = {
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0',
      };

      await logUnauthorizedAccess('export_data', adminUser, undefined, metadata);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          metadata: expect.objectContaining({
            attempted_action: 'export_data',
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0',
          }),
        }),
      );
    });
  });

  describe('logAdminLogin()', () => {
    it('should log successful admin login', async () => {
      await logAdminLogin(adminUser, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'auth.login_admin',
          severity: 'medium',
          user_id: adminUser.id,
          user_email: adminUser.email,
          user_role: adminUser.role,
          success: true,
        }),
      );
    });

    it('should log failed admin login', async () => {
      const errorMsg = 'Invalid credentials';

      await logAdminLogin(adminUser, false, errorMsg);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          success: false,
          error_message: errorMsg,
        }),
      );
    });
  });

  describe('logAdminLogout()', () => {
    it('should log admin logout', async () => {
      await logAdminLogout(adminUser);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'auth.logout_admin',
          severity: 'low',
          user_id: adminUser.id,
          user_email: adminUser.email,
          user_role: adminUser.role,
          success: true,
        }),
      );
    });
  });

  describe('formatChanges()', () => {
    it('should detect and format changed fields', () => {
      const oldData = {
        name: 'John Doe',
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
        role: 'assistant',
      };

      const newData = {
        name: 'John Smith',
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
        role: 'manager',
      };

      const changes = formatChanges(oldData, newData);

      expect(changes).toEqual({
        name: { old: 'John Doe', new: 'John Smith' },
        role: { old: 'assistant', new: 'manager' },
      });
    });

    it('should return empty object when no changes', () => {
      const data = {
        name: 'John Doe',
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
      };

      const changes = formatChanges(data, data);

      expect(changes).toEqual({});
    });

    it('should handle boolean changes', () => {
      const oldData = { is_active: false };
      const newData = { is_active: true };

      const changes = formatChanges(oldData, newData);

      expect(changes).toEqual({
        is_active: { old: false, new: true },
      });
    });

    it('should handle null/undefined values', () => {
      const oldData = { phone: null as any };
      const newData = { phone: '555-1234' };

      const changes = formatChanges(oldData, newData);

      expect(changes).toEqual({
        phone: { old: null, new: '555-1234' },
      });
    });
  });

  describe('sanitizeForAudit()', () => {
    it('should redact password fields', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
      };

      const sanitized = sanitizeForAudit(data);

      expect(sanitized).toEqual({
        username: 'john',
        password: '[REDACTED]',
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
      });
    });

    it('should redact token fields', () => {
      const data = {
        user_id: 123,
        access_token: 'eyJhbGc...',
        refresh_token: 'eyJhbGc...',
      };

      const sanitized = sanitizeForAudit(data);

      expect(sanitized).toEqual({
        user_id: 123,
        access_token: '[REDACTED]',
        refresh_token: '[REDACTED]',
      });
    });

    it('should redact secret fields', () => {
      const data = {
        api_key: 'sk_live_123',
        client_secret: 'secret_abc',
        private_key: 'private_xyz',
      };

      const sanitized = sanitizeForAudit(data);

      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.client_secret).toBe('[REDACTED]');
      expect(sanitized.private_key).toBe('[REDACTED]');
    });

    it('should handle case-insensitive field matching', () => {
      const data = {
        Password: 'secret',
        ACCESS_TOKEN: 'token',
      };

      const sanitized = sanitizeForAudit(data);

      expect(sanitized.Password).toBe('[REDACTED]');
      expect(sanitized.ACCESS_TOKEN).toBe('[REDACTED]');
    });

    it('should not modify non-sensitive fields', () => {
      const data = {
        username: 'john',
        email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
        role: 'manager',
      };

      const sanitized = sanitizeForAudit(data);

      expect(sanitized).toEqual(data);
    });
  });

  describe('AuditLogBatcher', () => {
    beforeEach(() => {
      // Clear any existing batch entries
      (auditBatcher as any).batch = [];
      if ((auditBatcher as any).timer) {
        clearTimeout((auditBatcher as any).timer);
        (auditBatcher as any).timer = null;
      }
    });

    it('should add entry to batch', () => {
      const entry: AuditLogEntry = {
        action: 'user.create',
        severity: 'medium',
        user_id: 1,
        success: true,
      };

      auditBatcher.add(entry);

      expect((auditBatcher as any).batch).toHaveLength(1);
      expect((auditBatcher as any).batch[0]).toEqual(entry);
    });

    it('should flush batch when size limit reached', async () => {
      const entries = new Array(10).fill(null).map((_, i) => ({
        action: 'user.create' as AuditAction,
        severity: 'medium' as AuditSeverity,
        user_id: i,
        success: true,
      }));

      // Add 9 entries (below batch size)
      for (let i = 0; i < 9; i++) {
        auditBatcher.add(entries[i]);
      }

      expect((auditBatcher as any).batch).toHaveLength(9);
      expect(mockApi.post).not.toHaveBeenCalledWith('/api/v1/audit-trail/batch');

      // Add 10th entry (triggers flush)
      auditBatcher.add(entries[9]);

      // Wait for async flush
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect((auditBatcher as any).batch).toHaveLength(0);
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/audit-trail/batch', {
        entries: expect.arrayContaining(entries),
      });
    });

    it('should flush on timer expiration', async () => {
      jest.useFakeTimers({ doNotFake: ['performance'] });

      const entry: AuditLogEntry = {
        action: 'user.create',
        severity: 'medium',
        user_id: 1,
        success: true,
      };

      auditBatcher.add(entry);

      expect((auditBatcher as any).batch).toHaveLength(1);
      expect(mockApi.post).not.toHaveBeenCalled();

      // Fast-forward time to trigger flush
      jest.advanceTimersByTime(5000);

      // Wait for async flush
      await Promise.resolve();

      expect((auditBatcher as any).batch).toHaveLength(0);
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/audit-trail/batch', {
        entries: [entry],
      });

      jest.useRealTimers();
    });

    it('should handle flush errors gracefully', async () => {
      const apiError = new Error('Network error');
      mockApi.post.mockRejectedValueOnce(apiError);

      // Add entries to batch
      const entries = new Array(5).fill(null).map((_, i) => ({
        action: 'user.create' as AuditAction,
        severity: 'medium' as AuditSeverity,
        user_id: i,
        success: true,
      }));

      for (const entry of entries) {
        auditBatcher.add(entry);
      }

      // Directly call flush and await it
      await auditBatcher.flush();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'audit',
        'Failed to flush audit log batch',
        expect.objectContaining({
          error: apiError,
          entry_count: 5,
        }),
      );
    });
  });

  describe('withAuditLog()', () => {
    it('should execute function and log success', async () => {
      const mockFn = jest.fn().mockResolvedValue({ id: 123 });
      const getUser = () => adminUser;

      const wrappedFn = withAuditLog(mockFn, 'user.create', getUser);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toEqual({ id: 123 });
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.create',
          user_id: adminUser.id,
          success: true,
        }),
      );
    });

    it('should include metadata from getMetadata function', async () => {
      const mockFn = jest.fn().mockResolvedValue({ id: 123 });
      const getUser = () => adminUser;
      const getMetadata = (arg1: string, arg2: number) => ({
        param1: arg1,
        param2: arg2,
      });

      const wrappedFn = withAuditLog(mockFn, 'user.update', getUser, getMetadata);

      await wrappedFn('test', 456);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          metadata: {
            param1: 'test',
            param2: 456,
          },
        }),
      );
    });

    it('should log error and re-throw on function failure', async () => {
      const error = new Error('Operation failed');
      const mockFn = jest.fn().mockRejectedValue(error);
      const getUser = () => adminUser;

      const wrappedFn = withAuditLog(mockFn, 'user.delete', getUser);

      await expect(wrappedFn()).rejects.toThrow('Operation failed');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          action: 'user.delete',
          success: false,
          error_message: 'Operation failed',
        }),
      );
    });

    it('should handle null user from getUser', async () => {
      const mockFn = jest.fn().mockResolvedValue({ id: 123 });
      const getUser = (): any => null;

      const wrappedFn = withAuditLog(mockFn, 'system.restart', getUser);

      await wrappedFn();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/audit-trail',
        expect.objectContaining({
          user_id: undefined,
          user_email: undefined,
          user_role: undefined,
        }),
      );
    });
  });
});
