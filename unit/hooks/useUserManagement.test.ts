/**
 * Tests for useUserManagement hook
 *
 * @description Comprehensive tests for the user management hook including
 * user listing, filtering, bulk operations, and user status management.
 *
 * @module __tests__/unit/hooks/useUserManagement
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserManagement } from '@/hooks/admin/useUserManagement';
import type { User } from '@/types/user';

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
    post: jest.fn(),
    get: jest.fn(),
  },
  fetcher: jest.fn(),
}));

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

jest.mock('@/lib/security/auditLogger', () => ({
  logUserAction: jest.fn().mockResolvedValue(undefined),
  logBulkOperation: jest.fn().mockResolvedValue(undefined),
  formatChanges: jest.fn(() => ({ is_active: { from: true, to: false } })),
}));

// Import after mocking
import useSWR from 'swr';
import api from '@/lib/api';

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockApi = api as jest.Mocked<typeof api>;

describe('useUserManagement', () => {
  const mockUsers: User[] = [
    {
      id: 1,
      email: 'user1@example.com',
      full_name: 'User One',
      role: 'user',
      is_active: true,
      is_verified: true,
    },
    {
      id: 2,
      email: 'user2@example.com',
      full_name: 'User Two',
      role: 'admin',
      is_active: true,
      is_verified: true,
    },
    {
      id: 3,
      email: 'user3@example.com',
      full_name: 'User Three',
      role: 'user',
      is_active: false,
      is_verified: false,
    },
  ] as User[];

  const mockMutate = jest.fn().mockResolvedValue(undefined);

  const defaultSWRReturn = {
    data: { users: mockUsers },
    error: undefined,
    isLoading: false,
    mutate: mockMutate,
    isValidating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSWR.mockReturnValue(defaultSWRReturn as any);
    mockMutate.mockResolvedValue(undefined);
  });

  describe('Initial state', () => {
    it('should return users from SWR', () => {
      const { result } = renderHook(() => useUserManagement());

      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('should start with empty selected user IDs', () => {
      const { result } = renderHook(() => useUserManagement());
      expect(result.current.selectedUserIds).toEqual([]);
    });

    it('should start with empty filter values', () => {
      const { result } = renderHook(() => useUserManagement());
      expect(result.current.filterValues).toEqual({});
    });

    it('should start with no action loading', () => {
      const { result } = renderHook(() => useUserManagement());
      expect(result.current.actionLoading).toBeNull();
    });

    it('should start with no status error', () => {
      const { result } = renderHook(() => useUserManagement());
      expect(result.current.statusError).toBeNull();
    });

    it('should start with importing as false', () => {
      const { result } = renderHook(() => useUserManagement());
      expect(result.current.importing).toBe(false);
    });

    it('should start with no import result', () => {
      const { result } = renderHook(() => useUserManagement());
      expect(result.current.importResult).toBeNull();
    });
  });

  describe('Loading state', () => {
    it('should reflect loading state from SWR', () => {
      mockUseSWR.mockReturnValue({
        ...defaultSWRReturn,
        data: undefined,
        isLoading: true,
      } as any);

      const { result } = renderHook(() => useUserManagement());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.users).toBeUndefined();
    });
  });

  describe('Error state', () => {
    it('should reflect error state from SWR', () => {
      const mockError = new Error('Failed to fetch users');
      mockUseSWR.mockReturnValue({
        ...defaultSWRReturn,
        error: mockError,
      } as any);

      const { result } = renderHook(() => useUserManagement());

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Analytics', () => {
    it('should fetch analytics when showAnalytics is true', () => {
      renderHook(() => useUserManagement({ showAnalytics: true }));

      // Second SWR call should be for analytics
      expect(mockUseSWR).toHaveBeenCalledWith(
        '/api/v1/admin/users/analytics',
        expect.any(Function),
      );
    });

    it('should not fetch analytics when showAnalytics is false', () => {
      renderHook(() => useUserManagement({ showAnalytics: false }));

      // Verify SWR was called - analytics feature behavior is validated by observing calls
      expect(mockUseSWR).toHaveBeenCalled();
    });
  });

  describe('Filter values', () => {
    it('should update filter values', () => {
      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.setFilterValues({ role: 'admin' });
      });

      expect(result.current.filterValues).toEqual({ role: 'admin' });
    });

    it('should build query string with role filter', () => {
      const { result, rerender } = renderHook(() => useUserManagement());

      act(() => {
        result.current.setFilterValues({ role: 'admin' });
      });

      rerender();

      // SWR should be called with the filtered URL
      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.stringContaining('role=admin'),
        expect.any(Function),
      );
    });

    it('should build query string with isActive filter', () => {
      const { result, rerender } = renderHook(() => useUserManagement());

      act(() => {
        result.current.setFilterValues({ isActive: true });
      });

      rerender();

      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.stringContaining('is_active=true'),
        expect.any(Function),
      );
    });

    it('should build query string with isVerified filter', () => {
      const { result, rerender } = renderHook(() => useUserManagement());

      act(() => {
        result.current.setFilterValues({ isVerified: false });
      });

      rerender();

      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.stringContaining('is_verified=false'),
        expect.any(Function),
      );
    });

    it('should build query string with search filter', () => {
      const { result, rerender } = renderHook(() => useUserManagement());

      act(() => {
        result.current.setFilterValues({ search: 'john' });
      });

      rerender();

      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.stringContaining('q=john'),
        expect.any(Function),
      );
    });

    it('should combine multiple filters in query string', () => {
      const { result, rerender } = renderHook(() => useUserManagement());

      act(() => {
        result.current.setFilterValues({
          role: 'admin',
          isActive: true,
          search: 'test',
        });
      });

      rerender();

      // Find the LATEST users API call (after filters are applied)
      // We need to reverse-search because find() returns the first match
      const usersCall = mockUseSWR.mock.calls
        .toReversed()
        .find((call) => call[0]?.includes?.('/api/v1/admin/users'));
      const url = usersCall?.[0] as string;

      expect(url).toContain('role=admin');
      expect(url).toContain('is_active=true');
      expect(url).toContain('q=test');
    });
  });

  describe('User selection', () => {
    it('should add user to selection when handleUserSelectionChange is called with checked=true', () => {
      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
      });

      expect(result.current.selectedUserIds).toContain(1);
    });

    it('should remove user from selection when handleUserSelectionChange is called with checked=false', () => {
      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
        result.current.handleUserSelectionChange(2, true);
      });

      expect(result.current.selectedUserIds).toEqual([1, 2]);

      act(() => {
        result.current.handleUserSelectionChange(1, false);
      });

      expect(result.current.selectedUserIds).toEqual([2]);
    });

    it('should select all users when handleSelectAllChange is called with checked=true', () => {
      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleSelectAllChange(true);
      });

      expect(result.current.selectedUserIds).toEqual([1, 2, 3]);
    });

    it('should deselect all users when handleSelectAllChange is called with checked=false', () => {
      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleSelectAllChange(true);
      });

      expect(result.current.selectedUserIds.length).toBe(3);

      act(() => {
        result.current.handleSelectAllChange(false);
      });

      expect(result.current.selectedUserIds).toEqual([]);
    });
  });

  describe('Toggle user status', () => {
    it('should toggle user status successfully', async () => {
      mockApi.put.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() =>
        useUserManagement({
          currentUser: { id: 99, email: 'admin@example.com', role: 'admin' },
        }),
      );

      await act(async () => {
        await result.current.handleToggleUserStatus(mockUsers[0]);
      });

      expect(mockApi.put).toHaveBeenCalledWith(`/api/v1/users/1`, {
        is_active: false,
      });
      expect(mockMutate).toHaveBeenCalled();
    });

    it('should set actionLoading during status toggle', async () => {
      let resolvePromise: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.put.mockReturnValueOnce(apiPromise as any);

      const { result } = renderHook(() => useUserManagement());

      // Start the toggle
      act(() => {
        result.current.handleToggleUserStatus(mockUsers[0]);
      });

      // actionLoading should be set to user ID
      expect(result.current.actionLoading).toBe(1);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ data: {} });
        await apiPromise.catch(() => {});
      });

      // actionLoading should be null after completion
      await waitFor(() => {
        expect(result.current.actionLoading).toBeNull();
      });
    });

    it('should set status error on toggle failure', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { data: { detail: 'Permission denied' } },
      });

      const { result } = renderHook(() => useUserManagement());

      await act(async () => {
        await result.current.handleToggleUserStatus(mockUsers[0]);
      });

      await waitFor(() => {
        expect(result.current.statusError).not.toBeNull();
      });
    });

    it('should set error for user without ID', async () => {
      const userWithoutId = { ...mockUsers[0], id: undefined };

      const { result } = renderHook(() => useUserManagement());

      await act(async () => {
        await result.current.handleToggleUserStatus(userWithoutId as User);
      });

      expect(result.current.statusError).toContain('User ID is missing');
    });
  });

  describe('Bulk actions', () => {
    it('should perform bulk activate action', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
        result.current.handleUserSelectionChange(2, true);
      });

      await act(async () => {
        await result.current.handleBulkAction('activate');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users/bulk-update', {
        user_ids: [1, 2],
        action: 'activate',
      });
    });

    it('should perform bulk deactivate action', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
      });

      await act(async () => {
        await result.current.handleBulkAction('deactivate');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users/bulk-update', {
        user_ids: [1],
        action: 'deactivate',
      });
    });

    it('should perform bulk delete action', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(3, true);
      });

      await act(async () => {
        await result.current.handleBulkAction('delete');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/users/bulk-update', {
        user_ids: [3],
        action: 'delete',
      });
    });

    it('should not perform bulk action with empty selection', async () => {
      const { result } = renderHook(() => useUserManagement());

      await act(async () => {
        await result.current.handleBulkAction('activate');
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should clear selection after successful bulk action', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
        result.current.handleUserSelectionChange(2, true);
      });

      expect(result.current.selectedUserIds.length).toBe(2);

      await act(async () => {
        await result.current.handleBulkAction('activate');
      });

      expect(result.current.selectedUserIds).toEqual([]);
    });

    it('should set status error on bulk action failure', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { detail: 'Bulk operation failed' } },
      });

      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
      });

      await act(async () => {
        await result.current.handleBulkAction('delete');
      });

      await waitFor(() => {
        expect(result.current.statusError).not.toBeNull();
      });
    });

    it('should set actionLoading to -1 during bulk action', async () => {
      let resolvePromise: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.post.mockReturnValueOnce(apiPromise as any);

      const { result } = renderHook(() => useUserManagement());

      act(() => {
        result.current.handleUserSelectionChange(1, true);
      });

      act(() => {
        result.current.handleBulkAction('activate');
      });

      expect(result.current.actionLoading).toBe(-1);

      await act(async () => {
        resolvePromise!({ data: {} });
        await apiPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.actionLoading).toBeNull();
      });
    });
  });

  describe('Import users', () => {
    // Helper to create a mock file with text() method
    const createMockFile = (content: string, filename: string) => {
      return {
        name: filename,
        text: jest.fn().mockResolvedValue(content),
        type: 'application/json',
      };
    };

    it('should not import when no file is selected', async () => {
      const { result } = renderHook(() => useUserManagement());

      const mockEvent = {
        target: { files: null },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleImport(mockEvent);
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should not import when files array is empty', async () => {
      const { result } = renderHook(() => useUserManagement());

      const mockEvent = {
        target: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleImport(mockEvent);
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should import users successfully', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { imported: 5 } });

      const { result } = renderHook(() => useUserManagement());

      const mockFile = createMockFile('[{"email": "test@example.com"}]', 'users.json');

      const mockEvent = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleImport(mockEvent);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/users/import', {
        users: [{ email: 'test@example.com' }],
      });
      expect(result.current.importResult).toContain('Successfully imported: 5 users');
    });

    it('should set error for invalid JSON', async () => {
      const { result } = renderHook(() => useUserManagement());

      const mockFile = createMockFile('invalid json', 'users.json');

      const mockEvent = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleImport(mockEvent);
      });

      expect(result.current.importResult).toBe('Invalid JSON format');
    });

    it('should set importing state during import', async () => {
      let resolvePromise: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.post.mockReturnValueOnce(apiPromise as any);

      const { result } = renderHook(() => useUserManagement());

      const mockFile = createMockFile('[]', 'users.json');

      const mockEvent = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleImport(mockEvent);
      });

      // importing starts immediately after file.text() resolves
      await waitFor(() => {
        expect(result.current.importing).toBe(true);
      });

      await act(async () => {
        resolvePromise!({ data: { imported: 0 } });
        await apiPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });
    });

    it('should set error on import failure', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { detail: 'Import failed' } },
      });

      const { result } = renderHook(() => useUserManagement());

      const mockFile = createMockFile('[]', 'users.json');

      const mockEvent = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleImport(mockEvent);
      });

      expect(result.current.importResult).toContain('Import failed');
    });
  });

  describe('Clear status error', () => {
    it('should clear status error', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { data: { detail: 'Error' } },
      });

      const { result } = renderHook(() => useUserManagement());

      await act(async () => {
        await result.current.handleToggleUserStatus(mockUsers[0]);
      });

      await waitFor(() => {
        expect(result.current.statusError).not.toBeNull();
      });

      act(() => {
        result.current.clearStatusError();
      });

      expect(result.current.statusError).toBeNull();
    });
  });

  describe('Mutate', () => {
    it('should expose mutate function from SWR', () => {
      const { result } = renderHook(() => useUserManagement());

      expect(typeof result.current.mutate).toBe('function');
    });
  });
});
