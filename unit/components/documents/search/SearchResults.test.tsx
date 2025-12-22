/**
 * @fileoverview Tests for SearchResults component
 * @description Tests the search results display with highlighting and actions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchResults } from '@/components/documents/search/SearchResults';
import type { SearchResultItem } from '@/types/search';

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html: string) => html),
}));

// Mock datetime utils
jest.mock('@/lib/utils/datetime', () => ({
  formatDate: jest.fn((date: string) => '12/1/2024'),
}));

const mockResults: SearchResultItem[] = [
  {
    document: {
      id: 1,
      filename: 'contract.pdf',
      original_filename: 'contract.pdf',
      file_path: '/uploads/contract.pdf',
      file_size: 1024 * 1024, // 1MB
      mime_type: 'application/pdf',
      upload_date: '2024-12-01T10:00:00Z',
      status: 'uploaded',
      owner_id: 1,
    },
    rank: 0.95,
    filename_highlight: '<mark>contract</mark>.pdf',
    content_highlight: 'This is a <mark>contract</mark> for services...',
  },
  {
    document: {
      id: 2,
      filename: 'agreement.docx',
      original_filename: 'agreement.docx',
      file_path: '/uploads/agreement.docx',
      file_size: 512 * 1024, // 512KB
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upload_date: '2024-12-02T14:30:00Z',
      status: 'processed',
      owner_id: 1,
    },
    rank: 0.72,
    filename_highlight: undefined,
    content_highlight: undefined,
  },
];

describe('SearchResults', () => {
  describe('rendering', () => {
    it('renders search results with documents', () => {
      const { container } = render(<SearchResults results={mockResults} total={2} />);

      // Check the header text contains total count
      expect(container.textContent).toContain('Found');
      expect(container.textContent).toContain('documents');
    });

    it('renders singular "document" when total is 1', () => {
      const { container } = render(<SearchResults results={[mockResults[0]]} total={1} />);

      // The text is "Found 1 document" vs "Found 2 documents"
      expect(container.textContent).toContain('Found');
      // Should contain 'document' but not 'documents'
      expect(container.textContent).toMatch(/1 document[^s]/);
    });

    it('displays response time when provided', () => {
      render(<SearchResults results={mockResults} total={2} responseTimeMs={150} />);

      expect(screen.getByText('(150ms)')).toBeInTheDocument();
    });

    it('shows loading skeleton when isLoading is true', () => {
      render(<SearchResults results={[]} isLoading={true} />);

      // Skeleton has animate-pulse class
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows empty state when no results and query provided', () => {
      render(<SearchResults results={[]} query="missing" />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(
        screen.getByText(/No documents match "missing"/)
      ).toBeInTheDocument();
    });

    it('shows empty state message for no query', () => {
      render(<SearchResults results={[]} />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(
        screen.getByText('Enter a search query to find documents.')
      ).toBeInTheDocument();
    });
  });

  describe('result cards', () => {
    it('displays document filename', () => {
      render(<SearchResults results={mockResults} total={2} />);

      // The second document has no highlight, so it uses the plain filename
      expect(screen.getByText('agreement.docx')).toBeInTheDocument();
    });

    it('displays relevance badge with percentage', () => {
      render(<SearchResults results={mockResults} total={2} />);

      expect(screen.getByText('95% match')).toBeInTheDocument();
      expect(screen.getByText('72% match')).toBeInTheDocument();
    });

    it('displays file size formatted', () => {
      render(<SearchResults results={mockResults} total={2} />);

      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('512 KB')).toBeInTheDocument();
    });

    it('renders highlighted content when provided', () => {
      const { container } = render(<SearchResults results={mockResults} total={2} />);

      // Check that mark tags are rendered (through SafeHighlight)
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBeGreaterThan(0);
    });
  });

  describe('actions', () => {
    it('calls onPreview when preview button clicked', () => {
      const onPreview = jest.fn();
      render(
        <SearchResults results={mockResults} total={2} onPreview={onPreview} />
      );

      const previewButtons = screen.getAllByTitle('Preview');
      fireEvent.click(previewButtons[0]);

      expect(onPreview).toHaveBeenCalledWith(1);
    });

    it('calls onDownload when download button clicked', () => {
      const onDownload = jest.fn();
      render(
        <SearchResults results={mockResults} total={2} onDownload={onDownload} />
      );

      const downloadButtons = screen.getAllByTitle('Download');
      fireEvent.click(downloadButtons[0]);

      expect(onDownload).toHaveBeenCalledWith(1);
    });

    it('calls onShare when share button clicked', () => {
      const onShare = jest.fn();
      render(
        <SearchResults results={mockResults} total={2} onShare={onShare} />
      );

      const shareButtons = screen.getAllByTitle('Share');
      fireEvent.click(shareButtons[0]);

      expect(onShare).toHaveBeenCalledWith(1);
    });

    it('does not render action buttons when callbacks not provided', () => {
      render(<SearchResults results={mockResults} total={2} />);

      expect(screen.queryByTitle('Preview')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Download')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Share')).not.toBeInTheDocument();
    });
  });

  describe('relevance badge colors', () => {
    it('shows green badge for high relevance (>= 0.8)', () => {
      const highRelevanceResult: SearchResultItem[] = [
        {
          ...mockResults[0],
          rank: 0.85,
        },
      ];

      const { container } = render(
        <SearchResults results={highRelevanceResult} total={1} />
      );

      const badge = container.querySelector('.bg-green-100');
      expect(badge).toBeInTheDocument();
    });

    it('shows yellow badge for medium relevance (0.5 - 0.8)', () => {
      const mediumRelevanceResult: SearchResultItem[] = [
        {
          ...mockResults[0],
          rank: 0.65,
        },
      ];

      const { container } = render(
        <SearchResults results={mediumRelevanceResult} total={1} />
      );

      const badge = container.querySelector('.bg-yellow-100');
      expect(badge).toBeInTheDocument();
    });

    it('shows gray badge for low relevance (< 0.5)', () => {
      const lowRelevanceResult: SearchResultItem[] = [
        {
          ...mockResults[0],
          rank: 0.35,
        },
      ];

      const { container } = render(
        <SearchResults results={lowRelevanceResult} total={1} />
      );

      const badge = container.querySelector('.bg-gray-100');
      expect(badge).toBeInTheDocument();
    });
  });
});
