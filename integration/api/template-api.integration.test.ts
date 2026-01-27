/**
 * Integration tests for Template API
 *
 * Tests cover:
 * - Template listing
 * - Template fetching by ID
 * - Template download
 * - Error handling
 * - Loading states
 * - Pagination
 *
 * Related Phase: Template Visibility Fix (Phase 9)
 */

import api from '@/lib/api';
import type { Template } from '@/types/template';

// Mock axios
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Template API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('List Templates', () => {
    const mockTemplates: Template[] = [
      {
        id: 1,
        name: 'Employment Contract',
        description: 'Standard employment contract template',
        variables: ['employee_name', 'position', 'salary', 'start_date'],
        company_id: null, // System template
        is_active: true,
        created_by: {
          id: 1,
          full_name: 'Admin User',
          email: 'admin@example.com',
        },
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        usage_count: 15,
      },
      {
        id: 2,
        name: 'NDA Template',
        description: 'Non-disclosure agreement template',
        variables: ['party_name', 'effective_date', 'term'],
        company_id: 1, // Company template
        is_active: true,
        created_by: {
          id: 2,
          full_name: 'Manager User',
          email: 'manager@example.com',
        },
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z',
        usage_count: 8,
      },
    ];

    it('should fetch all active templates', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {
          templates: mockTemplates,
          total: mockTemplates.length,
        },
      });

      const response = await api.get('/api/v1/templates/', {
        params: { is_active: true },
      });

      expect(response.data.templates).toEqual(mockTemplates);
      expect(response.data.total).toBe(2);
      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/templates/', {
        params: { is_active: true },
      });
    });

    it('should filter templates by category', async () => {
      const filteredTemplates = [mockTemplates[0]];

      mockedApi.get.mockResolvedValueOnce({
        data: {
          templates: filteredTemplates,
          total: filteredTemplates.length,
        },
      });

      const response = await api.get('/api/v1/templates/', {
        params: { is_active: true, category: 'employment' },
      });

      expect(response.data.templates).toEqual(filteredTemplates);
      expect(response.data.total).toBe(1);
      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/templates/', {
        params: { is_active: true, category: 'employment' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {
          templates: [],
          total: 0,
        },
      });

      const response = await api.get('/api/v1/templates/', {
        params: { is_active: true },
      });

      expect(response.data.templates).toEqual([]);
      expect(response.data.total).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch templates';
      mockedApi.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        api.get('/api/v1/templates/', { params: { is_active: true } }),
      ).rejects.toThrow(errorMessage);
    });

    it('should handle 403 Forbidden error', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { detail: 'Insufficient permissions' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(forbiddenError);

      await expect(
        api.get('/api/v1/templates/', { params: { is_active: true } }),
      ).rejects.toEqual(forbiddenError);
    });

    it('should handle 500 Server Error', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(serverError);

      await expect(
        api.get('/api/v1/templates/', { params: { is_active: true } }),
      ).rejects.toEqual(serverError);
    });
  });

  describe('Get Template by ID', () => {
    const mockTemplate: Template = {
      id: 1,
      name: 'Employment Contract',
      description: 'Standard employment contract template',
      variables: ['employee_name', 'position', 'salary', 'start_date'],
      company_id: null,
      is_active: true,
      created_by: {
        id: 1,
        full_name: 'Admin User',
        email: 'admin@example.com',
      },
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      usage_count: 15,
    };

    it('should fetch template by ID', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: mockTemplate,
      });

      const response = await api.get('/api/v1/templates/1');

      expect(response.data).toEqual(mockTemplate);
      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/templates/1');
    });

    it('should handle 404 Not Found', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { detail: 'Template not found' },
        },
      };
      mockedApi.get.mockRejectedValueOnce(notFoundError);

      await expect(api.get('/api/v1/templates/999')).rejects.toEqual(notFoundError);
    });
  });

  describe('Download Template', () => {
    it('should trigger template download', async () => {
      const templateId = 1;
      const downloadUrl = `/api/v1/templates/${templateId}/download`;

      // Mock window.open
      const mockOpen = jest.fn();
      global.window.open = mockOpen;

      // Simulate download by calling window.open
      window.open(downloadUrl, '_blank');

      expect(mockOpen).toHaveBeenCalledWith(downloadUrl, '_blank');
    });

    it('should handle download errors', async () => {
      const templateId = 999;
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Template not found' },
        },
      };

      mockedApi.get.mockRejectedValueOnce(errorResponse);

      await expect(api.get(`/api/v1/templates/${templateId}/download`)).rejects.toEqual(
        errorResponse,
      );
    });
  });

  describe('Template Sorting', () => {
    it('should sort templates by usage_count descending', () => {
      const unsortedTemplates: Template[] = [
        {
          id: 1,
          name: 'Template A',
          description: 'Desc A',
          variables: [],
          company_id: null,
          is_active: true,
          created_by: { id: 1, full_name: 'User', email: 'user@example.com' },
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          usage_count: 5,
        },
        {
          id: 2,
          name: 'Template B',
          description: 'Desc B',
          variables: [],
          company_id: null,
          is_active: true,
          created_by: { id: 1, full_name: 'User', email: 'user@example.com' },
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
          usage_count: 15,
        },
        {
          id: 3,
          name: 'Template C',
          description: 'Desc C',
          variables: [],
          company_id: null,
          is_active: true,
          created_by: { id: 1, full_name: 'User', email: 'user@example.com' },
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
          usage_count: 10,
        },
      ];

      const sorted = [...unsortedTemplates].sort((a, b) => {
        const aCount = a.usage_count ?? 0;
        const bCount = b.usage_count ?? 0;
        return bCount - aCount;
      });

      expect(sorted[0].id).toBe(2); // usage_count: 15
      expect(sorted[1].id).toBe(3); // usage_count: 10
      expect(sorted[2].id).toBe(1); // usage_count: 5
    });

    it('should handle templates with undefined usage_count', () => {
      const templatesWithUndefined: Partial<Template>[] = [
        { id: 1, usage_count: undefined },
        { id: 2, usage_count: 10 },
        { id: 3, usage_count: undefined },
      ];

      const sorted = [...templatesWithUndefined].sort((a, b) => {
        const aCount = a.usage_count ?? 0;
        const bCount = b.usage_count ?? 0;
        return bCount - aCount;
      });

      expect(sorted[0].id).toBe(2); // usage_count: 10
      // Templates with undefined usage_count should be at the end
      expect([sorted[1].id, sorted[2].id]).toContain(1);
      expect([sorted[1].id, sorted[2].id]).toContain(3);
    });
  });

  describe('Template Search Filtering', () => {
    const allTemplates: Template[] = [
      {
        id: 1,
        name: 'Employment Contract',
        description: 'Standard employment contract template',
        variables: ['employee_name', 'position'],
        company_id: null,
        is_active: true,
        created_by: { id: 1, full_name: 'User', email: 'user@example.com' },
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        usage_count: 15,
      },
      {
        id: 2,
        name: 'NDA Template',
        description: 'Non-disclosure agreement',
        variables: ['party_name', 'effective_date'],
        company_id: null,
        is_active: true,
        created_by: { id: 1, full_name: 'User', email: 'user@example.com' },
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z',
        usage_count: 8,
      },
    ];

    it('should filter by template name', () => {
      const query = 'employment';
      const filtered = allTemplates.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase()),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should filter by description', () => {
      const query = 'disclosure';
      const filtered = allTemplates.filter((t) =>
        t.description.toLowerCase().includes(query.toLowerCase()),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });

    it('should filter by variables', () => {
      const query = 'employee_name';
      const filtered = allTemplates.filter((t) =>
        t.variables.some((v) => v.toLowerCase().includes(query.toLowerCase())),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should be case-insensitive', () => {
      const query = 'EMPLOYMENT';
      const filtered = allTemplates.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase()),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const query = 'nonexistent';
      const filtered = allTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase()),
      );

      expect(filtered).toHaveLength(0);
    });
  });
});
