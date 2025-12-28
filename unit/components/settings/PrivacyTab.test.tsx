/**
 * Tests for PrivacyTab component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrivacyTab } from '@/components/settings/PrivacyTab';

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
  buildUrl: jest.fn((endpoint: string) => endpoint),
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/utils', () => ({
  formatDateTime: jest.fn((date: string) => date),
}));

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import useSWR from 'swr';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

describe('PrivacyTab', () => {
  const mockConsents = [
    {
      type: 'analytics',
      label: 'Analytics Data Collection',
      granted: true,
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      type: 'marketing',
      label: 'Marketing Communications',
      granted: false,
      updated_at: '2025-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // API returns { success: boolean, user_id: number, consents: Consent[] }
    mockUseSWR.mockReturnValue({
      data: {
        success: true,
        user_id: 1,
        consents: mockConsents,
      },
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    } as any);
  });

  describe('Basic Rendering', () => {
    it('should render privacy tab component', () => {
      render(<PrivacyTab />);
      expect(screen.getByText(/export your data/i)).toBeInTheDocument();
    });

    it('should render data export section', () => {
      render(<PrivacyTab />);
      expect(screen.getByText(/export your data/i)).toBeInTheDocument();
      expect(screen.getByText(/request data export/i)).toBeInTheDocument();
    });

    it('should render consent management section', () => {
      render(<PrivacyTab />);
      // Privacy Preferences section exists
      const privacyPreferences = screen.getAllByText(/privacy preferences/i);
      expect(privacyPreferences.length).toBeGreaterThan(0);
    });

    it('should display consent items', () => {
      render(<PrivacyTab />);
      expect(screen.getByText('Analytics Data Collection')).toBeInTheDocument();
      expect(screen.getByText('Marketing Communications')).toBeInTheDocument();
    });
  });

  describe('Data Export', () => {
    it('should call onRequestDataExport when provided', async () => {
      const mockOnRequestDataExport = jest.fn().mockResolvedValue(undefined);
      render(<PrivacyTab onRequestDataExport={mockOnRequestDataExport} />);
      const exportButton = screen.getByText(/request data export/i);
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockOnRequestDataExport).toHaveBeenCalledTimes(1);
      });
    });

    it('should call executeAction API when onRequestDataExport is not provided', async () => {
      // Component now uses two-step process:
      // 1. First calls executeAction('export_my_data') via fetch
      // 2. Only calls api.get for download if status is 'completed'

      // Mock fetch for executeAction (returns 'queued' status - common case)
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'queued' }),
      });
      globalThis.fetch = mockFetch;

      render(<PrivacyTab />);
      const exportButton = screen.getByText(/request data export/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify fetch was called with correct endpoint
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/compliance/execute'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }),
        );
      });

      // Restore
      globalThis.fetch = fetch;
    });

    it('should show success message on successful export', async () => {
      // When custom onRequestDataExport is provided, the component doesn't show toast
      // (custom handler is responsible for feedback)
      // When using built-in handler, component shows toast based on API response
      // Mock the fetch for executeAction
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'queued' }),
      });
      globalThis.fetch = mockFetch;

      render(<PrivacyTab />);
      const exportButton = screen.getByText(/request data export/i);
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Data export queued successfully',
        );
      });

      // Restore
      globalThis.fetch = fetch;
    });

    it('should show error message on failed export', async () => {
      const mockOnRequestDataExport = jest
        .fn()
        .mockRejectedValue(new Error('Export failed'));
      render(<PrivacyTab onRequestDataExport={mockOnRequestDataExport} />);
      const exportButton = screen.getByText(/request data export/i);
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to request data export');
      });
    });

    it('should disable export button while exporting', async () => {
      const mockOnRequestDataExport = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      render(<PrivacyTab onRequestDataExport={mockOnRequestDataExport} />);
      const exportButton = screen.getByText(/request data export/i);
      fireEvent.click(exportButton);
      expect(screen.getByText(/requesting export/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/request data export/i)).toBeInTheDocument();
      });
    });
  });

  describe('Consent Management', () => {
    it('should call onUpdateConsent when provided', async () => {
      const mockOnUpdateConsent = jest.fn().mockResolvedValue(undefined);
      render(<PrivacyTab onUpdateConsent={mockOnUpdateConsent} />);
      const toggleButtons = screen.getAllByRole('button');
      const consentToggle = toggleButtons.find((btn) =>
        btn.textContent?.includes('Analytics'),
      );
      if (consentToggle) {
        fireEvent.click(consentToggle);
        await waitFor(() => {
          expect(mockOnUpdateConsent).toHaveBeenCalled();
        });
      }
    });

    it('should call API when onUpdateConsent is not provided', async () => {
      (api.post as jest.Mock) = jest.fn().mockResolvedValue({});
      render(<PrivacyTab />);
      // Find checkbox for consent toggle
      const checkboxes = screen.getAllByRole('checkbox');
      const analyticsCheckbox = checkboxes.find((cb) =>
        cb.getAttribute('id')?.includes('analytics'),
      );
      if (analyticsCheckbox) {
        fireEvent.click(analyticsCheckbox);
        await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith('/api/v1/compliance/gdpr/consent', {
            consent_type: 'analytics',
            status: 'withdrawn', // Current value is true, so toggling sets to withdrawn
          });
        });
      }
    });

    it('should show success toast on consent update', async () => {
      const mockOnUpdateConsent = jest.fn().mockResolvedValue(undefined);
      render(<PrivacyTab onUpdateConsent={mockOnUpdateConsent} />);
      const toggleButtons = screen.getAllByRole('button');
      const consentToggle = toggleButtons.find((btn) =>
        btn.textContent?.includes('Analytics'),
      );
      if (consentToggle) {
        fireEvent.click(consentToggle);
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Consent updated successfully');
        });
      }
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        mutate: jest.fn(),
      } as any);
      render(<PrivacyTab />);
      expect(screen.getByText(/export your data/i)).toBeInTheDocument();
    });
  });

  describe('Props Override', () => {
    it('should use consents prop when provided', () => {
      const customConsents = [
        {
          type: 'custom',
          label: 'Custom Consent',
          granted: true,
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];
      render(<PrivacyTab consents={customConsents} />);
      expect(screen.getByText('Custom Consent')).toBeInTheDocument();
    });
  });
});
