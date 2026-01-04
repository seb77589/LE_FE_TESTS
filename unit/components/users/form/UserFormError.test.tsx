/**
 * Tests for UserFormError component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserFormError } from '@/components/users/form/UserFormError';

describe('UserFormError', () => {
  describe('Basic Rendering', () => {
    it('should render error message when error is provided', () => {
      render(<UserFormError error="This is an error message" />);
      expect(screen.getByText('This is an error message')).toBeInTheDocument();
    });

    it('should not render when error is empty string', () => {
      const { container } = render(<UserFormError error="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when error is null', () => {
      const { container } = render(<UserFormError error={null as any} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when error is undefined', () => {
      const { container } = render(<UserFormError error={undefined as any} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Display', () => {
    it('should display validation error message', () => {
      render(<UserFormError error="Email is required" />);
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should display API error message', () => {
      render(<UserFormError error="Failed to create user" />);
      expect(screen.getByText('Failed to create user')).toBeInTheDocument();
    });

    it('should have correct styling classes', () => {
      const { container } = render(<UserFormError error="Test error" />);
      const errorElement = container.firstChild as HTMLElement;
      expect(errorElement).toHaveClass(
        'mb-4',
        'p-3',
        'bg-red-100',
        'text-red-700',
        'rounded',
      );
    });
  });
});
