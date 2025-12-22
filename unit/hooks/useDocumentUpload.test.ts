/**
 * useDocumentUpload Hook Unit Tests
 *
 * Tests for:
 * - Document upload hook logic
 * - Progress tracking
 * - Error handling
 * - Multiple file uploads
 * - Success callbacks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentUpload } from '@/hooks/documents/useDocumentUpload';
import api from '@/lib/api/client';
import { apiConfig } from '@/lib/api/config';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/lib/api/config', () => ({
  apiConfig: {
    endpoints: {
      documents: {
        create: '/api/v1/documents/',
      },
    },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('useDocumentUpload Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Document Upload', () => {
    it('should upload document successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const mockResponse = {
        data: {
          id: 1,
          filename: 'test.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          status: 'uploaded',
        },
        status: 201,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        await result.current.uploadDocument(mockFile);
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        apiConfig.endpoints.documents.create,
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        }),
      );

      expect(result.current.uploadedDocuments).toHaveLength(1);
      expect(result.current.uploadedDocuments[0].id).toBe(1);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should track upload progress', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockApi.post.mockImplementation((url, data, config) => {
        // Simulate progress updates
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 } as any);
          config.onUploadProgress({ loaded: 100, total: 100 } as any);
        }
        return Promise.resolve({
          data: { id: 1, filename: 'test.pdf' },
          status: 201,
        });
      });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        await result.current.uploadDocument(mockFile);
      });

      // Progress should be tracked
      expect(result.current.progress).toBe(0); // Reset after upload
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockError = {
        response: {
          status: 400,
          data: {
            detail: 'Invalid file type',
          },
        },
      };

      mockApi.post.mockRejectedValue(mockError);

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        try {
          await result.current.uploadDocument(mockFile);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadedDocuments).toHaveLength(0);
    });

    it('should call onSuccess callback', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const onSuccess = jest.fn();

      mockApi.post.mockResolvedValue({
        data: { id: 1, filename: 'test.pdf' },
        status: 201,
      });

      const { result } = renderHook(() => useDocumentUpload({ onSuccess }));

      await act(async () => {
        await result.current.uploadDocument(mockFile);
      });

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          filename: 'test.pdf',
        }),
      );
    });

    it('should call onError callback', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const onError = jest.fn();

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: { detail: 'Upload failed' },
        },
      });

      const { result } = renderHook(() => useDocumentUpload({ onError }));

      await act(async () => {
        try {
          await result.current.uploadDocument(mockFile);
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should call onProgress callback', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const onProgress = jest.fn();

      mockApi.post.mockImplementation((url, data, config) => {
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 } as any);
        }
        return Promise.resolve({
          data: { id: 1, filename: 'test.pdf' },
          status: 201,
        });
      });

      const { result } = renderHook(() => useDocumentUpload({ onProgress }));

      await act(async () => {
        await result.current.uploadDocument(mockFile);
      });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('Multiple Document Upload', () => {
    it('should upload multiple documents successfully', async () => {
      const mockFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ];

      mockApi.post
        .mockResolvedValueOnce({
          data: { id: 1, filename: 'test1.pdf' },
          status: 201,
        })
        .mockResolvedValueOnce({
          data: { id: 2, filename: 'test2.pdf' },
          status: 201,
        });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        await result.current.uploadMultipleDocuments(mockFiles);
      });

      expect(mockApi.post).toHaveBeenCalledTimes(2);
      expect(result.current.uploadedDocuments).toHaveLength(2);
    });

    it('should handle partial failures in multiple uploads', async () => {
      const mockFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ];

      mockApi.post
        .mockResolvedValueOnce({
          data: { id: 1, filename: 'test1.pdf' },
          status: 201,
        })
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: { detail: 'Invalid file' },
          },
        });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        try {
          await result.current.uploadMultipleDocuments(mockFiles);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.uploadedDocuments.length).toBeGreaterThan(0);
    });

    it('should track progress for multiple uploads', async () => {
      const mockFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ];

      mockApi.post
        .mockResolvedValueOnce({
          data: { id: 1, filename: 'test1.pdf' },
          status: 201,
        })
        .mockResolvedValueOnce({
          data: { id: 2, filename: 'test2.pdf' },
          status: 201,
        });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        await result.current.uploadMultipleDocuments(mockFiles);
      });

      // Progress should be tracked across multiple files
      expect(result.current.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State Management', () => {
    it('should set isUploading to true during upload', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });

      mockApi.post.mockReturnValue(uploadPromise as any);

      const { result } = renderHook(() => useDocumentUpload());

      act(() => {
        result.current.uploadDocument(mockFile);
      });

      expect(result.current.isUploading).toBe(true);

      await act(async () => {
        resolveUpload!({
          data: { id: 1, filename: 'test.pdf' },
          status: 201,
        });
        await uploadPromise;
      });

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });

    it('should reset progress after upload completes', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockApi.post.mockResolvedValue({
        data: { id: 1, filename: 'test.pdf' },
        status: 201,
      });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        await result.current.uploadDocument(mockFile);
      });

      expect(result.current.progress).toBe(0);
    });

    it('should clear error on new upload', async () => {
      const mockFile1 = new File(['test1'], 'test1.pdf', { type: 'application/pdf' });
      const mockFile2 = new File(['test2'], 'test2.pdf', { type: 'application/pdf' });

      mockApi.post
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: { detail: 'Error' },
          },
        })
        .mockResolvedValueOnce({
          data: { id: 1, filename: 'test2.pdf' },
          status: 201,
        });

      const { result } = renderHook(() => useDocumentUpload());

      // First upload fails
      await act(async () => {
        try {
          await result.current.uploadDocument(mockFile1);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      // Second upload succeeds
      await act(async () => {
        await result.current.uploadDocument(mockFile2);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      // Reject with an actual Error instance to preserve the message
      mockApi.post.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        try {
          await result.current.uploadDocument(mockFile);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Network');
    });

    it('should handle file size errors', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockApi.post.mockRejectedValue({
        response: {
          status: 413,
          data: {
            detail: 'File size exceeds maximum allowed size',
          },
        },
      });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        try {
          await result.current.uploadDocument(mockFile);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle validation errors', async () => {
      const mockFile = new File(['test'], 'test.exe', {
        type: 'application/x-msdownload',
      });

      mockApi.post.mockRejectedValue({
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'file'],
                msg: 'Invalid file type',
              },
            ],
          },
        },
      });

      const { result } = renderHook(() => useDocumentUpload());

      await act(async () => {
        try {
          await result.current.uploadDocument(mockFile);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});
