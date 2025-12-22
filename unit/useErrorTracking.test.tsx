// Mock the errorTracking module before any imports
jest.mock('@/lib/errors', () => ({
  errorTracking: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
    addBreadcrumb: jest.fn(),
    trackUserAction: jest.fn(),
    trackPageView: jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react';
import { useErrorTracking, useFormTracking } from '@/hooks/useErrorTracking';
import { errorTracking } from '@/lib/errors';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Get the mocked functions for type-safe access
const mockErrorTracking = errorTracking as jest.Mocked<typeof errorTracking>;

// Mock window.location
const mockLocation = {
  pathname: '/',
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
};

delete (globalThis.window as any).location;
(globalThis.window as any).location = mockLocation;

describe('useErrorTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide trackError function', () => {
    const { result } = renderHook(() => useErrorTracking());

    expect(result.current.trackError).toBeDefined();
    expect(typeof result.current.trackError).toBe('function');
  });

  it('should call captureException when trackError is called with an error', () => {
    const { result } = renderHook(() => useErrorTracking());

    act(() => {
      result.current.trackError(new Error('Test error'), { key: 'value' });
    });

    expect(mockErrorTracking.captureException).toHaveBeenCalled();
  });
});

describe('useFormTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide form tracking functions', () => {
    const { result } = renderHook(() => useFormTracking('testForm'));

    expect(result.current.trackFormStart).toBeDefined();
    expect(result.current.trackFormSubmit).toBeDefined();
    expect(result.current.trackFormSuccess).toBeDefined();
    expect(result.current.trackFormError).toBeDefined();
    expect(result.current.trackFieldInteraction).toBeDefined();
  });

  it('should call trackUserAction when trackFormStart is called', () => {
    const { result } = renderHook(() => useFormTracking('testForm'));

    act(() => {
      result.current.trackFormStart();
    });

    expect(mockErrorTracking.trackUserAction).toHaveBeenCalled();
    const calls = mockErrorTracking.trackUserAction.mock.calls;
    expect(calls[0]?.[0]).toBe('form_started');
  });

  it('should call trackUserAction when trackFormSubmit is called', () => {
    const { result } = renderHook(() => useFormTracking('testForm'));

    act(() => {
      result.current.trackFormSubmit({ email: FRONTEND_TEST_CREDENTIALS.USER.email });
    });

    expect(mockErrorTracking.trackUserAction).toHaveBeenCalled();
    const calls = mockErrorTracking.trackUserAction.mock.calls;
    expect(calls[0]?.[0]).toBe('form_submitted');
    expect(calls[0]?.[1]).toHaveProperty('email');
  });

  it('should call trackUserAction when trackFormSuccess is called', () => {
    const { result } = renderHook(() => useFormTracking('testForm'));

    act(() => {
      result.current.trackFormSuccess();
    });

    expect(mockErrorTracking.trackUserAction).toHaveBeenCalled();
    const calls = mockErrorTracking.trackUserAction.mock.calls;
    expect(calls[0]?.[0]).toBe('form_success');
  });

  it('should call trackUserAction when trackFormError is called', () => {
    const { result } = renderHook(() => useFormTracking('testForm'));

    act(() => {
      result.current.trackFormError(new Error('Form error'));
    });

    expect(mockErrorTracking.trackUserAction).toHaveBeenCalled();
    const calls = mockErrorTracking.trackUserAction.mock.calls;
    expect(calls[0]?.[0]).toBe('form_error');
  });

  it('should call trackUserAction when trackFieldInteraction is called', () => {
    const { result } = renderHook(() => useFormTracking('testForm'));

    act(() => {
      result.current.trackFieldInteraction('username', 'focus');
    });

    expect(mockErrorTracking.trackUserAction).toHaveBeenCalled();
    const calls = mockErrorTracking.trackUserAction.mock.calls;
    expect(calls[0]?.[0]).toBe('form_field_interaction');
    expect(calls[0]?.[1]).toHaveProperty('field', 'username');
  });
});
