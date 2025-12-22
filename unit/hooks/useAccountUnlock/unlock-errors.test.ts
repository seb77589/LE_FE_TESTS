/**
 * Tests for useAccountUnlock hook - Unlock operation error tests
 *
 * @description Tests verifying error handling during unlock operations.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/unlock-errors
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccountUnlock, LockedAccount } from '@/hooks/admin/useAccountUnlock';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Import mocked modules
import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

const mockLockedAccounts: LockedAccount[] = [
  {
    user_id: 1,
    email: 'locked1@example.com',
    full_name: 'Locked User One',
    role: 'user',
    failed_attempts: 5,
    lockout_reason: 'Too many failed login attempts',
    lockout_until: '2024-01-03T12:00:00Z',
    remaining_lockout_minutes: 30,
  },
];

const mockUnlockResponse = {
  message: 'Account unlocked successfully',
  user_id: 1,
  email: 'locked1@example.com',
  unlocked: true,
  unlocked_by: 'admin@example.com',
  unlock_reason: 'Manual unlock by admin',
};

describe('useAccountUnlock - Unlock operation errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.get.mockResolvedValue({
      data: { locked_accounts: mockLockedAccounts },
    });
    mockApi.post.mockResolvedValue({
      data: mockUnlockResponse,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should set error when account is not actually locked', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        message: 'Account is not locked',
        user_id: 1,
        email: 'locked1@example.com',
        unlocked: false,
      },
    });

    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    await act(async () => {
      await result.current.confirmUnlock();
    });

    expect(result.current.error).toContain('not locked');
    unmount();
  });

  it('should set error on unlock failure', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Reset mock AFTER initial data fetch, before unlock call
    mockApi.post.mockReset();
    mockApi.post.mockRejectedValueOnce({
      response: { data: { detail: 'Permission denied' } },
    });

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    await act(async () => {
      await result.current.confirmUnlock();
    });

    expect(result.current.error).toBe('Permission denied');
    unmount();
  });

  it('should set generic error message when no detail provided', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Reset mock AFTER initial data fetch, before unlock call
    mockApi.post.mockReset();
    mockApi.post.mockRejectedValueOnce(new Error('Network failure'));

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    await act(async () => {
      await result.current.confirmUnlock();
    });

    expect(result.current.error).toBe('Failed to unlock account');
    unmount();
  });

  it('should not call API if no account is selected', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.confirmUnlock();
    });

    expect(mockApi.post).not.toHaveBeenCalled();
    unmount();
  });

  it('should set unlocking state during unlock operation', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Use delayed auto-resolving mock instead of manual promise
    const delayedResponse = {
      data: {
        message: 'Unlocked',
        user_id: 1,
        email: 'locked1@example.com',
        unlocked: true,
      },
    };
    mockApi.post.mockReset();
    mockApi.post.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(delayedResponse), 10)),
    );

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    // Start unlock operation (don't await)
    act(() => {
      result.current.confirmUnlock();
    });

    // Should be unlocking
    expect(result.current.unlocking).toBe(1);

    // Wait for unlock to complete
    await waitFor(() => {
      expect(result.current.unlocking).toBeNull();
    });

    unmount();
  });
});
