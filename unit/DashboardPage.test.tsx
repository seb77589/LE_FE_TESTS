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

  test('renders welcome message with user email', () => {
    setupAuth('assistant');
    render(<DashboardPage />);

    // Check for welcome heading with user email
    const userEmail = screen.getByTestId('user-email');
    expect(userEmail).toHaveTextContent(FRONTEND_TEST_CREDENTIALS.USER.email);

    // Check for user role text
    expect(
      screen.getByText(/you're signed in as a assistant user/i),
    ).toBeInTheDocument();
  });

  test('displays regular user dashboard without admin actions', () => {
    setupAuth('assistant');
    render(<DashboardPage />);

    // Regular action should be visible
    const createDocumentButton = screen.getByRole('button', {
      name: (content) => content.includes('Create Document'),
    });
    expect(createDocumentButton).toBeInTheDocument();

    // Check for action description text
    expect(screen.getByText('Generate a new legal document')).toBeInTheDocument();

    // Admin buttons should not be visible
    const quickActionsContainer = screen.getByText('Quick Actions').closest('div');
    const buttonTexts = quickActionsContainer
      ? Array.from(quickActionsContainer.querySelectorAll('button')).map(
          (button) => button.textContent,
        )
      : [];

    expect(buttonTexts.filter((text) => text?.includes('Manage Users'))).toHaveLength(
      0,
    );
    expect(buttonTexts.filter((text) => text?.includes('Admin Panel'))).toHaveLength(0);
  });

  test('displays admin users dashboard with admin actions', () => {
    setupAuth('manager');
    render(<DashboardPage />);

    // Welcome message should be visible
    const userEmail = screen.getByTestId('user-email');
    expect(userEmail).toHaveTextContent(FRONTEND_TEST_CREDENTIALS.USER.email);

    // Admin-specific quick action should be visible
    const quickActionsContainer = screen.getByText('Quick Actions').closest('div');
    expect(quickActionsContainer).toBeInTheDocument();
    const buttonTexts = quickActionsContainer
      ? Array.from(quickActionsContainer.querySelectorAll('button')).map(
          (button) => button.textContent,
        )
      : [];
    expect(buttonTexts.filter((text) => text?.includes('Manage Users'))).toHaveLength(
      1,
    );

    // Admin privilege notice should be visible
    expect(screen.getByText('Administrator Access')).toBeInTheDocument();
    expect(screen.getByText(/you have administrative privileges/i)).toBeInTheDocument();
  });

  test('displays superadmin users dashboard with all admin actions', () => {
    setupAuth('superadmin');
    render(<DashboardPage />);

    // Welcome message should be visible
    const userEmail = screen.getByTestId('user-email');
    expect(userEmail).toHaveTextContent(FRONTEND_TEST_CREDENTIALS.USER.email);

    // Admin actions including Admin Panel quick action should be visible
    const quickActionsContainer = screen.getByText('Quick Actions').closest('div');
    expect(quickActionsContainer).toBeInTheDocument();
    const buttonTexts = quickActionsContainer
      ? Array.from(quickActionsContainer.querySelectorAll('button')).map(
          (button) => button.textContent,
        )
      : [];
    expect(buttonTexts.filter((text) => text?.includes('Manage Users'))).toHaveLength(
      1,
    );
    expect(buttonTexts.filter((text) => text?.includes('Admin Panel'))).toHaveLength(1);

    // Admin privilege notice section should have "System Admin" link
    const adminSection = screen.getByText('Administrator Access').closest('div');
    expect(adminSection).toBeInTheDocument();
    // "System Admin" is a Link (mocked as <a>), not a button
    const adminLinks = adminSection
      ? Array.from(adminSection.querySelectorAll('a')).map((link) => link.textContent)
      : [];
    expect(adminLinks.filter((text) => text?.includes('System Admin'))).toHaveLength(1);
  });
});
