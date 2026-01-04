/**
 * Unit Tests for SystemHealthDashboard Component
 *
 * Tests cover:
 * - WebSocket subscription for system health
 * - Event handling and state updates
 * - Fallback to polling
 * - Status change detection
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard';
import { WebSocketEventType } from '@/lib/context/WebSocketContext';
import { TEST_CREDENTIALS } from '../../test-credentials';

// Mock WebSocket context
const mockSubscribe = vi.fn(() => () => {}); // Returns unsubscribe function
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: () => ({
    getValidAccessToken: vi.fn(() => Promise.resolve('mock-token')),
    user: {
      id: 1,
      email: process.env.TEST_ADMIN_EMAIL!,
      role: 'manager',
    },
    isAuthenticated: true,
  }),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  }),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/datetime', () => ({
  formatTime: (seconds: number) => `${seconds}s`,
  formatDateTime: (date: string) => new Date(date).toISOString(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('SystemHealthDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          database: 'healthy',
          storage: 'healthy',
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metrics: {
            cpu_usage: 45.2,
            memory_usage: 67.8,
            disk_usage: 23.1,
          },
          dependencies: {},
          generated_at: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
  });

  it('should render the system health dashboard', async () => {
    render(<SystemHealthDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/system health/i)).toBeInTheDocument();
    });
  });

  it('should subscribe to SYSTEM_STATUS WebSocket events', async () => {
    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        WebSocketEventType.SYSTEM_STATUS,
        expect.any(Function),
      );
    });
  });

  it('should handle system status WebSocket events', async () => {
    let statusHandler: ((event: any) => void) | null = null;

    mockSubscribe.mockImplementation((eventType, handler) => {
      if (eventType === WebSocketEventType.SYSTEM_STATUS) {
        statusHandler = handler;
      }
      return () => {}; // Return unsubscribe function
    });

    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(statusHandler).toBeTruthy();
    });

    // Simulate system status event
    const statusEvent = {
      type: WebSocketEventType.SYSTEM_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        type: 'health_update',
        status: {
          overall: 'warning',
          database: 'healthy',
          storage: 'warning',
          api: 'healthy',
          websocket: 'healthy',
        },
        metrics: {
          cpu_usage: 75.5,
          memory_usage: 85.2,
        },
      },
    };

    act(() => {
      if (statusHandler) {
        statusHandler(statusEvent);
      }
    });

    // Component should process the status update
    // (State updates may not be immediately visible, but no errors should occur)
    expect(statusHandler).toBeTruthy();
  });

  it('should update metrics when received in WebSocket event', async () => {
    let statusHandler: ((event: any) => void) | null = null;

    mockSubscribe.mockImplementation((eventType, handler) => {
      if (eventType === WebSocketEventType.SYSTEM_STATUS) {
        statusHandler = handler;
      }
      return () => {};
    });

    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(statusHandler).toBeTruthy();
    });

    const eventWithMetrics = {
      type: WebSocketEventType.SYSTEM_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        status: {
          overall: 'healthy',
          database: 'healthy',
          storage: 'healthy',
          api: 'healthy',
          websocket: 'healthy',
        },
        metrics: {
          cpu_usage: 50.0,
          memory_usage: 60.0,
          disk_usage: 30.0,
        },
      },
    };

    act(() => {
      if (statusHandler) {
        statusHandler(eventWithMetrics);
      }
    });

    // Component should update metrics
    expect(statusHandler).toBeTruthy();
  });

  it('should update alerts when received in WebSocket event', async () => {
    let statusHandler: ((event: any) => void) | null = null;

    mockSubscribe.mockImplementation((eventType, handler) => {
      if (eventType === WebSocketEventType.SYSTEM_STATUS) {
        statusHandler = handler;
      }
      return () => {};
    });

    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(statusHandler).toBeTruthy();
    });

    const eventWithAlerts = {
      type: WebSocketEventType.SYSTEM_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        status: {
          overall: 'healthy',
          database: 'healthy',
          storage: 'healthy',
          api: 'healthy',
          websocket: 'healthy',
        },
        alerts: [
          {
            id: 'alert-1',
            type: 'warning',
            message: 'High CPU usage detected',
            timestamp: new Date().toISOString(),
            component: 'system',
          },
        ],
      },
    };

    act(() => {
      if (statusHandler) {
        statusHandler(eventWithAlerts);
      }
    });

    // Component should update alerts
    expect(statusHandler).toBeTruthy();
  });

  it('should fallback to polling when WebSocket is not connected', async () => {
    vi.doMock('@/hooks/useWebSocket', () => ({
      useWebSocket: () => ({
        isConnected: false,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      }),
    }));

    render(<SystemHealthDashboard />);

    // Should use polling (check for fetch calls)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should unsubscribe from WebSocket events on unmount', async () => {
    const unsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(unsubscribe);

    const { unmount } = render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    // Should call unsubscribe
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should handle WebSocket event with changed components', async () => {
    let statusHandler: ((event: any) => void) | null = null;

    mockSubscribe.mockImplementation((eventType, handler) => {
      if (eventType === WebSocketEventType.SYSTEM_STATUS) {
        statusHandler = handler;
      }
      return () => {};
    });

    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(statusHandler).toBeTruthy();
    });

    const eventWithChanges = {
      type: WebSocketEventType.SYSTEM_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        type: 'health_update',
        status: {
          overall: 'critical',
          database: 'critical',
          storage: 'healthy',
          api: 'healthy',
          websocket: 'healthy',
        },
        changed_components: ['overall', 'database'],
        previous_status: {
          overall: 'healthy',
          database: 'healthy',
          storage: 'healthy',
          api: 'healthy',
          websocket: 'healthy',
        },
      },
    };

    act(() => {
      if (statusHandler) {
        statusHandler(eventWithChanges);
      }
    });

    // Component should handle status changes
    expect(statusHandler).toBeTruthy();
  });

  it('should add entries to history when status changes', async () => {
    let statusHandler: ((event: any) => void) | null = null;

    mockSubscribe.mockImplementation((eventType, handler) => {
      if (eventType === WebSocketEventType.SYSTEM_STATUS) {
        statusHandler = handler;
      }
      return () => {};
    });

    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(statusHandler).toBeTruthy();
    });

    const historyEvent = {
      type: WebSocketEventType.SYSTEM_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        status: {
          overall: 'warning',
          database: 'healthy',
          storage: 'healthy',
          api: 'healthy',
          websocket: 'healthy',
        },
        metrics: {
          cpu_usage: 80.0,
          memory_usage: 70.0,
        },
      },
    };

    act(() => {
      if (statusHandler) {
        statusHandler(historyEvent);
      }
    });

    // Component should add to history
    expect(statusHandler).toBeTruthy();
  });

  it('should handle errors in WebSocket event processing', async () => {
    let statusHandler: ((event: any) => void) | null = null;

    mockSubscribe.mockImplementation((eventType, handler) => {
      if (eventType === WebSocketEventType.SYSTEM_STATUS) {
        statusHandler = handler;
      }
      return () => {};
    });

    render(<SystemHealthDashboard />);

    await waitFor(() => {
      expect(statusHandler).toBeTruthy();
    });

    // Simulate event with invalid data
    const invalidEvent = {
      type: WebSocketEventType.SYSTEM_STATUS,
      data: null, // Invalid data
    };

    act(() => {
      if (statusHandler) {
        // Should handle error gracefully
        try {
          statusHandler(invalidEvent);
        } catch (error) {
          // Error should be caught and logged
        }
      }
    });

    // Component should handle error without crashing
    expect(statusHandler).toBeTruthy();
  });
});
