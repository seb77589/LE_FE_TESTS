/**
 * Tests for useAccountUnlock hook - Unlock operation success tests
 *
 * @description Tests verifying successful unlock operations including API calls,
 * success messages, and state updates.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/unlock
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
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
    email: FRONTEND_TEST_CREDENTIALS.LOCKED_USER_1.email,
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
  email: FRONTEND_TEST_CREDENTIALS.LOCKED_USER_1.email,
  unlocked: true,
  unlocked_by: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
  unlock_reason: 'Manual unlock by admin',
};

describe('useAccountUnlock - Unlock operation success', () => {
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

  it('should call API with correct data when confirmUnlock is called', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ canUnlock: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    act(() => {
      result.current.setUnlockReason('User verified identity');
    });

    await act(async () => {
      await result.current.confirmUnlock();
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/admin/users/1/unlock?reason=User%20verified%20identity',
    );
    unmount();
  });

  it('should set success message on successful unlock', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ canUnlock: true }),
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

    expect(result.current.success).toContain('Successfully unlocked');
    unmount();
  });

  it('should close dialog after successful unlock', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ canUnlock: true }),
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

    expect(result.current.unlockDialogOpen).toBe(false);
    unmount();
  });

  it('should clear selectedAccount after successful unlock', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ canUnlock: true }),
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

    expect(result.current.selectedAccount).toBeNull();
    unmount();
  });

  it('should refetch locked accounts after successful unlock', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ canUnlock: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = mockApi.get.mock.calls.length;

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    await act(async () => {
      await result.current.confirmUnlock();
    });

    expect(mockApi.get.mock.calls.length).toBeGreaterThan(initialCallCount);
    unmount();
  });
});
