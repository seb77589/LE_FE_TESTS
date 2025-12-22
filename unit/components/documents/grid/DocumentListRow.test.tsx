import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DocumentListRow } from '@/components/documents/grid/DocumentListRow';

// Mock logger
jest.mock('@/lib/logging', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Mock i18n
jest.mock('@/lib/i18n', () => ({
  i18n: {
    getCurrentLocale: jest.fn(() => 'en'),
    setLocale: jest.fn(),
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock DocumentThumbnail component
jest.mock('@/components/documents/DocumentThumbnail', () => {
  return function MockDocumentThumbnail({ document, onClick, size }: any) {
    return (
      <button
        type="button"
        data-testid="document-thumbnail"
        data-size={size}
        onClick={() => onClick?.(document.id)}
      >
        Thumbnail for {document.filename}
      </button>
    );
  };
});

// Mock Button component
jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    onClick,
    variant,
    size,
    className,
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
  }: any) {
    return (
      <button
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        className={className}
        aria-label={ariaLabel}
        data-testid={dataTestId}
      >
        {children}
      </button>
    );
  };
});

// Mock gridUtils
jest.mock('@/components/documents/grid/gridUtils', () => ({
  formatFileSize: (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  getFileIcon: (mimeType: string) => {
    return <span data-testid={`file-icon-${mimeType.replace('/', '-')}`} />;
  },
}));

// Mock formatDate from utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatDate: (date: string) => {
    return new Intl.DateTimeFormat('en-US').format(new Date(date));
  },
}));

describe('DocumentListRow', () => {
  const mockDocument = {
    id: 1,
    filename: 'test-document.pdf',
    mime_type: 'application/pdf',
    file_size: 1048576, // 1 MB
    upload_date: '2024-01-15T10:30:00Z',
    status: 'uploaded',
  };

  const defaultProps = {
    document: mockDocument,
    isSelected: false,
    hoveredDocument: null,
    onSelect: jest.fn(),
    onPreview: jest.fn(),
    onDownload: jest.fn(),
    onShare: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onSelectionToggle: jest.fn(),
    onMouseEnter: jest.fn(),
    onMouseLeave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders list row with correct structure', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('renders document filename', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('renders document mime type', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });

    it('renders formatted file size', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });

    it('renders formatted upload date', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    });

    it('renders document thumbnail with small size', () => {
      render(<DocumentListRow {...defaultProps} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      expect(thumbnail).toHaveAttribute('data-size', 'small');
    });

    it('renders file type icon', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByTestId('file-icon-application-pdf')).toBeInTheDocument();
    });

    it('sets filename as title attribute for tooltip', () => {
      render(<DocumentListRow {...defaultProps} />);

      const heading = screen.getByRole('heading', { name: 'test-document.pdf' });
      expect(heading).toHaveAttribute('title', 'test-document.pdf');
    });
  });

  describe('Selection', () => {
    it('renders checkbox when onSelect is provided', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('does not render checkbox when onSelect is not provided', () => {
      const { onSelect, ...propsWithoutSelect } = defaultProps;
      render(<DocumentListRow {...propsWithoutSelect} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('checkbox reflects isSelected state (unchecked)', () => {
      render(<DocumentListRow {...defaultProps} isSelected={false} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('checkbox reflects isSelected state (checked)', () => {
      render(<DocumentListRow {...defaultProps} isSelected={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls onSelectionToggle when checkbox is changed', async () => {
      const user = userEvent.setup();
      const onSelectionToggle = jest.fn();
      render(<DocumentListRow {...defaultProps} onSelectionToggle={onSelectionToggle} />);

      await user.click(screen.getByRole('checkbox'));

      expect(onSelectionToggle).toHaveBeenCalledWith(mockDocument.id);
    });

    it('shows selection ring when isSelected is true', () => {
      render(<DocumentListRow {...defaultProps} isSelected={true} />);

      const row = screen.getByRole('listitem');
      expect(row).toHaveClass('ring-2', 'ring-blue-500', 'border-blue-500');
    });

    it('does not show selection ring when isSelected is false', () => {
      render(<DocumentListRow {...defaultProps} isSelected={false} />);

      const row = screen.getByRole('listitem');
      expect(row).not.toHaveClass('ring-2');
    });
  });

  describe('Mouse Events', () => {
    it('calls onMouseEnter with document id when mouse enters', () => {
      const onMouseEnter = jest.fn();
      render(<DocumentListRow {...defaultProps} onMouseEnter={onMouseEnter} />);

      const row = screen.getByRole('listitem');
      fireEvent.mouseEnter(row);

      expect(onMouseEnter).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onMouseLeave when mouse leaves', () => {
      const onMouseLeave = jest.fn();
      render(<DocumentListRow {...defaultProps} onMouseLeave={onMouseLeave} />);

      const row = screen.getByRole('listitem');
      fireEvent.mouseLeave(row);

      expect(onMouseLeave).toHaveBeenCalled();
    });
  });

  describe('Thumbnail Click', () => {
    it('calls onSelect when thumbnail button is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<DocumentListRow {...defaultProps} onSelect={onSelect} />);

      // Find the button wrapper around thumbnail
      const thumbnailButton = screen.getByLabelText(`Select document ${mockDocument.filename}`);
      await user.click(thumbnailButton);

      expect(onSelect).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onSelect when thumbnail itself is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<DocumentListRow {...defaultProps} onSelect={onSelect} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      await user.click(thumbnail);

      expect(onSelect).toHaveBeenCalledWith(mockDocument.id);
    });
  });

  describe('Action Buttons', () => {
    it('renders preview button', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByTestId('preview-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Preview')).toBeInTheDocument();
    });

    it('renders download button', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByTestId('download-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Download')).toBeInTheDocument();
    });

    it('renders share button', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByTestId('share-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Share')).toBeInTheDocument();
    });

    it('renders rename button when onEdit is provided', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByTestId('rename-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Rename')).toBeInTheDocument();
    });

    it('does not render rename button when onEdit is not provided', () => {
      const { onEdit, ...propsWithoutEdit } = defaultProps;
      render(<DocumentListRow {...propsWithoutEdit} />);

      expect(screen.queryByTestId('rename-button')).not.toBeInTheDocument();
    });

    it('renders delete button when onDelete is provided', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete')).toBeInTheDocument();
    });

    it('does not render delete button when onDelete is not provided', () => {
      const { onDelete, ...propsWithoutDelete } = defaultProps;
      render(<DocumentListRow {...propsWithoutDelete} />);

      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
    });

    it('delete button has red text styling', () => {
      render(<DocumentListRow {...defaultProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      expect(deleteButton).toHaveClass('text-red-600', 'hover:text-red-700');
    });
  });

  describe('Action Handlers', () => {
    it('calls onPreview when preview button is clicked', async () => {
      const user = userEvent.setup();
      const onPreview = jest.fn();
      render(<DocumentListRow {...defaultProps} onPreview={onPreview} />);

      await user.click(screen.getByTestId('preview-button'));

      expect(onPreview).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onDownload when download button is clicked', async () => {
      const user = userEvent.setup();
      const onDownload = jest.fn();
      render(<DocumentListRow {...defaultProps} onDownload={onDownload} />);

      await user.click(screen.getByTestId('download-button'));

      expect(onDownload).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onShare when share button is clicked', async () => {
      const user = userEvent.setup();
      const onShare = jest.fn();
      render(<DocumentListRow {...defaultProps} onShare={onShare} />);

      await user.click(screen.getByTestId('share-button'));

      expect(onShare).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onEdit when rename button is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      render(<DocumentListRow {...defaultProps} onEdit={onEdit} />);

      await user.click(screen.getByTestId('rename-button'));

      expect(onEdit).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();
      render(<DocumentListRow {...defaultProps} onDelete={onDelete} />);

      await user.click(screen.getByTestId('delete-button'));

      expect(onDelete).toHaveBeenCalledWith(mockDocument.id);
    });
  });

  describe('Different Document Types', () => {
    it('handles image documents', () => {
      const imageDoc = {
        ...mockDocument,
        filename: 'photo.jpg',
        mime_type: 'image/jpeg',
      };
      render(<DocumentListRow {...defaultProps} document={imageDoc} />);

      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
      expect(screen.getByText('image/jpeg')).toBeInTheDocument();
      expect(screen.getByTestId('file-icon-image-jpeg')).toBeInTheDocument();
    });

    it('handles text documents', () => {
      const textDoc = {
        ...mockDocument,
        filename: 'readme.txt',
        mime_type: 'text/plain',
      };
      render(<DocumentListRow {...defaultProps} document={textDoc} />);

      expect(screen.getByText('readme.txt')).toBeInTheDocument();
      expect(screen.getByText('text/plain')).toBeInTheDocument();
    });

    it('handles word documents', () => {
      const wordDoc = {
        ...mockDocument,
        filename: 'document.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      render(<DocumentListRow {...defaultProps} document={wordDoc} />);

      expect(screen.getByText('document.docx')).toBeInTheDocument();
    });
  });

  describe('File Size Formatting', () => {
    it('formats bytes correctly', () => {
      const smallDoc = { ...mockDocument, file_size: 500 };
      render(<DocumentListRow {...defaultProps} document={smallDoc} />);

      expect(screen.getByText('500 Bytes')).toBeInTheDocument();
    });

    it('formats kilobytes correctly', () => {
      const kbDoc = { ...mockDocument, file_size: 2048 };
      render(<DocumentListRow {...defaultProps} document={kbDoc} />);

      expect(screen.getByText('2 KB')).toBeInTheDocument();
    });

    it('formats megabytes correctly', () => {
      render(<DocumentListRow {...defaultProps} />);

      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });

    it('formats gigabytes correctly', () => {
      const gbDoc = { ...mockDocument, file_size: 1073741824 };
      render(<DocumentListRow {...defaultProps} document={gbDoc} />);

      expect(screen.getByText('1 GB')).toBeInTheDocument();
    });

    it('handles zero bytes', () => {
      const zeroDoc = { ...mockDocument, file_size: 0 };
      render(<DocumentListRow {...defaultProps} document={zeroDoc} />);

      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles long filenames', () => {
      const longNameDoc = {
        ...mockDocument,
        filename: 'this-is-a-very-long-filename-that-might-need-truncation.pdf',
      };
      render(<DocumentListRow {...defaultProps} document={longNameDoc} />);

      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('truncate');
      expect(heading).toHaveTextContent(longNameDoc.filename);
    });

    it('handles special characters in filename', () => {
      const specialDoc = {
        ...mockDocument,
        filename: 'test & <special> "file".pdf',
      };
      render(<DocumentListRow {...defaultProps} document={specialDoc} />);

      expect(screen.getByText('test & <special> "file".pdf')).toBeInTheDocument();
    });

    it('renders with minimal required props', () => {
      const minimalProps = {
        document: mockDocument,
        isSelected: false,
        hoveredDocument: null,
        onPreview: jest.fn(),
        onDownload: jest.fn(),
        onShare: jest.fn(),
        onSelectionToggle: jest.fn(),
        onMouseEnter: jest.fn(),
        onMouseLeave: jest.fn(),
      };
      render(<DocumentListRow {...minimalProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('handles different document IDs', () => {
      const doc123 = { ...mockDocument, id: 123 };
      const onPreview = jest.fn();
      render(<DocumentListRow {...defaultProps} document={doc123} onPreview={onPreview} />);

      fireEvent.click(screen.getByTestId('preview-button'));

      expect(onPreview).toHaveBeenCalledWith(123);
    });
  });

  describe('Button Variants and Sizes', () => {
    it('action buttons use ghost variant', () => {
      render(<DocumentListRow {...defaultProps} />);

      const previewButton = screen.getByTestId('preview-button');
      expect(previewButton).toHaveAttribute('data-variant', 'ghost');
    });

    it('action buttons use sm size', () => {
      render(<DocumentListRow {...defaultProps} />);

      const previewButton = screen.getByTestId('preview-button');
      expect(previewButton).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Hover State', () => {
    it('applies hover styling via CSS classes', () => {
      render(<DocumentListRow {...defaultProps} />);

      const row = screen.getByRole('listitem');
      expect(row).toHaveClass('hover:shadow-md');
    });

    it('tracks hoveredDocument prop', () => {
      const { rerender } = render(
        <DocumentListRow {...defaultProps} hoveredDocument={null} />
      );

      // Re-render with different hovered document
      rerender(<DocumentListRow {...defaultProps} hoveredDocument={1} />);

      // Component should handle hoveredDocument prop (used for external state management)
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });
  });
});
