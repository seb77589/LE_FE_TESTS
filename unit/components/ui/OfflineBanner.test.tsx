/**
 * Tests for OfflineBanner component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// Mock AppStateContext
const mockUseAppState = jest.fn();
jest.mock('@/lib/context/AppStateContext', () => ({
  useAppState: () => mockUseAppState(),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render banner when offline', () => {
      mockUseAppState.mockReturnValue({ online: false });
      render(<OfflineBanner />);
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    it('should not render banner when online', () => {
      mockUseAppState.mockReturnValue({ online: true });
      const { container } = render(<OfflineBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('should display offline message', () => {
      mockUseAppState.mockReturnValue({ online: false });
      render(<OfflineBanner />);
      expect(screen.getByText(/some features may be unavailable/i)).toBeInTheDocument();
    });
  });
});
