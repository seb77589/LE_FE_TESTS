/**
 * Tests for PreviewActions component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewActions } from '@/components/documents/preview/PreviewActions';

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon">Download</div>,
  Share: () => <div data-testid="share-icon">Share</div>,
}));

describe('PreviewActions', () => {
  const mockOnClose = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render preview actions', () => {
      render(
        <PreviewActions
          onClose={mockOnClose}
          onDownload={mockOnDownload}
          onShare={mockOnShare}
        />,
      );
      expect(screen.getByText('Close')).toBeInTheDocument();
      const downloadElements = screen.getAllByText('Download');
      expect(downloadElements.length).toBeGreaterThan(0);
      const shareElements = screen.getAllByText('Share');
      expect(shareElements.length).toBeGreaterThan(0);
    });

    it('should render download icon', () => {
      render(
        <PreviewActions
          onClose={mockOnClose}
          onDownload={mockOnDownload}
          onShare={mockOnShare}
        />,
      );
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('should render share icon', () => {
      render(
        <PreviewActions
          onClose={mockOnClose}
          onDownload={mockOnDownload}
          onShare={mockOnShare}
        />,
      );
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <PreviewActions
          onClose={mockOnClose}
          onDownload={mockOnDownload}
          onShare={mockOnShare}
        />,
      );
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onDownload when download button is clicked', () => {
      render(
        <PreviewActions
          onClose={mockOnClose}
          onDownload={mockOnDownload}
          onShare={mockOnShare}
        />,
      );
      const buttons = screen.getAllByRole('button');
      // Find button that contains Download text (may include icon text)
      const downloadBtn = buttons.find((btn) => {
        const text = btn.textContent || '';
        return text.includes('Download') && text.trim().length > 8; // Button text is longer than icon text
      });
      expect(downloadBtn).toBeTruthy();
      if (downloadBtn) {
        fireEvent.click(downloadBtn);
        expect(mockOnDownload).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onShare when share button is clicked', () => {
      render(
        <PreviewActions
          onClose={mockOnClose}
          onDownload={mockOnDownload}
          onShare={mockOnShare}
        />,
      );
      const buttons = screen.getAllByRole('button');
      // Find button that contains Share text (may include icon text)
      const shareBtn = buttons.find((btn) => {
        const text = btn.textContent || '';
        return text.includes('Share') && text.trim().length > 5; // Button text is longer than icon text
      });
      expect(shareBtn).toBeTruthy();
      if (shareBtn) {
        fireEvent.click(shareBtn);
        expect(mockOnShare).toHaveBeenCalledTimes(1);
      }
    });
  });
});
