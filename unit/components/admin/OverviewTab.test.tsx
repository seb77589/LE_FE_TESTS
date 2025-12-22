/**
 * Tests for OverviewTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from '@/components/admin/OverviewTab';

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
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

jest.mock('@/components/admin/LazyAdminComponents', () => ({
  LazyRealTimeActivityFeed: () => <div data-testid="activity-feed">Activity Feed</div>,
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

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

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
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'superadmin',
      },
    } as any);

    // Default SWR mocks
    mockUseSWR.mockImplementation((key: any) => {
      if (typeof key === 'function' && key().includes('/admin/stats')) {
        return {
          data: mockStatsData,
          error: undefined,
          isLoading: false,
          mutate: jest.fn(),
        } as any;
      }
      if (typeof key === 'function' && key().includes('/admin/system/status')) {
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

    it('should render charts', () => {
      render(<OverviewTab />);
      expect(screen.getByTestId('users-chart')).toBeInTheDocument();
      expect(screen.getByTestId('documents-chart')).toBeInTheDocument();
    });

    it('should render activity feed', () => {
      render(<OverviewTab />);
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });
  });

  describe('System Status Display', () => {
    it('should display system status for superadmin', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@example.com',
          role: 'superadmin',
        },
      } as any);

      render(<OverviewTab />);
      expect(screen.getByText(/system status/i)).toBeInTheDocument();
    });

    it('should not display system status for non-superadmin', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
        },
      } as any);

      render(<OverviewTab />);
      expect(screen.queryByText(/system status/i)).not.toBeInTheDocument();
    });

    it('should display healthy status correctly', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@example.com',
          role: 'superadmin',
        },
      } as any);

      render(<OverviewTab />);
      // System status shows "HEALTHY" in uppercase
      expect(screen.getByText('HEALTHY')).toBeInTheDocument();
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
        if (typeof key === 'function' && key().includes('/admin/stats')) {
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
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@example.com',
          role: 'superadmin',
        },
      } as any);

      mockUseSWR.mockImplementation((key: any) => {
        if (typeof key === 'function' && key().includes('/admin/stats')) {
          return {
            data: mockStatsData,
            error: undefined,
            isLoading: false,
            mutate: jest.fn(),
          } as any;
        }
        if (typeof key === 'function' && key().includes('/admin/system/status')) {
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
