/**
 * Unit Tests for Input Component
 *
 * Coverage: Rendering, labels, errors, helper text, accessibility
 */

import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with default type text', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('renders with custom type', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('applies custom className', () => {
      const { container } = render(<Input className="custom-class" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('Labels', () => {
    it('renders label when provided', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('associates label with input via htmlFor', () => {
      render(<Input label="Email" name="email" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('does not render label when not provided', () => {
      const { container } = render(<Input />);
      expect(container.querySelector('label')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message when provided', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styles to input', () => {
      const { container } = render(<Input error="Error" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('border-destructive', 'focus-visible:ring-destructive');
    });

    it('renders error with aria-label', () => {
      render(<Input error="Error message" />);
      const errorElement = screen.getByText('Error message');
      expect(errorElement).toHaveAttribute('role', 'alert');
      expect(errorElement).toHaveAttribute('aria-label', 'Error message');
    });

    it('does not show helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper text" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('renders helper text when provided', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('does not render helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });

    it('applies correct styling to helper text', () => {
      const { container } = render(<Input helperText="Helper" />);
      const helperText = container.querySelector('.text-muted-foreground');
      expect(helperText).toBeInTheDocument();
    });
  });

  describe('ID Generation', () => {
    it('generates stable ID from name prop', () => {
      render(<Input name="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'input-email');
    });

    it('generates ID from placeholder when name not provided', () => {
      render(<Input placeholder="Enter email" />);
      const input = screen.getByRole('textbox');
      expect(input.id).toMatch(/^input-/);
    });

    it('uses custom id when provided', () => {
      render(<Input id="custom-id" name="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Input Attributes', () => {
    it('forwards standard input props', () => {
      render(<Input placeholder="Enter text" required maxLength={50} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('maxLength', '50');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Accessibility', () => {
    it('has focus-visible ring styles', () => {
      const { container } = render(<Input />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    });

    it('has disabled styles', () => {
      const { container } = render(<Input disabled />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('allows typing in input', async () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      await userEvent.type(input, FRONTEND_TEST_CREDENTIALS.USER.email);
      expect(input).toHaveValue(FRONTEND_TEST_CREDENTIALS.USER.email);
    });

    it('calls onChange when value changes', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'a');
      expect(handleChange).toHaveBeenCalled();
    });
  });
});
