/**
 * Tests for ActivityList component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActivityList } from '@/components/admin/activity/ActivityList';
import { ActivityEvent } from '@/components/admin/activity/types';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock dependencies
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/admin/activity/activityUtils', () => ({
  getActionIcon: jest.fn(() => <div data-testid="action-icon">Icon</div>),
  getSeverityColor: jest.fn(() => 'bg-red-100'),
  formatTimestamp: jest.fn((timestamp: string) => timestamp),
}));

describe('ActivityList', () => {
  const mockActivities: ActivityEvent[] = [
    {
      id: '1',
      action: 'user_login',
      timestamp: '2025-01-01T12:00:00Z',
      user_email: FRONTEND_TEST_CREDENTIALS.USER.email,
      user_role: 'USER',
      status: 'success',
      severity: 'low',
      ip_address: '192.168.1.1',
      details: 'User logged in successfully',
    },
    {
      id: '2',
      action: 'document_uploaded',
      timestamp: '2025-01-01T11:00:00Z',
      user_email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
      user_role: 'ADMIN',
      status: 'success',
      severity: 'medium',
      ip_address: '192.168.1.2',
      details: { document_id: 123, filename: 'test.pdf' },
    },
  ];

  describe('Basic Rendering', () => {
    it('should render activity list component', () => {
      render(<ActivityList activities={mockActivities} />);
      expect(screen.getAllByTestId('activity-item')).toHaveLength(2);
    });

    it('should display activity items', () => {
      render(<ActivityList activities={mockActivities} />);
      expect(screen.getByText('user_login')).toBeInTheDocument();
      expect(screen.getByText('document_uploaded')).toBeInTheDocument();
    });

    it('should display user email', () => {
      render(<ActivityList activities={mockActivities} />);
      expect(screen.getByText(FRONTEND_TEST_CREDENTIALS.USER.email)).toBeInTheDocument();
      expect(screen.getByText(FRONTEND_TEST_CREDENTIALS.ADMIN.email)).toBeInTheDocument();
    });

    it('should display user role', () => {
      render(<ActivityList activities={mockActivities} />);
      expect(screen.getByText('USER')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('should display severity badge', () => {
      render(<ActivityList activities={mockActivities} />);
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      render(<ActivityList activities={mockActivities} />);
      const statusBadges = screen.getAllByText('success');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should display IP address', () => {
      render(<ActivityList activities={mockActivities} />);
      expect(screen.getByText(/192\.168\.1\.1/i)).toBeInTheDocument();
      expect(screen.getByText(/192\.168\.1\.2/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no activities', () => {
      render(<ActivityList activities={[]} />);
      expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
    });

    it('should show search hint when search term provided', () => {
      render(<ActivityList activities={[]} searchTerm="test" />);
      expect(
        screen.getByText(/try adjusting your search criteria/i),
      ).toBeInTheDocument();
    });

    it('should not show search hint when no search term', () => {
      render(<ActivityList activities={[]} />);
      expect(
        screen.queryByText(/try adjusting your search criteria/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('Activity Details', () => {
    it('should display string details', () => {
      render(<ActivityList activities={[mockActivities[0]]} />);
      expect(screen.getByText('User logged in successfully')).toBeInTheDocument();
    });

    it('should display object details as JSON', () => {
      render(<ActivityList activities={[mockActivities[1]]} />);
      expect(screen.getByText(/document_id/i)).toBeInTheDocument();
      expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
    });
  });

  describe('Activity Filtering', () => {
    it('should render filtered activities', () => {
      const filteredActivities = [mockActivities[0]];
      render(<ActivityList activities={filteredActivities} />);
      expect(screen.getByText('user_login')).toBeInTheDocument();
      expect(screen.queryByText('document_uploaded')).not.toBeInTheDocument();
    });
  });
});
