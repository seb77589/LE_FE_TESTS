/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  useWebSocket,
  useAdminWebSocket,
  WebSocketStatus,
  WebSocketEventType,
} from '@/lib/context/WebSocketContext';

// ==============================================================================
// Module-level utilities (extracted to reduce nesting depth - fixes S2004)
// ==============================================================================

// No-op callback for subscribe tests
const noopCallback = (): void => undefined;

// Mock error extractor function
function extractErrorMock(error: unknown, defaultMsg: string): string {
  return error instanceof Error ? error.message : defaultMsg;
}

// Mock logging
jest.mock('@/lib/logging', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Mock errors module
jest.mock('@/lib/errors', () => ({
  extractErrorMessage: jest.fn(extractErrorMock),
}));

// Mock useAuth - token resolver defined at module level
const resolveToken = (): Promise<string> => Promise.resolve('test-token');

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: () => ({
    user: null, // Start with no user to prevent auto-connect
    getValidAccessToken: jest.fn(resolveToken),
  }),
}));

// ==============================================================================
// Module-level test components (extracted to reduce nesting depth - fixes S2004)
// ==============================================================================

// Basic status display component
function WebSocketStatusComponent() {
  const ws = useWebSocket();
  return (
    <div>
      <span data-testid="status">{ws.status}</span>
      <span data-testid="isConnected">{String(ws.isConnected)}</span>
      <span data-testid="lastError">{ws.lastError || 'null'}</span>
      <span data-testid="connectionStats">{ws.connectionStats ? 'has-stats' : 'null'}</span>
    </div>
  );
}

// Component that tests no-op functions
function WebSocketNoOpComponent() {
  const ws = useWebSocket();

  // These should not throw
  ws.sendMessage({ test: 'data' });
  ws.connect();
  ws.disconnect();
  const unsub = ws.subscribe(WebSocketEventType.NOTIFICATION, noopCallback);
  unsub();
  ws.unsubscribe(WebSocketEventType.NOTIFICATION, noopCallback);

  return <div>OK</div>;
}

// Component that tests subscribe return type
function WebSocketSubscribeTypeComponent() {
  const ws = useWebSocket();
  const unsub = ws.subscribe(WebSocketEventType.NOTIFICATION, noopCallback);
  return <div data-testid="result">{typeof unsub}</div>;
}

// Admin WebSocket status component
function AdminWebSocketStatusComponent() {
  const ws = useAdminWebSocket();
  return (
    <div>
      <span data-testid="status">{ws.status}</span>
      <span data-testid="isConnected">{String(ws.isConnected)}</span>
    </div>
  );
}

// Admin WebSocket no-op component
function AdminWebSocketNoOpComponent() {
  const ws = useAdminWebSocket();

  // These should not throw
  ws.sendMessage({ test: 'data' });
  ws.connect();
  ws.disconnect();
  const unsub = ws.subscribe(WebSocketEventType.ADMIN_ALERT, noopCallback);
  unsub();

  return <div>OK</div>;
}

// Connected status component
function ConnectedStatusComponent() {
  const ws = useWebSocket();
  return <div data-testid="connected">{String(ws.isConnected)}</div>;
}

// Multiple subscribe component
function MultipleSubscribeComponent() {
  const ws = useWebSocket();
  const unsub1 = ws.subscribe(WebSocketEventType.NOTIFICATION, noopCallback);
  const unsub2 = ws.subscribe(WebSocketEventType.NOTIFICATION, noopCallback);
  const unsub3 = ws.subscribe(WebSocketEventType.USER_ACTIVITY, noopCallback);

  // Clean up
  unsub1();
  unsub2();
  unsub3();

  return <div>OK</div>;
}

// Unsubscribe without subscribe component
function UnsubscribeWithoutSubscribeComponent() {
  const ws = useWebSocket();
  // Should not throw even when unsubscribing a callback that was never added
  ws.unsubscribe(WebSocketEventType.NOTIFICATION, noopCallback);
  return <div>OK</div>;
}

// Send message on disconnected socket component
function SendMessageDisconnectedComponent() {
  const ws = useWebSocket();
  // Should not throw when sending on disconnected socket
  ws.sendMessage({ type: 'test', data: { value: 123 } });
  return <div>OK</div>;
}

// Multiple connect calls component
function MultipleConnectComponent() {
  const ws = useWebSocket();
  // Multiple connect calls should not throw
  ws.connect();
  ws.connect();
  ws.connect();
  return <div>OK</div>;
}

// Multiple disconnect calls component
function MultipleDisconnectComponent() {
  const ws = useWebSocket();
  // Multiple disconnect calls should not throw
  ws.disconnect();
  ws.disconnect();
  ws.disconnect();
  return <div>OK</div>;
}

// Properties check component
function PropertiesCheckComponent() {
  const ws = useWebSocket();
  const properties = [
    'status',
    'isConnected',
    'lastError',
    'connectionStats',
    'sendMessage',
    'subscribe',
    'unsubscribe',
    'connect',
    'disconnect',
  ];

  const missingProps = properties.filter((prop) => !(prop in ws));
  return <div data-testid="missing">{missingProps.length}</div>;
}

// Type check component for sendMessage
function SendMessageTypeComponent() {
  const ws = useWebSocket();
  return <div data-testid="type">{typeof ws.sendMessage}</div>;
}

// Type check component for subscribe
function SubscribeTypeComponent() {
  const ws = useWebSocket();
  return <div data-testid="type">{typeof ws.subscribe}</div>;
}

// Type check component for unsubscribe
function UnsubscribeTypeComponent() {
  const ws = useWebSocket();
  return <div data-testid="type">{typeof ws.unsubscribe}</div>;
}

// Type check component for connect
function ConnectTypeComponent() {
  const ws = useWebSocket();
  return <div data-testid="type">{typeof ws.connect}</div>;
}

// Type check component for disconnect
function DisconnectTypeComponent() {
  const ws = useWebSocket();
  return <div data-testid="type">{typeof ws.disconnect}</div>;
}

// ==============================================================================
// Test Suites
// ==============================================================================

describe('WebSocketContext', () => {
  describe('useWebSocket without provider', () => {
    it('should return stub implementation when used outside provider', () => {
      render(<WebSocketStatusComponent />);

      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
      expect(screen.getByTestId('lastError')).toHaveTextContent('null');
      expect(screen.getByTestId('connectionStats')).toHaveTextContent('null');
    });

    it('should provide no-op functions in stub', () => {
      expect(() => render(<WebSocketNoOpComponent />)).not.toThrow();
    });

    it('should return unsubscribe function from subscribe', () => {
      render(<WebSocketSubscribeTypeComponent />);
      expect(screen.getByTestId('result')).toHaveTextContent('function');
    });
  });

  describe('useAdminWebSocket without provider', () => {
    it('should return stub implementation when used outside provider', () => {
      render(<AdminWebSocketStatusComponent />);

      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
    });

    it('should provide no-op functions in admin stub', () => {
      expect(() => render(<AdminWebSocketNoOpComponent />)).not.toThrow();
    });
  });

  describe('WebSocketStatus enum', () => {
    it('should have all expected values', () => {
      expect(WebSocketStatus.DISCONNECTED).toBe('disconnected');
      expect(WebSocketStatus.CONNECTING).toBe('connecting');
      expect(WebSocketStatus.CONNECTED).toBe('connected');
      expect(WebSocketStatus.RECONNECTING).toBe('reconnecting');
      expect(WebSocketStatus.ERROR).toBe('error');
    });

    it('should have correct string types', () => {
      expect(typeof WebSocketStatus.DISCONNECTED).toBe('string');
      expect(typeof WebSocketStatus.CONNECTING).toBe('string');
      expect(typeof WebSocketStatus.CONNECTED).toBe('string');
    });
  });

  describe('WebSocketEventType enum', () => {
    it('should have all expected values', () => {
      expect(WebSocketEventType.USER_ACTIVITY).toBe('user_activity');
      expect(WebSocketEventType.NOTIFICATION).toBe('notification');
      expect(WebSocketEventType.DOCUMENT_UPDATE).toBe('document_update');
      expect(WebSocketEventType.USER_UPDATE).toBe('user_update');
      expect(WebSocketEventType.ADMIN_ALERT).toBe('admin_alert');
      expect(WebSocketEventType.SYSTEM_STATUS).toBe('system_status');
      expect(WebSocketEventType.CONNECTION_STATS).toBe('connection_stats');
    });

    it('should have all 7 event types', () => {
      const eventTypes = Object.values(WebSocketEventType);
      expect(eventTypes.length).toBe(7);
    });
  });

  describe('stub implementation behavior', () => {
    it('should have correct isConnected false by default', () => {
      render(<ConnectedStatusComponent />);
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
    });

    it('should allow multiple subscribe calls', () => {
      expect(() => render(<MultipleSubscribeComponent />)).not.toThrow();
    });

    it('should allow unsubscribe without prior subscribe', () => {
      expect(() => render(<UnsubscribeWithoutSubscribeComponent />)).not.toThrow();
    });

    it('should handle sendMessage on disconnected socket gracefully', () => {
      expect(() => render(<SendMessageDisconnectedComponent />)).not.toThrow();
    });

    it('should handle connect when already disconnected', () => {
      expect(() => render(<MultipleConnectComponent />)).not.toThrow();
    });

    it('should handle disconnect when already disconnected', () => {
      expect(() => render(<MultipleDisconnectComponent />)).not.toThrow();
    });
  });

  describe('context type checking', () => {
    it('should provide all expected properties in context', () => {
      render(<PropertiesCheckComponent />);
      expect(screen.getByTestId('missing')).toHaveTextContent('0');
    });

    it('should have sendMessage as a function', () => {
      render(<SendMessageTypeComponent />);
      expect(screen.getByTestId('type')).toHaveTextContent('function');
    });

    it('should have subscribe as a function', () => {
      render(<SubscribeTypeComponent />);
      expect(screen.getByTestId('type')).toHaveTextContent('function');
    });

    it('should have unsubscribe as a function', () => {
      render(<UnsubscribeTypeComponent />);
      expect(screen.getByTestId('type')).toHaveTextContent('function');
    });

    it('should have connect as a function', () => {
      render(<ConnectTypeComponent />);
      expect(screen.getByTestId('type')).toHaveTextContent('function');
    });

    it('should have disconnect as a function', () => {
      render(<DisconnectTypeComponent />);
      expect(screen.getByTestId('type')).toHaveTextContent('function');
    });
  });
});
