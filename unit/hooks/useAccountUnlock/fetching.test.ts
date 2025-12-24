/**
 * Tests for useAccountUnlock hook - Data fetching tests
 *
 * @description Tests verifying data fetching behavior including API calls,
 * loading states, and error handling during fetch operations.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/fetching
 */

import { renderHook, waitFor } from '@testing-library/react';
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
import logger from '@/lib/logging';
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
  {
    user_id: 2,
    email: FRONTEND_TEST_CREDENTIALS.LOCKED_USER_2.email,
    full_name: 'Locked User Two',
    role: 'user',
    failed_attempts: 5,
    lockout_reason: 'Suspicious activity detected',
    lockout_until: '2024-01-03T15:00:00Z',
    remaining_lockout_minutes: 180,
  },
];

describe('useAccountUnlock - Data fetching', () => {
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

  it('should fetch locked accounts when superadmin', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.get).toHaveBeenCalledWith('/admin/users/locked');
    unmount();
  });

  it('should not fetch when not superadmin', () => {
    const { unmount } = renderHook(() => useAccountUnlock({ isSuperadmin: false }));

    expect(mockApi.get).not.toHaveBeenCalled();
    unmount();
  });

  it('should populate lockedAccounts on successful fetch', async () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.lockedAccounts).toHaveLength(2);
    });

    expect(result.current.lockedAccounts[0].email).toBe(FRONTEND_TEST_CREDENTIALS.LOCKED_USER_1.email);
    expect(result.current.lockedAccounts[1].email).toBe(FRONTEND_TEST_CREDENTIALS.LOCKED_USER_2.email);
    unmount();
  });

  it('should handle fetch error', async () => {
    // Reset and set rejection as the default behavior for ALL calls
    mockApi.get.mockReset();
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    unmount();
  });

  it('should log fetch errors', async () => {
    // Reset and set rejection as the default behavior for ALL calls
    mockApi.get.mockReset();
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(logger.error).toHaveBeenCalled();
    unmount();
  });
});
