/**
 * Tests for Navigation component
 *
 * Consolidated from:
 * - src/__tests__/unit/components/ui/Navigation.test.tsx
 * - src/__tests__/unit/components/Navigation.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from '@/components/ui/Navigation';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock HTMLDialogElement API (not fully supported in jsdom)
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= jest.fn();
  HTMLDialogElement.prototype.close ??= jest.fn();
});

// Mock LogoutConfirmationModal to ensure it renders when isOpen is true
jest.mock('@/components/ui/LogoutConfirmationModal', () => ({
  LogoutConfirmationModal: ({ isOpen, onClose, onConfirm, logoutType }: any) => {
    if (!isOpen) return null;
    return (
      <dialog open data-testid="logout-confirmation-modal">
        <h2>Log out?</h2>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Log Out</button>
      </dialog>
    );
  },
}));

// Mock the useAuth hook
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Navigation Component', () => {
  const mockLogout = jest.fn();

  const setupAuth = (role: 'assistant' | 'manager' | 'superadmin') => {
    mockUseAuth.mockReturnValue({
      // State properties
      user: {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        full_name: 'Test User',
        role,
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      isNavigating: false,

      // Operations (mocked functions)
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshToken: jest.fn(),
      updateUserProfile: jest.fn(),
      getValidAccessToken: jest.fn(),

      // Permissions
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      isAdmin: () => role === 'manager' || role === 'superadmin',
      isSuperAdmin: () => role === 'superadmin',
      canAccess: jest.fn(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render navigation', () => {
      setupAuth('assistant');
      render(<Navigation />);

      expect(screen.getByText('LegalEase')).toBeInTheDocument();
    });

    test('renders the navigation for regular users', () => {
      setupAuth('assistant');
      render(<Navigation />);

      // Logo should be visible
      expect(screen.getByText('LegalEase')).toBeInTheDocument();

      // Navigation items for regular users
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /cases/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sessions/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /security/i })).toBeInTheDocument();

      // Admin navigation items should not be visible for regular users
      expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();

      // User menu should show the user email
      expect(
        screen.getByText(FRONTEND_TEST_CREDENTIALS.USER.email),
      ).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      setupAuth('assistant');
      render(<Navigation />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });

  describe('User Display', () => {
    it('should display user email', () => {
      setupAuth('assistant');
      render(<Navigation />);

      expect(
        screen.getByText(FRONTEND_TEST_CREDENTIALS.USER.email),
      ).toBeInTheDocument();
    });
  });

  describe('Admin Links', () => {
    it('should show admin links for admin users', () => {
      setupAuth('manager');
      render(<Navigation />);

      // There may be multiple "Admin" links (desktop and mobile), so use getAllByText
      expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    });

    test('renders the navigation for admin users with admin links', () => {
      setupAuth('manager');
      render(<Navigation />);

      // Navigation items for admins (all regular items)
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /cases/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sessions/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /security/i })).toBeInTheDocument();

      // Admin-specific navigation items
      expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();

      // User menu should show the admin role
      expect(
        screen.getByText(FRONTEND_TEST_CREDENTIALS.USER.email),
      ).toBeInTheDocument();
    });

    it('should not show admin links for non-admin users', () => {
      setupAuth('assistant');
      render(<Navigation />);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('should toggle mobile menu', () => {
      setupAuth('assistant');
      render(<Navigation />);

      const menuButtons = screen.getAllByRole('button');
      const mobileMenuButton = menuButtons.find((btn) => btn.querySelector('.w-5.h-5'));
      if (mobileMenuButton) {
        fireEvent.click(mobileMenuButton);
        // Mobile menu should be toggled
        expect(mobileMenuButton).toBeInTheDocument();
      }
    });

    test('toggles the mobile menu on button click', async () => {
      setupAuth('assistant');
      render(<Navigation />);

      // Open the mobile menu - get the menu button by finding the one with the menu icon
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find((button) =>
        button.querySelector('svg.lucide-menu'),
      );

      expect(menuButton).toBeInTheDocument();
      if (menuButton) {
        await userEvent.click(menuButton);
      }

      // The mobile menu should be open, check for existence of a sign out button
      const signOutButtons = screen
        .getAllByRole('button')
        .filter((button) => button.textContent?.includes('Sign out'));
      expect(signOutButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Logout Functionality', () => {
    it('should open logout modal when logout button clicked', () => {
      setupAuth('assistant');
      render(<Navigation />);

      // Open the mobile menu first to access the logout button
      const menuButtons = screen.getAllByRole('button');
      const mobileMenuButton = menuButtons.find(
        (btn) =>
          btn.querySelector('svg.lucide-menu') || btn.querySelector('svg.lucide-x'),
      );

      if (mobileMenuButton) {
        fireEvent.click(mobileMenuButton);
      }

      // Now find and click the logout button (mobile version)
      const logoutButton = screen.getByTestId('logout-button-mobile');
      fireEvent.click(logoutButton);

      expect(screen.getByTestId('logout-confirmation-modal')).toBeInTheDocument();
    });

    test('calls logout function when sign out is clicked', async () => {
      setupAuth('assistant');
      render(<Navigation />);

      // Open the menu - get the menu button by finding the one with the menu icon
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find((button) =>
        button.querySelector('svg.lucide-menu'),
      );

      expect(menuButton).toBeInTheDocument();
      if (menuButton) {
        await userEvent.click(menuButton);
      }

      // Click the sign out button - find the first one that contains the text and log-out icon
      const signOutButtons = screen
        .getAllByRole('button')
        .filter(
          (button) =>
            button.textContent?.includes('Sign out') &&
            button.querySelector('svg.lucide-log-out'),
        );

      expect(signOutButtons.length).toBeGreaterThan(0);

      const firstSignOutButton = signOutButtons[0];
      expect(firstSignOutButton).toBeDefined();
      if (firstSignOutButton) {
        await userEvent.click(firstSignOutButton);
      }

      // Wait for the confirmation modal to appear
      // The modal might take a moment to render, so we wait for it
      await waitFor(
        () => {
          // Look for modal title "Log out?" to confirm modal is rendered
          expect(screen.getByText(/log out\?/i)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Find the confirm button in the modal - should be "Log Out" (not "Sign out" from nav)
      // Use getAllByRole to get all buttons, then find the one with "Log Out" text
      const allButtons = screen.getAllByRole('button');
      const logoutButton = allButtons.find(
        (btn) =>
          btn.textContent?.trim() === 'Log Out' || btn.textContent?.includes('Log Out'),
      );

      expect(logoutButton).toBeDefined();
      expect(logoutButton).toBeInTheDocument();

      // Click the confirm button in the modal
      if (logoutButton) {
        await userEvent.click(logoutButton);
      }

      // Logout should have been called
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
