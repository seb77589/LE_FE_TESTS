/**
 * Tests for SettingsTabs component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

import { useSearchParams } from 'next/navigation';

const mockUseSearchParams = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;

describe('SettingsTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render settings tabs', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    render(<SettingsTabs />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Data')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('should highlight active tab from search params', () => {
    const mockSearchParams = new URLSearchParams('tab=security');
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    render(<SettingsTabs />);

    const securityTab = screen.getByText('Security').closest('a');
    // Component uses design tokens: border-primary and text-primary
    expect(securityTab).toHaveClass('border-primary', 'text-primary');
  });

  it('should use default activeTab when no search param', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    render(<SettingsTabs activeTab="general" />);

    const generalTab = screen.getByText('General').closest('a');
    // Component uses design tokens: border-primary and text-primary
    expect(generalTab).toHaveClass('border-primary', 'text-primary');
  });

  it('should use custom activeTab prop', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    render(<SettingsTabs activeTab="privacy" />);

    const privacyTab = screen.getByText('Privacy & Data').closest('a');
    // Component uses design tokens: border-primary and text-primary
    expect(privacyTab).toHaveClass('border-primary', 'text-primary');
  });

  it('should render all tabs with correct hrefs', () => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    render(<SettingsTabs />);

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
