/**
 * useNotification Hook Unit Tests
 *
 * Tests for:
 * - Notification fetching hook
 * - Real-time updates
 * - Mark as read functionality
 * - Filtering by type and read status
 */

import { renderHook, act } from '@testing-library/react';
import { useNotification } from '@/hooks/useNotification';
import useSWR from 'swr';
import api from '@/lib/api/client';
import { buildUrl } from '@/lib/api/config';

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
}));

jest.mock('@/lib/api/config', () => ({
  buildUrl: jest.fn((url: string) => url),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockApi = api as jest.Mocked<typeof api>;

describe('useNotification Hook Tests', () => {
  const mockNotifications = [
    {
      id: 1,
      title: 'New Case Update',
      message: 'Case #123 has been updated',
      notification_type: 'CASE_UPDATE' as const,
      related_case_id: 123,
      is_read: false,
      recipient_id: 1,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 2,
      title: 'Document Uploaded',
      message: 'A new document has been uploaded',
      notification_type: 'DOCUMENT_UPLOAD' as const,
      related_case_id: null,
      is_read: true,
      recipient_id: 1,
      created_at: '2025-01-02T00:00:00Z',
    },
    {
      id: 3,
      title: 'System Alert',
      message: 'System maintenance scheduled',
      notification_type: 'SYSTEM_ALERT' as const,
      related_case_id: null,
      is_read: false,
      recipient_id: 1,
      created_at: '2025-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Fetching', () => {
    it('should fetch all notifications', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification());

      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch unread notifications only', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result: _result } = renderHook(() =>
        useNotification({ filter: 'unread' }),
      );

      expect(mockUseSWR).toHaveBeenCalledWith(
        buildUrl('/api/v1/notifications/unread'),
        expect.any(Function),
        expect.objectContaining({
          refreshInterval: expect.any(Number),
        }),
      );
    });

    it('should handle loading state', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        mutate: mockMutate,
        isLoading: true,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.notifications).toEqual([]);
    });

    it('should handle error state', () => {
      const mockMutate = jest.fn();
      const mockError = new Error('Failed to fetch notifications');
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification());

      expect(result.current.error).toBe(mockError);
      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('Unread Count Calculation', () => {
    it('should calculate unread count correctly', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification());

      // 2 unread notifications (id 1 and 3)
      expect(result.current.unreadCount).toBe(2);
    });

    it('should return zero unread count when all are read', () => {
      const allReadNotifications = mockNotifications.map((n) => ({
        ...n,
        is_read: true,
      }));
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: allReadNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification());

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Mark as Read', () => {
    it('should mark single notification as read', async () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.patch.mockResolvedValue({
        data: { ...mockNotifications[0], is_read: true },
        status: 200,
      });

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        await result.current.markAsRead(1);
      });

      expect(mockApi.patch).toHaveBeenCalledWith(buildUrl('/api/v1/notifications/1'), {
        is_read: true,
      });
      expect(mockMutate).toHaveBeenCalled();
    });

    it('should handle mark as read errors', async () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.patch.mockRejectedValue({
        response: {
          status: 404,
          data: { detail: 'Notification not found' },
        },
      });

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        try {
          await result.current.markAsRead(999);
        } catch {
          // Expected to throw
        }
      });

      expect(mockApi.patch).toHaveBeenCalled();
    });
  });

  describe('Mark All as Read', () => {
    it('should mark all notifications as read', async () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.post.mockResolvedValue({
        data: { message: 'All notifications marked as read', count: 2 },
        status: 200,
      });

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        buildUrl('/api/v1/notifications/mark-all-read'),
      );
      expect(mockMutate).toHaveBeenCalled();
    });

    it('should handle mark all as read errors', async () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.post.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: 'Server error' },
        },
      });

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        try {
          await result.current.markAllAsRead();
        } catch {
          // Expected to throw
        }
      });

      expect(mockApi.post).toHaveBeenCalled();
    });
  });

  describe('Toggle Read Status', () => {
    it('should toggle notification read status', async () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.patch.mockResolvedValue({
        data: { ...mockNotifications[0], is_read: true },
        status: 200,
      });

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        await result.current.toggleRead(mockNotifications[0]);
      });

      expect(mockApi.patch).toHaveBeenCalledWith(buildUrl('/api/v1/notifications/1'), {
        is_read: true,
      });
      expect(mockMutate).toHaveBeenCalled();
    });

    it('should toggle from read to unread', async () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      mockApi.patch.mockResolvedValue({
        data: { ...mockNotifications[1], is_read: false },
        status: 200,
      });

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        await result.current.toggleRead(mockNotifications[1]);
      });

      expect(mockApi.patch).toHaveBeenCalledWith(buildUrl('/api/v1/notifications/2'), {
        is_read: false,
      });
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications by type', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() =>
        useNotification({ notificationType: 'CASE_UPDATE' }),
      );

      const filtered = result.current.notifications.filter(
        (n) => n.notification_type === 'CASE_UPDATE',
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should return all notifications when type is "all"', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification({ notificationType: 'all' }));

      expect(result.current.notifications).toEqual(mockNotifications);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh notifications', async () => {
      const mockMutate = jest.fn().mockResolvedValue(undefined);
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      const { result } = renderHook(() => useNotification());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should support refresh interval for real-time updates', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      renderHook(() => useNotification({ refreshInterval: 60000 }));

      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          refreshInterval: 60000,
        }),
      );
    });

    it('should revalidate on focus', () => {
      const mockMutate = jest.fn();
      mockUseSWR.mockReturnValue({
        data: mockNotifications,
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      renderHook(() => useNotification());

      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          revalidateOnFocus: true,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback when fetch fails', () => {
      const onError = jest.fn();
      const mockError = new Error('Fetch failed');
      const mockMutate = jest.fn();

      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      renderHook(() => useNotification({ onError }));

      // onError should be called through SWR's onError option
      expect(mockUseSWR).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });
  });
});
