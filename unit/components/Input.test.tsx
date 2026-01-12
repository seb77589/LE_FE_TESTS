import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input Component', () => {
  test('renders a basic input element', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  test('renders input with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  test('renders input with error message', () => {
    render(
      <Input
        label="Email"
        placeholder="Enter email"
        error="Please enter a valid email"
      />,
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('renders input with helper text', () => {
    render(
      <Input
        label="Password"
        placeholder="Enter password"
        helperText="Password must be at least 8 characters"
      />,
    );

    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument();
  });

  test('applies custom className to input', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  test('handles input value changes', async () => {
    render(<Input label="Username" />);

    const input = screen.getByLabelText('Username');
    await userEvent.type(input, 'testuser');

    expect(input).toHaveValue('testuser');
  });

  test('properly sets type attribute', () => {
    render(<Input type="password" placeholder="Enter password" />);
    expect(screen.getByPlaceholderText('Enter password')).toHaveAttribute(
      'type',
      'password',
    );
  });

  test('generates stable id when name is provided', () => {
    render(<Input name="username" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'input-username');
  });

  test('respects explicitly provided id over generated one', () => {
    render(<Input id="custom-id" name="username" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'custom-id');
  });

  test('error styling is applied when error prop is provided', () => {
    render(<Input error="Error message" />);
    // Component uses design token 'border-destructive' instead of 'border-red-500'
    expect(screen.getByRole('textbox')).toHaveClass('border-destructive');
  });
});
