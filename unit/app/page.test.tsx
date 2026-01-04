/**
 * Unit tests for Root Page (Home Page)
 *
 * @description Comprehensive tests for the root page component including authentication-based
 * routing, loading states, and user redirection logic.
 *
 * Test Coverage:
 * - Authenticated user redirect to /dashboard
 * - Unauthenticated user redirect to /auth/login
 * - Loading state display
 * - useAuth integration
 * - useRouter integration
 * - Accessibility compliance
 *
 * @module __tests__/unit/app/page
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/page';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRouter } from 'next/navigation';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock dependencies
jest.mock('@/lib/context/ConsolidatedAuthContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('HomePage', () => {
  let mockRouter: { push: jest.Mock };

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    };

    (mockUseRouter as jest.Mock).mockReturnValue(mockRouter);

    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should display loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      expect(screen.getByText(/Loading LegalEase/i)).toBeInTheDocument();
      expect(screen.getByText(/Hot reload is working!/i)).toBeInTheDocument();
    });

    it('should have spinner animation', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { container } = render(<HomePage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full');
      expect(spinner).toHaveClass('border-b-2');
      expect(spinner).toHaveClass('border-blue-600');
    });

    it('should have main role for accessibility', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('min-h-screen');
    });

    it('should have screen reader text', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      expect(screen.getByText(/LegalEase - Loading/i)).toHaveClass('sr-only');
    });

    it('should have aria-live region for loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { container } = render(<HomePage />);

      const output = container.querySelector('output[aria-live="polite"]');
      expect(output).toBeInTheDocument();
      expect(output).toHaveAttribute('aria-busy', 'true');
    });

    it('should not call router.push during loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated user redirect', () => {
    it('should redirect authenticated user to /dashboard', async () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'user',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should not render content when redirecting authenticated user', () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'user',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      const { container } = render(<HomePage />);

      // Should return null and not render loading spinner
      expect(screen.queryByText(/Loading LegalEase/i)).not.toBeInTheDocument();
      expect(container.textContent).toBe('');
    });

    it('should redirect admin user to /dashboard', async () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
        role: 'admin',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should redirect superadmin user to /dashboard', async () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.SUPERADMIN.email,
        role: 'superadmin',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Unauthenticated user redirect', () => {
    it('should redirect unauthenticated user to /auth/login', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('should not render content when redirecting unauthenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      const { container } = render(<HomePage />);

      // Should return null and not render loading spinner
      expect(screen.queryByText(/Loading LegalEase/i)).not.toBeInTheDocument();
      expect(container.textContent).toBe('');
    });
  });

  describe('Effect hook behavior', () => {
    it('should only call router.push once per render', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledTimes(1);
      });
    });

    it('should update redirect when auth state changes', async () => {
      // Initial: loading
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { rerender } = render(<HomePage />);

      expect(mockRouter.push).not.toHaveBeenCalled();

      // Auth completes: unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      rerender(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('should handle auth state transition from loading to authenticated', async () => {
      const mockUser = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER.email,
        role: 'user',
      };

      // Start with loading
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { rerender } = render(<HomePage />);

      expect(screen.getByText(/Loading LegalEase/i)).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      rerender(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Loading UI elements', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);
    });

    it('should display correct loading message', () => {
      render(<HomePage />);

      expect(
        screen.getByText('Loading LegalEase (Modernized Dev Environment)...'),
      ).toBeInTheDocument();
    });

    it('should display hot reload indicator', () => {
      render(<HomePage />);

      expect(screen.getByText('Hot reload is working!')).toBeInTheDocument();
    });

    it('should have centered layout', () => {
      render(<HomePage />);

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex');
      expect(main).toHaveClass('items-center');
      expect(main).toHaveClass('justify-center');
    });

    it('should have gray background', () => {
      render(<HomePage />);

      const main = screen.getByRole('main');
      expect(main).toHaveClass('bg-gray-50');
    });

    it('should have spinner with correct styling', () => {
      const { container } = render(<HomePage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12');
      expect(spinner).toHaveClass('w-12');
      expect(spinner).toHaveClass('mx-auto');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined user', async () => {
      mockUseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('should handle null router', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      mockUseRouter.mockReturnValue(null as any);

      // Should not throw error
      expect(() => render(<HomePage />)).not.toThrow();
    });

    it('should handle rapid auth state changes', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { rerender } = render(<HomePage />);

      // Quickly transition through states
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      rerender(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes in loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { container } = render(<HomePage />);

      const output = container.querySelector('output');
      expect(output).toHaveAttribute('aria-live', 'polite');
      expect(output).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-hidden on spinner for screen readers', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      const { container } = render(<HomePage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have accessible text for screen readers', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      const srText = screen.getByText('LegalEase - Loading');
      expect(srText).toHaveClass('sr-only');
    });

    it('should have main landmark', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      } as any);

      render(<HomePage />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Integration with useAuth', () => {
    it('should correctly use all required useAuth properties', () => {
      const mockAuthValue = {
        user: null,
        isLoading: true,
        isAuthenticated: false,
        token: null,
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthValue as any);

      render(<HomePage />);

      expect(mockUseAuth).toHaveBeenCalled();
    });

    it('should react to useAuth returning different user objects', async () => {
      const user1 = {
        id: 1,
        email: FRONTEND_TEST_CREDENTIALS.USER1.email,
        role: 'user',
      };
      const user2 = {
        id: 2,
        email: FRONTEND_TEST_CREDENTIALS.USER2.email,
        role: 'admin',
      };

      mockUseAuth.mockReturnValue({
        user: user1,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      const { rerender } = render(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });

      // Change user
      mockRouter.push.mockClear();
      mockUseAuth.mockReturnValue({
        user: user2,
        isLoading: false,
        isAuthenticated: true,
      } as any);

      rerender(<HomePage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});
