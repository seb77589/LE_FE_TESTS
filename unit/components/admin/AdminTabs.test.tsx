/**
 * Tests for AdminTabs component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { useSearchParams } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock useAuth to provide a user context
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { role: 'MANAGER' },
    isAuthenticated: true,
  })),
}));

describe('AdminTabs', () => {
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  describe('Basic Rendering', () => {
    it('should render admin tabs component', () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<AdminTabs />);
      expect(screen.getByTestId('admin-tabs')).toBeInTheDocument();
    });

    it('should render both tabs', () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<AdminTabs />);
      expect(screen.getByTestId('admin-tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('admin-tab-users')).toBeInTheDocument();
    });

    it('should display correct tab labels', () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<AdminTabs />);
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });

  describe('Active Tab State', () => {
    it('should mark overview tab as active by default', () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<AdminTabs />);
      const overviewTab = screen.getByTestId('admin-tab-overview');
      expect(overviewTab).toHaveAttribute('aria-current', 'page');
      // Component uses design tokens: 'border-primary' and 'text-primary' instead of hardcoded colors
      expect(overviewTab).toHaveClass('border-primary', 'text-primary');
    });

    it('should mark users tab as active when tab=users in URL', () => {
      mockSearchParams.get.mockReturnValue('users');
      render(<AdminTabs />);
      const usersTab = screen.getByTestId('admin-tab-users');
      expect(usersTab).toHaveAttribute('aria-current', 'page');
      // Component uses design tokens: 'border-primary' and 'text-primary' instead of hardcoded colors
      expect(usersTab).toHaveClass('border-primary', 'text-primary');
    });

    it('should use activeTab prop when searchParams is null', () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<AdminTabs activeTab="users" />);
      const usersTab = screen.getByTestId('admin-tab-users');
      expect(usersTab).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Tab Links', () => {
    it('should have correct hrefs for each tab', () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<AdminTabs />);
      expect(screen.getByTestId('admin-tab-overview')).toHaveAttribute(
        'href',
        '/admin?tab=overview',
      );
      expect(screen.getByTestId('admin-tab-users')).toHaveAttribute(
        'href',
        '/admin/users',
      );
    });
  });

  describe('Inactive Tab Styling', () => {
    it('should style inactive tabs correctly', () => {
      mockSearchParams.get.mockReturnValue('overview');
      render(<AdminTabs />);
      const usersTab = screen.getByTestId('admin-tab-users');
      expect(usersTab).not.toHaveAttribute('aria-current');
      // Component uses design tokens: 'border-transparent' and 'text-muted-foreground' instead of hardcoded colors
      expect(usersTab).toHaveClass('border-transparent', 'text-muted-foreground');
    });
  });
});
