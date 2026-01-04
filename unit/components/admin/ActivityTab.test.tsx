/**
 * Tests for ActivityTab component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActivityTab } from '@/components/admin/ActivityTab';

// Mock LazyRealTimeActivityFeed
jest.mock('@/components/admin/LazyAdminComponents', () => ({
  LazyRealTimeActivityFeed: () => (
    <div data-testid="lazy-activity-feed">Activity Feed</div>
  ),
}));

describe('ActivityTab', () => {
  it('should render activity tab', () => {
    render(<ActivityTab />);
    expect(screen.getByTestId('activity-tab')).toBeInTheDocument();
  });

  it('should render lazy-loaded activity feed', () => {
    render(<ActivityTab />);
    expect(screen.getByTestId('lazy-activity-feed')).toBeInTheDocument();
  });
});
