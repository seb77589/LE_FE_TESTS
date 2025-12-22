/**
 * Tests for useAsyncData hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAsyncData } from '@/hooks/useAsyncData';

describe('useAsyncData', () => {
  it('should return initial data state when immediate is false', () => {
    const fetchFn = jest.fn(async () => ({ data: 'test' }));
    const { result } = renderHook(() =>
      useAsyncData(fetchFn, { initialData: null, immediate: false }),
    );

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should fetch data immediately when immediate is true', async () => {
    const fetchFn = jest.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() => useAsyncData(fetchFn, { immediate: true }));

    expect(result.current.loading).toBe(true);
    expect(fetchFn).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error('Fetch failed');
    });

    const { result } = renderHook(() => useAsyncData(fetchFn, { immediate: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.data).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    const fetchFn = jest.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() => useAsyncData(fetchFn, { immediate: false }));

    expect(fetchFn).not.toHaveBeenCalled();

    const refetchPromise = result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await refetchPromise;

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'test' });
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ data: 'test' });
  });

  it('should reset state when reset is called', async () => {
    const fetchFn = jest.fn(async () => ({ data: 'test' }));

    const { result } = renderHook(() =>
      useAsyncData(fetchFn, { initialData: null, immediate: true }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });

    result.current.reset();

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should use initial data when provided', () => {
    const { result } = renderHook(() =>
      useAsyncData(async () => ({ data: 'new' }), {
        initialData: { data: 'initial' },
        immediate: false,
      }),
    );

    expect(result.current.data).toEqual({ data: 'initial' });
  });
});
