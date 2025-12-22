/**
 * Tests for useAccountUnlock hook - State setters tests
 *
 * @description Tests verifying state setter functions work correctly.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/setters
 */

import { renderHook, act } from '@testing-library/react';
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

describe('useAccountUnlock - State setters', () => {
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

  it('should allow setting error', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.setError('Custom error');
    });

    expect(result.current.error).toBe('Custom error');
    unmount();
  });

  it('should allow clearing error', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.setError('Custom error');
    });

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
    unmount();
  });

  it('should allow setting success', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.setSuccess('Custom success');
    });

    expect(result.current.success).toBe('Custom success');
    unmount();
  });

  it('should allow clearing success', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.setSuccess('Custom success');
    });

    act(() => {
      result.current.setSuccess(null);
    });

    expect(result.current.success).toBeNull();
    unmount();
  });

  it('should allow setting unlockReason', () => {
    const { result, unmount } = renderHook(() =>
      useAccountUnlock({ isSuperadmin: false }),
    );

    act(() => {
      result.current.setUnlockReason('User requested unlock');
    });

    expect(result.current.unlockReason).toBe('User requested unlock');
    unmount();
  });
});
