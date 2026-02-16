/**
 * Tests for UserAnalytics component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserAnalytics } from '@/components/admin/UserAnalytics';

describe('UserAnalytics', () => {
  const mockAnalytics = {
    total_users: 150,
    active_users: 120,
    admin_users: 10,
    superadmins: 2,
  };

  describe('Basic Rendering', () => {
    it('should render user analytics component', () => {
      render(<UserAnalytics analytics={mockAnalytics} />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    it('should display total users', () => {
      render(<UserAnalytics analytics={mockAnalytics} />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should display active users', () => {
      render(<UserAnalytics analytics={mockAnalytics} />);
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('should display admin users', () => {
      render(<UserAnalytics analytics={mockAnalytics} />);
      expect(screen.getByText('Admins')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display superadmins', () => {
      render(<UserAnalytics analytics={mockAnalytics} />);
      expect(screen.getByText('SuperAdmins')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Analytics Display', () => {
    it('should display all analytics metrics', () => {
      render(<UserAnalytics analytics={mockAnalytics} />);
      // Check that all values are displayed (may appear multiple times)
      const totalUsers = screen.getAllByText('150');
      const activeUsers = screen.getAllByText('120');
      const admins = screen.getAllByText('10');
      const superadmins = screen.getAllByText('2');
      expect(totalUsers.length).toBeGreaterThan(0);
      expect(activeUsers.length).toBeGreaterThan(0);
      expect(admins.length).toBeGreaterThan(0);
      expect(superadmins.length).toBeGreaterThan(0);
    });

    it('should handle zero values', () => {
      const zeroAnalytics = {
        total_users: 0,
        active_users: 0,
        admin_users: 0,
        superadmins: 0,
      };
      render(<UserAnalytics analytics={zeroAnalytics} />);
      // All metrics show 0, so there will be multiple "0" elements
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle large values', () => {
      const largeAnalytics = {
        total_users: 10000,
        active_users: 8500,
        admin_users: 50,
        superadmins: 5,
      };
      render(<UserAnalytics analytics={largeAnalytics} />);
      expect(screen.getByText('10000')).toBeInTheDocument();
      expect(screen.getByText('8500')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have correct container classes', () => {
      const { container } = render(<UserAnalytics analytics={mockAnalytics} />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass(
        'bg-card',
        'text-card-foreground',
        'rounded-lg',
        'shadow-md',
        'border',
        'border-border',
        'p-4',
      );
    });

    it('should display metrics in grid layout', () => {
      const { container } = render(<UserAnalytics analytics={mockAnalytics} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4');
    });
  });
});
