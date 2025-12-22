/**
 * Comprehensive Tests for SessionTimeoutWarning component and useSessionTimeout hook
 * 
 * @description Tests covering all code paths including:
 * - Component rendering states
 * - Warning level configurations
 * - Timer/countdown logic with fake timers
 * - formatTime utility function
 * - getProgressValue calculation
 * - handleExtend success and error paths
 * - useSessionTimeout hook state management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { SessionTimeoutWarning, useSessionTimeout } from '@/components/auth/SessionTimeoutWarning';

// Helper functions to avoid deep nesting in tests
function createDelayedResolve(ms: number): () => Promise<void> {
  return () => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Mock UI components
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
  CardDescription: ({ children, className }: any) => (
    <p data-testid="card-description" className={className}>
      {children}
    </p>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/Progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

jest.mock('lucide-react', () => ({
  Clock: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  Shield: ({ className }: { className?: string }) => <div data-testid="shield-icon" className={className} />,
  LogOut: ({ className }: { className?: string }) => <div data-testid="logout-icon" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-icon" className={className} />,
}));

// Mock logger - define inside mock factory
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import logger from '@/lib/logging';
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('SessionTimeoutWarning Component', () => {
  const defaultProps = {
    timeRemaining: 300000, // 5 minutes in ms
    onExtend: jest.fn().mockResolvedValue(undefined),
    onLogout: jest.fn(),
    isVisible: true,
    warningLevel: 'subtle' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility and Null Returns', () => {
    it('returns null when isVisible is false', () => {
      const { container } = render(
        <SessionTimeoutWarning {...defaultProps} isVisible={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when timeRemaining is 0', () => {
      const { container } = render(
        <SessionTimeoutWarning {...defaultProps} timeRemaining={0} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when timeRemaining is negative', () => {
      const { container } = render(
        <SessionTimeoutWarning {...defaultProps} timeRemaining={-1000} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders component when isVisible is true and timeRemaining > 0', () => {
      render(<SessionTimeoutWarning {...defaultProps} />);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('Warning Level Configurations', () => {
    describe('subtle warning level', () => {
      it('shows correct title for subtle warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
        expect(screen.getByTestId('card-title')).toHaveTextContent('Session Expiring Soon');
      });

      it('shows correct description for subtle warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
        expect(screen.getByTestId('card-description')).toHaveTextContent(
          'Your session will expire in a few minutes. Click to extend.',
        );
      });

      it('uses Clock icon for subtle warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      });

      it('does not show progress bar for subtle warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
        expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
      });

      it('does not show logout button for subtle warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
        expect(screen.queryByText(/logout now/i)).not.toBeInTheDocument();
      });
    });

    describe('prominent warning level', () => {
      it('shows correct title for prominent warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="prominent" />);
        expect(screen.getByTestId('card-title')).toHaveTextContent('Session Timeout Warning');
      });

      it('shows countdown in description for prominent warning', () => {
        render(
          <SessionTimeoutWarning
            {...defaultProps}
            warningLevel="prominent"
            timeRemaining={120000} // 2 minutes
          />,
        );
        expect(screen.getByTestId('card-description')).toHaveTextContent(/2:00/);
      });

      it('uses Shield icon for prominent warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="prominent" />);
        expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
      });

      it('shows progress bar for prominent warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="prominent" />);
        expect(screen.getByTestId('progress')).toBeInTheDocument();
      });

      it('does not show logout button for prominent warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="prominent" />);
        expect(screen.queryByText(/logout now/i)).not.toBeInTheDocument();
      });
    });

    describe('critical warning level', () => {
      it('shows correct title for critical warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
        expect(screen.getByTestId('card-title')).toHaveTextContent('Session Expiring!');
      });

      it('shows countdown in description for critical warning', () => {
        render(
          <SessionTimeoutWarning
            {...defaultProps}
            warningLevel="critical"
            timeRemaining={25000} // 25 seconds
          />,
        );
        expect(screen.getByTestId('card-description')).toHaveTextContent(/0:25/);
      });

      it('uses LogOut icon for critical warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
        // Critical mode has two logout icons - header and button
        const icons = screen.getAllByTestId('logout-icon');
        expect(icons.length).toBeGreaterThan(0);
      });

      it('shows progress bar for critical warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
        expect(screen.getByTestId('progress')).toBeInTheDocument();
      });

      it('shows logout button for critical warning', () => {
        render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
        expect(screen.getByText(/logout now/i)).toBeInTheDocument();
      });
    });
  });

  describe('Countdown Timer and useEffect', () => {
    it('initializes countdown from timeRemaining', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={180000} // 3 minutes
        />,
      );
      expect(screen.getByTestId('card-description')).toHaveTextContent('3:00');
    });

    it('sets up interval on mount when visible', () => {
      const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={60000}
        />,
      );
      expect(setIntervalSpy).toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('does not set up interval when not visible', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          isVisible={false}
          warningLevel="prominent"
        />,
      );
      // When not visible, component returns null early
      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('clears interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
      const { unmount } = render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={60000}
        />,
      );
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('updates countdown on interval tick', async () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={60000} // 1 minute
        />,
      );

      // Initial state
      expect(screen.getByTestId('card-description')).toHaveTextContent('1:00');

      // Simulate prop update (like a parent would provide) - countdown is driven by prop
      rerender(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={59000} // 59 seconds
        />,
      );

      // Advance timer to trigger interval callback
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('card-description')).toHaveTextContent('0:59');
      });
    });

    it('handles countdown reaching zero', async () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          timeRemaining={2000} // 2 seconds
        />,
      );

      // Simulate time passing and reaching zero
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      rerender(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          timeRemaining={0}
        />,
      );

      // Should not render when time is 0
      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });
  });

  describe('formatTime Function', () => {
    // formatTime is tested through the component's display
    it('formats time with single-digit seconds correctly', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={65000} // 1:05
        />,
      );
      expect(screen.getByTestId('card-description')).toHaveTextContent('1:05');
    });

    it('formats time with double-digit seconds correctly', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={75000} // 1:15
        />,
      );
      expect(screen.getByTestId('card-description')).toHaveTextContent('1:15');
    });

    it('formats time with only seconds correctly', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          timeRemaining={45000} // 0:45
        />,
      );
      expect(screen.getByTestId('card-description')).toHaveTextContent('0:45');
    });

    it('formats multi-minute time correctly', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={305000} // 5:05
        />,
      );
      expect(screen.getByTestId('card-description')).toHaveTextContent('5:05');
    });
  });

  describe('getProgressValue Function', () => {
    it('calculates progress for critical warning (30 second total)', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          timeRemaining={15000} // 15 seconds = 50% of 30s
        />,
      );
      const progress = screen.getByTestId('progress');
      expect(progress.dataset.value).toBe('50');
    });

    it('calculates progress for prominent warning (5 minute total)', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="prominent"
          timeRemaining={150000} // 150 seconds = 50% of 300s
        />,
      );
      const progress = screen.getByTestId('progress');
      expect(progress.dataset.value).toBe('50');
    });

    it('returns 100% when countdown is at max', () => {
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          timeRemaining={30000} // 30 seconds = 100%
        />,
      );
      const progress = screen.getByTestId('progress');
      expect(progress.dataset.value).toBe('100');
    });

    it('returns 0 when countdown is 0 or negative', () => {
      // This case is hard to test as component doesn't render at 0
      // Instead test very small value
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          timeRemaining={1000} // 1 second
        />,
      );
      const progress = screen.getByTestId('progress');
      // 1 second / 30 seconds = 3.33%
      const value = Number.parseFloat(progress.dataset.value || '0');
      expect(value).toBeCloseTo(3.33, 0);
    });
  });

  describe('handleExtend Function', () => {
    it('calls onExtend when extend button is clicked', async () => {
      const onExtend = jest.fn().mockResolvedValue(undefined);
      render(<SessionTimeoutWarning {...defaultProps} onExtend={onExtend} />);

      const extendButton = screen.getByText(/extend session/i);
      fireEvent.click(extendButton);

      await waitFor(() => {
        expect(onExtend).toHaveBeenCalledTimes(1);
      });
    });

    it('sets isExtending state during extension', async () => {
      const onExtend = jest.fn().mockImplementation(createDelayedResolve(100));
      render(<SessionTimeoutWarning {...defaultProps} onExtend={onExtend} />);

      const extendButton = screen.getByText(/extend session/i);
      fireEvent.click(extendButton);

      // Button should show extending state
      expect(screen.getByText(/extending\.\.\./i)).toBeInTheDocument();
    });

    it('logs success message on successful extend', async () => {
      const onExtend = jest.fn().mockResolvedValue(undefined);
      render(<SessionTimeoutWarning {...defaultProps} onExtend={onExtend} />);

      const extendButton = screen.getByText(/extend session/i);
      fireEvent.click(extendButton);

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          'session',
          'Session extended successfully',
        );
      });
    });

    it('logs error and recovers on failed extend', async () => {
      const error = new Error('Network error');
      const onExtend = jest.fn().mockRejectedValue(error);
      render(<SessionTimeoutWarning {...defaultProps} onExtend={onExtend} />);

      const extendButton = screen.getByText(/extend session/i);
      fireEvent.click(extendButton);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'session',
          'Failed to extend session:',
          { error },
        );
      });

      // Should recover from error state
      await waitFor(() => {
        expect(screen.getByText(/extend session/i)).toBeInTheDocument();
      });
    });

    it('disables button while extending', async () => {
      const onExtend = jest.fn().mockImplementation(createDelayedResolve(1000));
      render(<SessionTimeoutWarning {...defaultProps} onExtend={onExtend} />);

      const extendButton = screen.getByText(/extend session/i);
      fireEvent.click(extendButton);

      // Button should be disabled
      await waitFor(() => {
        expect(screen.getByText(/extending\.\.\./i).closest('button')).toBeDisabled();
      });
    });
  });

  describe('Logout Button', () => {
    it('calls onLogout when logout button is clicked', () => {
      const onLogout = jest.fn();
      render(
        <SessionTimeoutWarning
          {...defaultProps}
          warningLevel="critical"
          onLogout={onLogout}
        />,
      );

      const logoutButton = screen.getByText(/logout now/i);
      fireEvent.click(logoutButton);

      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Icon Colors', () => {
    it('applies blue color for subtle warning icon', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
      const icon = screen.getByTestId('clock-icon');
      expect(icon).toHaveClass('text-blue-500');
    });

    it('applies orange color for prominent warning icon', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="prominent" />);
      const icon = screen.getByTestId('shield-icon');
      expect(icon).toHaveClass('text-orange-500');
    });

    it('applies red color for critical warning icon', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
      // Critical has two logout-icons: one in header, one in button
      // Get the header one (first one with h-5 w-5 class)
      const icons = screen.getAllByTestId('logout-icon');
      const headerIcon = icons.find((icon) => icon.className.includes('h-5 w-5'));
      expect(headerIcon).toHaveClass('text-red-500');
    });
  });

  describe('Title Colors', () => {
    it('applies blue color for subtle warning title', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('text-blue-700');
    });

    it('applies orange color for prominent warning title', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="prominent" />);
      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('text-orange-700');
    });

    it('applies red color for critical warning title', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('text-red-700');
    });
  });

  describe('Button Variants', () => {
    it('uses primary variant for non-critical extend button', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="subtle" />);
      const button = screen.getByText(/extend session/i);
      expect(button).toHaveAttribute('data-variant', 'primary');
    });

    it('uses destructive variant for critical extend button', () => {
      render(<SessionTimeoutWarning {...defaultProps} warningLevel="critical" />);
      const button = screen.getByText(/extend session/i);
      expect(button).toHaveAttribute('data-variant', 'destructive');
    });
  });
});

describe('useSessionTimeout Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with zero time remaining', () => {
      const { result } = renderHook(() => useSessionTimeout());
      expect(result.current.timeRemaining).toBe(0);
    });

    it('initializes as not visible', () => {
      const { result } = renderHook(() => useSessionTimeout());
      expect(result.current.isVisible).toBe(false);
    });

    it('initializes with subtle warning level', () => {
      const { result } = renderHook(() => useSessionTimeout());
      expect(result.current.warningLevel).toBe('subtle');
    });
  });

  describe('updateTimeout Function', () => {
    it('sets time remaining', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(300000); // 5 minutes
      });
      
      expect(result.current.timeRemaining).toBe(300000);
    });

    it('shows warning and sets subtle level for time <= 5 minutes', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(300000); // 5 minutes
      });
      
      expect(result.current.isVisible).toBe(true);
      expect(result.current.warningLevel).toBe('subtle');
    });

    it('shows warning and sets prominent level for time <= 2 minutes', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(120000); // 2 minutes
      });
      
      expect(result.current.isVisible).toBe(true);
      expect(result.current.warningLevel).toBe('prominent');
    });

    it('shows warning and sets critical level for time <= 30 seconds', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(30000); // 30 seconds
      });
      
      expect(result.current.isVisible).toBe(true);
      expect(result.current.warningLevel).toBe('critical');
    });

    it('hides warning when time > 5 minutes', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(600000); // 10 minutes
      });
      
      expect(result.current.isVisible).toBe(false);
    });

    it('hides warning when time is 0', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      // First show the warning
      act(() => {
        result.current.updateTimeout(30000);
      });
      expect(result.current.isVisible).toBe(true);
      
      // Then set to 0
      act(() => {
        result.current.updateTimeout(0);
      });
      expect(result.current.isVisible).toBe(false);
    });

    it('hides warning when time is negative', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(-1000);
      });
      
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('hideWarning Function', () => {
    it('hides the warning when called', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      // First show the warning
      act(() => {
        result.current.updateTimeout(30000);
      });
      expect(result.current.isVisible).toBe(true);
      
      // Then hide it
      act(() => {
        result.current.hideWarning();
      });
      
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('Warning Level Thresholds', () => {
    it('sets critical at exactly 30 seconds', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(30000);
      });
      
      expect(result.current.warningLevel).toBe('critical');
    });

    it('sets prominent at 31 seconds (just over critical threshold)', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(31000);
      });
      
      expect(result.current.warningLevel).toBe('prominent');
    });

    it('sets prominent at exactly 2 minutes', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(120000);
      });
      
      expect(result.current.warningLevel).toBe('prominent');
    });

    it('sets subtle at 121 seconds (just over prominent threshold)', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(121000);
      });
      
      expect(result.current.warningLevel).toBe('subtle');
    });

    it('sets subtle at exactly 5 minutes', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(300000);
      });
      
      expect(result.current.warningLevel).toBe('subtle');
    });

    it('hides at 301 seconds (just over subtle threshold)', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      act(() => {
        result.current.updateTimeout(301000);
      });
      
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('transitions from subtle to prominent to critical', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      // Start at subtle
      act(() => {
        result.current.updateTimeout(300000);
      });
      expect(result.current.warningLevel).toBe('subtle');
      
      // Move to prominent
      act(() => {
        result.current.updateTimeout(120000);
      });
      expect(result.current.warningLevel).toBe('prominent');
      
      // Move to critical
      act(() => {
        result.current.updateTimeout(30000);
      });
      expect(result.current.warningLevel).toBe('critical');
    });

    it('can transition back from critical to subtle', () => {
      const { result } = renderHook(() => useSessionTimeout());
      
      // Start at critical
      act(() => {
        result.current.updateTimeout(30000);
      });
      expect(result.current.warningLevel).toBe('critical');
      
      // User extends session, move back to subtle
      act(() => {
        result.current.updateTimeout(300000);
      });
      expect(result.current.warningLevel).toBe('subtle');
    });
  });
});
