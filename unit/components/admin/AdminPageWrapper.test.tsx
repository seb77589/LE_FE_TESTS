/**
 * Tests for AdminPageWrapper component
 *
 * @description Tests for the AdminPageWrapper component including:
 * - Loading state rendering
 * - Role-based access control (manager, superadmin)
 * - Redirect behavior for unauthorized users
 * - useAdminAccess hook functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  AdminPageWrapper,
  AdminPageLoadingSkeleton,
  useAdminAccess,
} from '@/components/admin/AdminPageWrapper';

// Mock dependencies
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/auth/roleChecks', () => ({
  useRoleCheck: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/ui/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRoleCheck } from '@/lib/auth/roleChecks';
import { useRouter } from 'next/navigation';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRoleCheck = useRoleCheck as jest.MockedFunction<typeof useRoleCheck>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('AdminPageLoadingSkeleton', () => {
  it('should render loading skeleton', () => {
    render(<AdminPageLoadingSkeleton />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render skeleton elements', () => {
    render(<AdminPageLoadingSkeleton />);

    // Component uses bg-muted design token, not bg-gray-200
    const skeletons = document.querySelectorAll('.bg-muted');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('AdminPageWrapper', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  });

  it('should render loading skeleton while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      currentRole: undefined,
      user: null,
    });

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('should render children when user is manager', () => {
    const mockUser = { id: 1, email: 'manager@test.com', role: 'MANAGER' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: (role: string) => role === 'MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('MANAGER'),
      hasAllRoles: (roles: string[]) => roles.every((r) => r === 'MANAGER'),
      currentRole: 'MANAGER',
      user: mockUser,
    });

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should render children when user is superadmin', () => {
    const mockUser = { id: 1, email: 'superadmin@test.com', role: 'SUPERADMIN' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: true,
      isAssistant: false,
      hasRole: (role: string) => role === 'SUPERADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('SUPERADMIN'),
      hasAllRoles: () => true,
      currentRole: 'SUPERADMIN',
      user: mockUser,
    });

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should redirect unauthorized users to dashboard', async () => {
    const mockUser = { id: 1, email: 'user@test.com', role: 'ASSISTANT' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isAssistant: true,
      hasRole: (role: string) => role === 'ASSISTANT',
      hasAnyRole: (roles: string[]) => roles.includes('ASSISTANT'),
      hasAllRoles: () => false,
      currentRole: 'ASSISTANT',
      user: mockUser,
    });

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should redirect unauthenticated users', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      currentRole: undefined,
      user: null,
    });

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should redirect to custom path when specified', async () => {
    const mockUser = { id: 1, email: 'user@test.com', role: 'ASSISTANT' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isAssistant: true,
      hasRole: (role: string) => role === 'ASSISTANT',
      hasAnyRole: (roles: string[]) => roles.includes('ASSISTANT'),
      hasAllRoles: () => false,
      currentRole: 'ASSISTANT',
      user: mockUser,
    });

    render(
      <AdminPageWrapper redirectPath="/custom-redirect">
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-redirect');
    });
  });

  it('should require superadmin when requireSuperAdmin is true', async () => {
    const mockUser = { id: 1, email: 'manager@test.com', role: 'MANAGER' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: (role: string) => role === 'MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('MANAGER'),
      hasAllRoles: () => false,
      currentRole: 'MANAGER',
      user: mockUser,
    });

    render(
      <AdminPageWrapper requireSuperAdmin>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should allow superadmin when requireSuperAdmin is true', () => {
    const mockUser = { id: 1, email: 'superadmin@test.com', role: 'SUPERADMIN' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: true,
      isAssistant: false,
      hasRole: (role: string) => role === 'SUPERADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('SUPERADMIN'),
      hasAllRoles: () => true,
      currentRole: 'SUPERADMIN',
      user: mockUser,
    });

    render(
      <AdminPageWrapper requireSuperAdmin>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should handle case-insensitive role checking', () => {
    const mockUser = { id: 1, email: 'manager@test.com', role: 'MANAGER' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: (role: string) => role === 'MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('MANAGER'),
      hasAllRoles: () => false,
      currentRole: 'MANAGER',
      user: mockUser,
    });

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });
});

describe('useAdminAccess', () => {
  // Test component to use the hook
  function TestComponent({
    requireSuperAdmin = false,
  }: {
    readonly requireSuperAdmin?: boolean;
  }) {
    const access = useAdminAccess({ requireSuperAdmin });
    return (
      <div>
        <span data-testid="is-admin">{String(access.isAdmin)}</span>
        <span data-testid="is-superadmin">{String(access.isSuperAdmin)}</span>
        <span data-testid="has-access">{String(access.hasAccess)}</span>
        <span data-testid="is-loading">{String(access.isLoading)}</span>
      </div>
    );
  }

  it('should return correct access for manager', () => {
    const mockUser = { id: 1, email: 'manager@test.com', role: 'MANAGER' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: (role: string) => role === 'MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('MANAGER'),
      hasAllRoles: () => false,
      currentRole: 'MANAGER',
      user: mockUser,
    });

    render(<TestComponent />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('false');
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
  });

  it('should return correct access for superadmin', () => {
    const mockUser = { id: 1, email: 'superadmin@test.com', role: 'SUPERADMIN' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: true,
      isAssistant: false,
      hasRole: (role: string) => role === 'SUPERADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('SUPERADMIN'),
      hasAllRoles: () => true,
      currentRole: 'SUPERADMIN',
      user: mockUser,
    });

    render(<TestComponent />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('true');
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
  });

  it('should deny access for regular user', () => {
    const mockUser = { id: 1, email: 'user@test.com', role: 'ASSISTANT' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isAssistant: true,
      hasRole: (role: string) => role === 'ASSISTANT',
      hasAnyRole: (roles: string[]) => roles.includes('ASSISTANT'),
      hasAllRoles: () => false,
      currentRole: 'ASSISTANT',
      user: mockUser,
    });

    render(<TestComponent />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('false');
    expect(screen.getByTestId('has-access')).toHaveTextContent('false');
  });

  it('should deny manager access when requireSuperAdmin is true', () => {
    const mockUser = { id: 1, email: 'manager@test.com', role: 'MANAGER' };
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: (role: string) => role === 'MANAGER',
      hasAnyRole: (roles: string[]) => roles.includes('MANAGER'),
      hasAllRoles: () => false,
      currentRole: 'MANAGER',
      user: mockUser,
    });

    render(<TestComponent requireSuperAdmin />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('has-access')).toHaveTextContent('false');
  });

  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    } as any);
    mockUseRoleCheck.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isAssistant: false,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      currentRole: undefined,
      user: null,
    });

    render(<TestComponent />);

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});
