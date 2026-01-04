/**
 * Tests for useDocumentPreview hook
 *
 * @description Comprehensive tests for the document preview hook including
 * data fetching, preview type handling, image error state, and modal controls.
 *
 * @module __tests__/unit/hooks/useDocumentPreview
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentPreview, PreviewData } from '@/hooks/documents/useDocumentPreview';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn((err, defaultMsg) => defaultMsg),
}));

// Import mocked modules
import logger from '@/lib/logging';
import { extractErrorMessage } from '@/lib/errors';

const mockExtractErrorMessage = extractErrorMessage as jest.MockedFunction<
  typeof extractErrorMessage
>;

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// ==============================================================================
// Module-level localStorage mock factory (extracted to reduce nesting - fixes S2004)
// ==============================================================================

// Wrapper to hold store reference (fixes closure issue with store = {})
interface LocalStorageWrapper {
  data: Record<string, string>;
}

// Storage operation functions (use wrapper for consistent reference)
function mockGetItem(wrapper: LocalStorageWrapper, key: string): string | null {
  return wrapper.data[key] || null;
}

function mockSetItem(wrapper: LocalStorageWrapper, key: string, value: string): void {
  wrapper.data[key] = value;
}

function mockRemoveItem(wrapper: LocalStorageWrapper, key: string): void {
  delete wrapper.data[key];
}

function mockClear(wrapper: LocalStorageWrapper): void {
  wrapper.data = {};
}

// Create localStorage mock using module-level functions
function createLocalStorageMock() {
  const wrapper: LocalStorageWrapper = { data: {} };

  return {
    getItem: jest.fn((key: string) => mockGetItem(wrapper, key)),
    setItem: jest.fn((key: string, value: string) => mockSetItem(wrapper, key, value)),
    removeItem: jest.fn((key: string) => mockRemoveItem(wrapper, key)),
    clear: jest.fn(() => mockClear(wrapper)),
  };
}

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useDocumentPreview', () => {
  const mockImagePreviewData: PreviewData = {
    preview_type: 'image',
    filename: 'photo.jpg',
    dimensions: { width: 1920, height: 1080 },
    format: 'jpeg',
    preview_url: '/api/v1/documents/1/preview/image',
    thumbnail_url: '/api/v1/documents/1/thumbnail',
    mime_type: 'image/jpeg',
    file_size: 1024 * 500,
  };

  const mockPdfPreviewData: PreviewData = {
    preview_type: 'pdf',
    filename: 'document.pdf',
    preview_url: '/api/v1/documents/2/preview/pdf',
    mime_type: 'application/pdf',
    file_size: 1024 * 1024 * 2,
    page_count: 10,
    metadata: {
      title: 'Legal Contract',
      author: 'John Doe',
      creation_date: '2024-01-01T00:00:00Z',
    },
  };

  const mockInfoPreviewData: PreviewData = {
    preview_type: 'info',
    filename: 'data.xlsx',
    message: 'Preview not available for this file type',
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 1024 * 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('access_token', 'test-token');
    mockExtractErrorMessage.mockImplementation((err, defaultMsg) => defaultMsg);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockImagePreviewData),
    });
  });

  describe('Initial state', () => {
    it('should return null previewData initially', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );
      expect(result.current.previewData).toBeNull();
    });

    it('should start with isLoading as false when not open', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );
      expect(result.current.error).toBeNull();
    });

    it('should start with imageError as false', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );
      expect(result.current.imageError).toBe(false);
    });

    it('should expose setImageError function', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );
      expect(typeof result.current.setImageError).toBe('function');
    });

    it('should expose refetch function', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Data fetching on open', () => {
    it('should not fetch when isOpen is false', () => {
      renderHook(() => useDocumentPreview({ documentId: 1, isOpen: false }));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch when isOpen becomes true', async () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      expect(mockFetch).not.toHaveBeenCalled();

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should include authorization header from localStorage', async () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/documents/1/preview'),
          expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
          }),
        );
      });
    });

    it('should update previewData when fetch succeeds', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
      });

      expect(result.current.previewData?.filename).toBe('photo.jpg');
      expect(result.current.previewData?.preview_type).toBe('image');
    });

    it('should preserve imageError state when modal opens (user must explicitly reset)', async () => {
      // Implementation note: imageError is NOT auto-reset when modal opens
      // This allows the caller to handle error state explicitly via setImageError()
      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      // Set imageError
      act(() => {
        result.current.setImageError(true);
      });
      expect(result.current.imageError).toBe(true);

      // Open modal - imageError should be preserved (not auto-reset)
      rerender({ isOpen: true });

      // imageError stays true until explicitly reset by caller
      await waitFor(() => {
        expect(result.current.imageError).toBe(true);
      });

      // Caller can reset it explicitly
      act(() => {
        result.current.setImageError(false);
      });
      expect(result.current.imageError).toBe(false);
    });
  });

  describe('Preview types', () => {
    it('should handle image preview type', async () => {
      // Default mock from beforeEach already returns image data

      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData?.preview_type).toBe('image');
      });

      expect(result.current.previewData?.dimensions).toEqual({
        width: 1920,
        height: 1080,
      });
      expect(result.current.previewData?.format).toBe('jpeg');
    });

    it('should handle PDF preview type', async () => {
      // Reset mock and set PDF response as the default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPdfPreviewData),
      });

      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 2, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData?.preview_type).toBe('pdf');
      });

      expect(result.current.previewData?.page_count).toBe(10);
      expect(result.current.previewData?.metadata?.title).toBe('Legal Contract');
    });

    it('should handle info preview type', async () => {
      // Reset mock and set info response as the default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInfoPreviewData),
      });

      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 3, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData?.preview_type).toBe('info');
      });

      expect(result.current.previewData?.message).toBe(
        'Preview not available for this file type',
      );
    });
  });

  describe('Image error handling', () => {
    it('should allow setting imageError to true', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );

      act(() => {
        result.current.setImageError(true);
      });

      expect(result.current.imageError).toBe(true);
    });

    it('should allow setting imageError to false', () => {
      const { result } = renderHook(() =>
        useDocumentPreview({ documentId: 1, isOpen: false }),
      );

      act(() => {
        result.current.setImageError(true);
      });

      act(() => {
        result.current.setImageError(false);
      });

      expect(result.current.imageError).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should set error when API returns error response', async () => {
      // Reset mock and set error response as the default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Document not found' }),
      });

      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 999, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    });

    it('should log errors for monitoring', async () => {
      // Reset mock and set error response as the default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Server error' }),
      });

      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should use extractErrorMessage for error messages', async () => {
      // Reset mock and set error response as the default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'API Error' }),
      });

      const { rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(mockExtractErrorMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Document ID changes', () => {
    it('should refetch when documentId changes and modal is open', async () => {
      const { result, rerender } = renderHook(
        ({ documentId, isOpen }) => useDocumentPreview({ documentId, isOpen }),
        { initialProps: { documentId: 1, isOpen: true } },
      );

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
      });

      const initialCallCount = mockFetch.mock.calls.length;

      // Change document ID
      rerender({ documentId: 2, isOpen: true });

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
      });

      const initialCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Preview data structure', () => {
    it('should include all metadata fields for PDF', async () => {
      // Reset mock and set PDF response as the default
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPdfPreviewData),
      });

      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 2, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
      });

      expect(result.current.previewData?.metadata).toBeDefined();
      expect(result.current.previewData?.metadata?.author).toBe('John Doe');
      expect(result.current.previewData?.metadata?.creation_date).toBe(
        '2024-01-01T00:00:00Z',
      );
    });

    it('should include file size', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
      });

      expect(result.current.previewData?.file_size).toBe(1024 * 500);
    });

    it('should include mime_type', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useDocumentPreview({ documentId: 1, isOpen }),
        { initialProps: { isOpen: false } },
      );

      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.previewData).not.toBeNull();
      });

      expect(result.current.previewData?.mime_type).toBe('image/jpeg');
    });
  });
});
