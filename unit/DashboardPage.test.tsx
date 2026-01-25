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

  test('displays admin users dashboard with admin actions', () => {
    setupAuth('manager');
    render(<DashboardPage />);

    // Welcome message should be visible
    const userName = screen.getByTestId('user-name');
    const expectedFirstName = FRONTEND_TEST_CREDENTIALS.USER.email.split('@')[0];
    expect(userName).toHaveTextContent(expectedFirstName);

    // Admin privilege notice should be visible
    expect(screen.getByText('Administrator Access')).toBeInTheDocument();
    expect(screen.getByText(/you have administrative privileges/i)).toBeInTheDocument();

    // Manage Users link should be visible
    const manageUsersLink = screen.getByRole('link', { name: /manage users/i });
    expect(manageUsersLink).toBeInTheDocument();
    expect(manageUsersLink).toHaveAttribute('href', '/admin/users');
  });

  test('displays superadmin users dashboard with all admin actions', () => {
    setupAuth('superadmin');
    render(<DashboardPage />);

    // Welcome message should be visible
    const userName = screen.getByTestId('user-name');
    const expectedFirstName = FRONTEND_TEST_CREDENTIALS.USER.email.split('@')[0];
    expect(userName).toHaveTextContent(expectedFirstName);

    // Admin privilege notice should be visible
    expect(screen.getByText('Administrator Access')).toBeInTheDocument();

    // Both admin links should be visible for superadmin
    const manageUsersLink = screen.getByRole('link', { name: /manage users/i });
    expect(manageUsersLink).toBeInTheDocument();
    expect(manageUsersLink).toHaveAttribute('href', '/admin/users');

    const systemAdminLink = screen.getByRole('link', { name: /system admin/i });
    expect(systemAdminLink).toBeInTheDocument();
    expect(systemAdminLink).toHaveAttribute('href', '/admin');
  });
});
