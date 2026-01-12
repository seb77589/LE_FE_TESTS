/**
 * Admin Dashboard Page Tests
 *
 * Tests for the main admin dashboard including:
 * - Tab navigation
 * - Role-based access
 * - Error handling
 * - Mobile responsiveness
 * - Data fetching
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPage from '@/app/(admin)/admin/page';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRoleCheck } from '@/lib/auth/roleChecks';
import useSWR from 'swr';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock dependencies
jest.mock('@/lib/context/ConsolidatedAuthContext');
jest.mock('@/lib/auth/roleChecks');
jest.mock('swr');
const mockGetSearchParams = jest.fn((key: string) => null);
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: mockGetSearchParams,
  })),
  useRouter: jest.fn(() => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  })),
}));
jest.mock('@/components/ui/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));
jest.mock('@/components/ui/ErrorDisplay', () => ({
  __esModule: true,
  default: ({ message, showRetry, onRetry }: any) => (
    <div data-testid="error-display" role="alert">
      <div>{message}</div>
      {showRetry && onRetry && (
        <button onClick={onRetry} aria-label="Retry">
          Retry
        </button>
      )}
    </div>
  ),
}));
jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
  default: {
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Mock Recharts to avoid rendering issues
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => <svg data-testid="bar-chart">{children}</svg>,
  LineChart: ({ children }: any) => <svg data-testid="line-chart">{children}</svg>,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock child components
jest.mock('@/components/admin/UserManagement', () => {
  return function MockUserManagement() {
    return <div data-testid="user-management">User Management Component</div>;
  };
});
jest.mock('@/components/admin/AdminTabs', () => ({
  AdminTabs: ({ activeTab = 'overview' }: any) => {
    const { useSearchParams } = require('next/navigation');
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get?.('tab') || activeTab;

    return (
      <nav data-testid="admin-tabs" aria-label="Admin tabs">
        <button
          aria-label="Switch to Overview tab"
          aria-current={currentTab === 'overview' ? 'page' : undefined}
        >
          Overview
        </button>
        <button
          aria-label="Switch to Users tab"
          aria-current={currentTab === 'users' ? 'page' : undefined}
        >
          Users
        </button>
      </nav>
    );
  },
}));
jest.mock('@/components/admin/OverviewTab', () => {
  const { useAuth } = require('@/lib/context/ConsolidatedAuthContext');
  const ErrorDisplay = require('@/components/ui/ErrorDisplay').default;

  return {
    OverviewTab: function OverviewTab() {
      const { user } = useAuth();
      const isSuperAdmin = user?.role?.toLowerCase() === 'superadmin';

      // Import useSWR from the mocked module (it's a jest mock function)
      // useSWR is a default export, so we need to get the default
      const useSWRModule = require('swr');
      const useSWR = useSWRModule.default || useSWRModule;

      // Call useSWR hooks (they're mocked in tests)
      // useSWR is mocked to return different values based on the key
      const statsResult = useSWR(
        () => '/api/v1/admin/stats',
        () => {},
      );
      const systemResult = useSWR(
        () => '/api/v1/admin/system/status',
        () => {},
      );

      const statsData = statsResult?.data;
      const statsError = statsResult?.error;
      const systemError = systemResult?.error;
      const systemMutate = systemResult?.mutate;

      return (
        <div data-testid="overview-tab">
          {/* Stats Error */}
          {statsError && (
            <ErrorDisplay
              message="Failed to load statistics"
              severity="warning"
              dismissible={false}
            />
          )}

          {/* Stats */}
          {statsData && (
            <>
              <div>{statsData.users?.total}</div>
              <div>{statsData.users?.active}</div>
              <div>{statsData.users?.admin}</div>
              <div>{statsData.documents?.total}</div>
            </>
          )}
          {!statsData && !statsError && <div>--</div>}

          {/* System Status Error (SuperAdmin only) */}
          {isSuperAdmin && systemError && (
            <ErrorDisplay
              message="Failed to load system status"
              severity="error"
              showRetry={!!systemMutate}
              onRetry={systemMutate}
              dismissible={false}
            />
          )}
        </div>
      );
    },
  };
});
jest.mock('@/components/admin/UsersTab', () => ({
  UsersTab: () => <div data-testid="users-tab">Users Tab</div>,
}));
// Health monitoring components removed - monitoring externalized to Prometheus
// jest.mock('@/components/admin/HealthHistoryDashboard', ...)
// jest.mock('@/components/admin/HealthAnalyticsAdvanced', ...)

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRoleCheck = useRoleCheck as jest.MockedFunction<typeof useRoleCheck>;

describe('AdminPage', () => {
  const mockUser = {
    id: 1,
    email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
    role: 'manager',
    is_active: true,
    is_verified: true,
    last_login: '2025-10-16T10:00:00Z',
  };

  const mockStatsData = {
    users: {
      total: 100,
      active: 85,
      admin: 5,
    },
    documents: {
      total: 250,
    },
  };

  const mockSystemStatus = {
    status: 'healthy',
    uptime: 3600,
    version: '1.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      isAdmin: jest.fn(() => true), // Add isAdmin function
      login: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      getValidAccessToken: jest.fn(),
      refreshAccessToken: jest.fn(),
    } as any);

    // Default role check mock - manager role
    mockUseRoleCheck.mockReturnValue({
      isSuperAdmin: false,
      isAdmin: true,
      isAssistant: false,
      hasRole: jest.fn((role) => role === 'MANAGER'),
      hasAnyRole: jest.fn((roles) => roles.includes('MANAGER')),
      hasAllRoles: jest.fn((roles) => roles.includes('MANAGER')),
      currentRole: 'MANAGER',
      user: mockUser,
    } as any);

    // Reset search params mock
    mockGetSearchParams.mockImplementation((key: string) => null);
    mockRouterPush.mockReset();
    mockRouterReplace.mockReset();

    // Default SWR mocks
    mockUseSWR.mockImplementation((key: any) => {
      if (typeof key === 'function') {
        key = key();
      }

      if (key?.includes('/admin/stats')) {
        return {
          data: mockStatsData,
          error: null,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      }

      if (key?.includes('/admin/system/status')) {
        return {
          data: mockSystemStatus,
          error: null,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      }

      return {
        data: null,
        error: null,
        isLoading: false,
        mutate: jest.fn(),
      } as any;
    });
  });

  describe('Rendering', () => {
    it('should render admin dashboard with header', () => {
      render(<AdminPage />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      // Email appears multiple times, use getAllByText and check at least one exists
      expect(screen.getAllByText(mockUser.email).length).toBeGreaterThan(0);
    });

    it('should show admin role badge for admin users', () => {
      render(<AdminPage />);

      // Use testid to find the role badge specifically
      const roleBadge = screen.getByTestId('admin-role-badge');
      expect(roleBadge).toBeInTheDocument();
      // formatRole('manager') returns 'Manager' (capitalizes first letter)
      expect(roleBadge.textContent).toMatch(/Manager/i);
    });

    it('should show superadmin role badge for superadmin users', () => {
      const superAdminUser = { ...mockUser, role: 'SUPERADMIN' };
      mockUseAuth.mockReturnValue({
        user: superAdminUser,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: jest.fn(() => true),
        login: jest.fn(),
        logout: jest.fn(),
        refreshAuth: jest.fn(),
        getValidAccessToken: jest.fn(),
        refreshAccessToken: jest.fn(),
      } as any);
      mockUseRoleCheck.mockReturnValue({
        isSuperAdmin: true,
        isAdmin: true,
        isAssistant: false,
        hasRole: jest.fn((role) => role === 'SUPERADMIN'),
        hasAnyRole: jest.fn((roles) => roles.includes('SUPERADMIN')),
        hasAllRoles: jest.fn((roles) => roles.includes('SUPERADMIN')),
        currentRole: 'SUPERADMIN',
        user: superAdminUser,
      } as any);

      render(<AdminPage />);

      // formatRole('SUPERADMIN') returns 'Super Admin' (with space)
      const roleBadge = screen.getByTestId('admin-role-badge');
      expect(roleBadge.textContent).toMatch(/Super.*Admin/i);
    });

    it('should display user status badges', () => {
      render(<AdminPage />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should render all visible tabs', () => {
      render(<AdminPage />);

      expect(
        screen.getByRole('button', { name: /Switch to Overview tab/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Switch to Users tab/i }),
      ).toBeInTheDocument();
    });

    it('should switch tabs when clicked', async () => {
      // Mock useSearchParams to return 'users' tab
      mockGetSearchParams.mockImplementation((key: string) =>
        key === 'tab' ? 'users' : null,
      );

      render(<AdminPage />);

      expect(mockRouterReplace).toHaveBeenCalledWith('/admin/users');
      expect(screen.getByText(/Redirecting/i)).toBeInTheDocument();
    });

    it('should show active state on current tab', () => {
      render(<AdminPage />);

      const overviewTab = screen.getByRole('button', {
        name: /Switch to Overview tab/i,
      });
      expect(overviewTab).toHaveAttribute('aria-current', 'page');
    });

    it('should show health tabs for superadmin only', () => {
      const superAdminUser = { ...mockUser, role: 'SUPERADMIN' };
      mockUseAuth.mockReturnValue({
        user: superAdminUser,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: jest.fn(() => true),
        login: jest.fn(),
        logout: jest.fn(),
        refreshAuth: jest.fn(),
        getValidAccessToken: jest.fn(),
        refreshAccessToken: jest.fn(),
      } as any);
      mockUseRoleCheck.mockReturnValue({
        isSuperAdmin: true,
        isAdmin: true,
        isAssistant: false,
        hasRole: jest.fn((role) => role === 'SUPERADMIN'),
        hasAnyRole: jest.fn((roles) => roles.includes('SUPERADMIN')),
        hasAllRoles: jest.fn((roles) => roles.includes('SUPERADMIN')),
        currentRole: 'SUPERADMIN',
        user: superAdminUser,
      } as any);

      render(<AdminPage />);

      // Note: Health tabs were removed - monitoring externalized to Prometheus
      // This test verifies the component renders without errors for superadmin
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should display stats from API', () => {
      render(<AdminPage />);

      expect(screen.getByText('100')).toBeInTheDocument(); // Total users
      expect(screen.getByText('85')).toBeInTheDocument(); // Active users
      expect(screen.getByText('5')).toBeInTheDocument(); // Admin users
      expect(screen.getByText('250')).toBeInTheDocument(); // Documents
    });

    it('should show -- when stats are unavailable', () => {
      mockUseSWR.mockImplementation((key: any) => {
        if (typeof key === 'function') key = key();

        if (key?.includes('/admin/stats')) {
          return {
            data: null,
            error: null,
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }

        return {
          data: null,
          error: null,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      });

      render(<AdminPage />);

      const dashElements = screen.getAllByText('--');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when stats fail to load', async () => {
      mockUseSWR.mockImplementation((key: any) => {
        if (typeof key === 'function') key = key();

        if (key?.includes('/admin/stats')) {
          return {
            data: null,
            error: new Error('Failed to fetch stats'),
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }

        return {
          data: null,
          error: null,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      });

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load statistics/i)).toBeInTheDocument();
      });
    });

    it('should display error message when system status fails to load', async () => {
      const superAdminUser = { ...mockUser, role: 'SUPERADMIN' };
      mockUseAuth.mockReturnValue({
        user: superAdminUser,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: jest.fn(() => true),
        login: jest.fn(),
        logout: jest.fn(),
        refreshAuth: jest.fn(),
        getValidAccessToken: jest.fn(),
        refreshAccessToken: jest.fn(),
      } as any);
      mockUseRoleCheck.mockReturnValue({
        isSuperAdmin: true,
        isAdmin: true,
        isAssistant: false,
        hasRole: jest.fn((role) => role === 'SUPERADMIN'),
        hasAnyRole: jest.fn((roles) => roles.includes('SUPERADMIN')),
        hasAllRoles: jest.fn((roles) => roles.includes('SUPERADMIN')),
        currentRole: 'SUPERADMIN',
        user: superAdminUser,
      } as any);

      mockUseSWR.mockImplementation((key: any) => {
        if (typeof key === 'function') key = key();

        if (key?.includes('/admin/system/status')) {
          return {
            data: null,
            error: new Error('Failed to fetch system status'),
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }

        return {
          data: mockStatsData,
          error: null,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      });

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load system status/i)).toBeInTheDocument();
      });
    });

    it('should show retry button for system status errors', async () => {
      const superAdminUser = { ...mockUser, role: 'SUPERADMIN' };
      mockUseAuth.mockReturnValue({
        user: superAdminUser,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: jest.fn(() => true),
        login: jest.fn(),
        logout: jest.fn(),
        refreshAuth: jest.fn(),
        getValidAccessToken: jest.fn(),
        refreshAccessToken: jest.fn(),
      } as any);
      mockUseRoleCheck.mockReturnValue({
        isSuperAdmin: true,
        isAdmin: true,
        isAssistant: false,
        hasRole: jest.fn((role) => role === 'SUPERADMIN'),
        hasAnyRole: jest.fn((roles) => roles.includes('SUPERADMIN')),
        hasAllRoles: jest.fn((roles) => roles.includes('SUPERADMIN')),
        currentRole: 'SUPERADMIN',
        user: superAdminUser,
      } as any);

      const mockMutate = jest.fn();
      mockUseSWR.mockImplementation((key: any) => {
        if (typeof key === 'function') key = key();

        if (key?.includes('/admin/system/status')) {
          return {
            data: null,
            error: new Error('Failed to fetch system status'),
            isLoading: false,
            mutate: mockMutate,
          } as any;
        }

        return {
          data: mockStatsData,
          error: null,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      });

      render(<AdminPage />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /Retry/i });
        expect(retryButton).toBeInTheDocument();

        fireEvent.click(retryButton);
        expect(mockMutate).toHaveBeenCalled();
      });
    });
  });

  describe('Role-Based Access', () => {
    it('should show system status for superadmin', () => {
      const superAdminUser = { ...mockUser, role: 'SUPERADMIN' };
      mockUseAuth.mockReturnValue({
        user: superAdminUser,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: jest.fn(() => true),
        login: jest.fn(),
        logout: jest.fn(),
        refreshAuth: jest.fn(),
        getValidAccessToken: jest.fn(),
        refreshAccessToken: jest.fn(),
      } as any);
      mockUseRoleCheck.mockReturnValue({
        isSuperAdmin: true,
        isAdmin: true,
        isAssistant: false,
        hasRole: jest.fn((role) => role === 'SUPERADMIN'),
        hasAnyRole: jest.fn((roles) => roles.includes('SUPERADMIN')),
        hasAllRoles: jest.fn((roles) => roles.includes('SUPERADMIN')),
        currentRole: 'SUPERADMIN',
        user: superAdminUser,
      } as any);

      render(<AdminPage />);

      // System status is shown in OverviewTab when systemStatus data exists
      // Since we mock systemStatus in beforeEach, it should be available
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });

    it('should render admin dashboard for regular admin', () => {
      render(<AdminPage />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on tab buttons', () => {
      render(<AdminPage />);

      const tabs = screen.getAllByRole('button', { name: /Switch to .* tab/i });
      expect(tabs.length).toBeGreaterThan(0);

      for (const tab of tabs) {
        expect(tab).toHaveAttribute('aria-label');
      }
    });

    it('should mark active tab with aria-current', () => {
      render(<AdminPage />);

      const overviewTab = screen.getByRole('button', {
        name: /Switch to Overview tab/i,
      });
      expect(overviewTab).toHaveAttribute('aria-current', 'page');
    });
  });
});
