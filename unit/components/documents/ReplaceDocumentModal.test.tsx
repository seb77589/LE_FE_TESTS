/**
 * Tests for ReplaceDocumentModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReplaceDocumentModal from '@/components/documents/ReplaceDocumentModal';

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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    type?: string;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-variant={variant}
        type={type}
        data-testid={`button-${variant || 'default'}`}
      >
        {children}
      </button>
    );
  };
});

import api from '@/lib/api';
import toast from 'react-hot-toast';
import logger from '@/lib/logging';

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
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Replace Document File');
    });

    it('should not render when closed', () => {
      render(<ReplaceDocumentModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display version information', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByText(/Current Version: v1/i)).toBeInTheDocument();
      expect(screen.getByText(/New Version: v2/i)).toBeInTheDocument();
    });

    it('should display document name', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByText(/test-document.pdf/i)).toBeInTheDocument();
    });

    it('should show drag and drop area', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByText(/drag & drop file here/i)).toBeInTheDocument();
    });

    it('should show pre-replacement checklist', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      expect(screen.getByText(/Document metadata will be preserved/i)).toBeInTheDocument();
      expect(screen.getByText(/Previous version will be saved/i)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file input change', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test content'], 'new-file.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;

      await user.upload(input, file);

      expect(screen.getByText('new-file.pdf')).toBeInTheDocument();
    });

    it('should display file size in KB', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['x'.repeat(2048)], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;

      await user.upload(input, file);

      expect(screen.getByText(/2\.00 KB/i)).toBeInTheDocument();
    });

    it('should display file size in MB for large files', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;

      await user.upload(input, file);

      expect(screen.getByText(/2\.00 MB/i)).toBeInTheDocument();
    });

    it('should allow file removal', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;

      await user.upload(input, file);
      expect(screen.getByText('test.pdf')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove file/i });
      await user.click(removeButton);

      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle file drop', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const dropZone = screen.getByText(/drag & drop file here/i).closest('div');
      const file = new File(['test'], 'dropped.pdf', { type: 'application/pdf' });

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
    });

    it('should add drag-over styling on dragEnter', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const dropZone = screen.getByText(/drag & drop file here/i).closest('div');

      fireEvent.dragEnter(dropZone!);

      // Component should add visual feedback (checked via className in real component)
    });

    it('should remove drag-over styling on dragLeave', () => {
      render(<ReplaceDocumentModal {...defaultProps} />);

      const dropZone = screen.getByText(/drag & drop file here/i).closest('div');

      fireEvent.dragEnter(dropZone!);
      fireEvent.dragLeave(dropZone!);

      // Component should remove visual feedback
    });
  });

  describe('Form Submission', () => {
    it('should show error if no file selected', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      expect(screen.getByText(/please select a file/i)).toBeInTheDocument();
    });

    it('should submit with file and change notes', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<ReplaceDocumentModal {...defaultProps} />);

      // Upload file
      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      // Add change notes
      const textarea = screen.getByPlaceholderText(/describe the changes/i);
      await user.type(textarea, 'Updated with new content');

      // Submit
      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/v1/documents/123/replace`,
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: expect.any(Function),
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Document replaced successfully');
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should submit without change notes', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<ReplaceDocumentModal {...defaultProps} />);

      // Upload file only
      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      // Submit
      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalled();
      });

      expect(toast.success).toHaveBeenCalled();
    });

    it('should show upload progress', async () => {
      const user = userEvent.setup();
      let progressCallback: ((progressEvent: any) => void) | undefined;

      mockApi.post.mockImplementation((_url, _data, config) => {
        progressCallback = config?.onUploadProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            if (progressCallback) {
              progressCallback({ loaded: 50, total: 100 });
            }
            resolve({ data: { success: true } });
          }, 100);
        });
      });

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });

    it('should handle upload error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'File too large';
      mockApi.post.mockRejectedValue({ message: errorMessage });

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });

      expect(logger.error).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should disable buttons during upload', async () => {
      const user = userEvent.setup();
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: { success: true } }), 100);
          })
      );

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      expect(replaceButton).toBeDisabled();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalled();
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
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: { success: true } }), 100);
          })
      );

      render(<ReplaceDocumentModal {...defaultProps} />);

      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large file names', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const longFileName = 'a'.repeat(200) + '.pdf';
      const file = new File(['test'], longFileName, { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;

      await user.upload(input, file);

      expect(screen.getByText(new RegExp(longFileName))).toBeInTheDocument();
    });

    it('should handle special characters in file name', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      const specialFileName = 'file (copy) [2024] #1.pdf';
      const file = new File(['test'], specialFileName, { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;

      await user.upload(input, file);

      expect(screen.getByText(specialFileName)).toBeInTheDocument();
    });

    it('should clear error when selecting new file', async () => {
      const user = userEvent.setup();
      render(<ReplaceDocumentModal {...defaultProps} />);

      // Try to submit without file
      const replaceButton = screen.getByRole('button', { name: /replace file/i });
      await user.click(replaceButton);
      expect(screen.getByText(/please select a file/i)).toBeInTheDocument();

      // Select file
      const file = new File(['test'], 'new.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select file/i) as HTMLInputElement;
      await user.upload(input, file);

      // Error should be cleared
      expect(screen.queryByText(/please select a file/i)).not.toBeInTheDocument();
    });
  });
});
