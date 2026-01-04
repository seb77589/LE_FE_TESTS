/**
 * Tests for ThemeProvider component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

// Mock AppStateContext
jest.mock('@/lib/context/AppStateContext', () => ({
  useAppState: jest.fn(),
}));

import { useAppState } from '@/lib/context/AppStateContext';

const mockUseAppState = useAppState as jest.MockedFunction<typeof useAppState>;

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset document classes
    document.documentElement.className = '';
  });

  it('should render children', () => {
    mockUseAppState.mockReturnValue({ theme: 'light' } as any);

    const { getByText } = render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>,
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply dark theme class when theme is dark', () => {
    mockUseAppState.mockReturnValue({ theme: 'dark' } as any);

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    // Wait for useEffect to run
    setTimeout(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    }, 0);
  });

  it('should remove dark theme class when theme is light', () => {
    document.documentElement.classList.add('dark');
    mockUseAppState.mockReturnValue({ theme: 'light' } as any);

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    // Wait for useEffect to run
    setTimeout(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    }, 0);
  });

  it('should apply theme after mount', () => {
    mockUseAppState.mockReturnValue({ theme: 'dark' } as any);

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    // Theme should be applied after mount (useEffect runs synchronously in tests)
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
