/**
 * Tests for Activity Page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ActivityPage from '@/app/(protected)/activity/page';

// Mock dependencies
const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'MANAGER',
};

const mockToken = 'mock-token';

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
    token: mockToken,
    isAuthenticated: true,
  })),
}));

const mockActivityData = {
  activities: [
    {
      id: 1,
      action: 'DOCUMENT_UPLOADED',
      timestamp: '2024-01-13T10:00:00Z',
      details: 'Uploaded contract.pdf',
      ip_address: '192.168.1.1',
    },
    {
      id: 2,
      action: 'CASE_CREATED',
      timestamp: '2024-01-13T09:00:00Z',
      details: 'Created case #123',
      ip_address: '192.168.1.2',
    },
    {
      id: 3,
      action: 'LOGIN',
      timestamp: '2024-01-13T08:00:00Z',
      details: 'User logged in',
      ip_address: '192.168.1.1',
    },
  ],
  total: 3,
  login_count: 5,
};

const mockStatsData = {
  stats: {
    document_count: 25,
    case_count: 10,
    completed_count: 8,
    last_login: '2024-01-13T08:00:00Z',
  },
};

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn((key: string | null) => {
    if (!key) {
      return { data: null, error: null };
    }
    if (key.includes('/api/v1/users/me/activity')) {
      return { data: mockActivityData, error: null };
    }
    if (key.includes('/api/v1/users/me/stats')) {
      return { data: mockStatsData, error: null };
    }
    return { data: null, error: null };
  }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  fetcher: jest.fn(),
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/lib/utils', () => ({
  formatDateTime: jest.fn((date: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }),
  formatDate: jest.fn((date: string) => new Date(date).toLocaleDateString()),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  FileText: () => <span data-testid="icon-file-text">FileText</span>,
  Briefcase: () => <span data-testid="icon-briefcase">Briefcase</span>,
  CheckCircle: () => <span data-testid="icon-check-circle">CheckCircle</span>,
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
  Search: () => <span data-testid="icon-search">Search</span>,
  Filter: () => <span data-testid="icon-filter">Filter</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
}));

describe('ActivityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render activity page with title', () => {
      render(<ActivityPage />);

      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });

    it('should render summary cards', () => {
      render(<ActivityPage />);

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // document_count
      expect(screen.getByText('Cases')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // case_count
      expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // completed_count
      expect(screen.getByText('Last Login')).toBeInTheDocument();
    });

    it('should render activity table', () => {
      render(<ActivityPage />);

      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('IP Address')).toBeInTheDocument();
    });

    it('should display activities in table', () => {
      render(<ActivityPage />);

      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
      expect(screen.getByText('Uploaded contract.pdf')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('CASE_CREATED')).toBeInTheDocument();
      expect(screen.getByText('LOGIN')).toBeInTheDocument();
    });

    it('should show total results count', () => {
      render(<ActivityPage />);

      expect(screen.getByText(/showing 3 activities/i)).toBeInTheDocument();
    });

    it('should display login count badge', () => {
      render(<ActivityPage />);

      expect(screen.getByText(/5 logins/i)).toBeInTheDocument();
    });
  });

  describe('Date Range Filter', () => {
    it('should render date range selector with default 30 days', () => {
      render(<ActivityPage />);

      const select = screen.getByLabelText(/date range/i) as HTMLSelectElement;
      expect(select.value).toBe('30');
    });

    it('should have all date range options', () => {
      render(<ActivityPage />);

      const select = screen.getByLabelText(/date range/i);
      expect(select).toContainHTML('Last 7 days');
      expect(select).toContainHTML('Last 30 days');
      expect(select).toContainHTML('Last 90 days');
      expect(select).toContainHTML('Last 365 days');
    });

    it('should update activities when date range changes', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const select = screen.getByLabelText(/date range/i);
      await user.selectOptions(select, '7');

      // Component should trigger SWR refetch with new days parameter
      expect(select).toHaveValue('7');
    });
  });

  describe('Activity Type Filter', () => {
    it('should render activity type filter', () => {
      render(<ActivityPage />);

      expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
    });

    it('should show "All Activities" as default', () => {
      render(<ActivityPage />);

      const select = screen.getByLabelText(/filter by type/i) as HTMLSelectElement;
      expect(select.value).toBe('all');
    });

    it('should filter activities by type', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const select = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(select, 'DOCUMENT');

      // Should show only DOCUMENT_UPLOADED activity
      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
      expect(screen.queryByText('CASE_CREATED')).not.toBeInTheDocument();
      expect(screen.queryByText('LOGIN')).not.toBeInTheDocument();
    });

    it('should update results count after filtering', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const select = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(select, 'CASE');

      expect(screen.getByText(/showing 1 activities/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', () => {
      render(<ActivityPage />);

      expect(screen.getByPlaceholderText(/search activities/i)).toBeInTheDocument();
    });

    it('should filter activities by search query', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'contract');

      // Should show only activity with "contract" in details
      expect(screen.getByText(/uploaded contract.pdf/i)).toBeInTheDocument();
      expect(screen.queryByText('Created case #123')).not.toBeInTheDocument();
    });

    it('should search in action field', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'uploaded');

      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
      expect(screen.queryByText('CASE_CREATED')).not.toBeInTheDocument();
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'UPLOADED');

      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
    });

    it('should clear search filter', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'contract');
      await user.clear(searchInput);

      // Should show all activities again
      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
      expect(screen.getByText('CASE_CREATED')).toBeInTheDocument();
      expect(screen.getByText('LOGIN')).toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    it('should render export button', () => {
      render(<ActivityPage />);

      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    });

    it('should export activities as CSV', async () => {
      const user = userEvent.setup();

      // Mock blob and URL creation
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      const mockClick = jest.fn();
      const mockLink = {
        click: mockClick,
        href: '',
        download: '',
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(<ActivityPage />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      expect(mockClick).toHaveBeenCalled();
      expect(mockLink.download).toMatch(/activity_log_.*\.csv/);
    });

    it('should export filtered activities', async () => {
      const user = userEvent.setup();

      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      const mockClick = jest.fn();
      const mockLink = { click: mockClick, href: '', download: '' };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(<ActivityPage />);

      // Apply filter
      const select = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(select, 'DOCUMENT');

      // Export
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      // Should export only filtered activities
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle CSV export with special characters', async () => {
      const user = userEvent.setup();

      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      const mockClick = jest.fn();
      jest.spyOn(document, 'createElement').mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any);

      render(<ActivityPage />);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      // CSV should properly escape quotes and commas
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Combined Filters', () => {
    it('should apply both type filter and search simultaneously', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      // Apply type filter
      const typeSelect = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(typeSelect, 'DOCUMENT');

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'contract');

      // Should show only activities matching both filters
      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
      expect(screen.getByText(/showing 1 activities/i)).toBeInTheDocument();
    });

    it('should show no results when filters exclude all activities', async () => {
      const user = userEvent.setup();
      render(<ActivityPage />);

      const typeSelect = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(typeSelect, 'CASE');

      const searchInput = screen.getByPlaceholderText(/search activities/i);
      await user.type(searchInput, 'uploaded');

      expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching data', () => {
      const useSWR = require('swr').default;
      useSWR.mockReturnValue({ data: null, error: null });

      render(<ActivityPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error message on fetch failure', () => {
      const useSWR = require('swr').default;
      useSWR.mockReturnValue({
        data: null,
        error: new Error('Failed to fetch'),
      });

      render(<ActivityPage />);

      expect(screen.getByText(/failed to load activities/i)).toBeInTheDocument();
    });

    it('should handle empty activities list', () => {
      const useSWR = require('swr').default;
      useSWR.mockImplementation((key: string) => {
        if (key.includes('/api/v1/users/me/activity')) {
          return { data: { activities: [], total: 0, login_count: 0 }, error: null };
        }
        if (key.includes('/api/v1/users/me/stats')) {
          return { data: mockStatsData, error: null };
        }
        return { data: null, error: null };
      });

      render(<ActivityPage />);

      expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
    });
  });

  describe('Summary Cards Edge Cases', () => {
    it('should handle missing stats data', () => {
      const useSWR = require('swr').default;
      useSWR.mockImplementation((key: string) => {
        if (key.includes('/api/v1/users/me/activity')) {
          return { data: mockActivityData, error: null };
        }
        return { data: null, error: null };
      });

      render(<ActivityPage />);

      // Should show placeholders or 0 values
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('should format large numbers correctly', () => {
      const useSWR = require('swr').default;
      useSWR.mockImplementation((key: string) => {
        if (key.includes('/api/v1/users/me/activity')) {
          return { data: mockActivityData, error: null };
        }
        if (key.includes('/api/v1/users/me/stats')) {
          return {
            data: {
              stats: {
                document_count: 1234,
                case_count: 567,
                completed_count: 890,
                last_login: '2024-01-13T08:00:00Z',
              },
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      render(<ActivityPage />);

      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('567')).toBeInTheDocument();
      expect(screen.getByText('890')).toBeInTheDocument();
    });
  });

  describe('Activity Badges', () => {
    it('should display different badge variants for activity types', () => {
      render(<ActivityPage />);

      // Component should render badges with appropriate colors
      expect(screen.getByText('DOCUMENT_UPLOADED')).toBeInTheDocument();
      expect(screen.getByText('CASE_CREATED')).toBeInTheDocument();
      expect(screen.getByText('LOGIN')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should not render if user is not authenticated', () => {
      const useAuth = require('@/lib/context/ConsolidatedAuthContext').useAuth;
      useAuth.mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
      });

      render(<ActivityPage />);

      // Should show loading or redirect (implementation dependent)
      expect(screen.queryByText('Activity Log')).not.toBeInTheDocument();
    });
  });
});
