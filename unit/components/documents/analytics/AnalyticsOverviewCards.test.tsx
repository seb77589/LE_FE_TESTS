/**
 * Tests for AnalyticsOverviewCards component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnalyticsOverviewCards } from '@/components/documents/analytics/AnalyticsOverviewCards';

// Mock analyticsUtils
jest.mock('@/components/documents/analytics/analyticsUtils', () => ({
  formatFileSize: jest.fn((size) => `${size} bytes`),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-icon">File</div>,
  HardDrive: () => <div data-testid="drive-icon">Drive</div>,
  Share2: () => <div data-testid="share-icon">Share</div>,
  TrendingUp: () => <div data-testid="trend-icon">Trend</div>,
}));

describe('AnalyticsOverviewCards', () => {
  const mockAnalytics = {
    total_documents: 100,
    total_size: 1024 * 1024 * 10, // 10MB
    sharing_stats: {
      active_shares: 25,
    },
    storage_usage: {
      percentage: 75,
    },
  };

  describe('Basic Rendering', () => {
    it('should render analytics overview cards', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getByText('Total Documents')).toBeInTheDocument();
    });

    it('should display total documents count', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should display storage used', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getByText('Storage Used')).toBeInTheDocument();
    });

    it('should display active shares count', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getByText('Active Shares')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should display storage usage percentage', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getByText('Storage Usage')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render file icon', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getAllByTestId('file-icon').length).toBeGreaterThan(0);
    });

    it('should render drive icon', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getAllByTestId('drive-icon').length).toBeGreaterThan(0);
    });

    it('should render share icon', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getAllByTestId('share-icon').length).toBeGreaterThan(0);
    });

    it('should render trend icon', () => {
      render(<AnalyticsOverviewCards analytics={mockAnalytics} />);
      expect(screen.getAllByTestId('trend-icon').length).toBeGreaterThan(0);
    });
  });
});
