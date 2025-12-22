/**
 * @jest-environment jsdom
 */

/**
 * Tests for FeatureFlagProvider component and hooks
 *
 * Tests covering:
 * - FeatureFlagProvider context rendering
 * - useFeatureFlag hook
 * - useFeatureFlags hook
 * - User and role-based flag evaluation
 * - Fail-safe behavior when provider is missing
 */

import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import type { FeatureFlagConfig } from '@/lib/features/types';

// Mock logger - inline the mock function
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock getFeatureFlags and getFeatureFlag
jest.mock('@/lib/features/FeatureFlagConfig', () => ({
  getFeatureFlags: jest.fn(() => ({
    new_dashboard: true,
    advanced_search: true,
    experimental_features: false,
  })),
  getFeatureFlag: jest.fn((
    config: FeatureFlagConfig,
    flag: string
  ) => {
    const value = config[flag];
    return typeof value === 'boolean' ? value : false;
  }),
}));

// Import after mocks
import {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlags,
} from '@/lib/features/FeatureFlagProvider';
import logger from '@/lib/logging';
import { getFeatureFlags, getFeatureFlag } from '@/lib/features/FeatureFlagConfig';

// Get references to mocked functions
const mockGetFeatureFlags = getFeatureFlags as jest.MockedFunction<typeof getFeatureFlags>;
const mockGetFeatureFlag = getFeatureFlag as jest.MockedFunction<typeof getFeatureFlag>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('FeatureFlagProvider', () => {
  const defaultConfig: FeatureFlagConfig = {
    new_dashboard: true,
    advanced_search: true,
    experimental_features: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFeatureFlags.mockReturnValue(defaultConfig);
    mockGetFeatureFlag.mockImplementation(
      (config: FeatureFlagConfig, flag: string) => {
        const value = config[flag];
        return typeof value === 'boolean' ? value : false;
      }
    );
  });

  describe('FeatureFlagProvider component', () => {
    it('renders children correctly', () => {
      render(
        <FeatureFlagProvider>
          <div data-testid="child">Child content</div>
        </FeatureFlagProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('uses default config from getFeatureFlags when no config provided', () => {
      render(
        <FeatureFlagProvider>
          <div>Content</div>
        </FeatureFlagProvider>
      );

      expect(mockGetFeatureFlags).toHaveBeenCalled();
    });

    it('uses provided config when passed as prop', () => {
      const customConfig: FeatureFlagConfig = {
        custom_flag: true,
      };

      render(
        <FeatureFlagProvider config={customConfig}>
          <TestComponent />
        </FeatureFlagProvider>
      );

      // getFeatureFlags should not be called since config was provided
      expect(mockGetFeatureFlags).not.toHaveBeenCalled();
    });

    it('passes userId and userRole to flag evaluation', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
      };

      const TestComponent = () => {
        const enabled = useFeatureFlag('new_dashboard');
        return <div>{enabled ? 'enabled' : 'disabled'}</div>;
      };

      render(
        <FeatureFlagProvider config={config} userId="user-123" userRole="admin">
          <TestComponent />
        </FeatureFlagProvider>
      );

      expect(mockGetFeatureFlag).toHaveBeenCalledWith(
        config,
        'new_dashboard',
        'user-123',
        'admin'
      );
    });

    it('renders multiple children', () => {
      render(
        <FeatureFlagProvider>
          <div data-testid="child1">First</div>
          <div data-testid="child2">Second</div>
        </FeatureFlagProvider>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
  });

  describe('useFeatureFlag hook', () => {
    it('returns true for enabled boolean flag', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
      };
      mockGetFeatureFlag.mockReturnValue(true);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlag('new_dashboard'), {
        wrapper,
      });

      expect(result.current).toBe(true);
    });

    it('returns false for disabled boolean flag', () => {
      const config: FeatureFlagConfig = {
        experimental_features: false,
      };
      mockGetFeatureFlag.mockReturnValue(false);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlag('experimental_features'), {
        wrapper,
      });

      expect(result.current).toBe(false);
    });

    it('returns false and logs warning when provider is missing', () => {
      // Render hook without provider
      const { result } = renderHook(() => useFeatureFlag('new_dashboard'));

      expect(result.current).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'general',
        expect.stringContaining("FeatureFlagProvider not found"),
      );
    });

    it('checks flag for specific feature types', () => {
      const config: FeatureFlagConfig = {
        advanced_search: true,
        dark_mode: false,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      mockGetFeatureFlag.mockReturnValueOnce(true);
      const { result: result1 } = renderHook(() => useFeatureFlag('advanced_search'), {
        wrapper,
      });
      expect(result1.current).toBe(true);

      mockGetFeatureFlag.mockReturnValueOnce(false);
      const { result: result2 } = renderHook(() => useFeatureFlag('dark_mode'), {
        wrapper,
      });
      expect(result2.current).toBe(false);
    });
  });

  describe('useFeatureFlags hook', () => {
    it('returns isEnabled function', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      expect(typeof result.current.isEnabled).toBe('function');
    });

    it('returns getConfig function', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      expect(typeof result.current.getConfig).toBe('function');
    });

    it('throws error when used outside provider', () => {
      const { result } = renderHook(() => {
        try {
          return useFeatureFlags();
        } catch (error) {
          return error;
        }
      });

      expect(result.current).toBeInstanceOf(Error);
      expect((result.current as Error).message).toBe(
        'useFeatureFlags must be used within FeatureFlagProvider'
      );
    });

    it('isEnabled returns correct values for flags', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
        experimental_features: false,
      };
      mockGetFeatureFlag
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      expect(result.current.isEnabled('new_dashboard')).toBe(true);
      expect(result.current.isEnabled('experimental_features')).toBe(false);
    });

    it('isEnabled uses provided userId and userRole', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: {
          enabled: true,
          allowedUsers: ['user-123'],
        },
      };
      mockGetFeatureFlag.mockReturnValue(true);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      result.current.isEnabled('new_dashboard', 'user-456', 'admin');

      expect(mockGetFeatureFlag).toHaveBeenCalledWith(
        config,
        'new_dashboard',
        'user-456',
        'admin'
      );
    });

    it('getConfig returns the feature flag configuration', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
        custom_flag: false,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      const returnedConfig = result.current.getConfig();
      expect(returnedConfig).toEqual(config);
    });
  });

  describe('context memoization', () => {
    it('maintains stable reference for isEnabled', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result, rerender } = renderHook(() => useFeatureFlags(), { wrapper });

      const firstIsEnabled = result.current.isEnabled;
      rerender();
      const secondIsEnabled = result.current.isEnabled;

      expect(firstIsEnabled).toBe(secondIsEnabled);
    });

    it('maintains stable reference for getConfig', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FeatureFlagProvider config={config}>{children}</FeatureFlagProvider>
      );

      const { result, rerender } = renderHook(() => useFeatureFlags(), { wrapper });

      const firstGetConfig = result.current.getConfig;
      rerender();
      const secondGetConfig = result.current.getConfig;

      expect(firstGetConfig).toBe(secondGetConfig);
    });
  });

  describe('integration scenarios', () => {
    it('supports nested providers with different configs', () => {
      const outerConfig: FeatureFlagConfig = {
        new_dashboard: false,
      };
      const innerConfig: FeatureFlagConfig = {
        new_dashboard: true,
      };

      mockGetFeatureFlag.mockReturnValue(true);

      const InnerComponent = () => {
        const enabled = useFeatureFlag('new_dashboard');
        return <div data-testid="inner">{enabled ? 'enabled' : 'disabled'}</div>;
      };

      render(
        <FeatureFlagProvider config={outerConfig}>
          <FeatureFlagProvider config={innerConfig}>
            <InnerComponent />
          </FeatureFlagProvider>
        </FeatureFlagProvider>
      );

      // Inner provider should take precedence
      expect(mockGetFeatureFlag).toHaveBeenCalledWith(
        innerConfig,
        'new_dashboard',
        undefined,
        undefined
      );
    });

    it('works with React.memo wrapped components', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
      };
      mockGetFeatureFlag.mockReturnValue(true);

      const MemoizedComponent = React.memo(function ChildComponent() {
        const enabled = useFeatureFlag('new_dashboard');
        return <div>{enabled ? 'enabled' : 'disabled'}</div>;
      });

      render(
        <FeatureFlagProvider config={config}>
          <MemoizedComponent />
        </FeatureFlagProvider>
      );

      expect(screen.getByText('enabled')).toBeInTheDocument();
    });

    it('handles conditional rendering based on flag', () => {
      const config: FeatureFlagConfig = {
        new_dashboard: true,
      };
      mockGetFeatureFlag.mockReturnValue(true);

      const ConditionalComponent = () => {
        const showNewDashboard = useFeatureFlag('new_dashboard');
        return showNewDashboard ? (
          <div data-testid="new">New Dashboard</div>
        ) : (
          <div data-testid="old">Old Dashboard</div>
        );
      };

      render(
        <FeatureFlagProvider config={config}>
          <ConditionalComponent />
        </FeatureFlagProvider>
      );

      expect(screen.getByTestId('new')).toBeInTheDocument();
      expect(screen.queryByTestId('old')).not.toBeInTheDocument();
    });
  });
});

// Test component for use in tests
function TestComponent() {
  const { isEnabled } = useFeatureFlags();
  return <div>{isEnabled('new_dashboard') ? 'enabled' : 'disabled'}</div>;
}
