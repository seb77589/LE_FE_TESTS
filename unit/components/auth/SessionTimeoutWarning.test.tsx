/**
 * Tests for SessionTimeoutWarning component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionTimeoutWarning } from '@/components/auth/SessionTimeoutWarning';

// Mock child components
jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-variant={variant} data-testid="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  RefreshCw: () => <div data-testid="refresh-icon">Refresh</div>,
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SessionTimeoutWarning', () => {
  const mockOnExtend = jest.fn().mockResolvedValue(undefined);
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render session timeout warning when visible', () => {
      render(
        <SessionTimeoutWarning
          timeRemaining={300000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={true}
          warningLevel="subtle"
        />,
      );
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <SessionTimeoutWarning
          timeRemaining={300000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={false}
          warningLevel="subtle"
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Warning Levels', () => {
    it('should render subtle warning level', () => {
      render(
        <SessionTimeoutWarning
          timeRemaining={300000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={true}
          warningLevel="subtle"
        />,
      );
      expect(screen.getByText(/Session Expiring Soon/i)).toBeInTheDocument();
    });

    it('should render prominent warning level', () => {
      render(
        <SessionTimeoutWarning
          timeRemaining={300000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={true}
          warningLevel="prominent"
        />,
      );
      expect(screen.getByText(/Session Timeout Warning/i)).toBeInTheDocument();
    });

    it('should render critical warning level', () => {
      render(
        <SessionTimeoutWarning
          timeRemaining={30000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={true}
          warningLevel="critical"
        />,
      );
      expect(screen.getByText(/Session Expiring!/i)).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onExtend when extend button is clicked', async () => {
      render(
        <SessionTimeoutWarning
          timeRemaining={300000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={true}
          warningLevel="subtle"
        />,
      );
      const extendButton = screen.getByText(/extend session/i);
      fireEvent.click(extendButton);
      await waitFor(() => {
        expect(mockOnExtend).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onLogout when logout button is clicked', () => {
      render(
        <SessionTimeoutWarning
          timeRemaining={30000}
          onExtend={mockOnExtend}
          onLogout={mockOnLogout}
          isVisible={true}
          warningLevel="critical"
        />,
      );
      const logoutButton = screen.getByText(/logout now/i);
      fireEvent.click(logoutButton);
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });
});
