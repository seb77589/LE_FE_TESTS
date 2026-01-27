import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(protected)/dashboard/page';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock the useAuth hook
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation for router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard',
  })),
}));

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: null as any,
    error: null as any,
    mutate: jest.fn(),
  })),
}));

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

describe('Dashboard Page', () => {
  const setupAuth = (role: string) => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role,
        name: 'Test User',
      },
      isLoading: false, // Not loading - prevents loading screen
      isAuthenticated: true, // Authenticated - prevents redirect screen
      isAdmin: jest.fn(() => role === 'manager' || role === 'superadmin'),
      isSuperAdmin: jest.fn(() => role === 'superadmin'),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders welcome message with user name and role', () => {
    setupAuth('assistant');
    render(<DashboardPage />);

    // Check for welcome heading with user name (first name from email)
    const userName = screen.getByTestId('user-name');
    const expectedFirstName = FRONTEND_TEST_CREDENTIALS.USER.email.split('@')[0];
    expect(userName).toHaveTextContent(expectedFirstName);

    // Check for user role badge
    expect(screen.getByText(/assistant/i)).toBeInTheDocument();
  });

  test('displays regular user dashboard with stats cards', () => {
    setupAuth('assistant');
    render(<DashboardPage />);

    // Stats cards should be visible
    expect(screen.getByText('Closed Cases')).toBeInTheDocument();
    expect(screen.getByText('Cases In Progress')).toBeInTheDocument();
    expect(screen.getByText('Cases To Review')).toBeInTheDocument();

    // Admin section should not be visible for regular users
    expect(screen.queryByText('Administrator Access')).not.toBeInTheDocument();
  });

  test('displays admin users dashboard without redundant admin section', () => {
    setupAuth('manager');
    render(<DashboardPage />);

    // Welcome message should be visible
    const userName = screen.getByTestId('user-name');
    const expectedFirstName = FRONTEND_TEST_CREDENTIALS.USER.email.split('@')[0];
    expect(userName).toHaveTextContent(expectedFirstName);

    // Administrator Access section REMOVED (redundant with top navigation "Admin" link)
    // Admin functionality accessible via Navigation > Admin link
    expect(screen.queryByText('Administrator Access')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/you have administrative privileges/i),
    ).not.toBeInTheDocument();

    // Manage Users link should NOT be on dashboard (accessible via Admin navigation)
    const manageUsersLink = screen.queryByRole('link', { name: /manage users/i });
    expect(manageUsersLink).not.toBeInTheDocument();
  });

  test('displays superadmin users dashboard without redundant admin section', () => {
    setupAuth('superadmin');
    render(<DashboardPage />);

    // Welcome message should be visible
    const userName = screen.getByTestId('user-name');
    const expectedFirstName = FRONTEND_TEST_CREDENTIALS.USER.email.split('@')[0];
    expect(userName).toHaveTextContent(expectedFirstName);

    // Administrator Access section REMOVED (redundant with top navigation "Admin" link)
    expect(screen.queryByText('Administrator Access')).not.toBeInTheDocument();

    // Admin links should NOT be on dashboard (accessible via Admin navigation)
    const manageUsersLink = screen.queryByRole('link', { name: /manage users/i });
    expect(manageUsersLink).not.toBeInTheDocument();

    const systemAdminLink = screen.queryByRole('link', { name: /system admin/i });
    expect(systemAdminLink).not.toBeInTheDocument();
  });
});
