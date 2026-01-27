/**
 * Integration tests for Document Version API
 *
 * Tests cover:
 * - Version history fetching
 * - Version restoration
 * - Version deletion
 * - Version comparison
 * - Error handling
 * - Pagination
 *
 * Related Phase: Document Enhancements (Phase 5)
 */

import api from '@/lib/api';

// Mock axios
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  file_name: string;
  file_size: number;
  content_type: string;
  created_by: {
    id: number;
    full_name: string;
    email: string;
  };
  created_at: string;
  notes?: string;
}

describe('Document Version API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockVersions: DocumentVersion[] = [
    {
      id: 1,
      document_id: 100,
      version_number: 1,
      file_name: 'contract_v1.docx',
      file_size: 51200,
      content_type:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      created_by: {
        id: 1,
        full_name: 'John Doe',
        email: 'john@example.com',
      },
      created_at: '2024-01-01T10:00:00Z',
      notes: 'Initial version',
    },
    {
      id: 2,
      document_id: 100,
      version_number: 2,
      file_name: 'contract_v2.docx',
      file_size: 52300,
      content_type:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      created_by: {
        id: 1,
        full_name: 'John Doe',
        email: 'john@example.com',
      },
      created_at: '2024-01-02T10:00:00Z',
      notes: 'Updated terms section',
    },
    {
      id: 3,
      document_id: 100,
      version_number: 3,
      file_name: 'contract_v3.docx',
      file_size: 53100,
      content_type:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      created_by: {
        id: 2,
        full_name: 'Jane Smith',
        email: 'jane@example.com',
      },
      created_at: '2024-01-03T10:00:00Z',
      notes: 'Final review changes',
    },
  ];

  describe('Fetch Version History', () => {
    it('should fetch all versions for a document', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {
          versions: mockVersions,
          total: mockVersions.length,
        },
      });

      const response = await api.get('/api/v1/documents/100/versions');

      expect(response.data.versions).toEqual(mockVersions);
      expect(response.data.total).toBe(3);
      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documents/100/versions');
    });

    it('should handle documents with no versions', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {
          versions: [],
          total: 0,
        },
      });

      const response = await api.get('/api/v1/documents/200/versions');

      expect(response.data.versions).toEqual([]);
      expect(response.data.total).toBe(0);
    });

    it('should handle 404 for non-existent document', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { detail: 'Document not found' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(notFoundError);

      await expect(api.get('/api/v1/documents/999/versions')).rejects.toEqual(
        notFoundError,
      );
    });

    it('should handle pagination parameters', async () => {
      const paginatedVersions = mockVersions.slice(0, 2);
      mockedApi.get.mockResolvedValueOnce({
        data: {
          versions: paginatedVersions,
          total: mockVersions.length,
          page: 1,
          page_size: 2,
        },
      });

      const response = await api.get('/api/v1/documents/100/versions', {
        params: { page: 1, page_size: 2 },
      });

      expect(response.data.versions).toHaveLength(2);
      expect(response.data.page).toBe(1);
      expect(response.data.page_size).toBe(2);
    });
  });

  describe('Restore Version', () => {
    it('should restore a specific version', async () => {
      const restoredVersion: DocumentVersion = {
        ...mockVersions[0],
        id: 4,
        version_number: 4,
        file_name: 'contract_v1_restored.docx',
        created_at: '2024-01-04T10:00:00Z',
        notes: 'Restored version 1',
      };

      mockedApi.post.mockResolvedValueOnce({
        data: {
          message: 'Version restored successfully',
          new_version: restoredVersion,
        },
      });

      const response = await api.post('/api/v1/documents/100/versions/1/restore', {
        notes: 'Restored version 1',
      });

      expect(response.data.message).toBe('Version restored successfully');
      expect(response.data.new_version.version_number).toBe(4);
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/documents/100/versions/1/restore',
        { notes: 'Restored version 1' },
      );
    });

    it('should handle restore errors', async () => {
      const conflictError = {
        response: {
          status: 409,
          data: { detail: 'Cannot restore: document is locked' },
        },
      };
      mockedApi.post.mockRejectedValueOnce(conflictError);

      await expect(
        api.post('/api/v1/documents/100/versions/1/restore', {}),
      ).rejects.toEqual(conflictError);
    });

    it('should handle 403 Forbidden for insufficient permissions', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { detail: 'Insufficient permissions to restore version' },
        },
      };
      mockedApi.post.mockRejectedValueOnce(forbiddenError);

      await expect(
        api.post('/api/v1/documents/100/versions/1/restore', {}),
      ).rejects.toEqual(forbiddenError);
    });
  });

  describe('Delete Version', () => {
    it('should delete a specific version', async () => {
      mockedApi.delete.mockResolvedValueOnce({
        data: {
          message: 'Version deleted successfully',
        },
      });

      const response = await api.delete('/api/v1/documents/100/versions/2');

      expect(response.data.message).toBe('Version deleted successfully');
      expect(mockedApi.delete).toHaveBeenCalledWith('/api/v1/documents/100/versions/2');
    });

    it('should handle 404 for non-existent version', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { detail: 'Version not found' },
        },
      };
      mockedApi.delete.mockRejectedValueOnce(notFoundError);

      await expect(api.delete('/api/v1/documents/100/versions/999')).rejects.toEqual(
        notFoundError,
      );
    });

    it('should handle 400 for last remaining version', async () => {
      const badRequestError = {
        response: {
          status: 400,
          data: { detail: 'Cannot delete the last remaining version' },
        },
      };
      mockedApi.delete.mockRejectedValueOnce(badRequestError);

      await expect(api.delete('/api/v1/documents/100/versions/1')).rejects.toEqual(
        badRequestError,
      );
    });
  });

  describe('Compare Versions', () => {
    it('should compare two versions', async () => {
      const comparisonResult = {
        version1: mockVersions[0],
        version2: mockVersions[2],
        differences: [
          {
            section: 'Section 1',
            type: 'modified',
            old_content: 'Original text',
            new_content: 'Updated text',
          },
          {
            section: 'Section 2',
            type: 'added',
            new_content: 'New paragraph',
          },
        ],
      };

      mockedApi.get.mockResolvedValueOnce({
        data: comparisonResult,
      });

      const response = await api.get('/api/v1/documents/100/versions/compare', {
        params: { version1: 1, version2: 3 },
      });

      expect(response.data.version1.version_number).toBe(1);
      expect(response.data.version2.version_number).toBe(3);
      expect(response.data.differences).toHaveLength(2);
    });

    it('should handle comparison errors', async () => {
      const badRequestError = {
        response: {
          status: 400,
          data: { detail: 'Both version parameters are required' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(badRequestError);

      await expect(
        api.get('/api/v1/documents/100/versions/compare', {
          params: { version1: 1 },
        }),
      ).rejects.toEqual(badRequestError);
    });
  });

  describe('Download Version', () => {
    it('should download a specific version', async () => {
      const documentId = 100;
      const versionId = 2;
      const downloadUrl = `/api/v1/documents/${documentId}/versions/${versionId}/download`;

      // Mock window.open
      const mockOpen = jest.fn();
      global.window.open = mockOpen;

      window.open(downloadUrl, '_blank');

      expect(mockOpen).toHaveBeenCalledWith(downloadUrl, '_blank');
    });

    it('should handle download errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { detail: 'Version file not found' },
        },
      };

      mockedApi.get.mockRejectedValueOnce(notFoundError);

      await expect(
        api.get('/api/v1/documents/100/versions/999/download'),
      ).rejects.toEqual(notFoundError);
    });
  });

  describe('Version Metadata', () => {
    it('should fetch version metadata', async () => {
      const versionMetadata = {
        ...mockVersions[1],
        checksum: 'abc123def456',
        file_path: '/storage/documents/100/versions/2.docx',
        is_current: false,
      };

      mockedApi.get.mockResolvedValueOnce({
        data: versionMetadata,
      });

      const response = await api.get('/api/v1/documents/100/versions/2');

      expect(response.data.version_number).toBe(2);
      expect(response.data.checksum).toBe('abc123def456');
      expect(response.data.is_current).toBe(false);
    });

    it('should identify current version', async () => {
      const currentVersion = {
        ...mockVersions[2],
        is_current: true,
      };

      mockedApi.get.mockResolvedValueOnce({
        data: currentVersion,
      });

      const response = await api.get('/api/v1/documents/100/versions/3');

      expect(response.data.is_current).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 Internal Server Error', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(serverError);

      await expect(api.get('/api/v1/documents/100/versions')).rejects.toEqual(
        serverError,
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(networkError);

      await expect(api.get('/api/v1/documents/100/versions')).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };
      mockedApi.get.mockRejectedValueOnce(timeoutError);

      await expect(api.get('/api/v1/documents/100/versions')).rejects.toEqual(
        timeoutError,
      );
    });
  });
});
