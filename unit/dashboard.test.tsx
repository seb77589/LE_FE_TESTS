import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/(protected)/dashboard/page';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { authApi } from '@/lib/api';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock useAuth hook
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock API calls
jest.mock('@/lib/api', () => ({
  authApi: {
    requestEmailVerification: jest.fn(),
  },
}));

// Mock SWR to prevent HTTP requests in tests
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined as any,
    error: undefined as any,
    isLoading: false,
    mutate: jest.fn(),
  })),
}));

describe('DashboardPage', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  // Setup for regular user
  const setupRegularUser = () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 123,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        full_name: 'Regular User',
        role: 'assistant',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login: '2023-06-15T10:30:00Z',
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      isNavigating: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateUserProfile: jest.fn(),
      getValidAccessToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      isAdmin: () => false,
      isSuperAdmin: () => false,
      canAccess: jest.fn(),
    });
  };

  // Setup for unverified user
  const setupUnverifiedUser = () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 123,
        email: FRONTEND_TEST_CREDENTIALS.UNVERIFIED.email,
        full_name: 'Unverified User',
        role: 'assistant',
        is_active: true,
        is_verified: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      isNavigating: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateUserProfile: jest.fn(),
      getValidAccessToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      isAdmin: () => false,
      isSuperAdmin: () => false,
      canAccess: jest.fn(),
    });
  };

  // Setup for admin user (available for future tests)
  const _setupAdminUser = () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 456,
        email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
        full_name: 'Admin User',
        role: 'manager',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      isNavigating: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateUserProfile: jest.fn(),
      getValidAccessToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      isAdmin: () => true,
      isSuperAdmin: () => false,
      canAccess: jest.fn(),
    });
  };

  // Setup for superadmin user (available for future tests)
  const _setupSuperAdminUser = () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 789,
        email: FRONTEND_TEST_CREDENTIALS.SUPERADMIN.email,
        full_name: 'Super Admin User',
        role: 'superadmin',
        is_active: true,
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      isNavigating: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      updateUserProfile: jest.fn(),
      getValidAccessToken: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      isAdmin: () => true,
      isSuperAdmin: () => true,
      canAccess: jest.fn(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with regular user permissions', () => {
    setupRegularUser();

    render(<DashboardPage />);

    // Check that regular user elements are present
    expect(screen.getByTestId('user-email')).toHaveTextContent(
      FRONTEND_TEST_CREDENTIALS.USER.email,
    );
    expect(screen.getByText(/create document/i)).toBeInTheDocument();

    // Check that admin features are not present
    const adminSection = screen.queryByText(/administrator access/i);
    expect(adminSection).not.toBeInTheDocument();
  });

  // Note: Admin/superadmin tests removed (obsolete) - by design, admins are
  // automatically redirected to /admin and should never see the dashboard page.
  // Redirect behavior is tested in E2E tests.

  it('displays dashboard statistics', () => {
    setupRegularUser();

    render(<DashboardPage />);

    // Check statistics are displayed (use specific text to avoid matching multiple elements)
    expect(screen.getByText('My Documents')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('displays recent activity section', () => {
    setupRegularUser();

    render(<DashboardPage />);

    // Check recent activity section
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    expect(screen.getByText(/created contract template/i)).toBeInTheDocument();
    expect(screen.getByText(/updated user permissions/i)).toBeInTheDocument();
  });

  it('displays verification status for verified user', () => {
    setupRegularUser();

    render(<DashboardPage />);

    const verificationStatus = screen.getByTestId('verification-status');
    expect(verificationStatus).toHaveTextContent('Verified');
    expect(verificationStatus).toHaveClass('bg-green-100');
  });

  it('displays verification warning for unverified user', () => {
    setupUnverifiedUser();

    render(<DashboardPage />);

    const verificationStatus = screen.getByTestId('verification-status');
    expect(verificationStatus).toHaveTextContent('Unverified');
    expect(verificationStatus).toHaveClass('bg-yellow-100');

    // Check for verification alert
    expect(screen.getByText(/email verification required/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });

  it('handles email verification request success', async () => {
    setupUnverifiedUser();
    (authApi.requestEmailVerification as jest.Mock).mockResolvedValue({
      message: 'Verification email sent successfully',
    });

    render(<DashboardPage />);

    // Find and click resend verification button
    const resendButton = screen.getByRole('button', {
      name: /resend verification email/i,
    });
    fireEvent.click(resendButton);

    // Wait for success message
    await waitFor(() => {
      expect(
        screen.getByText(/verification email sent successfully/i),
      ).toBeInTheDocument();
    });

    expect(authApi.requestEmailVerification).toHaveBeenCalledWith(
      FRONTEND_TEST_CREDENTIALS.UNVERIFIED.email,
    );
  });

  it('handles email verification request error', async () => {
    setupUnverifiedUser();
    (authApi.requestEmailVerification as jest.Mock).mockRejectedValue({
      response: {
        data: {
          detail: 'Too many requests, please try again later',
        },
      },
    });

    render(<DashboardPage />);

    // Find and click resend verification button
    const resendButton = screen.getByRole('button', {
      name: /resend verification email/i,
    });
    fireEvent.click(resendButton);

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/too many requests, please try again later/i),
      ).toBeInTheDocument();
    });

    expect(authApi.requestEmailVerification).toHaveBeenCalledWith(
      FRONTEND_TEST_CREDENTIALS.UNVERIFIED.email,
    );
  });
});
