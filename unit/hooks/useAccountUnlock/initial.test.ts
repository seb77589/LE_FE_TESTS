/**
 * Tests for useAccountUnlock hook - Initial state tests
 *
 * @description Tests verifying initial state values when the hook is first rendered.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/initial
 */

import { renderHook } from '@testing-library/react';
import { useAccountUnlock } from '@/hooks/admin/useAccountUnlock';

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

describe('useAccountUnlock - Initial state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.get.mockResolvedValue({
      data: { locked_accounts: [] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should start with empty lockedAccounts when not superadmin', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.lockedAccounts).toEqual([]);
    unmount();
  });

  it('should start with loading as true when superadmin', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: true }),
    );
    expect(result.current.loading).toBe(true);
    unmount();
  });

  it('should start with no error', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.error).toBeNull();
    unmount();
  });

  it('should start with no success message', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.success).toBeNull();
    unmount();
  });

  it('should start with unlocking as null', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.unlocking).toBeNull();
    unmount();
  });

  it('should start with unlockDialogOpen as false', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.unlockDialogOpen).toBe(false);
    unmount();
  });

  it('should start with selectedAccount as null', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.selectedAccount).toBeNull();
    unmount();
  });

  it('should start with empty unlockReason', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );
    expect(result.current.unlockReason).toBe('');
    unmount();
  });

  it('should expose all required handlers', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    expect(typeof result.current.setUnlockDialogOpen).toBe('function');
    expect(typeof result.current.setSelectedAccount).toBe('function');
    expect(typeof result.current.setUnlockReason).toBe('function');
    expect(typeof result.current.setError).toBe('function');
    expect(typeof result.current.setSuccess).toBe('function');
    expect(typeof result.current.handleUnlockAccount).toBe('function');
    expect(typeof result.current.confirmUnlock).toBe('function');
    expect(typeof result.current.fetchLockedAccounts).toBe('function');
    unmount();
  });
});
