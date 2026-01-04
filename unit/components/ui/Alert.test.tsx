/**
 * Unit Tests for Alert Component
 *
 * Coverage: Rendering, variants, close button, accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, AlertDescription } from '@/components/ui/Alert';

describe('Alert', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('has alert role', () => {
      const { container } = render(<Alert>Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Alert className="custom-class">Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      const { container } = render(<Alert>Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
    });

    it('applies info variant styles', () => {
      const { container } = render(<Alert variant="info">Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
    });

    it('applies destructive variant styles', () => {
      const { container } = render(<Alert variant="destructive">Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    });

    it('applies warning variant styles', () => {
      const { container } = render(<Alert variant="warning">Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
    });

    it('applies error variant styles', () => {
      const { container } = render(<Alert variant="error">Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    });

    it('applies success variant styles', () => {
      const { container } = render(<Alert variant="success">Alert</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800');
    });
  });

  describe('Title', () => {
    it('renders title when provided', () => {
      render(<Alert title="Alert Title">Alert message</Alert>);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('does not render title when not provided', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('applies correct styling to title', () => {
      const { container } = render(<Alert title="Title">Message</Alert>);
      const title = container.querySelector('.font-medium');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Title');
    });
  });

  describe('Close Button', () => {
    it('renders close button when onClose is provided', () => {
      const onClose = jest.fn();
      render(<Alert onClose={onClose}>Alert</Alert>);
      expect(screen.getByLabelText('Close alert')).toBeInTheDocument();
    });

    it('does not render close button when onClose is not provided', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.queryByLabelText('Close alert')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      render(<Alert onClose={onClose}>Alert</Alert>);

      const closeButton = screen.getByLabelText('Close alert');
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('applies variant-specific close button styles', () => {
      const onClose = jest.fn();
      const { container } = render(
        <Alert variant="destructive" onClose={onClose}>
          Alert
        </Alert>,
      );
      const closeButton = container.querySelector('button');
      expect(closeButton).toHaveClass('text-red-500', 'hover:bg-red-100');
    });
  });

  describe('AlertDescription', () => {
    it('renders AlertDescription children', () => {
      render(
        <Alert>
          <AlertDescription>Description text</AlertDescription>
        </Alert>,
      );
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('applies custom className to AlertDescription', () => {
      const { container } = render(
        <Alert>
          <AlertDescription className="custom-desc">Description</AlertDescription>
        </Alert>,
      );
      const desc = container.querySelector('.custom-desc');
      expect(desc).toBeInTheDocument();
    });

    it('applies default styling to AlertDescription', () => {
      const { container } = render(
        <Alert>
          <AlertDescription>Description</AlertDescription>
        </Alert>,
      );
      const desc = container.querySelector('.text-sm');
      expect(desc).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has alert role for screen readers', () => {
      const { container } = render(<Alert>Important message</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
    });

    it('close button has aria-label', () => {
      const onClose = jest.fn();
      render(<Alert onClose={onClose}>Alert</Alert>);
      const closeButton = screen.getByLabelText('Close alert');
      expect(closeButton).toBeInTheDocument();
    });
  });
});
