/**
 * Tests for useAccountUnlock hook - Miscellaneous tests
 *
 * @description Tests for manual refetch and isSuperadmin state changes.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/misc
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

describe('useAccountUnlock - Manual refetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.get.mockResolvedValue({
      data: { locked_accounts: mockLockedAccounts },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should allow manual refetch of locked accounts', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = mockApi.get.mock.calls.length;

    await act(async () => {
      await result.current.fetchLockedAccounts();
    });

    expect(mockApi.get.mock.calls.length).toBeGreaterThan(initialCallCount);
    unmount();
  });
});

describe('useAccountUnlock - isSuperadmin changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.get.mockResolvedValue({
      data: { locked_accounts: mockLockedAccounts },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should refetch when isSuperadmin becomes true', async () => {
    const { rerender, unmount } = renderHook(
      ({ isSuperadmin }) => useAccountUnlock({ isSuperadmin }),
      { initialProps: { isSuperadmin: false } },
    );

    expect(mockApi.get).not.toHaveBeenCalled();

    rerender({ isSuperadmin: true });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalled();
    });
    unmount();
  });
});
