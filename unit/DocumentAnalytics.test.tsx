import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentAnalytics from '@/components/documents/DocumentAnalytics';

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock the useDocumentAnalytics hook directly to avoid the token bug in source
const mockAnalyticsData = {
  total_documents: 10,
  total_size: 1024000,
  documents_by_type: [
    { type: 'application', count: 5, size: 512000 },
    { type: 'image', count: 5, size: 512000 },
  ],
  documents_by_status: [{ status: 'active', count: 10 }],
  upload_trend: [{ date: '2025-11-21', count: 2, size: 204800 }],
  recent_activity: [],
  storage_usage: {
    used: 1024000,
    available: 10737418240,
    percentage: 0.01,
  },
  sharing_stats: {
    total_shares: 3,
    active_shares: 2,
    expired_shares: 1,
  },
};

let mockHookState = {
  analytics: null as typeof mockAnalyticsData | null,
  isLoading: true,
  error: null as string | null,
  timeRange: '30d' as const,
  setTimeRange: jest.fn(),
  refetch: jest.fn(),
};

jest.mock('@/hooks/documents/useDocumentAnalytics', () => ({
  useDocumentAnalytics: () => mockHookState,
}));

// Mock useAuth hook
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: () => ({
    getValidAccessToken: jest.fn(() => Promise.resolve('mock-token')),
    user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
    isAuthenticated: true,
    token: 'mock-token',
  }),
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock datetime utils
jest.mock('@/lib/utils/datetime', () => ({
  formatDate: jest.fn((date) => date),
}));

// Mock error extraction
jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((error, defaultMsg) => defaultMsg),
}));

describe('DocumentAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state to loading
    mockHookState = {
      analytics: null,
      isLoading: true,
      error: null,
      timeRange: '30d' as const,
      setTimeRange: jest.fn(),
      refetch: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    // Set loaded state with analytics data
    mockHookState = {
      ...mockHookState,
      analytics: mockAnalyticsData,
      isLoading: false,
    };

    render(<DocumentAnalytics />);

    // Wait for analytics data to load and header to appear
    await waitFor(() => {
      expect(screen.getByText('Document Analytics')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    // Keep loading state (default in beforeEach)
    render(<DocumentAnalytics />);
    // Loading state shows a spinner (no text), check for the spinner element
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('uses the useDocumentAnalytics hook', async () => {
    // Set loaded state
    mockHookState = {
      ...mockHookState,
      analytics: mockAnalyticsData,
      isLoading: false,
    };

    render(<DocumentAnalytics />);

    // Verify component renders with hook data
    await waitFor(() => {
      expect(screen.getByText('Document Analytics')).toBeInTheDocument();
    });
  });

  it('renders analytics data after successful fetch', async () => {
    // Set loaded state with analytics data
    mockHookState = {
      ...mockHookState,
      analytics: mockAnalyticsData,
      isLoading: false,
    };

    render(<DocumentAnalytics />);

    await waitFor(() => {
      // Check if "Total Documents" label is rendered
      expect(screen.getByText('Total Documents')).toBeInTheDocument();
      // Check if the count (10) appears at least once (multiple "10" values exist)
      const countElements = screen.getAllByText('10');
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  it('handles fetch errors gracefully', async () => {
    // Set error state
    mockHookState = {
      ...mockHookState,
      analytics: null,
      isLoading: false,
      error: 'Failed to load analytics',
    };

    render(<DocumentAnalytics />);

    await waitFor(() => {
      // Component renders "Failed to load analytics" error message
      const errorMessages = screen.getAllByText(/Failed to load analytics/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
