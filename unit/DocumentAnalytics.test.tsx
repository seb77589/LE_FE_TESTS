import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentAnalytics from '@/components/documents/DocumentAnalytics';

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
// Mock useAuth hook
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: () => ({
    getValidAccessToken: jest.fn(() => Promise.resolve('mock-token')),
    user: { id: 1, email: FRONTEND_TEST_CREDENTIALS.USER.email },
    isAuthenticated: true,
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

    // Mock successful fetch response
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
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
          }),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    render(<DocumentAnalytics />);

    // Wait for analytics data to load and header to appear
    await waitFor(() => {
      expect(screen.getByText('Document Analytics')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(<DocumentAnalytics />);
    // Loading state shows a spinner (no text), check for the spinner element
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('fetches analytics data with correct authorization', async () => {
    render(<DocumentAnalytics />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents/analytics'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });
  });

  it('renders analytics data after successful fetch', async () => {
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
    // Mock failed fetch
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Network error' }),
      }),
    ) as jest.Mock;

    render(<DocumentAnalytics />);

    await waitFor(() => {
      // Component renders "Failed to load analytics" twice (heading and detail)
      // Use getAllByText to handle multiple matches
      const errorMessages = screen.getAllByText(/Failed to load analytics/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
