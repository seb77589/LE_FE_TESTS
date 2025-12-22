/**
 * Unit Tests for Route Permission Utilities
 */

import {
  ROUTE_PERMISSIONS,
  canAccessRoute,
  getRoutePermissions,
  isRouteRestricted,
  getRoutesForPermission,
  type Permission,
} from '@/lib/auth/routePermissions';

describe('Route Permission Utilities', () => {
  describe('canAccessRoute', () => {
    it('should return true if user has required permission for exact route', () => {
      const userPermissions: Permission[] = ['users:admin'];
      const result = canAccessRoute('/admin/users', userPermissions);

      expect(result).toBe(true);
    });

    it('should return false if user lacks required permission', () => {
      const userPermissions: Permission[] = ['users:read'];
      const result = canAccessRoute('/admin/users', userPermissions);

      expect(result).toBe(false);
    });

    it('should check parent route if exact match not found', () => {
      const userPermissions: Permission[] = ['users:admin'];
      const result = canAccessRoute('/admin/users/123', userPermissions);

      expect(result).toBe(true);
    });

    it('should return true if user has any of multiple required permissions', () => {
      const userPermissions: Permission[] = ['system:admin'];
      const result = canAccessRoute('/admin', userPermissions);

      expect(result).toBe(true);
    });

    it('should normalize route by removing trailing slash', () => {
      const userPermissions: Permission[] = ['users:admin'];
      const result1 = canAccessRoute('/admin/users', userPermissions);
      const result2 = canAccessRoute('/admin/users/', userPermissions);

      expect(result1).toBe(result2);
    });

    it('should normalize route by removing query parameters', () => {
      const userPermissions: Permission[] = ['users:admin'];
      const result1 = canAccessRoute('/admin/users', userPermissions);
      const result2 = canAccessRoute('/admin/users?id=123', userPermissions);

      expect(result1).toBe(result2);
    });

    it('should normalize route by removing hash', () => {
      const userPermissions: Permission[] = ['users:admin'];
      const result1 = canAccessRoute('/admin/users', userPermissions);
      const result2 = canAccessRoute('/admin/users#section', userPermissions);

      expect(result1).toBe(result2);
    });

    it('should return true for routes without permission requirements', () => {
      const userPermissions: Permission[] = [];
      const result = canAccessRoute('/public/page', userPermissions);

      expect(result).toBe(true);
    });

    it('should handle empty permissions array', () => {
      const result = canAccessRoute('/admin/users', []);

      expect(result).toBe(false);
    });
  });

  describe('getRoutePermissions', () => {
    it('should return permissions for exact route match', () => {
      const permissions = getRoutePermissions('/admin/users');

      expect(permissions).toContain('users:admin');
    });

    it('should return permissions for parent route if exact match not found', () => {
      const permissions = getRoutePermissions('/admin/users/123');

      expect(permissions).toContain('users:admin');
    });

    it('should return empty array for route without restrictions', () => {
      const permissions = getRoutePermissions('/public/page');

      expect(permissions).toEqual([]);
    });

    it('should normalize route before checking', () => {
      const permissions1 = getRoutePermissions('/admin/users');
      const permissions2 = getRoutePermissions('/admin/users/');
      const permissions3 = getRoutePermissions('/admin/users?id=123');

      expect(permissions1).toEqual(permissions2);
      expect(permissions1).toEqual(permissions3);
    });

    it('should return multiple permissions for routes with multiple requirements', () => {
      const permissions = getRoutePermissions('/admin');

      expect(permissions.length).toBeGreaterThan(1);
      expect(permissions).toContain('users:admin');
      expect(permissions).toContain('system:admin');
    });
  });

  describe('isRouteRestricted', () => {
    it('should return true for restricted routes', () => {
      const result = isRouteRestricted('/admin/users');

      expect(result).toBe(true);
    });

    it('should return false for unrestricted routes', () => {
      const result = isRouteRestricted('/public/page');

      expect(result).toBe(false);
    });

    it('should check parent routes for nested paths', () => {
      const result = isRouteRestricted('/admin/users/123');

      expect(result).toBe(true);
    });
  });

  describe('getRoutesForPermission', () => {
    it('should return all routes requiring a specific permission', () => {
      const routes = getRoutesForPermission('users:admin');

      expect(routes).toContain('/admin');
      expect(routes).toContain('/admin/users');
    });

    it('should return empty array for permission not in any route', () => {
      const routes = getRoutesForPermission('nonexistent:permission' as Permission);

      expect(routes).toEqual([]);
    });

    it('should return routes for system:admin permission', () => {
      const routes = getRoutesForPermission('system:admin');

      expect(routes.length).toBeGreaterThan(0);
      expect(routes).toContain('/admin');
    });

    it('should return routes for documents:read permission', () => {
      const routes = getRoutesForPermission('documents:read');

      expect(routes.length).toBeGreaterThan(0);
      expect(routes).toContain('/documents');
    });
  });

  describe('ROUTE_PERMISSIONS constant', () => {
    it('should have permissions defined for admin routes', () => {
      expect(ROUTE_PERMISSIONS['/admin']).toBeDefined();
      expect(ROUTE_PERMISSIONS['/admin/users']).toBeDefined();
      expect(ROUTE_PERMISSIONS['/admin/system']).toBeDefined();
    });

    it('should have permissions defined for document routes', () => {
      expect(ROUTE_PERMISSIONS['/documents']).toBeDefined();
      expect(ROUTE_PERMISSIONS['/documents/new']).toBeDefined();
    });

    it('should have permissions defined for case routes', () => {
      expect(ROUTE_PERMISSIONS['/cases']).toBeDefined();
      expect(ROUTE_PERMISSIONS['/cases/new']).toBeDefined();
    });
  });
});
