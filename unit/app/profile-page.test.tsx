/**
 * Unit Tests for Profile Page
 *
 * Coverage: Profile page functionality including data fetching, editing, and avatar management
 * Test Categories:
 * - Loading and error states (3 tests)
 * - Profile display (5 tests)
 * - Edit mode functionality (4 tests)
 * - Form submission (3 tests)
 * - Notification preferences (2 tests)
 */

// Mock dependencies BEFORE imports
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn((): { get: (key: string) => string | null } => ({
    get: jest.fn((key: string): string | null => null),
  })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/profile'),
}));

jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  fetcher: jest.fn(),
}));

jest.mock('@/components/ui/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

jest.mock('@/components/profile/AvatarUpload', () => ({
  __esModule: true,
  default: ({ onUpload, onRemove, isLoading }: any) => (
    <div data-testid="avatar-upload">
      <button
        data-testid="upload-avatar-button"
        onClick={() => onUpload(new File([''], 'avatar.png', { type: 'image/png' }))}
        disabled={isLoading}
      >
        Upload Avatar
      </button>
      <button
        data-testid="remove-avatar-button"
        onClick={() => onRemove()}
        disabled={isLoading}
      >
        Remove Avatar
      </button>
    </div>
  ),
}));

jest.mock('@/components/profile/ProfilePicture', () => ({
  __esModule: true,
  default: ({ src, fallbackText }: { src?: string; fallbackText: string }) => (
    <div data-testid="profile-picture">
      {/* eslint-disable-next-line @next/next/no-img-element -- Test mock uses plain img for simplicity */}
      {src ? <img src={src} alt="Profile" /> : <span>{fallbackText}</span>}
    </div>
  ),
}));

jest.mock('@/lib/utils/datetime', () => ({
  formatDate: jest.fn((date) => `Formatted: ${date}`),
  formatDateTime: jest.fn((date) => `Formatted: ${date}`),
}));

// formatRole is in @/lib/utils, not @/lib/formatters
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  formatRole: jest.fn((role) => role.charAt(0).toUpperCase() + role.slice(1)),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSWR from 'swr';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ProfilePage from '@/app/(protected)/profile/page';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

describe('ProfilePage Component', () => {
  const mockUserData = {
    id: 1,
    full_name: 'John Doe',
    email: FRONTEND_TEST_CREDENTIALS.JOHN.email,
    role: 'assistant',
    created_at: '2024-01-01T00:00:00Z',
    profile_picture: null as any,
  };

  const mockPreferencesData = {
    notifications: {
      emailFrequency: 'immediate',
      documentUpdates: true,
      caseChanges: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading and Error States', () => {
    it('shows loading skeleton when data is loading', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        mutate: jest.fn(),
        isLoading: true,
        isValidating: false,
      } as any);

      render(<ProfilePage />);

      // Loading skeleton has animate-pulse class
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('shows error message when data fetch fails', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: new Error('Failed to fetch'),
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      render(<ProfilePage />);

      expect(
        screen.getByText('Error loading profile data. Please try again later.'),
      ).toBeInTheDocument();
    });

    it('renders profile content when data loads successfully', async () => {
      let callCount = 0;
      mockUseSWR.mockImplementation((key: any) => {
        callCount++;
        if (key === '/api/v1/users/me') {
          return {
            data: mockUserData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any;
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-loaded')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Display', () => {
    beforeEach(() => {
      mockUseSWR.mockImplementation((key: any) => {
        if (key === '/api/v1/users/me') {
          return {
            data: mockUserData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        if (key === '/api/v1/users/me/preferences') {
          return {
            data: mockPreferencesData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any;
      });
    });

    it('displays page heading and description', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(
          screen.getByText('Manage your profile information and preferences'),
        ).toBeInTheDocument();
      });
    });

    it('displays user full name in form', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const fullNameInput = screen.getByLabelText('Full Name');
        expect(fullNameInput).toBeInTheDocument();
        expect((fullNameInput as HTMLInputElement).value).toBe('John Doe');
        expect(fullNameInput).toBeDisabled(); // Disabled until edit mode
      });
    });

    it('displays user email (disabled)', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const emailInput = screen.getByTestId('profile-username');
        expect(emailInput).toBeInTheDocument();
        expect((emailInput as HTMLInputElement).value).toBe(
          FRONTEND_TEST_CREDENTIALS.JOHN.email,
        );
        expect(emailInput).toBeDisabled();
      });
    });

    it('displays user role badge', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const roleBadge = screen.getByTestId('profile-role');
        expect(roleBadge).toBeInTheDocument();
        expect(roleBadge).toHaveTextContent('Assistant');
      });
    });

    it('displays quick links to settings pages', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument();
        expect(screen.getByText('Security Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode Functionality', () => {
    beforeEach(() => {
      mockUseSWR.mockImplementation((key: any) => {
        if (key === '/api/v1/users/me') {
          return {
            data: mockUserData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any;
      });
    });

    it('enables edit mode when Edit Profile button is clicked', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        const fullNameInput = screen.getByLabelText('Full Name');
        expect(fullNameInput).not.toBeDisabled();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('allows editing full name in edit mode', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        const fullNameInput = screen.getByLabelText('Full Name');
        expect(fullNameInput).not.toBeDisabled();
      });

      const fullNameInput = screen.getByLabelText('Full Name');
      await userEvent.clear(fullNameInput);
      await userEvent.type(fullNameInput, 'Jane Smith');

      expect((fullNameInput as HTMLInputElement).value).toBe('Jane Smith');
    });

    it('cancels edit mode and resets form data when Cancel is clicked', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      // Change form data
      const fullNameInput = screen.getByLabelText('Full Name');
      await userEvent.clear(fullNameInput);
      await userEvent.type(fullNameInput, 'Jane Smith');

      // Cancel
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        const fullNameInput = screen.getByLabelText('Full Name');
        expect((fullNameInput as HTMLInputElement).value).toBe('John Doe'); // Reset to original
        expect(fullNameInput).toBeDisabled(); // Exit edit mode
      });
    });

    it('hides Edit Profile button when in edit mode', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-profile-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const mockMutate = jest.fn();

    beforeEach(() => {
      mockUseSWR.mockImplementation((key: any) => {
        if (key === '/api/v1/users/me') {
          return {
            data: mockUserData,
            error: undefined as any,
            mutate: mockMutate,
            isLoading: false,
            isValidating: false,
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any;
      });
    });

    it('successfully submits profile update', async () => {
      (api.patch as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      // Change name
      const fullNameInput = screen.getByLabelText('Full Name');
      await userEvent.clear(fullNameInput);
      await userEvent.type(fullNameInput, 'Jane Smith');

      // Submit
      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/api/v1/users/me', {
          full_name: 'Jane Smith',
        });
        expect(mockMutate).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });
    });

    it('shows error toast when profile update fails', async () => {
      (api.patch as jest.Mock).mockRejectedValue({
        response: {
          data: {
            detail: 'Failed to update profile',
          },
        },
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      // Submit
      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
      });
    });

    it('shows generic error message when API error has no detail', async () => {
      (api.patch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-profile-button')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByTestId('edit-profile-button');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      // Submit
      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to update profile. Please try again.',
        );
      });
    });
  });

  describe('Notification Preferences', () => {
    it('displays notification preferences summary when available', async () => {
      // Mock useSWR based on the key parameter
      mockUseSWR.mockImplementation(((key: string) => {
        if (key === '/api/v1/users/me') {
          return {
            data: mockUserData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          };
        }
        if (key === '/api/v1/users/me/preferences') {
          return {
            data: mockPreferencesData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          };
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        };
      }) as any);

      render(<ProfilePage />);

      await waitFor(
        () => {
          expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText('Email Frequency:')).toBeInTheDocument();
      expect(screen.getByText('Document Updates:')).toBeInTheDocument();
      expect(screen.getByText('Case Changes:')).toBeInTheDocument();

      // Both documentUpdates and caseChanges show "Enabled"
      const enabledElements = screen.getAllByText('Enabled');
      expect(enabledElements.length).toBe(2);
    });

    it('does not display notification preferences when data is unavailable', async () => {
      // Mock useSWR - only user data, no preferences
      mockUseSWR.mockImplementation(((key: string) => {
        if (key === '/api/v1/users/me') {
          return {
            data: mockUserData,
            error: undefined as any,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          };
        }
        // No preferences data for second call
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        };
      }) as any);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-loaded')).toBeInTheDocument();
      });

      expect(screen.queryByText('Notification Preferences')).not.toBeInTheDocument();
    });
  });
});
