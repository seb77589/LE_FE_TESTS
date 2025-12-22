/**
 * Tests for Badge component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Badge', () => {
  describe('Basic Rendering', () => {
    it('should render badge', () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should render badge with custom className', () => {
      const { container } = render(<Badge className="custom-class">Test</Badge>);
      const badge = container.firstChild;
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should render destructive variant', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      expect(screen.getByText('Destructive')).toBeInTheDocument();
    });

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });
  });
});
