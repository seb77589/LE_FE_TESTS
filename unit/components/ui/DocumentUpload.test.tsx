/**
 * Tests for DocumentUpload component
 *
 * Consolidated from:
 * - src/__tests__/unit/components/ui/DocumentUpload.test.tsx
 * - src/__tests__/unit/components/DocumentUpload.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DocumentUpload from '@/components/ui/DocumentUpload';

// Mock Next.js Image component for FilePreview
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock FilePreview and UploadProgress
jest.mock('@/components/ui/FilePreview', () => ({
  __esModule: true,
  default: ({ files }: any) => (
    <div data-testid="file-preview">
      {Array.from(files).map((f: File) => (
        <div key={f.name}>{f.name}</div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/ui/UploadProgress', () => ({
  __esModule: true,
  default: ({ fileName }: any) => <div data-testid="upload-progress">{fileName}</div>,
}));

beforeAll(() => {
  globalThis.URL.createObjectURL = jest.fn(() => 'https://example.com/mock-file.jpg');
  globalThis.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('DocumentUpload', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render upload form', () => {
      render(<DocumentUpload onUpload={mockOnUpload} />);

      expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument();
      // Use submit button type to distinguish from dropzone button
      expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    });

    it('renders and allows file selection', () => {
      render(<DocumentUpload onUpload={mockOnUpload} />);
      const input = screen.getByTestId('file-input');
      expect(input).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file selection via input', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileList = {
        length: 1,
        0: file,
        item: () => file,
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      render(<DocumentUpload onUpload={mockOnUpload} />);

      const input = screen.getByTestId('file-input');
      Object.defineProperty(input, 'files', {
        value: fileList,
        writable: false,
      });

      fireEvent.change(input);

      expect(screen.getByTestId('file-preview')).toBeInTheDocument();
    });

    it('shows file preview when files are selected', async () => {
      render(<DocumentUpload onUpload={mockOnUpload} />);
      const input = screen.getByTestId('file-input');
      const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // File name appears in file-preview container
      const filePreview = screen.getByTestId('file-preview');
      expect(filePreview).toHaveTextContent('hello.pdf');
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag and drop', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileList = {
        length: 1,
        0: file,
        item: () => file,
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      render(<DocumentUpload onUpload={mockOnUpload} />);

      const dropZone = screen.getByText(/Drag & drop files here/i).parentElement;
      if (dropZone) {
        fireEvent.dragOver(dropZone);
        fireEvent.drop(dropZone, {
          dataTransfer: { files: fileList },
        });

        expect(screen.getByTestId('file-preview')).toBeInTheDocument();
      }
    });
  });

  describe('Upload Button State', () => {
    it('should disable upload button when no files selected', () => {
      render(<DocumentUpload onUpload={mockOnUpload} />);

      const uploadButton = screen.getByRole('button', { name: 'Upload' });
      expect(uploadButton).toBeDisabled();
    });

    it('should enable upload button when files selected', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileList = {
        length: 1,
        0: file,
        item: () => file,
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      render(<DocumentUpload onUpload={mockOnUpload} />);

      const input = screen.getByTestId('file-input');
      Object.defineProperty(input, 'files', {
        value: fileList,
        writable: false,
      });

      fireEvent.change(input);

      const uploadButton = screen.getByRole('button', { name: 'Upload' });
      expect(uploadButton).not.toBeDisabled();
    });
  });

  describe('Upload Functionality', () => {
    it('should call onUpload when form submitted', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const fileList = {
        length: 1,
        0: file,
        item: () => file,
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      mockOnUpload.mockResolvedValue(undefined);

      render(<DocumentUpload onUpload={mockOnUpload} />);

      const input = screen.getByTestId('file-input');
      Object.defineProperty(input, 'files', {
        value: fileList,
        writable: false,
      });

      fireEvent.change(input);

      const form = screen.getByRole('button', { name: 'Upload' }).closest('form');
      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          expect(mockOnUpload).toHaveBeenCalled();
        });
      }
    });

    it('calls onUpload when files are selected and form is submitted', async () => {
      const onUpload = jest.fn().mockResolvedValue(undefined);
      render(<DocumentUpload onUpload={onUpload} />);
      const input = screen.getByTestId('file-input');
      const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await act(async () => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });

    it('handles upload progress updates', async () => {
      const onUpload = jest.fn().mockImplementation(async (files, onProgress) => {
        // Simulate progress updates
        if (onProgress) {
          onProgress(0, 50);
          onProgress(0, 100);
        }
      });

      render(<DocumentUpload onUpload={onUpload} />);
      const input = screen.getByTestId('file-input');
      const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await act(async () => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });

    it('clears files after successful upload', async () => {
      const onUpload = jest.fn().mockResolvedValue(undefined);
      render(<DocumentUpload onUpload={onUpload} />);
      const input = screen.getByTestId('file-input');
      const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      // Verify file appears in file preview
      const filePreview = screen.getByTestId('file-preview');
      expect(filePreview).toHaveTextContent('hello.pdf');

      await act(async () => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        // After successful upload, file preview should be empty
        expect(filePreview).not.toHaveTextContent('hello.pdf');
      });
    });
  });
});
