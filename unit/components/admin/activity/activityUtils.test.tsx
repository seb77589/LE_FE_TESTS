/**
 * Activity feed UI was removed as part of the admin UI simplification.
 *
 * This file previously imported removed modules and crashed Jest at import-time.
 */

describe.skip('activityUtils (removed)', () => {
  it('is no longer part of the admin UI', () => {
    expect(true).toBe(true);
  });
});

export {};

const _legacy = String.raw`
/**
 * Tests for activityUtils utility functions
 *
 * @description Tests for Activity Feed utility functions including:
 * - getSeverityColor - severity level to CSS class mapping
 * - getActionIcon - action type to icon mapping
 * - formatTimestamp - timestamp formatting
 * - filterActivities - activity filtering logic
 * - exportActivities - JSON/CSV export functionality
 */

import React from 'react';
import {
  getSeverityColor,
  getActionIcon,
  formatTimestamp,
  filterActivities,
  exportActivities,
} from '@/components/admin/activity/activityUtils';
import { ActivityEvent } from '@/components/admin/activity/types';
import {
  FRONTEND_TEST_CREDENTIALS,
  FRONTEND_TEST_DATA,
} from '@tests/jest-test-credentials';

// Mock formatRelativeTime
jest.mock('@/lib/utils', () => ({
  formatRelativeTime: jest.fn((timestamp: string) => 'formatted-' + timestamp),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  User: () => <span data-testid="user-icon">User</span>,
  FileText: () => <span data-testid="file-icon">FileText</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
}));

describe('getSeverityColor', () => {
  it('should return red classes for critical severity', () => {
    expect(getSeverityColor('critical')).toBe('bg-red-500 text-white');
  });

  it('should return orange classes for high severity', () => {
    expect(getSeverityColor('high')).toBe('bg-orange-500 text-white');
  });

  it('should return yellow classes for medium severity', () => {
    expect(getSeverityColor('medium')).toBe('bg-yellow-500 text-black');
  });

  it('should return green classes for low severity', () => {
    expect(getSeverityColor('low')).toBe('bg-green-500 text-white');
  });

  it('should return gray classes for unknown severity', () => {
    expect(getSeverityColor('unknown')).toBe('bg-gray-500 text-white');
  });

  it('should handle case-insensitive severity', () => {
    expect(getSeverityColor('CRITICAL')).toBe('bg-red-500 text-white');
    expect(getSeverityColor('High')).toBe('bg-orange-500 text-white');
    expect(getSeverityColor('MEDIUM')).toBe('bg-yellow-500 text-black');
    expect(getSeverityColor('Low')).toBe('bg-green-500 text-white');
  });

  it('should handle null/undefined severity', () => {
    expect(getSeverityColor('')).toBe('bg-gray-500 text-white');
    expect(getSeverityColor(undefined as unknown as string)).toBe(
      'bg-gray-500 text-white',
    );
  });
});

*/

describe('getActionIcon', () => {
  it('should return User icon for assistant actions', () => {
    const icon = getActionIcon('assistant_created');
    expect(icon).toBeDefined();
  });

  it('should return FileText icon for document actions', () => {
    const icon = getActionIcon('document_uploaded');
    expect(icon).toBeDefined();
  });

  it('should return Shield icon for manager actions', () => {
    const icon = getActionIcon('manager_action');
    expect(icon).toBeDefined();
  });

  it('should return Shield icon for system actions', () => {
    const icon = getActionIcon('system_update');
    expect(icon).toBeDefined();
  });

  it('should return Activity icon for generic actions', () => {
    const icon = getActionIcon('user_login');
    expect(icon).toBeDefined();
  });

  it('should return Activity icon for unknown actions', () => {
    const icon = getActionIcon('random_action');
    expect(icon).toBeDefined();
  });
});

describe('formatTimestamp', () => {
  it('should call formatRelativeTime with the timestamp', () => {
    const result = formatTimestamp('2024-01-01T12:00:00Z');
    expect(result).toBe('formatted-2024-01-01T12:00:00Z');
  });
});

describe('filterActivities', () => {
  const mockActivities: ActivityEvent[] = [
    {
      id: 1,
      action: 'user_login',
      user_email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
      user_id: 1,
      user_role: 'superadmin',
      status: 'success',
      timestamp: '2024-01-01T12:00:00Z',
      severity: 'low',
      details: 'Login successful',
      ip_address: '192.168.1.1',
    },
    {
      id: 2,
      action: 'document_upload',
      user_email: FRONTEND_TEST_CREDENTIALS.USER.email,
      user_id: 2,
      user_role: 'assistant',
      status: 'success',
      timestamp: '2024-01-01T12:30:00Z',
      severity: 'medium',
      details: 'Document uploaded',
      ip_address: '192.168.1.2',
    },
    {
      id: 3,
      action: 'failed_login',
      user_email: FRONTEND_TEST_DATA.EMAIL.INVALID,
      user_id: 3,
      user_role: 'unknown',
      status: 'failed',
      timestamp: '2024-01-01T13:00:00Z',
      severity: 'high',
      details: 'Invalid credentials',
      ip_address: '10.0.0.1',
    },
  ];

  it('should return all activities when no filters applied', () => {
    const result = filterActivities(mockActivities, {});
    expect(result).toHaveLength(3);
  });

  it('should filter by search term in action', () => {
    const result = filterActivities(mockActivities, { search: 'login' });
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('user_login');
    expect(result[1].action).toBe('failed_login');
  });

  it('should filter by search term in user_email', () => {
    const result = filterActivities(mockActivities, { search: 'admin' });
    expect(result).toHaveLength(1);
    expect(result[0].user_email).toBe(FRONTEND_TEST_CREDENTIALS.ADMIN.email);
  });

  it('should filter by search term in user_role', () => {
    const result = filterActivities(mockActivities, { search: 'superadmin' });
    expect(result).toHaveLength(1);
    expect(result[0].user_role).toBe('superadmin');
  });

  it('should filter by search term in details', () => {
    const result = filterActivities(mockActivities, { search: 'credentials' });
    expect(result).toHaveLength(1);
    expect(result[0].details).toBe('Invalid credentials');
  });

  it('should filter by search term in ip_address', () => {
    const result = filterActivities(mockActivities, { search: '192.168' });
    expect(result).toHaveLength(2);
  });

  it('should filter by severity', () => {
    const result = filterActivities(mockActivities, { severity: 'high' });
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('high');
  });

  it('should filter by activity_type (action)', () => {
    const result = filterActivities(mockActivities, {
      activity_type: 'document_upload',
    });
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('document_upload');
  });

  it('should combine multiple filters', () => {
    const result = filterActivities(mockActivities, {
      search: 'admin',
      severity: 'low',
    });
    expect(result).toHaveLength(1);
    expect(result[0].user_email).toBe(FRONTEND_TEST_CREDENTIALS.ADMIN.email);
  });

  it('should return empty array when no matches', () => {
    const result = filterActivities(mockActivities, { search: 'nonexistent' });
    expect(result).toHaveLength(0);
  });

  it('should be case-insensitive for search', () => {
    const result = filterActivities(mockActivities, { search: 'ADMIN' });
    expect(result).toHaveLength(1);
    expect(result[0].user_email).toBe(FRONTEND_TEST_CREDENTIALS.ADMIN.email);
  });
});

describe('exportActivities', () => {
  const mockActivities: ActivityEvent[] = [
    {
      id: 1,
      action: 'user_login',
      user_email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
      user_id: 1,
      status: 'success',
      timestamp: '2024-01-01T12:00:00Z',
      ip_address: '192.168.1.1',
    },
  ];

  // Store original methods
  const originalCreateObjectURL = globalThis.URL.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

  beforeEach(() => {
    // Mock URL methods
    globalThis.URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
    globalThis.URL.revokeObjectURL = jest.fn();

    // Mock createElement to return a mock anchor
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn(),
    };
    jest
      .spyOn(globalThis.document, 'createElement')
      .mockReturnValue(mockAnchor as unknown as HTMLElement);
    jest
      .spyOn(globalThis.document.body, 'appendChild')
      .mockImplementation((node) => node);
  });

  afterEach(() => {
    // Restore original methods
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('should export activities as JSON', () => {
    expect(() => exportActivities(mockActivities, 'json')).not.toThrow();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('should export activities as CSV', () => {
    expect(() => exportActivities(mockActivities, 'csv')).not.toThrow();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should default to JSON format', () => {
    expect(() => exportActivities(mockActivities)).not.toThrow();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should create blob with correct MIME type for JSON', () => {
    exportActivities(mockActivities, 'json');

    const createObjectURLCalls = (globalThis.URL.createObjectURL as jest.Mock).mock
      .calls;
    const blob = createObjectURLCalls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
  });

  it('should create blob with correct MIME type for CSV', () => {
    exportActivities(mockActivities, 'csv');

    const createObjectURLCalls = (globalThis.URL.createObjectURL as jest.Mock).mock
      .calls;
    const blob = createObjectURLCalls[0][0] as Blob;
    expect(blob.type).toBe('text/csv');
  });

  it('should throw error when export fails', () => {
    // Mock createObjectURL to throw
    globalThis.URL.createObjectURL = jest.fn().mockImplementation(() => {
      throw new Error('Blob creation failed');
    });

    expect(() => exportActivities(mockActivities, 'json')).toThrow(
      'Failed to export activities',
    );
  });
});

`;
void _legacy;
