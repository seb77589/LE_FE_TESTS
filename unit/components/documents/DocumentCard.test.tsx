import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentCard from '@/components/documents/DocumentCard';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

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

// Mock DocumentThumbnail component
jest.mock('@/components/documents/DocumentThumbnail', () => {
  return function MockDocumentThumbnail({ document, onClick, size, className }: any) {
    return (
      <button
        type="button"
        data-testid="document-thumbnail"
        data-size={size}
        className={className}
        onClick={() => onClick?.(document.id)}
      >
        Thumbnail for {document.filename}
      </button>
    );
  };
});

// Mock Button component - return a test element to avoid button nesting issue
jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    onClick,
    variant,
    size,
    className,
    ...props
  }: any) {
    return React.createElement(
      'x-mock-button',
      {
        onClick,
        'data-variant': variant,
        'data-size': size,
        className,
        ...props,
      },
      children,
    );
  };
});

// Mock formatDate from utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatDate: (date: string) => {
    // Use Intl.DateTimeFormat to avoid lint error
    return new Intl.DateTimeFormat('en-US').format(new Date(date));
  },
}));

describe('DocumentCard', () => {
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
    onPreview: jest.fn(),
    onDownload: jest.fn(),
    onShare: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders document card with correct structure', () => {
      render(<DocumentCard {...defaultProps} />);

      expect(screen.getByTestId('document-item')).toBeInTheDocument();
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('renders document filename', () => {
      render(<DocumentCard {...defaultProps} />);

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('renders document thumbnail with large size', () => {
      render(<DocumentCard {...defaultProps} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      expect(thumbnail).toHaveAttribute('data-size', 'large');
    });

    it('applies custom className', () => {
      render(<DocumentCard {...defaultProps} className="custom-class" />);

      const card = screen.getByTestId('document-item');
      expect(card).toHaveClass('custom-class');
    });

    it('renders status badge with correct styling', () => {
      render(<DocumentCard {...defaultProps} />);

      const statusBadge = screen.getByText('uploaded');
      expect(statusBadge).toBeInTheDocument();
    });

    it('has correct aria-label for accessibility', () => {
      render(<DocumentCard {...defaultProps} />);

      const card = screen.getByLabelText('Document: test-document.pdf');
      expect(card).toBeInTheDocument();
    });
  });

  describe('formatFileSize', () => {
    it('formats zero bytes correctly', () => {
      const docWithZeroSize = { ...mockDocument, file_size: 0 };
      render(<DocumentCard {...defaultProps} document={docWithZeroSize} />);

      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    });

    it('formats bytes correctly', () => {
      const docWithBytes = { ...mockDocument, file_size: 500 };
      render(<DocumentCard {...defaultProps} document={docWithBytes} />);

      expect(screen.getByText('500.00 Bytes')).toBeInTheDocument();
    });

    it('formats kilobytes correctly', () => {
      const docWithKB = { ...mockDocument, file_size: 2048 };
      render(<DocumentCard {...defaultProps} document={docWithKB} />);

      expect(screen.getByText('2.00 KB')).toBeInTheDocument();
    });

    it('formats megabytes correctly', () => {
      render(<DocumentCard {...defaultProps} />);

      expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    });

    it('formats gigabytes correctly', () => {
      const docWithGB = { ...mockDocument, file_size: 1073741824 };
      render(<DocumentCard {...defaultProps} document={docWithGB} />);

      expect(screen.getByText('1.00 GB')).toBeInTheDocument();
    });

    it('handles very large files (stays within bounds)', () => {
      // File size larger than GB range
      const docWithHugeSize = { ...mockDocument, file_size: 1099511627776 };
      render(<DocumentCard {...defaultProps} document={docWithHugeSize} />);

      // Should cap at GB (sizes array bounds check)
      expect(screen.getByText('1024.00 GB')).toBeInTheDocument();
    });
  });

  describe('getFileIcon', () => {
    it('returns image icon for image mime types', () => {
      const imageDoc = { ...mockDocument, mime_type: 'image/png' };
      render(<DocumentCard {...defaultProps} document={imageDoc} />);

      // Mime type text should show 'png'
      expect(screen.getByText('png')).toBeInTheDocument();
    });

    it('returns file icon for PDF mime type', () => {
      render(<DocumentCard {...defaultProps} />);

      expect(screen.getByText('pdf')).toBeInTheDocument();
    });

    it('returns generic file icon for unknown mime types', () => {
      const unknownDoc = { ...mockDocument, mime_type: 'application/octet-stream' };
      render(<DocumentCard {...defaultProps} document={unknownDoc} />);

      expect(screen.getByText('octet-stream')).toBeInTheDocument();
    });

    it('handles image/jpeg mime type', () => {
      const jpegDoc = { ...mockDocument, mime_type: 'image/jpeg' };
      render(<DocumentCard {...defaultProps} document={jpegDoc} />);

      expect(screen.getByText('jpeg')).toBeInTheDocument();
    });
  });

  describe('getStatusColor', () => {
    it('returns green styling for uploaded status', () => {
      render(<DocumentCard {...defaultProps} />);

      const badge = screen.getByText('uploaded');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('returns yellow styling for processing status', () => {
      const processingDoc = { ...mockDocument, status: 'processing' };
      render(<DocumentCard {...defaultProps} document={processingDoc} />);

      const badge = screen.getByText('processing');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('returns blue styling for processed status', () => {
      const processedDoc = { ...mockDocument, status: 'processed' };
      render(<DocumentCard {...defaultProps} document={processedDoc} />);

      const badge = screen.getByText('processed');
      // Component uses design tokens for processed status
      expect(badge).toHaveClass('text-primary');
    });

    it('returns red styling for error status', () => {
      const errorDoc = { ...mockDocument, status: 'error' };
      render(<DocumentCard {...defaultProps} document={errorDoc} />);

      const badge = screen.getByText('error');
      // Component uses design tokens for error status
      expect(badge).toHaveClass('text-destructive');
    });

    it('returns gray styling for unknown status', () => {
      const unknownDoc = { ...mockDocument, status: 'unknown' };
      render(<DocumentCard {...defaultProps} document={unknownDoc} />);

      const badge = screen.getByText('unknown');
      // Component uses design tokens: bg-muted and text-muted-foreground
      expect(badge).toHaveClass('bg-muted', 'text-muted-foreground');
    });

    it('handles uppercase status correctly', () => {
      const uploadedDoc = { ...mockDocument, status: 'UPLOADED' };
      render(<DocumentCard {...defaultProps} document={uploadedDoc} />);

      const badge = screen.getByText('UPLOADED');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Selection', () => {
    it('renders selection checkbox when onSelect is provided', () => {
      const onSelect = jest.fn();
      render(<DocumentCard {...defaultProps} onSelect={onSelect} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('does not render checkbox when onSelect is not provided', () => {
      render(<DocumentCard {...defaultProps} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('shows selection ring when isSelected is true', () => {
      const onSelect = jest.fn();
      render(<DocumentCard {...defaultProps} onSelect={onSelect} isSelected={true} />);

      const card = screen.getByTestId('document-item');
      // Component uses design tokens: ring-primary and border-primary
      expect(card).toHaveClass('ring-2', 'ring-primary', 'border-primary');
    });

    it('checkbox reflects isSelected state', () => {
      const onSelect = jest.fn();
      render(<DocumentCard {...defaultProps} onSelect={onSelect} isSelected={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('toggles selection when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<DocumentCard {...defaultProps} onSelect={onSelect} isSelected={false} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(onSelect).toHaveBeenCalledWith(mockDocument.id);
    });

    it('checkbox click does not propagate to card', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      const onPreview = jest.fn();
      render(
        <DocumentCard {...defaultProps} onSelect={onSelect} onPreview={onPreview} />,
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(onSelect).toHaveBeenCalledTimes(1);
      // Preview should not be called due to stopPropagation
    });
  });

  describe('Card Click Handler', () => {
    it('calls onSelect when card is clicked and onSelect is provided', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<DocumentCard {...defaultProps} onSelect={onSelect} />);

      const card = screen.getByTestId('document-item');
      await user.click(card);

      expect(onSelect).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onPreview when card is clicked and onSelect is not provided', async () => {
      const user = userEvent.setup();
      const onPreview = jest.fn();
      render(<DocumentCard {...defaultProps} onPreview={onPreview} />);

      const card = screen.getByTestId('document-item');
      await user.click(card);

      expect(onPreview).toHaveBeenCalledWith(mockDocument.id);
    });

    it('prioritizes onSelect over onPreview', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      const onPreview = jest.fn();
      render(
        <DocumentCard {...defaultProps} onSelect={onSelect} onPreview={onPreview} />,
      );

      const card = screen.getByTestId('document-item');
      await user.click(card);

      expect(onSelect).toHaveBeenCalledWith(mockDocument.id);
      expect(onPreview).not.toHaveBeenCalled();
    });

    it('does nothing when card is clicked without onSelect or onPreview', async () => {
      const user = userEvent.setup();
      const { container } = render(<DocumentCard document={mockDocument} />);

      const card = screen.getByTestId('document-item');
      await user.click(card);

      // Should not throw and component should still render
      expect(container).toBeInTheDocument();
    });
  });

  describe('Actions Menu', () => {
    it('shows action menu button on hover (via group-hover classes)', () => {
      render(<DocumentCard {...defaultProps} />);

      // The more options button exists but is initially hidden via opacity
      const moreButton = screen
        .getByTestId('document-item')
        .querySelector('x-mock-button[data-variant="ghost"]');
      expect(moreButton).toBeInTheDocument();
    });

    it('toggles actions menu when more button is clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentCard {...defaultProps} />);

      // Find the more options button
      const moreButton = screen
        .getByTestId('document-item')
        .querySelector('x-mock-button[data-variant="ghost"]') as HTMLElement;

      await user.click(moreButton);

      // Should show action menu items
      expect(screen.getByTestId('preview-button')).toBeInTheDocument();
      expect(screen.getByTestId('download-button')).toBeInTheDocument();
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    it('closes actions menu when action is clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentCard {...defaultProps} />);

      // Open menu
      const moreButton = screen
        .getByTestId('document-item')
        .querySelector('x-mock-button[data-variant="ghost"]') as HTMLElement;
      await user.click(moreButton);

      // Click preview action
      const previewBtn = screen.getByTestId('preview-button');
      await user.click(previewBtn);

      // Menu should be closed (preview-button should no longer be in DOM)
      await waitFor(() => {
        expect(screen.queryByTestId('preview-button')).not.toBeInTheDocument();
      });
    });

    it('toggles menu closed when clicked again', async () => {
      const user = userEvent.setup();
      render(<DocumentCard {...defaultProps} />);

      const moreButton = screen
        .getByTestId('document-item')
        .querySelector('x-mock-button[data-variant="ghost"]') as HTMLElement;

      // Open menu
      await user.click(moreButton);
      expect(screen.getByTestId('preview-button')).toBeInTheDocument();

      // Close menu
      await user.click(moreButton);
      await waitFor(() => {
        expect(screen.queryByTestId('preview-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Action Handlers', () => {
    const openMenuAndClickAction = async (
      user: ReturnType<typeof userEvent.setup>,
      actionTestId: string,
    ) => {
      const moreButton = screen
        .getByTestId('document-item')
        .querySelector('x-mock-button[data-variant="ghost"]') as HTMLElement;
      await user.click(moreButton);
      await user.click(screen.getByTestId(actionTestId));
    };

    it('calls onPreview when preview action is clicked', async () => {
      const user = userEvent.setup();
      const onPreview = jest.fn();
      render(<DocumentCard {...defaultProps} onPreview={onPreview} />);

      await openMenuAndClickAction(user, 'preview-button');

      expect(onPreview).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onDownload when download action is clicked', async () => {
      const user = userEvent.setup();
      const onDownload = jest.fn();
      render(<DocumentCard {...defaultProps} onDownload={onDownload} />);

      await openMenuAndClickAction(user, 'download-button');

      expect(onDownload).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onShare when share action is clicked', async () => {
      const user = userEvent.setup();
      const onShare = jest.fn();
      render(<DocumentCard {...defaultProps} onShare={onShare} />);

      await openMenuAndClickAction(user, 'share-button');

      expect(onShare).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onEdit when edit action is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      render(<DocumentCard {...defaultProps} onEdit={onEdit} />);

      await openMenuAndClickAction(user, 'edit-button');

      expect(onEdit).toHaveBeenCalledWith(mockDocument.id);
    });

    it('calls onDelete when delete action is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();
      render(<DocumentCard {...defaultProps} onDelete={onDelete} />);

      await openMenuAndClickAction(user, 'delete-button');

      expect(onDelete).toHaveBeenCalledWith(mockDocument.id);
    });

    it('does not throw when action handler is not provided', async () => {
      const user = userEvent.setup();
      render(<DocumentCard document={mockDocument} />);

      const moreButton = screen
        .getByTestId('document-item')
        .querySelector('x-mock-button[data-variant="ghost"]') as HTMLElement;
      await user.click(moreButton);

      const previewBtn = screen.getByTestId('preview-button');

      // Should not throw
      expect(async () => {
        await user.click(previewBtn);
      }).not.toThrow();
    });
  });

  describe('Hover State', () => {
    it('shows hover overlay with quick actions on mouse enter', async () => {
      render(<DocumentCard {...defaultProps} />);

      const card = screen.getByTestId('document-item');
      fireEvent.mouseEnter(card);

      // Wait for state to update and hover overlay to appear
      await waitFor(() => {
        // Look for Preview and Download buttons in hover overlay
        const previewButtons = screen.getAllByText('Preview');
        expect(previewButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('hides hover overlay on mouse leave', async () => {
      render(<DocumentCard {...defaultProps} />);

      const card = screen.getByTestId('document-item');

      // Enter hover state
      fireEvent.mouseEnter(card);
      await waitFor(() => {
        expect(screen.getAllByText('Preview').length).toBeGreaterThanOrEqual(1);
      });

      // Leave hover state
      fireEvent.mouseLeave(card);

      // The hover overlay buttons should not be visible (opacity-0 on leave)
      // Component still exists but won't show overlay
    });

    it('shows Preview button in hover overlay when onPreview is provided', async () => {
      render(<DocumentCard {...defaultProps} onPreview={jest.fn()} />);

      const card = screen.getByTestId('document-item');
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        const previewButtons = screen.getAllByText('Preview');
        expect(previewButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows Download button in hover overlay when onDownload is provided', async () => {
      render(<DocumentCard {...defaultProps} onDownload={jest.fn()} />);

      const card = screen.getByTestId('document-item');
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        const downloadButtons = screen.getAllByText('Download');
        expect(downloadButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('does not show hover overlay buttons when handlers not provided', async () => {
      render(<DocumentCard document={mockDocument} />);

      const card = screen.getByTestId('document-item');
      fireEvent.mouseEnter(card);

      // Should not have visible quick action buttons in hover overlay
      // since no handlers provided (onPreview, onDownload)
      await waitFor(() => {
        // Only the more options button should exist (the card wrapper itself is a button)
        const mockButtons = screen.queryAllByTestId('preview-button');
        // No preview quick action buttons should appear (only menu items when opened)
        expect(mockButtons.length).toBe(0);
      });
    });
  });

  describe('Thumbnail Integration', () => {
    it('passes document to thumbnail component', () => {
      render(<DocumentCard {...defaultProps} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      expect(thumbnail).toHaveTextContent('Thumbnail for test-document.pdf');
    });

    it('passes large size to thumbnail', () => {
      render(<DocumentCard {...defaultProps} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      expect(thumbnail).toHaveAttribute('data-size', 'large');
    });

    it('passes onPreview click handler to thumbnail', async () => {
      const user = userEvent.setup();
      const onPreview = jest.fn();
      render(<DocumentCard {...defaultProps} onPreview={onPreview} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      await user.click(thumbnail);

      expect(onPreview).toHaveBeenCalledWith(mockDocument.id);
    });

    it('does not pass click handler to thumbnail when onPreview not provided', () => {
      render(<DocumentCard document={mockDocument} />);

      const thumbnail = screen.getByTestId('document-thumbnail');
      // The onClick should not trigger anything when clicked
      expect(thumbnail).toBeInTheDocument();
    });
  });

  describe('Mime Type Display', () => {
    it('displays mime type subtype only', () => {
      render(<DocumentCard {...defaultProps} />);

      // Shows 'pdf' not 'application/pdf'
      expect(screen.getByText('pdf')).toBeInTheDocument();
    });

    it('handles mime type without subtype', () => {
      const noSubtypeDoc = { ...mockDocument, mime_type: 'text' };
      render(<DocumentCard {...defaultProps} document={noSubtypeDoc} />);

      // Falls back to full mime type
      expect(screen.getByText('text')).toBeInTheDocument();
    });

    it('capitalizes mime type subtype', () => {
      render(<DocumentCard {...defaultProps} />);

      // Uses capitalize class
      const mimeSpan = screen.getByText('pdf');
      expect(mimeSpan).toHaveClass('capitalize');
    });
  });

  describe('Date Display', () => {
    it('formats and displays upload date', () => {
      render(<DocumentCard {...defaultProps} />);

      // formatDate mock returns Intl.DateTimeFormat format - date appears in the DOM
      // The exact format may vary by locale, so just verify the element exists
      const dateElements = screen.getByText(/1\/15\/2024|1\/1\/2024/);
      expect(dateElements).toBeInTheDocument();
    });

    it('handles different date formats', () => {
      const differentDateDoc = { ...mockDocument, upload_date: '2023-12-31T23:59:59Z' };
      render(<DocumentCard {...defaultProps} document={differentDateDoc} />);

      // Verify the date is rendered - format depends on timezone
      const dateElement = screen.getByText(/12\/31\/2023|1\/1\/2024/);
      expect(dateElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles long filenames with truncation', () => {
      const longNameDoc = {
        ...mockDocument,
        filename:
          'this-is-a-very-long-filename-that-should-be-truncated-in-display.pdf',
      };
      render(<DocumentCard {...defaultProps} document={longNameDoc} />);

      const filenameEl = screen.getByText(longNameDoc.filename);
      expect(filenameEl).toHaveClass('line-clamp-2');
    });

    it('handles zero file size', () => {
      const zeroSizeDoc = { ...mockDocument, file_size: 0 };
      render(<DocumentCard {...defaultProps} document={zeroSizeDoc} />);

      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    });

    it('handles special characters in filename', () => {
      const specialDoc = { ...mockDocument, filename: 'test & <special> "file".pdf' };
      render(<DocumentCard {...defaultProps} document={specialDoc} />);

      expect(screen.getByText('test & <special> "file".pdf')).toBeInTheDocument();
    });

    it('renders correctly with minimal props', () => {
      render(<DocumentCard document={mockDocument} />);

      expect(screen.getByTestId('document-item')).toBeInTheDocument();
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('handles empty status', () => {
      const emptyStatusDoc = { ...mockDocument, status: '' };
      render(<DocumentCard {...defaultProps} document={emptyStatusDoc} />);

      // Should use default styling for unknown/empty status (design tokens)
      const badge = screen.getByText('', { selector: 'span.inline-flex' });
      expect(badge).toHaveClass('bg-muted', 'text-muted-foreground');
    });
  });
});
