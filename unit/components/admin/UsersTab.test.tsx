/**
 * Tests for UsersTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UsersTab } from '@/components/admin/UsersTab';

// Mock UserManagement component
jest.mock('@/components/admin/UserManagement', () => {
  return function MockUserManagement({
    showHeader,
    showBackLink,
    showAnalytics,
    showImport,
  }: {
    showHeader: boolean;
    showBackLink: boolean;
    showAnalytics: boolean;
    showImport: boolean;
  }) {
    return (
      <div data-testid="user-management">
        <div data-show-header={String(showHeader)} />
        <div data-show-back-link={String(showBackLink)} />
        <div data-show-analytics={String(showAnalytics)} />
        <div data-show-import={String(showImport)} />
      </div>
    );
  };
});

// Mock useAuth hook
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@/lib/context/ConsolidatedAuthContext';

describe('UsersTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render users tab', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { role: 'user' } });
    render(<UsersTab />);
    expect(screen.getByTestId('users-tab')).toBeInTheDocument();
  });

  it('should render UserManagement component', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { role: 'user' } });
    render(<UsersTab />);
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
  });

  it('should pass correct props to UserManagement', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { role: 'user' } });
    render(<UsersTab />);
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
    expect(
      screen.getByTestId('user-management').querySelector('[data-show-header="false"]'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('user-management')
        .querySelector('[data-show-back-link="false"]'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('user-management')
        .querySelector('[data-show-analytics="true"]'),
    ).toBeInTheDocument();
  });

  it('should show import for superadmin users', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { role: 'superadmin' } });
    render(<UsersTab />);
    expect(
      screen.getByTestId('user-management').querySelector('[data-show-import="true"]'),
    ).toBeInTheDocument();
  });

  it('should hide import for non-superadmin users', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { role: 'user' } });
    render(<UsersTab />);
    expect(
      screen.getByTestId('user-management').querySelector('[data-show-import="false"]'),
    ).toBeInTheDocument();
  });
});
