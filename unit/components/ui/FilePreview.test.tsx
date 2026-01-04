/**
 * Tests for FilePreview component
 *
 * Consolidated from:
 * - src/__tests__/unit/components/ui/FilePreview.test.tsx
 * - src/__tests__/unit/components/FilePreview.test.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import FilePreview from '@/components/ui/FilePreview';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element -- Test mock uses plain img to simplify next/image behavior
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  globalThis.URL.createObjectURL = mockCreateObjectURL;
  globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('FilePreview', () => {
  describe('Empty State', () => {
    it('should not render when files is empty', () => {
      const { container } = render(<FilePreview files={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('handles empty file list', () => {
      render(<FilePreview files={[]} />);
      // Should render nothing for empty files
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('File Rendering', () => {
    it('should render file list', () => {
      const file1 = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const file2 = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const files = [file1, file2];

      render(<FilePreview files={files} />);

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    it('renders file names', () => {
      const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
      render(<FilePreview files={[file]} />);
      expect(screen.getByText('hello.pdf')).toBeInTheDocument();
    });

    it('should display file name', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      render(<FilePreview files={[file]} />);

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });

    it('should display file type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      render(<FilePreview files={[file]} />);

      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });

    it('renders file type for non-image files', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      render(<FilePreview files={[file]} />);
      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });
  });

  describe('Image Preview', () => {
    it('should render image preview for image files', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const { container } = render(<FilePreview files={[file]} />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('renders image thumbnail for image files', () => {
      const file = new File(['img'], 'img.png', { type: 'image/png' });
      render(<FilePreview files={[file]} />);
      expect(screen.getByAltText('img.png')).toBeInTheDocument();
    });
  });

  describe('Non-Image Files', () => {
    it('should render file icon for non-image files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const { container } = render(<FilePreview files={[file]} />);

      const icon = container.querySelector('.text-lg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('FileList Support', () => {
    it('should handle FileList', () => {
      const file1 = new File(['content'], 'file1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content'], 'file2.jpg', { type: 'image/jpeg' });

      // Create a mock FileList
      const fileList = {
        length: 2,
        0: file1,
        1: file2,
        item: (index: number) => (index === 0 ? file1 : file2),
        [Symbol.iterator]: function* () {
          yield file1;
          yield file2;
        },
      } as FileList;

      render(<FilePreview files={fileList} />);

      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.jpg')).toBeInTheDocument();
    });
  });
});
