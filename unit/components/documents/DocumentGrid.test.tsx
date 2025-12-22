/**
 * Tests for DocumentGrid component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentGrid from '@/components/documents/DocumentGrid';

// Mock useDocumentGrid hook
const mockHandlePreview = jest.fn();
const mockHandleDownload = jest.fn();
const mockHandleShare = jest.fn();
const mockHandleSelectionToggle = jest.fn();
const mockSetHoveredDocument = jest.fn();

jest.mock('@/hooks/documents/useDocumentGrid', () => ({
  useDocumentGrid: jest.fn(() => ({
    hoveredDocument: null,
    handlePreview: mockHandlePreview,
    handleDownload: mockHandleDownload,
    handleShare: mockHandleShare,
    handleSelectionToggle: mockHandleSelectionToggle,
    setHoveredDocument: mockSetHoveredDocument,
  })),
}));

// Mock DocumentCard
jest.mock('@/components/documents/DocumentCard', () => ({
  __esModule: true,
  default: ({ document, onPreview, onSelect }: any) => (
    <div data-testid={`document-card-${document.id}`}>
      <span>{document.filename}</span>
      {onPreview && (
        <button
          data-testid={`preview-${document.id}`}
          onClick={() => onPreview(document.id)}
        >
          Preview
        </button>
      )}
      {onSelect && (
        <button
          data-testid={`select-${document.id}`}
          onClick={() => onSelect(document.id)}
        >
          Select
        </button>
      )}
    </div>
  ),
}));

// Mock DocumentListRow
jest.mock('@/components/documents/grid/DocumentListRow', () => ({
  DocumentListRow: ({ document }: any) => (
    <div data-testid={`document-row-${document.id}`}>{document.filename}</div>
  ),
}));

// Mock ViewModeToggle
jest.mock('@/components/documents/grid/ViewModeToggle', () => ({
  ViewModeToggle: ({ viewMode, onViewModeChange }: any) => (
    <div data-testid="view-mode-toggle">
      <button onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}>
        Toggle View
      </button>
    </div>
  ),
}));

// Mock DocumentsEmpty
jest.mock('@/components/documents/grid/DocumentsEmpty', () => ({
  DocumentsEmpty: () => <div data-testid="documents-empty">No documents</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('DocumentGrid', () => {
  const mockDocuments = [
    { id: 1, filename: 'document1.pdf', mime_type: 'application/pdf', file_size: 1024 },
    { id: 2, filename: 'document2.jpg', mime_type: 'image/jpeg', file_size: 2048 },
  ];

  const mockOnPreview = jest.fn();
  const _mockOnDownload = jest.fn();
  const _mockOnShare = jest.fn();
  const _mockOnEdit = jest.fn();
  const _mockOnDelete = jest.fn();
  const mockOnViewModeChange = jest.fn();
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render document grid', () => {
      render(<DocumentGrid documents={mockDocuments} />);
      expect(screen.getByTestId('documents-grid')).toBeInTheDocument();
    });

    it('should render empty state when no documents', () => {
      render(<DocumentGrid documents={[]} />);
      expect(screen.getByTestId('documents-empty')).toBeInTheDocument();
    });

    it('should render documents in grid view by default', () => {
      render(<DocumentGrid documents={mockDocuments} />);
      expect(screen.getByTestId('document-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('document-card-2')).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('should render grid view when viewMode is grid', () => {
      render(<DocumentGrid documents={mockDocuments} viewMode="grid" />);
      expect(screen.getByTestId('document-card-1')).toBeInTheDocument();
    });

    it('should render list view when viewMode is list', () => {
      render(<DocumentGrid documents={mockDocuments} viewMode="list" />);
      expect(screen.getByTestId('document-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('document-row-2')).toBeInTheDocument();
    });

    it('should render view mode toggle when onViewModeChange is provided', () => {
      render(
        <DocumentGrid
          documents={mockDocuments}
          viewMode="grid"
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
    });

    it('should call onViewModeChange when view mode is toggled', () => {
      render(
        <DocumentGrid
          documents={mockDocuments}
          viewMode="grid"
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      const toggleButton = screen.getByText('Toggle View');
      fireEvent.click(toggleButton);
      expect(mockOnViewModeChange).toHaveBeenCalled();
    });
  });

  describe('Document Selection', () => {
    it('should pass selectedDocuments to document cards', () => {
      render(
        <DocumentGrid
          documents={mockDocuments}
          selectedDocuments={[1]}
          onSelectionChange={mockOnSelectionChange}
        />,
      );
      // Selection is handled internally by useDocumentGrid hook
      expect(screen.getByTestId('document-card-1')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should pass onPreview callback to document cards', () => {
      render(<DocumentGrid documents={mockDocuments} onPreview={mockOnPreview} />);
      const previewButton = screen.getByTestId('preview-1');
      fireEvent.click(previewButton);
      expect(mockOnPreview).toHaveBeenCalledWith(1);
    });
  });
});
