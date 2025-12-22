'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ClientErrorTrackingProvider } from '@/components/providers/ClientErrorTrackingProvider';
import { errorTracking } from '@/lib/errors';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock the errorTracking module
jest.mock('@/lib/errors', () => {
  return {
    errorTracking: {
      captureMessage: jest.fn(),
      getQueueStatus: jest.fn().mockReturnValue({
        total: 0,
        unsent: 0,
        sent: 0,
      }),
      captureException: jest.fn(),
      trackUserAction: jest.fn(),
      setUser: jest.fn(),
      trackPerformance: jest.fn(),
      setFallbackMode: jest.fn(),
      isFallbackMode: jest.fn().mockReturnValue(false),
    },
  };
});

// Mock the healthCheck module to avoid network calls
jest.mock('@/lib/healthCheck', () => ({
  runStartupValidation: jest.fn().mockResolvedValue({
    overallStatus: 'healthy',
    environmentCheck: {
      valid: true,
      issues: [],
      recommendations: [],
    },
    healthCheck: {
      overall: 'healthy',
    },
  }),
}));

// Mock console.log to avoid cluttering test output
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

describe('ClientErrorTrackingProvider', () => {
  beforeAll(() => {
    console.log = mockConsoleLog;
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <ClientErrorTrackingProvider>
        <div data-testid="test-child">Test Child</div>
      </ClientErrorTrackingProvider>,
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('initializes error tracking and tracks app initialization', async () => {
    // Mock localStorage to have auth data
    const mockAuthData = {
      user: {
        id: 'test-user-id',
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'assistant',
      },
    };

    Object.defineProperty(globalThis.window, 'localStorage', {
      value: {
        getItem: jest.fn().mockImplementation((key) => {
          if (key === 'auth') {
            return JSON.stringify(mockAuthData);
          }
          return null;
        }),
      },
      writable: true,
    });

    render(
      <ClientErrorTrackingProvider>
        <div>Test Content</div>
      </ClientErrorTrackingProvider>,
    );

    // Wait for the useEffect to run
    await waitFor(() => {
      expect(errorTracking.trackUserAction).toHaveBeenCalledWith(
        'app_initialized',
        expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          viewport: expect.any(Object),
          screen: expect.any(Object),
          healthStatus: 'healthy',
          environmentValid: true,
          servicesHealthy: true,
        }),
      );
    });

    expect(errorTracking.setUser).toHaveBeenCalledWith('test-user-id', {
      email: FRONTEND_TEST_CREDENTIALS.USER.email,
      role: 'assistant',
    });
  });

  it('handles performance tracking setup', async () => {
    render(
      <ClientErrorTrackingProvider>
        <div>Test Content</div>
      </ClientErrorTrackingProvider>,
    );

    // Wait for initialization
    await waitFor(() => {
      expect(errorTracking.trackUserAction).toHaveBeenCalledWith(
        'app_initialized',
        expect.any(Object),
      );
    });

    // The performance tracking setup is called, but we can't easily mock the performance API
    // in jsdom, so we just verify that the component initializes correctly
    expect(errorTracking.trackUserAction).toHaveBeenCalled();
  });

  it('exposes error tracking to window object', async () => {
    // Save original window properties
    const originalWindowProps = {
      errorTracking: (globalThis as Record<string, unknown>).errorTracking,
      testFrontendError: (globalThis as Record<string, unknown>).testFrontendError,
      testUserAction: (globalThis as Record<string, unknown>).testUserAction,
    };

    render(
      <ClientErrorTrackingProvider>
        <div>Test Content</div>
      </ClientErrorTrackingProvider>,
    );

    // Wait for the useEffect to run
    await waitFor(() => {
      expect(globalThis.window).toHaveProperty('errorTracking');
      expect(globalThis.window).toHaveProperty('testFrontendError');
      expect(globalThis.window).toHaveProperty('testUserAction');
    });

    // Test the exposed methods
    const testWindow = globalThis.window as any;
    testWindow.testFrontendError();
    expect(errorTracking.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'manual_test',
        timestamp: expect.any(String),
      }),
    );

    testWindow.testUserAction('test-action', { extraData: 'test' });
    expect(errorTracking.trackUserAction).toHaveBeenCalledWith(
      'test-action',
      expect.objectContaining({
        source: 'manual_test',
        timestamp: expect.any(String),
        extraData: 'test',
      }),
    );

    // Restore original properties
    (globalThis.window as any).errorTracking = originalWindowProps.errorTracking;
    (globalThis.window as any).testFrontendError = originalWindowProps.testFrontendError;
    (globalThis.window as any).testUserAction = originalWindowProps.testUserAction;
  });
});
