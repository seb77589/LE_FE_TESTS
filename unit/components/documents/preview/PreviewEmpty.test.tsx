/**
 * Tests for PreviewEmpty component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewEmpty } from '@/components/documents/preview/PreviewEmpty';

// Mock previewUtils
jest.mock('@/components/documents/preview/previewUtils', () => ({
  getFileIcon: jest.fn(() => <div data-testid="file-icon">File Icon</div>),
}));

describe('PreviewEmpty', () => {
  describe('Basic Rendering', () => {
    it('should render preview empty state', () => {
      render(<PreviewEmpty mimeType="application/pdf" />);
      expect(screen.getByText('No preview available')).toBeInTheDocument();
    });

    it('should render file icon', () => {
      render(<PreviewEmpty mimeType="application/pdf" />);
      expect(screen.getByTestId('file-icon')).toBeInTheDocument();
    });

    it('should display empty message', () => {
      render(<PreviewEmpty mimeType="image/jpeg" />);
      expect(screen.getByText('No preview available')).toBeInTheDocument();
    });
  });
});
