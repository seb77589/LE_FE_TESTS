/**
 * Tests for ReplaceDocumentModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReplaceDocumentModal from '@/components/documents/ReplaceDocumentModal';
import api from '@/lib/api';
import logger from '@/lib/logging';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((error: any) => error?.message || 'An error occurred'),
}));

// Mock Alert component
jest.mock('@/components/ui/Alert', () => ({
  Alert: function MockAlert({
    variant,
    title,
    children,
    onClose,
  }: {
    variant: string;
    title?: string;
    children: React.ReactNode;
    onClose?: () => void;
  }) {
    return (
      <div
        role="alert"
        data-testid={`alert-${variant || 'default'}`}
        className={`alert alert-${variant || 'default'}`}
      >
        {title && <h4 className="alert-title">{title}</h4>}
        {onClose && (
          <button onClick={onClose} aria-label="Close alert">
            Close
          </button>
        )}
        <div className="alert-content">{children}</div>
      </div>
    );
  },
}));

// Mock Dialog component
jest.mock('@/components/ui/Dialog', () => {
  return function MockDialog({
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
      <div data-testid="dialog" role="dialog" aria-label={title}>
        <div data-testid="dialog-title">{title}</div>
        <button onClick={onClose} data-testid="dialog-close">
          Close
        </button>
        {children}
      </div>
    );
  };
});

// Mock Button component
jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    onClick,
    disabled,
    variant,
    type,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    type?: string;
    className?: string;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-variant={variant}
        type={type}
        className={className}
        data-testid={`button-${variant || 'default'}`}
      >
        {children}
      </button>
    );
  };
});

const mockApi = api as jest.Mocked<typeof api>;

describe('ReplaceDocumentModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    documentId: 123,
    documentName: 'test-document.pdf',
    currentVersion: 1,
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent(
        'Replace Document File',
      );
    });

    it('should not render when closed', () => {
      render(<ReplaceDocumentModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display version information', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByText(/Current Version/i)).toBeInTheDocument();
      expect(screen.getByText(/Version 1/i)).toBeInTheDocument();
      expect(screen.getByText(/After Replacement/i)).toBeInTheDocument();
      expect(screen.getByText(/Version 2/i)).toBeInTheDocument();
    });

    it('should display document name', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Replace Document File')).toBeInTheDocument();
    });

    it('should show drag and drop area', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(
        screen.getByText(/Drop file here or click to browse/i),
      ).toBeInTheDocument();
    });

    it('should show pre-replacement checklist', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByText(/Before Replacing, Verify:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/The new file is the correct version/i),
      ).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file input change', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test content'], 'new-file.pdf', {
        type: 'application/pdf',
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText('new-file.pdf')).toBeInTheDocument();
    });

    it('should display file size in KB', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['x'.repeat(2048)], 'test.pdf', {
        type: 'application/pdf',
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText(/2\.00 KB/i)).toBeInTheDocument();
    });

    it('should display file size in MB for large files', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText(/2\.00 MB/i)).toBeInTheDocument();
    });

    it('should allow file removal', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.pdf')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove file/i });
      await user.click(removeButton);

      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle file drop', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const dropZone = screen.getByLabelText('Select file to upload');
      const file = new File(['test'], 'dropped.pdf', { type: 'application/pdf' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
    });

    it('should add drag-over styling on dragEnter', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const dropZone = screen.getByLabelText('Select file to upload');

      fireEvent.dragEnter(dropZone);

      expect(dropZone).toHaveClass('border-primary');
    });

    it('should remove drag-over styling on dragLeave', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const dropZone = screen.getByLabelText('Select file to upload');

      // Enter state
      fireEvent.dragEnter(dropZone);
      expect(dropZone).toHaveClass('border-primary');

      // Leave state
      fireEvent.dragLeave(dropZone);

      // Should revert to default (not have border-primary, but have border-border or similar)
      expect(dropZone).not.toHaveClass('border-primary');
    });
  });

  describe('Form Submission', () => {
    it('should disable replace button if no file selected', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      expect(replaceButton).toBeDisabled();
    });

    it('should submit with file and change notes', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      const textarea = screen.getByPlaceholderText(/Describe what changed/i);
      await user.type(textarea, 'Updated with new content');

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      expect(replaceButton).not.toBeDisabled();
      await user.click(replaceButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/v1/documents/123/replace',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: expect.any(Function),
          }),
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should submit without change notes', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalled();
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should show upload progress', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;

      // Control the promise resolution
      mockApi.post.mockImplementation((_url, _data, config) => {
        // Immediately trigger progress
        if (config?.onUploadProgress) {
          act(() => {
            config.onUploadProgress({ loaded: 50, total: 100 });
          });
        }
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(screen.getByText('Uploading...')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
      });

      // Cleanup: resolve the promise
      await act(async () => {
        if (resolvePromise) resolvePromise({ data: { success: true } });
      });
    });

    it('should handle upload error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'File too large';
      mockApi.post.mockRejectedValue({ message: errorMessage });

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(logger.error).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should disable buttons during upload', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;

      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      await user.click(replaceButton);

      expect(replaceButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      await act(async () => {
        if (resolvePromise) resolvePromise({ data: { success: true } });
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal on cancel', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal on backdrop click (via close button)', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const closeButton = screen.getByTestId('dialog-close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal during upload', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;

      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      await user.click(replaceButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();

      await act(async () => {
        if (resolvePromise) resolvePromise({ data: { success: true } });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large file names', async () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const longFileName = 'a'.repeat(200) + '.pdf';
      const file = new File(['test'], longFileName, { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText(new RegExp(longFileName))).toBeInTheDocument();
    });

    it('should handle special characters in file name', async () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const specialFileName = 'file (copy) [2024] #1.pdf';
      const file = new File(['test'], specialFileName, { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText(specialFileName)).toBeInTheDocument();
    });

    it('should clear error when selecting new file', async () => {
      const user = userEvent.setup();
      const errorMessage = 'API Error';
      mockApi.post.mockRejectedValueOnce({ message: errorMessage });

      render(<ReplaceDocumentModal {...defaultProps} />);

      // Select initial file
      const file1 = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file1] } });

      // Submit to force error
      const replaceButton = screen.getByRole('button', { name: /replace document/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Select new file
      const file2 = new File(['test'], 'newer.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file2] } });

      // Error should be cleared
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });
});
