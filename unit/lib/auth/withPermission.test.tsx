/**
 * Unit Tests for Permission HOCs
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  withPermission,
  withRole,
  withAnyPermission,
  withAllPermissions,
} from '@/lib/auth/withPermission';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';

// Mock ConsolidatedAuthContext
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test component
const TestComponent: React.FC<{ message: string }> = ({ message }) => (
  <div data-testid="test-component">{message}</div>
);

// Fallback component
const FallbackComponent: React.FC<{ message: string }> = ({ message }) => (
  <div data-testid="fallback-component">{message}</div>
);

describe('Permission HOCs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withPermission', () => {
    it('should render component when user has permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
      } as any);

      const ProtectedComponent = withPermission('users:admin', TestComponent);
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should not render component when user lacks permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withPermission('users:admin', TestComponent);
      render(<ProtectedComponent message="Hello" />);

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('should render fallback component when permission denied', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withPermission(
        'users:admin',
        TestComponent,
        FallbackComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('should set display name for debugging', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
      } as any);

      const ProtectedComponent = withPermission('users:admin', TestComponent);
      expect(ProtectedComponent.displayName).toBe('withPermission(TestComponent)');
    });
  });

  describe('withRole', () => {
    it('should render component when user has required role', () => {
      mockUseAuth.mockReturnValue({
        hasRole: jest.fn((role) => role === 'superadmin'),
      } as any);

      const ProtectedComponent = withRole('superadmin', TestComponent);
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('should not render component when user lacks required role', () => {
      mockUseAuth.mockReturnValue({
        hasRole: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withRole('superadmin', TestComponent);
      render(<ProtectedComponent message="Hello" />);

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('should render fallback component when role check fails', () => {
      mockUseAuth.mockReturnValue({
        hasRole: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withRole(
        'superadmin',
        TestComponent,
        FallbackComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    });

    it('should set display name for debugging', () => {
      mockUseAuth.mockReturnValue({
        hasRole: jest.fn(() => true),
      } as any);

      const ProtectedComponent = withRole('superadmin', TestComponent);
      expect(ProtectedComponent.displayName).toBe('withRole(TestComponent)');
    });
  });

  describe('withAnyPermission', () => {
    it('should render component when user has any permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm) => perm === 'users:read'),
      } as any);

      const ProtectedComponent = withAnyPermission(
        ['users:read', 'users:write'],
        TestComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('should not render component when user has none of the permissions', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withAnyPermission(
        ['users:read', 'users:write'],
        TestComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('should render fallback component when no permissions match', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withAnyPermission(
        ['users:read', 'users:write'],
        TestComponent,
        FallbackComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    });

    it('should set display name for debugging', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
      } as any);

      const ProtectedComponent = withAnyPermission(['users:read'], TestComponent);
      expect(ProtectedComponent.displayName).toBe('withAnyPermission(TestComponent)');
    });
  });

  describe('withAllPermissions', () => {
    it('should render component when user has all permissions', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm) => ['users:read', 'users:write'].includes(perm)),
      } as any);

      const ProtectedComponent = withAllPermissions(
        ['users:read', 'users:write'],
        TestComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('should not render component when user is missing any permission', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm) => perm === 'users:read'),
      } as any);

      const ProtectedComponent = withAllPermissions(
        ['users:read', 'users:write'],
        TestComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('should render fallback component when any permission is missing', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn((perm) => perm === 'users:read'),
      } as any);

      const ProtectedComponent = withAllPermissions(
        ['users:read', 'users:write'],
        TestComponent,
        FallbackComponent,
      );
      render(<ProtectedComponent message="Hello" />);

      expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
    });

    it('should set display name for debugging', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
      } as any);

      const ProtectedComponent = withAllPermissions(['users:read'], TestComponent);
      expect(ProtectedComponent.displayName).toBe('withAllPermissions(TestComponent)');
    });
  });

  describe('HOC prop forwarding', () => {
    it('should forward props to wrapped component', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => true),
      } as any);

      const ProtectedComponent = withPermission('users:admin', TestComponent);
      render(<ProtectedComponent message="Custom Message" />);

      expect(screen.getByText('Custom Message')).toBeInTheDocument();
    });

    it('should forward props to fallback component', () => {
      mockUseAuth.mockReturnValue({
        hasPermission: jest.fn(() => false),
      } as any);

      const ProtectedComponent = withPermission(
        'users:admin',
        TestComponent,
        FallbackComponent,
      );
      render(<ProtectedComponent message="Fallback Message" />);

      expect(screen.getByText('Fallback Message')).toBeInTheDocument();
    });
  });
});
