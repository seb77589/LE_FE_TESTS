/**
 * Document Upload Component-Hook Integration Tests
 *
 * Tests the integration between:
 * - DocumentUpload component + API integration
 * - Upload progress tracking
 * - Error handling during upload
 * - File validation integration
 * - Multiple file upload coordination
 *
 * @integration
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentUpload from '@/components/ui/DocumentUpload';
import api from '@/lib/api';
import { apiConfig } from '@/lib/api/config';
import { AuthProvider } from '@/lib/context/ConsolidatedAuthContext';

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

// Mock @/lib/api (axios instance)
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
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

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', role: 'assistant' },
    isAuthenticated: true,
  }),
}));

// Polyfill DataTransfer for jsdom
if (typeof DataTransfer === 'undefined') {
  class DataTransferItemsMock {
    private readonly items: File[] = [];
    add(file: File) {
      this.items.push(file);
    }
    get length() {
      return this.items.length;
    }
  }
  class DataTransferMock {
    items: DataTransferItemsMock;
    files: File[];
    constructor() {
      this.items = new DataTransferItemsMock();
      this.files = [];
    }
  }
  (globalThis as any).DataTransfer = DataTransferMock;
}

const mockApi = api as jest.Mocked<typeof api>;

type UploadHandler = (
  files: FileList,
  onProgress?: (fileIdx: number, percent: number) => void,
) => Promise<void>;

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const validateAllowedMimeTypes = (files: readonly File[]): string | null => {
  const invalid = files.find((file) => !ALLOWED_MIME_TYPES.has(file.type));
  return invalid ? `Invalid file type: ${invalid.type}` : null;
};

const validateMaxUploadSize = (files: readonly File[]): string | null => {
  const tooLarge = files.find((file) => file.size > MAX_UPLOAD_SIZE_BYTES);
  return tooLarge ? 'File size exceeds maximum allowed size of 10MB' : null;
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const createMultipartFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};

const postMultipartDocument = async (formData: FormData) => {
  await mockApi.post(apiConfig.endpoints.documents.create, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const uploadFilesToApi = async (
  files: FileList,
  onProgress?: (fileIdx: number, percent: number) => void,
  options?: Readonly<{
    progressPercents?: readonly number[];
    progressDelayMs?: number;
  }>,
) => {
  const percents = options?.progressPercents ?? [100];
  const delayMs = options?.progressDelayMs ?? 0;

  for (const [fileIdx, file] of Array.from(files).entries()) {
    const formData = createMultipartFormData(file);

    if (onProgress) {
      for (const [percentIdx, percent] of percents.entries()) {
        onProgress(fileIdx, percent);
        if (delayMs > 0 && percentIdx < percents.length - 1) {
          await sleep(delayMs);
        }
      }
    }

    await postMultipartDocument(formData);
  }
};

const uploadFilesToApiWithErrors = async (
  files: FileList,
  onError: (file: File, err: any) => void,
  options?: Readonly<{
    onProgress?: (fileIdx: number, percent: number) => void;
    stopOnError?: boolean;
  }>,
) => {
  const stopOnError = options?.stopOnError ?? true;
  const onProgress = options?.onProgress;

  for (const [fileIdx, file] of Array.from(files).entries()) {
    const formData = createMultipartFormData(file);

    try {
      if (onProgress) {
        onProgress(fileIdx, 100);
      }
      await postMultipartDocument(formData);
    } catch (err: any) {
      onError(file, err);
      if (stopOnError) {
        return;
      }
    }
  }
};

const createProgressRecordingHandler = (
  progressUpdates: Array<{ fileIdx: number; percent: number }>,
  onProgress?: (fileIdx: number, percent: number) => void,
) => {
  return (fileIdx: number, percent: number): void => {
    onProgress?.(fileIdx, percent);
    progressUpdates.push({ fileIdx, percent });
  };
};

function UploadWithCapturedError(
  props: Readonly<{
    onUpload: UploadHandler;
    errorTestId: string;
    getErrorMessage: (err: any) => string;
  }>,
) {
  const { onUpload, errorTestId, getErrorMessage } = props;
  const [error, setError] = React.useState<string | null>(null);

  const handleUpload = React.useCallback<UploadHandler>(
    async (files, onProgress) => {
      try {
        await onUpload(files, onProgress);
      } catch (err: any) {
        setError(getErrorMessage(err));
      }
    },
    [getErrorMessage, onUpload],
  );

  return (
    <div>
      <DocumentUpload onUpload={handleUpload} />
      {error && <div data-testid={errorTestId}>{error}</div>}
    </div>
  );
}

function UploadWithNetworkError() {
  const [error, setError] = React.useState<string | null>(null);

  const handleUpload = React.useCallback<UploadHandler>(async (files) => {
    await uploadFilesToApiWithErrors(
      files,
      (_file, err) => {
        setError(err?.message || 'Network error');
      },
      { stopOnError: true },
    );
  }, []);

  return (
    <div>
      <DocumentUpload onUpload={handleUpload} />
      {error && <div data-testid="network-error">{error}</div>}
    </div>
  );
}

function UploadWithPartialFailures(
  props: Readonly<{ onProgress?: (fileIdx: number, percent: number) => void }>,
) {
  const { onProgress } = props;
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleUpload = React.useCallback<UploadHandler>(
    async (files) => {
      const uploadErrors: string[] = [];

      await uploadFilesToApiWithErrors(
        files,
        (file, err) => {
          uploadErrors.push(`${file.name}: ${err?.response?.data?.detail || 'Failed'}`);
        },
        { onProgress, stopOnError: false },
      );

      if (uploadErrors.length > 0) {
        setErrors(uploadErrors);
      }
    },
    [onProgress],
  );

  return (
    <div>
      <DocumentUpload onUpload={handleUpload} />
      {errors.length > 0 && (
        <div data-testid="upload-errors">
          {errors.map((err) => (
            <div key={err}>{err}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadWithValidation(
  props: Readonly<{
    validateFiles: (files: readonly File[]) => string | null;
  }>,
) {
  const { validateFiles } = props;
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleUpload = React.useCallback<UploadHandler>(
    async (files, onProgress) => {
      const fileList = Array.from(files);
      const error = validateFiles(fileList);

      if (error) {
        setValidationError(error);
        return;
      }

      await uploadFilesToApi(files, onProgress);
    },
    [validateFiles],
  );

  return (
    <div>
      <DocumentUpload onUpload={handleUpload} />
      {validationError && <div data-testid="validation-error">{validationError}</div>}
    </div>
  );
}

// Helper function to get the submit Upload button (not the drag-drop button)
const getUploadSubmitButton = () => {
  return screen.getByRole('button', { name: 'Upload' });
};

describe('Document Upload Component-Hook Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DocumentUpload + API Integration', () => {
    it('should upload single document via API', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      mockApi.post.mockResolvedValue({
        data: {
          id: 1,
          filename: 'test.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          upload_date: new Date().toISOString(),
          status: 'uploaded',
        },
        status: 201,
      });

      const handleUpload = async (
        files: FileList,
        onProgress?: (fileIdx: number, percent: number) => void,
      ) => {
        await uploadFilesToApi(files, onProgress, {
          progressPercents: [50, 100],
          progressDelayMs: 10,
        });
      };

      render(
        <AuthProvider>
          <DocumentUpload onUpload={handleUpload} />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFile);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          apiConfig.endpoints.documents.create,
          expect.any(FormData),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'multipart/form-data',
            }),
          }),
        );
      });
    });

    it('should upload multiple documents via API', async () => {
      const user = userEvent.setup();
      const mockFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ];

      mockApi.post
        .mockResolvedValueOnce({
          data: {
            id: 1,
            filename: 'test1.pdf',
            status: 'uploaded',
          },
          status: 201,
        })
        .mockResolvedValueOnce({
          data: {
            id: 2,
            filename: 'test2.pdf',
            status: 'uploaded',
          },
          status: 201,
        });

      const handleUpload = async (
        files: FileList,
        onProgress?: (fileIdx: number, percent: number) => void,
      ) => {
        await uploadFilesToApi(files, onProgress);
      };

      render(
        <AuthProvider>
          <DocumentUpload onUpload={handleUpload} />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFiles);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledTimes(2);
      });
    });

    it('should track upload progress for each file', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const progressUpdates: Array<{ fileIdx: number; percent: number }> = [];

      mockApi.post.mockImplementation(async () => {
        await sleep(100);
        return {
          data: { id: 1, filename: 'test.pdf', status: 'uploaded' },
          status: 201,
        } as any;
      });

      const handleUpload = async (
        files: FileList,
        onProgress?: (fileIdx: number, percent: number) => void,
      ) => {
        const onProgressWithRecording = createProgressRecordingHandler(
          progressUpdates,
          onProgress,
        );

        await uploadFilesToApi(files, onProgressWithRecording, {
          progressPercents: [25, 50, 100],
          progressDelayMs: 10,
        });
      };

      render(
        <AuthProvider>
          <DocumentUpload onUpload={handleUpload} />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFile);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates.at(-1)?.percent).toBe(100);
      });
    });
  });

  describe('Error Handling During Upload', () => {
    it('should handle API errors during upload', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockApi.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            detail: 'Invalid file type',
          },
        },
      });

      render(
        <AuthProvider>
          <UploadWithCapturedError
            onUpload={uploadFilesToApi}
            errorTestId="upload-error"
            getErrorMessage={(err) => err?.response?.data?.detail || 'Upload failed'}
          />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFile);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toHaveTextContent(
          'Invalid file type',
        );
      });
    });

    it('should handle network errors during upload', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockApi.post.mockRejectedValue({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      });

      render(
        <AuthProvider>
          <UploadWithNetworkError />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFile);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toHaveTextContent('Network Error');
      });
    });

    it('should handle partial upload failures for multiple files', async () => {
      const user = userEvent.setup();
      const mockFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ];

      mockApi.post
        .mockResolvedValueOnce({
          data: { id: 1, filename: 'test1.pdf', status: 'uploaded' },
          status: 201,
        })
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: { detail: 'Invalid file' },
          },
        });

      render(
        <AuthProvider>
          <UploadWithPartialFailures />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFiles);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('upload-errors')).toBeInTheDocument();
      });
    });
  });

  describe('File Validation Integration', () => {
    it('should validate file types before upload', async () => {
      const user = userEvent.setup();
      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-msdownload',
      });

      render(
        <AuthProvider>
          <UploadWithValidation validateFiles={validateAllowedMimeTypes} />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, invalidFile);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toHaveTextContent(
          'Invalid file type',
        );
      });
    });

    it('should validate file size before upload', async () => {
      const user = userEvent.setup();
      // Create a large file (> 10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });

      render(
        <AuthProvider>
          <UploadWithValidation validateFiles={validateMaxUploadSize} />
        </AuthProvider>,
      );

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, largeFile);

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toHaveTextContent(
          'exceeds maximum',
        );
      });
    });
  });

  describe('Drag and Drop Integration', () => {
    it('should handle drag and drop file selection', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockApi.post.mockResolvedValue({
        data: { id: 1, filename: 'test.pdf', status: 'uploaded' },
        status: 201,
      });

      const handleUpload = async (
        files: FileList,
        onProgress?: (fileIdx: number, percent: number) => void,
      ) => {
        await uploadFilesToApi(files, onProgress);
      };

      render(
        <AuthProvider>
          <DocumentUpload onUpload={handleUpload} />
        </AuthProvider>,
      );

      const dropZone = screen.getByLabelText(/drag.*drop.*click/i);

      // Create a mock DataTransfer with files
      const dataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: mockFile.type, getAsFile: () => mockFile }],
        types: ['Files'],
      };

      // Use fireEvent for drag and drop
      fireEvent.drop(dropZone, { dataTransfer });

      const uploadButton = getUploadSubmitButton();
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalled();
      });
    });
  });
});
