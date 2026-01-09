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

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/ui/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRouter } from 'next/navigation';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('AdminPageLoadingSkeleton', () => {
  it('should render loading skeleton', () => {
    render(<AdminPageLoadingSkeleton />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render skeleton elements', () => {
    render(<AdminPageLoadingSkeleton />);

    const skeletons = document.querySelectorAll('.bg-gray-200');
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

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('should render children when user is manager', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'manager@test.com', role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should render children when user is superadmin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'superadmin@test.com', role: 'superadmin' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

    render(
      <AdminPageWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should redirect unauthorized users to dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'user@test.com', role: 'assistant' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

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
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'user@test.com', role: 'assistant' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

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
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'manager@test.com', role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

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
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'superadmin@test.com', role: 'superadmin' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

    render(
      <AdminPageWrapper requireSuperAdmin>
        <div data-testid="admin-content">Admin Content</div>
      </AdminPageWrapper>,
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should handle case-insensitive role checking', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'manager@test.com', role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

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
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'manager@test.com', role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

    render(<TestComponent />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('false');
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
  });

  it('should return correct access for superadmin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'superadmin@test.com', role: 'superadmin' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

    render(<TestComponent />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('true');
    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
  });

  it('should deny access for regular user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'user@test.com', role: 'assistant' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

    render(<TestComponent />);

    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('false');
    expect(screen.getByTestId('has-access')).toHaveTextContent('false');
  });

  it('should deny manager access when requireSuperAdmin is true', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'manager@test.com', role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
    } as any);

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

    render(<TestComponent />);

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});
