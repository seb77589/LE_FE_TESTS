/**
 * Tests for UserManagementLoading component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserManagementLoading } from '@/components/admin/UserManagementLoading';

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('UserManagementLoading', () => {
  describe('Basic Rendering', () => {
    it('should render loading component', () => {
      render(<UserManagementLoading />);
      expect(screen.getByLabelText(/loading users/i)).toBeInTheDocument();
    });

    it('should display loading skeleton', () => {
      const { container } = render(<UserManagementLoading />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Header Display', () => {
    it('should show header by default', () => {
      render(<UserManagementLoading />);
      expect(screen.getByText(/user management/i)).toBeInTheDocument();
    });

    it('should hide header when showHeader is false', () => {
      render(<UserManagementLoading showHeader={false} />);
      expect(screen.queryByText(/user management/i)).not.toBeInTheDocument();
    });
  });

  describe('Back Link', () => {
    it('should show back link by default', () => {
      render(<UserManagementLoading />);
      expect(screen.getByText(/back to admin dashboard/i)).toBeInTheDocument();
    });

    it('should hide back link when showBackLink is false', () => {
      render(<UserManagementLoading showBackLink={false} />);
      expect(screen.queryByText(/back to admin dashboard/i)).not.toBeInTheDocument();
    });

    it('should have correct href for back link', () => {
      render(<UserManagementLoading />);
      const backLink = screen.getByText(/back to admin dashboard/i);
      expect(backLink.closest('a')).toHaveAttribute('href', '/admin');
    });
  });

  describe('Loading Skeleton', () => {
    it('should render multiple skeleton elements', () => {
      const { container } = render(<UserManagementLoading />);
      const skeletons = container.querySelectorAll('.bg-gray-200');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
