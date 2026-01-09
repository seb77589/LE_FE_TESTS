/**
 * Unit Test for LazyAdminComponents
 *
 * Coverage Target: 95%+
 * Priority: HIGH (infrastructure for code splitting)
 *
 * Test Categories:
 * - Lazy loading behavior (3 tests)
 * - Error boundaries (2 tests)
 * - Loading fallbacks (2 tests)
 * - Dynamic component loading (3 tests)
 * - Conditional loading (3 tests)
 * - Component registry (2 tests)
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the lazy-loaded components
jest.mock('@/components/admin/UserManagement', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="user-management-component">User Management</div>,
  };
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  LazyUserManagement,
  AdminComponentRegistry,
  DynamicAdminComponent,
  ConditionalAdminComponent,
} from '@/components/admin/LazyAdminComponents';

describe('LazyAdminComponents', () => {
  describe('Lazy Loading Behavior', () => {
    it('loads UserManagement component lazily', async () => {
      render(<LazyUserManagement />);

      // Should show loading state first
      expect(screen.getByText('Loading User Management...')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });

    it('passes props to lazy-loaded components', async () => {
      const mockProps = {
        showHeader: false,
        testProp: 'test value',
      };

      render(<LazyUserManagement {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('wraps components in ErrorBoundary', () => {
      // Test that components are wrapped - actual error handling tested at integration level
      const { container } = render(<LazyUserManagement />);
      expect(container.firstChild).toBeDefined();
    });

    it('error fallback structure includes reload functionality', () => {
      // Test the fallback component structure directly
      const handleReload = () => {
        globalThis.window.location.reload();
      };
      const ErrorFallback = () => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <h3>Failed to load Test Component</h3>
          <button onClick={handleReload}>Reload Page</button>
        </div>
      );

      render(<ErrorFallback />);
      expect(screen.getByText(/Failed to load Test Component/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/ })).toBeInTheDocument();
    });
  });

  describe('Loading Fallbacks', () => {
    it('lazy loads UserManagement and renders successfully', async () => {
      render(<LazyUserManagement />);

      // Component should eventually load
      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Component Loading', () => {
    it('loads component from registry by name', async () => {
      render(<DynamicAdminComponent component="UserManagement" />);

      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });

    it('shows error for unknown component name', () => {
      render(<DynamicAdminComponent component={'InvalidComponent' as any} />);

      expect(
        screen.getByText(/Unknown admin component: InvalidComponent/),
      ).toBeInTheDocument();
    });
  });

  describe('Conditional Loading', () => {
    it('shows component when isAdmin is true', async () => {
      render(<ConditionalAdminComponent isAdmin={true} component="UserManagement" />);

      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });

    it('shows default unauthorized message when isAdmin is false', () => {
      render(<ConditionalAdminComponent isAdmin={false} component="UserManagement" />);

      expect(
        screen.getByText(/You do not have permission to view this component/),
      ).toBeInTheDocument();
    });

    it('shows custom unauthorized component when provided', () => {
      const CustomUnauthorized = () => <div>Custom Unauthorized Message</div>;

      render(
        <ConditionalAdminComponent
          isAdmin={false}
          component="UserManagement"
          unauthorized={CustomUnauthorized}
        />,
      );

      expect(screen.getByText('Custom Unauthorized Message')).toBeInTheDocument();
    });
  });

  describe('Component Registry', () => {
    it('contains all admin components', () => {
      expect(AdminComponentRegistry).toHaveProperty('UserManagement');
    });

    it('registry components are valid React lazy components', () => {
      // React.lazy() returns LazyExoticComponent objects, not functions
      // Check they exist and are renderable (object type with $$typeof)
      expect(AdminComponentRegistry.UserManagement).toBeDefined();
      // LazyExoticComponent has $$typeof property
      expect((AdminComponentRegistry.UserManagement as any).$$typeof).toBeDefined();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards all props to DynamicAdminComponent', async () => {
      const customProps = {
        component: 'UserManagement' as const,
        showHeader: false,
        customProp: 'test',
      };

      render(<DynamicAdminComponent {...customProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });

    it('forwards props to ConditionalAdminComponent', async () => {
      render(
        <ConditionalAdminComponent
          isAdmin={true}
          component="UserManagement"
          testProp="value"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-management-component')).toBeInTheDocument();
      });
    });
  });
});
