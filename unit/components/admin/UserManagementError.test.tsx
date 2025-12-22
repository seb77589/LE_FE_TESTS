/**
 * Tests for UserManagementError component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserManagementError } from '@/components/admin/UserManagementError';

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('UserManagementError', () => {
  describe('Basic Rendering', () => {
    it('should render error component', () => {
      render(<UserManagementError />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display default error message', () => {
      render(<UserManagementError />);
      expect(
        screen.getByText(/error loading users. please try again later/i),
      ).toBeInTheDocument();
    });

    it('should display custom error message', () => {
      render(<UserManagementError message="Custom error message" />);
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Header Display', () => {
    it('should show header by default', () => {
      render(<UserManagementError />);
      expect(screen.getByText(/user management/i)).toBeInTheDocument();
    });

    it('should hide header when showHeader is false', () => {
      render(<UserManagementError showHeader={false} />);
      expect(screen.queryByText(/user management/i)).not.toBeInTheDocument();
    });
  });

  describe('Back Link', () => {
    it('should show back link by default', () => {
      render(<UserManagementError />);
      expect(screen.getByText(/back to admin dashboard/i)).toBeInTheDocument();
    });

    it('should hide back link when showBackLink is false', () => {
      render(<UserManagementError showBackLink={false} />);
      expect(screen.queryByText(/back to admin dashboard/i)).not.toBeInTheDocument();
    });

    it('should have correct href for back link', () => {
      render(<UserManagementError />);
      const backLink = screen.getByText(/back to admin dashboard/i);
      expect(backLink.closest('a')).toHaveAttribute('href', '/admin');
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      render(<UserManagementError />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live attribute', () => {
      const { container } = render(<UserManagementError />);
      const alert = container.querySelector('[aria-live="polite"]');
      expect(alert).toBeInTheDocument();
    });
  });
});
