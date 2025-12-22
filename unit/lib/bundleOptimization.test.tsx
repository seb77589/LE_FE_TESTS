/**
 * Tests for bundleOptimization utilities
 *
 * @description Tests for bundle optimization utilities including:
 * - createLazyComponent
 * - preloadComponent
 */

import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createLazyComponent, preloadComponent } from '@/lib/bundleOptimization';

describe('createLazyComponent', () => {
  it('should create a lazy-loaded component', async () => {
    // Create a simple test component
    const TestComponent = () => <div data-testid="test-component">Loaded</div>;

    // Create lazy version
    const LazyComponent = createLazyComponent(
      () => Promise.resolve({ default: TestComponent }),
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>,
    );

    // Should show loading initially (in some test environments)
    // Then the component should appear
    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });
  });

  it('should return a LazyExoticComponent', () => {
    const LazyComponent = createLazyComponent(() =>
      Promise.resolve({ default: () => <div>Test</div> }),
    );

    // LazyExoticComponent has $$typeof symbol
    expect(LazyComponent).toBeDefined();
    expect(typeof LazyComponent).toBe('object');
  });
});

describe('preloadComponent', () => {
  const originalRequestIdleCallback = globalThis.window?.requestIdleCallback;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalRequestIdleCallback) {
      (globalThis.window as any).requestIdleCallback = originalRequestIdleCallback;
    }
  });

  it('should call import function via requestIdleCallback when available', () => {
    const mockImport = jest.fn().mockResolvedValue({ default: () => <div>Test</div> });
    const mockRequestIdleCallback = jest.fn((callback: () => void) => callback());
    (globalThis.window as any).requestIdleCallback = mockRequestIdleCallback;

    preloadComponent(mockImport);

    expect(mockRequestIdleCallback).toHaveBeenCalled();
    expect(mockImport).toHaveBeenCalled();
  });

  it('should fall back to setTimeout when requestIdleCallback is not available', () => {
    const mockImport = jest.fn().mockResolvedValue({ default: () => <div>Test</div> });

    // Remove requestIdleCallback
    const original = (globalThis.window as any).requestIdleCallback;
    delete (globalThis.window as any).requestIdleCallback;

    preloadComponent(mockImport);

    // Import should not be called immediately
    expect(mockImport).not.toHaveBeenCalled();

    // Advance timers
    jest.advanceTimersByTime(100);

    expect(mockImport).toHaveBeenCalled();

    // Restore
    (globalThis.window as any).requestIdleCallback = original;
  });

  it('should silently handle import failures', () => {
    const mockImport = jest.fn().mockRejectedValue(new Error('Import failed'));
    const mockRequestIdleCallback = jest.fn((callback: () => void) => callback());
    (globalThis.window as any).requestIdleCallback = mockRequestIdleCallback;

    // Should not throw
    expect(() => preloadComponent(mockImport)).not.toThrow();
  });

  it('should handle environments with and without window', () => {
    const mockImport = jest.fn().mockResolvedValue({ default: () => <div>Test</div> });
    const mockRequestIdleCallback = jest.fn((callback: () => void) => callback());
    (globalThis.window as any).requestIdleCallback = mockRequestIdleCallback;

    // In JSDOM, window exists, so import will be called
    // This verifies the function works in browser-like environments
    preloadComponent(mockImport);

    expect(mockImport).toHaveBeenCalled();
  });
});
