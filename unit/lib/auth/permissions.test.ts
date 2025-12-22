/**
 * Unit Tests for Permission Utilities
 */

import { renderHook } from '@testing-library/react';
import {
  useHasAnyPermission,
  useHasAllPermissions,
  useCanManageUser,
  useCanDeleteResource,
  getPermissionsForRole,
  type Permission,
} from '@/lib/auth/permissions';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';

// Mock ConsolidatedAuthContext
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Permission Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useHasAnyPermission', () => {
    it('should return true if user has any of the specified permissions', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm: Permission) => perm === 'users:read'),
      } as any);

      const { result } = renderHook(() =>
        useHasAnyPermission(['users:read', 'users:write']),
      );

      expect(result.current).toBe(true);
    });

    it('should return false if user has none of the specified permissions', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() =>
        useHasAnyPermission(['users:read', 'users:write']),
      );

      expect(result.current).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
      } as any);

      const { result } = renderHook(() => useHasAnyPermission([]));

      expect(result.current).toBe(false);
    });
  });

  describe('useHasAllPermissions', () => {
    it('should return true if user has all specified permissions', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm: Permission) =>
          ['users:read', 'users:write'].includes(perm),
        ),
      } as any);

      const { result } = renderHook(() =>
        useHasAllPermissions(['users:read', 'users:write']),
      );

      expect(result.current).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm: Permission) => perm === 'users:read'),
      } as any);

      const { result } = renderHook(() =>
        useHasAllPermissions(['users:read', 'users:write']),
      );

      expect(result.current).toBe(false);
    });

    it('should return true for empty permissions array', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() => useHasAllPermissions([]));

      expect(result.current).toBe(true);
    });
  });

  describe('useCanManageUser', () => {
    it('should return true if user can manage themselves', () => {
      const currentUser = {
        id: 1,
        email: 'user@example.com',
        role: 'assistant',
        is_active: true,
      };

      mockUseAuth.mockReturnValue({
        user: currentUser,
        isSuperAdmin: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() => useCanManageUser(currentUser));

      expect(result.current).toBe(true);
    });

    it('should return true if superadmin can manage any user', () => {
      const currentUser = {
        id: 1,
        email: 'superadmin@example.com',
        role: 'superadmin',
        is_active: true,
      };

      const targetUser = {
        id: 2,
        email: 'target@example.com',
        role: 'assistant',
        is_active: true,
      };

      mockUseAuth.mockReturnValue({
        user: currentUser,
        isSuperAdmin: jest.fn(() => true),
      } as any);

      const { result } = renderHook(() => useCanManageUser(targetUser));

      expect(result.current).toBe(true);
    });

    it('should return true if admin can manage regular users', () => {
      const currentUser = {
        id: 1,
        email: 'admin@example.com',
        role: 'manager',
        is_active: true,
      };

      const targetUser = {
        id: 2,
        email: 'user@example.com',
        role: 'assistant',
        is_active: true,
      };

      mockUseAuth.mockReturnValue({
        user: currentUser,
        isSuperAdmin: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() => useCanManageUser(targetUser));

      expect(result.current).toBe(true);
    });

    it('should return false if admin tries to manage another admin', () => {
      const currentUser = {
        id: 1,
        email: 'admin1@example.com',
        role: 'manager',
        is_active: true,
      };

      const targetUser = {
        id: 2,
        email: 'admin2@example.com',
        role: 'manager',
        is_active: true,
      };

      mockUseAuth.mockReturnValue({
        user: currentUser,
        isSuperAdmin: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() => useCanManageUser(targetUser));

      expect(result.current).toBe(false);
    });

    it('should return false if user is not active', () => {
      const currentUser = {
        id: 1,
        email: 'user@example.com',
        role: 'assistant',
        is_active: false,
      };

      mockUseAuth.mockReturnValue({
        user: currentUser,
        isSuperAdmin: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() => useCanManageUser(null));

      expect(result.current).toBe(false);
    });

    it('should return false if no user is logged in', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isSuperAdmin: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() =>
        useCanManageUser({
          id: 2,
          email: 'target@example.com',
          role: 'assistant',
          is_active: true,
        }),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('useCanDeleteResource', () => {
    it('should return true if user has delete permission for resource type', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm: Permission) => perm === 'documents:delete'),
      } as any);

      const { result } = renderHook(() => useCanDeleteResource('document'));

      expect(result.current).toBe(true);
    });

    it('should return false if user lacks delete permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const { result } = renderHook(() => useCanDeleteResource('document'));

      expect(result.current).toBe(false);
    });

    it('should check correct permission for assistants resource', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm: Permission) => perm === 'assistants:delete'),
      } as any);

      const { result } = renderHook(() => useCanDeleteResource('assistant'));

      expect(mockUseAuth().hasPermission).toHaveBeenCalledWith('assistants:delete');
      expect(result.current).toBe(true);
    });

    it('should check correct permission for cases resource', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm: Permission) => perm === 'cases:delete'),
      } as any);

      const { result } = renderHook(() => useCanDeleteResource('case'));

      expect(mockUseAuth().hasPermission).toHaveBeenCalledWith('cases:delete');
      expect(result.current).toBe(true);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return all permissions for superadmin role', () => {
      const permissions = getPermissionsForRole('superadmin');

      expect(permissions).toContain('users:read');
      expect(permissions).toContain('users:write');
      expect(permissions).toContain('users:delete');
      expect(permissions).toContain('users:admin');
      expect(permissions).toContain('system:admin');
      expect(permissions.length).toBeGreaterThan(10);
    });

    it('should return manager permissions', () => {
      const permissions = getPermissionsForRole('manager');

      expect(permissions).toContain('users:read');
      expect(permissions).toContain('users:write');
      expect(permissions).toContain('users:admin');
      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:write');
      expect(permissions).not.toContain('system:admin');
    });

    it('should return assistant permissions', () => {
      const permissions = getPermissionsForRole('assistant');

      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:write');
      expect(permissions).toContain('cases:read');
      expect(permissions).toContain('cases:write');
      expect(permissions).not.toContain('users:admin');
    });

    it('should handle case-insensitive role names', () => {
      const upperCase = getPermissionsForRole('SUPERADMIN');
      const lowerCase = getPermissionsForRole('superadmin');
      const mixedCase = getPermissionsForRole('SuperAdmin');

      expect(upperCase).toEqual(lowerCase);
      expect(mixedCase).toEqual(lowerCase);
    });

    it('should return empty array for unknown role', () => {
      const permissions = getPermissionsForRole('unknown');

      expect(permissions).toEqual([]);
    });

    it('should return empty array for undefined role', () => {
      const permissions = getPermissionsForRole(undefined);

      expect(permissions).toEqual([]);
    });
  });
});
