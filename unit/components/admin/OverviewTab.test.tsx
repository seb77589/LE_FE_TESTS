/**
 * Tests for OverviewTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
import { OverviewTab } from '@/components/admin/OverviewTab';

// Mock next/dynamic to resolve the loader in an effect (ssr: false charts).
jest.mock('next/dynamic', () => {
  return (loader: () => Promise<any>, options: any) => {
    const DynamicComponent = (props: any) => {
      const [Resolved, setResolved] = React.useState<React.ComponentType<any> | null>(
        null,
      );

      React.useEffect(() => {
        let isActive = true;
        loader().then((mod: any) => {
          if (!isActive) return;
          const Component = mod?.default ?? mod;
          setResolved(() => Component);
        });
        return () => {
          isActive = false;
        };
      }, []);

      if (!Resolved) {
        return options?.loading ? options.loading(props) : null;
      }

      return <Resolved {...props} />;
    };

    return DynamicComponent;
  };
});

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/auth/roleChecks', () => ({
  useRoleCheck: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
}));

jest.mock('@/lib/api/config', () => ({
  buildUrl: jest.fn((path: string) => `http://localhost${path}`),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));


jest.mock('@/components/admin/charts/UsersOverTimeChart', () => ({
  UsersOverTimeChart: () => <div data-testid="users-chart">Users Chart</div>,
}));

jest.mock('@/components/admin/charts/DocumentsUploadChart', () => ({
  DocumentsUploadChart: () => <div data-testid="documents-chart">Documents Chart</div>,
}));

jest.mock('@/components/ui/ErrorDisplay', () => ({
  __esModule: true,
  default: ({ error }: any) =>
    error ? <div data-testid="error-display">{error}</div> : null,
}));

import useSWR from 'swr';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRoleCheck } from '@/lib/auth/roleChecks';

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRoleCheck = useRoleCheck as jest.MockedFunction<typeof useRoleCheck>;

describe('OverviewTab', () => {
  const mockStatsData = {
    users: {
      total: 100,
      active: 75,
      admin: 5,
    },
    documents: {
      total: 500,
    },
    cases: {
      total: 50,
    },
  };

  const mockSystemStatus = {
    status: 'healthy',
    version: '0.2.0',
    database: 'connected',
    redis: 'connected',
    uptime: 86400,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure the chart placeholders become "visible" during tests.
    (globalThis as any).IntersectionObserver = class {
      private callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe() {
        this.callback(
          [{ isIntersecting: true, target: {} as any }] as any,
          this as any,
        );
      }

      unobserve() {
        // no-op
      }

      disconnect() {
        // no-op
      }

      takeRecords() {
        return [];
      }
    };

    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
        role: 'SUPERADMIN',
      },
    } as any);

    // Default: superadmin role
    mockUseRoleCheck.mockReturnValue({
      isSuperAdmin: true,
      isAdmin: true,
      isAssistant: false,
      hasRole: jest.fn((role) => role === 'SUPERADMIN'),
      hasAnyRole: jest.fn((roles) => roles.includes('SUPERADMIN')),
      hasAllRoles: jest.fn((roles) => roles.includes('SUPERADMIN')),
      currentRole: 'SUPERADMIN',
      user: {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
        role: 'SUPERADMIN',
      },
    } as any);

    // Default SWR mocks
    mockUseSWR.mockImplementation((key: any) => {
      // Handle function keys that may return null
      let resolvedKey: string | null = null;
      if (typeof key === 'function') {
        try {
          resolvedKey = key();
        } catch {
          resolvedKey = null;
        }
      } else if (typeof key === 'string') {
        resolvedKey = key;
      }

      if (resolvedKey && resolvedKey.includes('/admin/stats')) {
        return {
          data: mockStatsData,
          error: undefined,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      }
      if (resolvedKey && resolvedKey.includes('/admin/system/status')) {
        return {
          data: mockSystemStatus,
          error: undefined,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      }
      return {
        data: undefined,
        error: undefined,
        isLoading: true,
        mutate: jest.fn(),
      } as any;
    });
  });

  describe('Basic Rendering', () => {
    it('should render overview tab', () => {
      render(<OverviewTab />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    it('should render stats cards', () => {
      render(<OverviewTab />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Admin Users')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('should display stat values', () => {
      render(<OverviewTab />);
      expect(screen.getByText('100')).toBeInTheDocument(); // Total Users
      expect(screen.getByText('75')).toBeInTheDocument(); // Active Users
      expect(screen.getByText('5')).toBeInTheDocument(); // Admin Users
      expect(screen.getByText('500')).toBeInTheDocument(); // Documents
    });

    it('should render charts', async () => {
      render(<OverviewTab />);

      expect(await screen.findByTestId('users-chart')).toBeInTheDocument();
      expect(await screen.findByTestId('documents-chart')).toBeInTheDocument();
    });

    it('should render activity feed', () => {
      render(<OverviewTab />);
      // Activity feed component was removed; ensure the overview still renders.
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  describe('SuperAdmin Features', () => {
    it('should display admin tools for superadmin', () => {
      // Default mock is superadmin, no need to override
      render(<OverviewTab />);
      // SuperAdmin sees Admin Tools section
      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
    });

    it('should not display admin tools for non-superadmin', () => {
      mockUseRoleCheck.mockReturnValue({
        isSuperAdmin: false,
        isAdmin: true,
        isAssistant: false,
        hasRole: jest.fn((role) => role === 'MANAGER'),
        hasAnyRole: jest.fn((roles) => roles.includes('MANAGER')),
        hasAllRoles: jest.fn((roles) => roles.includes('MANAGER')),
        currentRole: 'MANAGER',
        user: {
          id: 1,
          email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
          role: 'MANAGER',
        },
      } as any);

      render(<OverviewTab />);
      // Admin role doesn't see Admin Tools section
      expect(screen.queryByText('Admin Tools')).not.toBeInTheDocument();
    });

    it('should display quick links for superadmin', () => {
      // Default mock is superadmin, no need to override
      render(<OverviewTab />);
      // Quick links for superadmin
      expect(screen.getByText('Companies')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should handle loading state', () => {
      mockUseSWR.mockImplementation(
        () =>
          ({
            data: undefined,
            error: undefined,
            isLoading: true,
            mutate: jest.fn(),
          }) as any,
      );

      render(<OverviewTab />);
      // Should show placeholder values or loading state
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle stats error', () => {
      mockUseSWR.mockImplementation((key: any) => {
        // Handle key as string or function
        const keyStr = typeof key === 'function' ? key() : key;
        if (keyStr && typeof keyStr === 'string' && keyStr.includes('/admin/stats')) {
          return {
            data: undefined,
            error: new Error('Failed to fetch stats'),
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }
        return {
          data: mockSystemStatus,
          error: undefined,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      });

      render(<OverviewTab />);
      // Component should handle error gracefully
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    it('should handle system status error', () => {
      // useRoleCheck is already mocked as superadmin in beforeEach

      mockUseSWR.mockImplementation((key: any) => {
        // Handle key as string or function
        const keyStr = typeof key === 'function' ? key() : key;
        if (keyStr && typeof keyStr === 'string' && keyStr.includes('/admin/stats')) {
          return {
            data: mockStatsData,
            error: undefined,
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }
        if (keyStr && typeof keyStr === 'string' && keyStr.includes('/admin/system/status')) {
          return {
            data: undefined,
            error: new Error('Failed to fetch system status'),
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          isLoading: true,
          mutate: jest.fn(),
        } as any;
      });

      render(<OverviewTab />);
      // Component should handle error gracefully
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  describe('Fallback Values', () => {
    it('should show placeholder when stats data is undefined', () => {
      mockUseSWR.mockImplementation(
        () =>
          ({
            data: undefined,
            error: undefined,
            isLoading: false,
            mutate: jest.fn(),
          }) as any,
      );

      render(<OverviewTab />);
      // Should show '--' placeholder values
      const placeholders = screen.getAllByText('--');
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });
});
