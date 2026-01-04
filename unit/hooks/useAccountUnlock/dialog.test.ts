/**
 * Tests for useAccountUnlock hook - Dialog state management tests
 *
 * @description Tests verifying dialog state management including opening,
 * closing, and resetting dialog state.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/dialog
 */

import { renderHook, act } from '@testing-library/react';
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

describe('useAccountUnlock - Dialog state management', () => {
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

  it('should open dialog when handleUnlockAccount is called', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    expect(result.current.unlockDialogOpen).toBe(true);
    expect(result.current.selectedAccount).toEqual(mockLockedAccounts[0]);
    unmount();
  });

  it('should reset unlockReason when handleUnlockAccount is called', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    // Set a reason first
    act(() => {
      result.current.setUnlockReason('some reason');
    });

    // Then open dialog for new account
    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    expect(result.current.unlockReason).toBe('');
    unmount();
  });

  it('should close dialog when setUnlockDialogOpen(false) is called', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.handleUnlockAccount(mockLockedAccounts[0]);
    });

    expect(result.current.unlockDialogOpen).toBe(true);

    act(() => {
      result.current.setUnlockDialogOpen(false);
    });

    expect(result.current.unlockDialogOpen).toBe(false);
    unmount();
  });
});
