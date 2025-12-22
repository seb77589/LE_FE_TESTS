/**
 * Tests for DocumentInfo component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocumentInfo } from '@/components/documents/preview/DocumentInfo';

// Mock formatDate utility
jest.mock('@/lib/utils', () => ({
  formatDate: jest.fn((date) => `Formatted: ${date}`),
}));

// Mock previewUtils
jest.mock('@/components/documents/preview/previewUtils', () => ({
  getFileIcon: jest.fn(() => <div data-testid="file-icon">File Icon</div>),
  formatFileSize: jest.fn((size) => `${size} bytes`),
}));

describe('DocumentInfo', () => {
  const mockDocument = {
    filename: 'test-document.pdf',
    mime_type: 'application/pdf',
    file_size: 1024,
    upload_date: '2025-01-01T00:00:00Z',
    status: 'uploaded',
  };

  describe('Basic Rendering', () => {
    it('should render document info', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('should display document filename', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('should display document mime type', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(screen.getByText(/Type: application\/pdf/i)).toBeInTheDocument();
    });

    it('should display document file size', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(screen.getByText(/Size: 1024 bytes/i)).toBeInTheDocument();
    });

    it('should display formatted upload date', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(
        screen.getByText(/Uploaded: Formatted: 2025-01-01T00:00:00Z/i),
      ).toBeInTheDocument();
    });

    it('should display document status', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(screen.getByText(/Status: uploaded/i)).toBeInTheDocument();
    });

    it('should render file icon', () => {
      render(<DocumentInfo document={mockDocument} />);
      expect(screen.getByTestId('file-icon')).toBeInTheDocument();
    });
  });
});
