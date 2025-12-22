import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentPreview from '@/components/documents/DocumentPreview';

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

// Mock the useDocumentPreview hook
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockSetImageError = jest.fn();
let mockHookReturn: {
  previewData: any;
  isLoading: boolean;
  error: string | null;
  imageError: boolean;
  setImageError: jest.Mock;
  refetch: jest.Mock;
} = {
  previewData: null,
  isLoading: false,
  error: null,
  imageError: false,
  setImageError: mockSetImageError,
  refetch: mockRefetch,
};

jest.mock('@/hooks/documents/useDocumentPreview', () => ({
  useDocumentPreview: jest.fn(() => mockHookReturn),
}));

// Mock Modal component
jest.mock('@/components/ui/Modal', () => {
  return function MockModal({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) {
    if (!isOpen) return null;
    return (
      <dialog data-testid="modal" aria-label={title} open>
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        {children}
      </dialog>
    );
  };
});

// Mock preview components
jest.mock('../preview/ImagePreview', () => ({
  ImagePreview: function MockImagePreview({
    previewData,
    mimeType,
    imageError,
    onImageError,
  }: any) {
    return (
      <div data-testid="image-preview">
        <div>Image Preview</div>
        <div>Preview Type: {previewData?.preview_type}</div>
        <div>Mime Type: {mimeType}</div>
        {imageError && <div>Image Error</div>}
        <button onClick={onImageError} data-testid="trigger-image-error">
          Trigger Error
        </button>
      </div>
    );
  },
}));

jest.mock('../preview/PDFPreview', () => ({
  PDFPreview: function MockPDFPreview({
    previewData,
    imageError,
    onImageError,
  }: any) {
    return (
      <div data-testid="pdf-preview">
        <div>PDF Preview</div>
        <div>Preview Type: {previewData?.preview_type}</div>
        {imageError && <div>PDF Error</div>}
        <button onClick={onImageError} data-testid="trigger-pdf-error">
          Trigger Error
        </button>
      </div>
    );
  },
}));

jest.mock('../preview/InfoPreview', () => ({
  InfoPreview: function MockInfoPreview({
    previewData,
    mimeType,
    fileSize,
  }: any) {
    return (
      <div data-testid="info-preview">
        <div>Info Preview</div>
        <div>Preview Type: {previewData?.preview_type}</div>
        <div>Mime Type: {mimeType}</div>
        <div>File Size: {fileSize}</div>
      </div>
    );
  },
}));

jest.mock('../preview/DocumentInfo', () => ({
  DocumentInfo: function MockDocumentInfo({ document }: any) {
    return (
      <div data-testid="document-info">
        <div>Filename: {document.filename}</div>
        <div>Status: {document.status}</div>
      </div>
    );
  },
}));

jest.mock('../preview/PreviewActions', () => ({
  PreviewActions: function MockPreviewActions({
    onClose,
    onDownload,
    onShare,
  }: any) {
    return (
      <div data-testid="preview-actions">
        <button onClick={onClose} data-testid="action-close">
          Close
        </button>
        <button onClick={onDownload} data-testid="action-download">
          Download
        </button>
        <button onClick={onShare} data-testid="action-share">
          Share
        </button>
      </div>
    );
  },
}));

jest.mock('../preview/PreviewLoading', () => ({
  PreviewLoading: function MockPreviewLoading() {
    return <div data-testid="preview-loading">Loading...</div>;
  },
}));

jest.mock('../preview/PreviewError', () => ({
  PreviewError: function MockPreviewError({
    error,
    onRetry,
  }: {
    error: string;
    onRetry: () => void;
  }) {
    return (
      <div data-testid="preview-error">
        <div>Error: {error}</div>
        <button onClick={onRetry} data-testid="retry-button">
          Retry
        </button>
      </div>
    );
  },
}));

jest.mock('../preview/PreviewEmpty', () => ({
  PreviewEmpty: function MockPreviewEmpty({ mimeType }: { mimeType: string }) {
    return (
      <div data-testid="preview-empty">
        <div>No preview available</div>
        <div>Mime Type: {mimeType}</div>
      </div>
    );
  },
}));

// Mock window.open
const mockWindowOpen = jest.fn();
const originalWindowOpen = globalThis.window?.open;

beforeAll(() => {
  globalThis.window.open = mockWindowOpen;
});

afterAll(() => {
  if (originalWindowOpen) {
    globalThis.window.open = originalWindowOpen;
  }
});

describe('DocumentPreview', () => {
  const mockDocument = {
    id: 123,
    filename: 'test-document.pdf',
    mime_type: 'application/pdf',
    file_size: 1048576,
    upload_date: '2024-01-15T10:30:00Z',
    status: 'active',
  };

  const defaultProps = {
    documentId: 123,
    document: mockDocument,
    isOpen: true,
    onClose: jest.fn(),
    onDownload: jest.fn(),
    onShare: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = {
      previewData: null,
      isLoading: false,
      error: null,
      imageError: false,
      setImageError: mockSetImageError,
      refetch: mockRefetch,
    };
  });

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Document Preview');
    });

    it('does not render modal when isOpen is false', () => {
      render(<DocumentPreview {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when modal close is triggered', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DocumentPreview {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByTestId('modal-close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Document Info', () => {
    it('renders document info with correct data', () => {
      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('document-info')).toBeInTheDocument();
      expect(screen.getByText('Filename: test-document.pdf')).toBeInTheDocument();
      expect(screen.getByText('Status: active')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading component when isLoading is true', () => {
      mockHookReturn.isLoading = true;

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('preview-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not show preview content when loading', () => {
      mockHookReturn.isLoading = true;

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pdf-preview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('info-preview')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error component when there is an error', () => {
      mockHookReturn.error = 'Failed to load preview';

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('preview-error')).toBeInTheDocument();
      expect(screen.getByText('Error: Failed to load preview')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockHookReturn.error = 'Network error';

      render(<DocumentPreview {...defaultProps} />);

      await user.click(screen.getByTestId('retry-button'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('handles refetch rejection silently', async () => {
      const user = userEvent.setup();
      mockHookReturn.error = 'Network error';
      mockRefetch.mockRejectedValueOnce(new Error('Refetch failed'));

      render(<DocumentPreview {...defaultProps} />);

      // Should not throw
      await user.click(screen.getByTestId('retry-button'));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no previewData is available', () => {
      mockHookReturn.previewData = null;

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('preview-empty')).toBeInTheDocument();
      expect(screen.getByText('No preview available')).toBeInTheDocument();
      expect(screen.getByText('Mime Type: application/pdf')).toBeInTheDocument();
    });
  });

  describe('Image Preview', () => {
    it('renders ImagePreview for image preview type', () => {
      mockHookReturn.previewData = {
        preview_type: 'image',
        preview_url: 'http://example.com/image.jpg',
      };

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      expect(screen.getByText('Image Preview')).toBeInTheDocument();
      expect(screen.getByText('Preview Type: image')).toBeInTheDocument();
    });

    it('passes correct props to ImagePreview', () => {
      mockHookReturn.previewData = {
        preview_type: 'image',
        preview_url: 'http://example.com/image.jpg',
      };
      mockHookReturn.imageError = true;

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByText('Mime Type: application/pdf')).toBeInTheDocument();
      expect(screen.getByText('Image Error')).toBeInTheDocument();
    });

    it('triggers setImageError when image error occurs', async () => {
      const user = userEvent.setup();
      mockHookReturn.previewData = {
        preview_type: 'image',
        preview_url: 'http://example.com/image.jpg',
      };

      render(<DocumentPreview {...defaultProps} />);

      await user.click(screen.getByTestId('trigger-image-error'));

      expect(mockSetImageError).toHaveBeenCalledWith(true);
    });
  });

  describe('PDF Preview', () => {
    it('renders PDFPreview for pdf preview type', () => {
      mockHookReturn.previewData = {
        preview_type: 'pdf',
        preview_url: 'http://example.com/document.pdf',
      };

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument();
      expect(screen.getByText('PDF Preview')).toBeInTheDocument();
      expect(screen.getByText('Preview Type: pdf')).toBeInTheDocument();
    });

    it('passes imageError to PDFPreview', () => {
      mockHookReturn.previewData = {
        preview_type: 'pdf',
        preview_url: 'http://example.com/document.pdf',
      };
      mockHookReturn.imageError = true;

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByText('PDF Error')).toBeInTheDocument();
    });

    it('triggers setImageError from PDFPreview', async () => {
      const user = userEvent.setup();
      mockHookReturn.previewData = {
        preview_type: 'pdf',
        preview_url: 'http://example.com/document.pdf',
      };

      render(<DocumentPreview {...defaultProps} />);

      await user.click(screen.getByTestId('trigger-pdf-error'));

      expect(mockSetImageError).toHaveBeenCalledWith(true);
    });
  });

  describe('Info Preview', () => {
    it('renders InfoPreview for info preview type', () => {
      mockHookReturn.previewData = {
        preview_type: 'info',
        file_info: { name: 'test.docx' },
      };

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('info-preview')).toBeInTheDocument();
      expect(screen.getByText('Info Preview')).toBeInTheDocument();
      expect(screen.getByText('Preview Type: info')).toBeInTheDocument();
    });

    it('renders InfoPreview for unknown preview type (default case)', () => {
      mockHookReturn.previewData = {
        preview_type: 'unknown',
        some_data: 'value',
      };

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('info-preview')).toBeInTheDocument();
    });

    it('passes correct props to InfoPreview', () => {
      mockHookReturn.previewData = {
        preview_type: 'info',
        file_info: {},
      };

      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByText('File Size: 1048576')).toBeInTheDocument();
      expect(screen.getByText('Mime Type: application/pdf')).toBeInTheDocument();
    });
  });

  describe('Download Handler', () => {
    it('calls onDownload when provided', async () => {
      const user = userEvent.setup();
      const onDownload = jest.fn();
      render(<DocumentPreview {...defaultProps} onDownload={onDownload} />);

      await user.click(screen.getByTestId('action-download'));

      expect(onDownload).toHaveBeenCalledWith(123);
    });

    it('opens download URL in new window when onDownload not provided', async () => {
      const user = userEvent.setup();
      render(<DocumentPreview {...defaultProps} onDownload={undefined} />);

      await user.click(screen.getByTestId('action-download'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        '/api/v1/documents/123/download',
        '_blank'
      );
    });
  });

  describe('Share Handler', () => {
    it('calls onShare when provided', async () => {
      const user = userEvent.setup();
      const onShare = jest.fn();
      render(<DocumentPreview {...defaultProps} onShare={onShare} />);

      await user.click(screen.getByTestId('action-share'));

      expect(onShare).toHaveBeenCalledWith(123);
    });

    it('does nothing when onShare is not provided', async () => {
      const user = userEvent.setup();
      render(<DocumentPreview {...defaultProps} onShare={undefined} />);

      // Should not throw
      await user.click(screen.getByTestId('action-share'));
      
      // No error should occur
      expect(screen.getByTestId('action-share')).toBeInTheDocument();
    });
  });

  describe('Preview Actions', () => {
    it('renders PreviewActions component', () => {
      render(<DocumentPreview {...defaultProps} />);

      expect(screen.getByTestId('preview-actions')).toBeInTheDocument();
    });

    it('close action triggers onClose', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DocumentPreview {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByTestId('action-close'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Hook Integration', () => {
    it('passes correct documentId to useDocumentPreview', () => {
      const { useDocumentPreview } = require('@/hooks/documents/useDocumentPreview');

      render(<DocumentPreview {...defaultProps} documentId={456} />);

      expect(useDocumentPreview).toHaveBeenCalledWith({
        documentId: 456,
        isOpen: true,
      });
    });

    it('passes isOpen state to useDocumentPreview', () => {
      const { useDocumentPreview } = require('@/hooks/documents/useDocumentPreview');

      render(<DocumentPreview {...defaultProps} isOpen={false} />);

      expect(useDocumentPreview).toHaveBeenCalledWith({
        documentId: 123,
        isOpen: false,
      });
    });
  });

  describe('Different Document Types', () => {
    it('handles image document', () => {
      const imageDocument = {
        ...mockDocument,
        filename: 'photo.jpg',
        mime_type: 'image/jpeg',
      };
      mockHookReturn.previewData = {
        preview_type: 'image',
        preview_url: 'http://example.com/photo.jpg',
      };

      render(<DocumentPreview {...defaultProps} document={imageDocument} />);

      expect(screen.getByText('Filename: photo.jpg')).toBeInTheDocument();
      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
    });

    it('handles text document', () => {
      const textDocument = {
        ...mockDocument,
        filename: 'readme.txt',
        mime_type: 'text/plain',
      };
      mockHookReturn.previewData = {
        preview_type: 'info',
        content: 'text content',
      };

      render(<DocumentPreview {...defaultProps} document={textDocument} />);

      expect(screen.getByText('Filename: readme.txt')).toBeInTheDocument();
      expect(screen.getByTestId('info-preview')).toBeInTheDocument();
    });

    it('handles word document', () => {
      const wordDocument = {
        ...mockDocument,
        filename: 'document.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      mockHookReturn.previewData = null;

      render(<DocumentPreview {...defaultProps} document={wordDocument} />);

      expect(screen.getByTestId('preview-empty')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid open/close', () => {
      const { rerender } = render(<DocumentPreview {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<DocumentPreview {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<DocumentPreview {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles document id change', () => {
      const { useDocumentPreview } = require('@/hooks/documents/useDocumentPreview');
      const { rerender } = render(<DocumentPreview {...defaultProps} documentId={100} />);

      rerender(<DocumentPreview {...defaultProps} documentId={200} />);

      expect(useDocumentPreview).toHaveBeenLastCalledWith({
        documentId: 200,
        isOpen: true,
      });
    });

    it('handles missing optional props', () => {
      render(
        <DocumentPreview
          documentId={123}
          document={mockDocument}
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders correctly with zero file size', () => {
      const zeroSizeDoc = { ...mockDocument, file_size: 0 };
      mockHookReturn.previewData = { preview_type: 'info' };

      render(<DocumentPreview {...defaultProps} document={zeroSizeDoc} />);

      expect(screen.getByText('File Size: 0')).toBeInTheDocument();
    });
  });
});
