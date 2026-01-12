/**
 * Unit Tests for Button Component
 *
 * Coverage: Rendering, variants, sizes, loading states, accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/ui/Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('renders as a button element', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Button className="custom-class">Button</Button>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('applies primary variant styles by default', () => {
      const { container } = render(<Button>Button</Button>);
      expect(container.firstChild).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('applies secondary variant styles', () => {
      const { container } = render(<Button variant="secondary">Button</Button>);
      expect(container.firstChild).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('applies outline variant styles', () => {
      const { container } = render(<Button variant="outline">Button</Button>);
      expect(container.firstChild).toHaveClass('border', 'border-input', 'bg-background');
    });

    it('applies ghost variant styles', () => {
      const { container } = render(<Button variant="ghost">Button</Button>);
      expect(container.firstChild).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
    });

    it('applies destructive variant styles', () => {
      const { container } = render(<Button variant="destructive">Button</Button>);
      expect(container.firstChild).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      const { container } = render(<Button>Button</Button>);
      expect(container.firstChild).toHaveClass('h-11', 'px-4', 'py-2');
    });

    it('applies small size', () => {
      const { container } = render(<Button size="sm">Button</Button>);
      expect(container.firstChild).toHaveClass('h-10', 'px-3', 'text-sm');
    });

    it('applies large size', () => {
      const { container } = render(<Button size="lg">Button</Button>);
      expect(container.firstChild).toHaveClass('h-12', 'px-8');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      render(<Button loading>Button</Button>);
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('disables button when loading', () => {
      render(<Button loading>Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not show spinner when loading is false', () => {
      render(<Button loading={false}>Button</Button>);
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(<Button disabled>Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      const { container } = render(<Button disabled>Button</Button>);
      expect(container.firstChild).toHaveClass(
        'disabled:opacity-50',
        'disabled:pointer-events-none',
      );
    });

    it('is not disabled by default', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Event Handlers', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      await userEvent.click(screen.getByText('Click'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} disabled>
          Click
        </Button>,
      );

      await userEvent.click(screen.getByText('Click'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} loading>
          Click
        </Button>,
      );

      await userEvent.click(screen.getByText('Click'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has focus-visible ring styles', () => {
      const { container } = render(<Button>Button</Button>);
      expect(container.firstChild).toHaveClass(
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
      );
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('forwards other button props', () => {
      render(
        <Button type="submit" aria-label="Submit form">
          Submit
        </Button>,
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });
  });
});
