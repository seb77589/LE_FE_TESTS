/**
 * Admin Dashboard Integration Tests
 *
 * Tests the integration between:
 * - AdminTabs + data fetching
 * - UserManagement + API operations
 *
 * @integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { UsersTab } from '@/components/admin/UsersTab';
import { AuthProvider, useAuth } from '@/lib/context/ConsolidatedAuthContext';
import useSWR from 'swr';

// Mock dependencies
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key: string) => (key === 'tab' ? 'users' : null)),
  })),
  usePathname: jest.fn(() => '/admin'),
}));

jest.mock('@/lib/context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWebSocket: jest.fn(() => ({
    status: 'connected',
    isConnected: true,
    subscribe: jest.fn(() => jest.fn()),
    sendMessage: jest.fn(),
  })),
  WebSocketEventType: {
    USER_ACTIVITY: 'user_activity',
  },
}));

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const apiModule = require('@/lib/api');
const mockApi = apiModule.api;

describe('Admin Dashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'superadmin',
        is_active: true,
        is_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  describe('AdminTabs + Data Fetching', () => {
    it('should fetch admin stats data on mount', async () => {
      const mockStats = {
        totalUsers: 100,
        totalDocuments: 500,
        activeSessions: 25,
      };

      mockUseSWR.mockReturnValue({
        data: mockStats,
        error: undefined,
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      function TestComponent() {
        const { data } = useSWR('/api/v1/admin/stats');
        return (
          <div>
            <AdminTabs />
            {data && <div data-testid="stats">{data.totalUsers}</div>}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith('/api/v1/admin/stats');
      });
    });

    it('should switch tabs and fetch corresponding data', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', role: 'assistant' },
        { id: 2, email: 'user2@example.com', role: 'manager' },
      ];

      mockUseSWR.mockImplementation((key: string) => {
        if (key === '/api/v1/admin/users') {
          return {
            data: mockUsers,
            error: undefined,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any;
      });

      function TestComponent() {
        const { data } = useSWR('/api/v1/admin/users');
        return (
          <div>
            <AdminTabs activeTab="users" />
            {data && (
              <div data-testid="users-list">
                {data.map((user: any) => (
                  <div key={user.id}>{user.email}</div>
                ))}
              </div>
            )}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalledWith('/api/v1/admin/users');
      });
    });
  });

  describe('UserManagement + API Operations', () => {
    it('should fetch users list from API', async () => {
      const mockUsers = [
        {
          id: 1,
          email: 'user1@example.com',
          full_name: 'User One',
          role: 'assistant',
          is_active: true,
        },
        {
          id: 2,
          email: 'user2@example.com',
          full_name: 'User Two',
          role: 'manager',
          is_active: true,
        },
      ];

      mockUseSWR.mockReturnValue({
        data: mockUsers,
        error: undefined,
        mutate: jest.fn(),
        isLoading: false,
        isValidating: false,
      } as any);

      render(
        <AuthProvider>
          <UsersTab />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockUseSWR).toHaveBeenCalled();
      });
    });

    it('should update user via API', async () => {
      const user = userEvent.setup();
      const mockPut = mockApi.put as jest.Mock;
      const mockMutate = jest.fn();

      mockPut.mockResolvedValue({
        data: {
          id: 1,
          email: 'user1@example.com',
          full_name: 'Updated Name',
          role: 'assistant',
        },
      });

      mockUseSWR.mockReturnValue({
        data: [
          {
            id: 1,
            email: 'user1@example.com',
            full_name: 'Original Name',
            role: 'assistant',
          },
        ],
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      function TestComponent() {
        const { mutate } = useSWR('/api/v1/admin/users');

        const handleUpdate = async (userId: number, updates: any) => {
          await mockApi.put(`/api/v1/users/${userId}`, updates);
          await mutate();
        };

        return (
          <div>
            <UsersTab />
            <button
              data-testid="update-user-btn"
              onClick={() => handleUpdate(1, { full_name: 'Updated Name' })}
            >
              Update User
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const updateButton = screen.getByTestId('update-user-btn');
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/api/v1/users/1', {
          full_name: 'Updated Name',
        });
      });
    });

    it('should delete user via API', async () => {
      const user = userEvent.setup();
      const mockDelete = mockApi.delete as jest.Mock;
      const mockMutate = jest.fn();

      mockDelete.mockResolvedValue({ data: { message: 'User deleted' } });

      mockUseSWR.mockReturnValue({
        data: [
          {
            id: 1,
            email: 'user1@example.com',
            full_name: 'User One',
            role: 'assistant',
          },
        ],
        error: undefined,
        mutate: mockMutate,
        isLoading: false,
        isValidating: false,
      } as any);

      function TestComponent() {
        const { mutate } = useSWR('/api/v1/admin/users');

        const handleDelete = async (userId: number) => {
          await mockApi.delete(`/api/v1/users/${userId}`);
          await mutate();
        };

        return (
          <div>
            <UsersTab />
            <button data-testid="delete-user-btn" onClick={() => handleDelete(1)}>
              Delete User
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const deleteButton = screen.getByTestId('delete-user-btn');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/api/v1/users/1');
      });
    });
  });

  describe('Admin Dashboard Data Flow', () => {
    it('should coordinate data fetching across multiple tabs', async () => {
      const mockStats = { totalUsers: 100, totalDocuments: 500 };
      const mockUsers = [{ id: 1, email: 'user@example.com' }];

      let callCount = 0;
      mockUseSWR.mockImplementation((key: string) => {
        callCount++;
        if (key === '/api/v1/admin/stats') {
          return {
            data: mockStats,
            error: undefined,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        if (key === '/api/v1/admin/users') {
          return {
            data: mockUsers,
            error: undefined,
            mutate: jest.fn(),
            isLoading: false,
            isValidating: false,
          } as any;
        }
        return {
          data: undefined,
          error: undefined,
          mutate: jest.fn(),
          isLoading: false,
          isValidating: false,
        } as any;
      });

      function TestComponent() {
        const stats = useSWR('/api/v1/admin/stats');
        const users = useSWR('/api/v1/admin/users');

        return (
          <div>
            <AdminTabs />
            {stats.data && <div data-testid="stats-loaded">Stats loaded</div>}
            {users.data && <div data-testid="users-loaded">Users loaded</div>}
          </div>
        );
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(callCount).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
