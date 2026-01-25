/**
 * Tests for SettingsTabs component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AuthContextProvider } from '@/lib/context/auth/AuthContext';
import type { AuthContextType } from '@/lib/context/ConsolidatedAuthContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

import { useSearchParams } from 'next/navigation';

const mockUseSearchParams = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;

// Helper function to render SettingsTabs with AuthProvider
const renderWithAuth = (component: React.ReactElement, userRole: string = 'WORKER') => {
  const mockAuthContext: AuthContextType = {
    user: {
      id: 1,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: userRole as any,
      companyId: 1,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isAuthenticated: true,
    authLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    refreshAuth: jest.fn(),
    can: jest.fn().mockReturnValue(true),
    canAny: jest.fn().mockReturnValue(true),
    canAll: jest.fn().mockReturnValue(true),
    isRole: jest.fn().mockReturnValue(false),
    hasPermission: jest.fn().mockReturnValue(true),
  };

  return render(
    <AuthContextProvider value={mockAuthContext}>
      {component}
    </AuthContextProvider>
  );
};

describe('SettingsTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render settings tabs', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    renderWithAuth(<SettingsTabs />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Data')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('should highlight active tab from search params', () => {
    const mockSearchParams = new URLSearchParams('tab=security');
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    renderWithAuth(<SettingsTabs />);

    const securityTab = screen.getByText('Security').closest('a');
    // Component uses design tokens: border-primary and text-primary
    expect(securityTab).toHaveClass('border-primary', 'text-primary');
  });

  it('should use default activeTab when no search param', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    renderWithAuth(<SettingsTabs activeTab="general" />);

    const generalTab = screen.getByText('General').closest('a');
    // Component uses design tokens: border-primary and text-primary
    expect(generalTab).toHaveClass('border-primary', 'text-primary');
  });

  it('should use custom activeTab prop', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    renderWithAuth(<SettingsTabs activeTab="privacy" />);

    const privacyTab = screen.getByText('Privacy & Data').closest('a');
    // Component uses design tokens: border-primary and text-primary
    expect(privacyTab).toHaveClass('border-primary', 'text-primary');
  });

  it('should render all tabs with correct hrefs', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    renderWithAuth(<SettingsTabs />);

    expect(screen.getByText('General').closest('a')).toHaveAttribute(
      'href',
      '/settings?tab=general',
    );
    expect(screen.getByText('Security').closest('a')).toHaveAttribute(
      'href',
      '/settings?tab=security',
    );
  });
});
