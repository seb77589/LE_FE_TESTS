/**
 * Tests for OnlineStatusWatcher component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OnlineStatusWatcher } from '@/components/providers/OnlineStatusWatcher';

// Mock AppStateContext
jest.mock('@/lib/context/AppStateContext', () => ({
  useAppState: jest.fn(),
}));

// Mock networkMonitor
jest.mock('@/lib/errors', () => ({
  networkMonitor: {
    addListener: jest.fn(() => jest.fn()),
  },
}));

import { useAppState } from '@/lib/context/AppStateContext';
import { networkMonitor } from '@/lib/errors';

const mockUseAppState = useAppState as jest.MockedFunction<typeof useAppState>;
const mockNetworkMonitor = networkMonitor as jest.Mocked<typeof networkMonitor>;

describe('OnlineStatusWatcher', () => {
  const mockSetOnline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppState.mockReturnValue({
      setOnline: mockSetOnline,
    } as any);
  });

  it('should render without crashing', () => {
    const { container } = render(<OnlineStatusWatcher />);
    expect(container.firstChild).toBeNull(); // Component returns null
  });

  it('should set up online event listener', () => {
    render(<OnlineStatusWatcher />);

    // Trigger online event
    globalThis.dispatchEvent(new Event('online'));

    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('should set up offline event listener', () => {
    render(<OnlineStatusWatcher />);

    // Trigger offline event
    globalThis.dispatchEvent(new Event('offline'));

    expect(mockSetOnline).toHaveBeenCalledWith(false);
  });

  it('should register network monitor listener', () => {
    const mockUnsubscribe = jest.fn();
    mockNetworkMonitor.addListener.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(<OnlineStatusWatcher />);

    expect(mockNetworkMonitor.addListener).toHaveBeenCalled();

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(globalThis, 'removeEventListener');

    const { unmount } = render(<OnlineStatusWatcher />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'offline',
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });
});
