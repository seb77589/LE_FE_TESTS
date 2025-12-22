/**
 * Tests for GeneralTab component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeneralTab } from '@/components/settings/GeneralTab';

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  fetcher: jest.fn(),
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
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

// Type assertion for api.put
const apiPut = api.put as jest.MockedFunction<typeof api.put>;

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

describe('GeneralTab', () => {
  const mockPreferences = {
    appearance: {
      theme: 'dark',
      density: 'compact',
    },
    notifications: {
      emailFrequency: 'daily',
      documentUpdates: true,
      caseChanges: false,
      marketingEmails: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: mockPreferences,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    } as any);
  });

  describe('Basic Rendering', () => {
    it('should render general tab component', () => {
      render(<GeneralTab />);
      expect(screen.getByText(/appearance/i)).toBeInTheDocument();
    });

    it('should render theme selection buttons', () => {
      render(<GeneralTab />);
      expect(screen.getByText('light')).toBeInTheDocument();
      expect(screen.getByText('dark')).toBeInTheDocument();
      expect(screen.getByText('system')).toBeInTheDocument();
    });

    it('should render density selection buttons', () => {
      render(<GeneralTab />);
      expect(screen.getByText(/comfortable/i)).toBeInTheDocument();
      expect(screen.getByText(/compact/i)).toBeInTheDocument();
    });

    it('should render notification settings', () => {
      render(<GeneralTab />);
      expect(screen.getByText(/email frequency/i)).toBeInTheDocument();
      expect(screen.getByText(/document updates/i)).toBeInTheDocument();
      expect(screen.getByText(/case changes/i)).toBeInTheDocument();
      expect(screen.getByText(/marketing emails/i)).toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('should update theme when theme button is clicked', () => {
      render(<GeneralTab />);
      const darkButton = screen.getByText('dark');
      fireEvent.click(darkButton);
      expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should highlight selected theme', () => {
      render(<GeneralTab />);
      const darkButton = screen.getByText('dark');
      fireEvent.click(darkButton);
      expect(darkButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700');
    });
  });

  describe('Density Selection', () => {
    it('should update density when density button is clicked', () => {
      render(<GeneralTab />);
      const compactButton = screen.getByText(/compact/i);
      fireEvent.click(compactButton);
      expect(compactButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Notification Settings', () => {
    it('should toggle document updates checkbox', () => {
      render(<GeneralTab />);
      const checkbox = screen.getByLabelText(/document updates/i);
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle case changes checkbox', () => {
      render(<GeneralTab />);
      const checkbox = screen.getByLabelText(/case changes/i);
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should toggle marketing emails checkbox', () => {
      render(<GeneralTab />);
      const checkbox = screen.getByLabelText(/marketing emails/i);
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Save Functionality', () => {
    it('should call onSave prop when provided', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<GeneralTab onSave={mockOnSave} />);
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });

    it('should call API when onSave is not provided', async () => {
      apiPut.mockResolvedValue({} as any);
      render(<GeneralTab />);
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(apiPut).toHaveBeenCalledWith(
          '/api/v1/users/me/preferences',
          expect.objectContaining({
            preferences: expect.objectContaining({
              appearance: expect.any(Object),
              notifications: expect.any(Object),
            }),
          }),
        );
      });
    });

    it('should show success toast on successful save', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<GeneralTab onSave={mockOnSave} />);
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings saved successfully');
      });
    });

    it('should show error toast on failed save', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<GeneralTab onSave={mockOnSave} />);
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to save settings. Please try again.',
        );
      });
    });

    it('should disable save button while saving', async () => {
      const mockOnSave = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      render(<GeneralTab onSave={mockOnSave} />);
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);
      expect(saveButton).toBeDisabled();
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
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
      render(<GeneralTab />);
      // Component should render without crashing
      expect(screen.getByText(/appearance/i)).toBeInTheDocument();
    });
  });
});
