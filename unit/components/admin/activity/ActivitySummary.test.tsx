/**
 * Tests for ActivitySummary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActivitySummary } from '@/components/admin/activity/ActivitySummary';
import { ActivitySummary as ActivitySummaryType } from '@/components/admin/activity/types';

describe('ActivitySummary', () => {
  const mockSummary: ActivitySummaryType = {
    period_hours: 24,
    total_activities: 150,
    action_counts: {
      user_login: 50,
      document_uploaded: 30,
      admin_action: 20,
    },
    user_activity: {},
    severity_counts: {
      low: 100,
      medium: 30,
      high: 15,
      critical: 5,
    },
    recent_events: [],
  };

  describe('Basic Rendering', () => {
    it('should render activity summary component', () => {
      render(<ActivitySummary summary={mockSummary} />);
      expect(screen.getByText(/total activities/i)).toBeInTheDocument();
    });

    it('should display total activities', () => {
      render(<ActivitySummary summary={mockSummary} />);
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText(/total activities/i)).toBeInTheDocument();
    });

    it('should display severity counts', () => {
      render(<ActivitySummary summary={mockSummary} />);
      expect(screen.getByText(/low severity/i)).toBeInTheDocument();
      expect(screen.getByText(/medium severity/i)).toBeInTheDocument();
      expect(screen.getByText(/high\/critical/i)).toBeInTheDocument();
    });
  });

  describe('Severity Counts Display', () => {
    it('should display low severity count', () => {
      render(<ActivitySummary summary={mockSummary} />);
      const lowSeverityElements = screen.getAllByText('100');
      expect(lowSeverityElements.length).toBeGreaterThan(0);
    });

    it('should display medium severity count', () => {
      render(<ActivitySummary summary={mockSummary} />);
      const mediumSeverityElements = screen.getAllByText('30');
      expect(mediumSeverityElements.length).toBeGreaterThan(0);
    });

    it('should display high/critical severity count (combined)', () => {
      render(<ActivitySummary summary={mockSummary} />);
      // High + Critical = 15 + 5 = 20
      // May appear multiple times, check that it exists
      const highCriticalElements = screen.getAllByText('20');
      expect(highCriticalElements.length).toBeGreaterThan(0);
    });

    it('should handle zero severity counts', () => {
      const zeroSummary: ActivitySummaryType = {
        ...mockSummary,
        severity_counts: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
      };
      render(<ActivitySummary summary={zeroSummary} />);
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Statistics', () => {
    it('should display all summary metrics', () => {
      render(<ActivitySummary summary={mockSummary} />);
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Activities
      expect(screen.getByText('100')).toBeInTheDocument(); // Low Severity
      expect(screen.getByText('30')).toBeInTheDocument(); // Medium Severity
      expect(screen.getByText('20')).toBeInTheDocument(); // High/Critical
    });

    it('should handle empty summary', () => {
      const emptySummary: ActivitySummaryType = {
        period_hours: 24,
        total_activities: 0,
        action_counts: {},
        user_activity: {},
        severity_counts: {},
        recent_events: [],
      };
      render(<ActivitySummary summary={emptySummary} />);
      // All metrics show 0, so there will be multiple "0" elements
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Styling', () => {
    it('should have correct container classes', () => {
      const { container } = render(<ActivitySummary summary={mockSummary} />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('mb-4', 'grid', 'grid-cols-2', 'md:grid-cols-4');
    });
  });
});
