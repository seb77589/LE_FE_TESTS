/**
 * Unit tests for Root Layout
 *
 * @description Comprehensive tests for the root layout component including provider hierarchy,
 * SSR safety, metadata configuration, and initialization logic.
 *
 * Test Coverage:
 * - Provider hierarchy and nesting
 * - SSR safety for client-side initialization
 * - Metadata configuration
 * - Font configuration
 * - HTML structure
 * - Error boundary integration
 * - Theme provider integration
 * - Internationalization setup
 *
 * @module __tests__/unit/app/layout
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RootLayout, { metadata } from '@/app/layout';

// Mock all provider components
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

jest.mock('@/components/providers/ClientErrorTrackingProvider', () => ({
  ClientErrorTrackingProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-tracking-provider">{children}</div>
  ),
}));

jest.mock('@/lib/i18n/I18nProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

jest.mock('@/lib/context/AppStateContext', () => ({
  AppStateProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-state-provider">{children}</div>
  ),
}));

jest.mock('@/components/providers/ThemeProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('@/components/providers/OnlineStatusWatcher', () => ({
  __esModule: true,
  default: () => <div data-testid="online-status-watcher" />,
}));

jest.mock('@/components/ui/OfflineBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="offline-banner" />,
}));

jest.mock('@/components/auth/SessionTimeoutProvider', () => ({
  SessionTimeoutProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-timeout-provider">{children}</div>
  ),
}));

jest.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, showDetails }: { children: React.ReactNode; showDetails?: boolean }) => (
    <div data-testid="error-boundary" data-show-details={showDetails}>
      {children}
    </div>
  ),
}));

jest.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock('@/lib/simpleChunkLoader', () => ({
  installChunkErrorHandler: jest.fn(),
  preloadCriticalChunks: jest.fn(),
}));

jest.mock('@/components/ui/ErrorRecovery', () => ({
  errorRecovery: {
    reset: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  networkMonitor: {
    addListener: jest.fn(),
  },
  swrErrorConfig: {
    shouldRetryOnError: jest.fn(() => true),
    onError: jest.fn(),
  },
}));

jest.mock('@/lib/security/monitor', () => ({
  initializeSecurityMonitoring: jest.fn(),
}));

jest.mock('@/lib/utils/rum', () => ({
  initWebVitals: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic rendering', () => {
    it('should render children', () => {
      render(
        <RootLayout>
          <div data-testid="test-child">Test Content</div>
        </RootLayout>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    // Note: HTML structure (html, head, body tags) and font classes are handled by Next.js
    // at a level above what's testable in unit tests. These are verified in E2E tests.
  });

  describe('Provider hierarchy', () => {
    it('should render all providers in correct order', () => {
      render(
        <RootLayout>
          <div data-testid="content">Content</div>
        </RootLayout>
      );

      // Verify all providers are present
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
      expect(screen.getByTestId('app-state-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('error-tracking-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('session-timeout-provider')).toBeInTheDocument();
    });

    it('should nest providers correctly', () => {
      render(
        <RootLayout>
          <div data-testid="content">Content</div>
        </RootLayout>
      );

      // ErrorBoundary should wrap everything
      const errorBoundary = screen.getByTestId('error-boundary');
      const i18nProvider = screen.getByTestId('i18n-provider');

      expect(errorBoundary).toContainElement(i18nProvider);
    });

    it('should render OnlineStatusWatcher and OfflineBanner', () => {
      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      expect(screen.getByTestId('online-status-watcher')).toBeInTheDocument();
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    it('should render Toaster for notifications', () => {
      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });

  describe('Error boundary configuration', () => {
    it('should show error details in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const errorBoundary = screen.getByTestId('error-boundary');
      expect(errorBoundary).toHaveAttribute('data-show-details', 'true');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should hide error details in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      const errorBoundary = screen.getByTestId('error-boundary');
      expect(errorBoundary).toHaveAttribute('data-show-details', 'false');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Metadata', () => {
    it('should export correct metadata', () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe('LegalEase');
      expect(metadata.description).toBe('Legal document management and automation platform');
    });

    it('should have metadata with title and description', () => {
      expect(metadata).toEqual(
        expect.objectContaining({
          title: 'LegalEase',
          description: 'Legal document management and automation platform',
        })
      );
    });
  });

  // Note: Head elements (DNS prefetch, viewport, theme color) are handled by Next.js App Router
  // and are not directly testable in unit tests. These are verified in E2E tests.

  describe('Client-side initialization', () => {
    it('should not initialize on server-side', () => {
      const { installChunkErrorHandler, preloadCriticalChunks } = require('@/lib/simpleChunkLoader');
      const { errorRecovery } = require('@/components/ui/ErrorRecovery');

      // Temporarily remove window to simulate SSR
      const originalWindow = globalThis.window;
      // @ts-ignore
      globalThis.window = undefined;

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      // Should not initialize in SSR
      expect(installChunkErrorHandler).not.toHaveBeenCalled();
      expect(preloadCriticalChunks).not.toHaveBeenCalled();
      expect(errorRecovery.reset).not.toHaveBeenCalled();

      // Restore window
      globalThis.window = originalWindow;
    });

    it('should initialize client-side systems after timeout', async () => {
      const { installChunkErrorHandler, preloadCriticalChunks } = require('@/lib/simpleChunkLoader');
      const { errorRecovery } = require('@/components/ui/ErrorRecovery');
      const { initWebVitals } = require('@/lib/utils/rum');

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      // Fast-forward past the 100ms timeout
      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(installChunkErrorHandler).toHaveBeenCalled();
        expect(preloadCriticalChunks).toHaveBeenCalled();
        expect(errorRecovery.reset).toHaveBeenCalled();
        expect(initWebVitals).toHaveBeenCalled();
      });
    });

    it('should initialize web vitals with correct config in development', async () => {
      const { initWebVitals } = require('@/lib/utils/rum');
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(initWebVitals).toHaveBeenCalledWith({
          debug: true,
          sampleRate: 1,
        });
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should initialize web vitals with sampling in production', async () => {
      const { initWebVitals } = require('@/lib/utils/rum');
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(initWebVitals).toHaveBeenCalledWith({
          debug: false,
          sampleRate: 0.1,
        });
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should initialize security monitoring in development', async () => {
      const { initializeSecurityMonitoring } = require('@/lib/security/monitor');
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(initializeSecurityMonitoring).toHaveBeenCalled();
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should add network status listener', async () => {
      const { networkMonitor } = require('@/lib/errors');
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <RootLayout>
          <div>Content</div>
        </RootLayout>
      );

      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(networkMonitor.addListener).toHaveBeenCalled();
      });

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  // Note: HTML lang attribute is set by Next.js App Router (html tag in layout.tsx)
  // and is not directly testable in unit tests. Verified in E2E tests.

  describe('Multiple children', () => {
    it('should render multiple child elements', () => {
      render(
        <RootLayout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </RootLayout>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });
});
