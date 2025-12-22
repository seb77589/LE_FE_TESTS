import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '@/components/ui/Alert';

describe('Alert Component', () => {
  test('renders with default variant', () => {
    render(<Alert>This is a default alert</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('bg-blue-50');
    expect(alert).toHaveTextContent('This is a default alert');
  });

  test('renders info variant correctly', () => {
    render(<Alert variant="info">This is an info alert</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-50');
    expect(alert).toHaveTextContent('This is an info alert');
  });

  test('renders success variant correctly', () => {
    render(<Alert variant="success">Operation successful</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-50');
    expect(alert).toHaveTextContent('Operation successful');
  });

  test('renders error variant correctly', () => {
    render(<Alert variant="error">An error occurred</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50');
    expect(alert).toHaveTextContent('An error occurred');
  });

  test('renders warning variant correctly', () => {
    render(<Alert variant="warning">This is a warning</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50');
    expect(alert).toHaveTextContent('This is a warning');
  });

  test('renders with title', () => {
    render(<Alert title="Alert Title">This is the alert content</Alert>);

    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('This is the alert content')).toBeInTheDocument();
  });

  test('calls onClose handler when close button is clicked', () => {
    const handleClose = jest.fn();

    render(<Alert onClose={handleClose}>Dismissible alert</Alert>);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('does not render close button when onClose is not provided', () => {
    render(<Alert>Non-dismissible alert</Alert>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<Alert className="custom-class">Alert with custom class</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  test('renders close button with correct variant styling', () => {
    const handleClose = jest.fn();

    render(
      <Alert variant="error" onClose={handleClose}>
        Error alert with close button
      </Alert>,
    );

    const closeButton = screen.getByRole('button');
    expect(closeButton).toHaveClass('text-red-500');
    expect(closeButton).toHaveClass('hover:bg-red-100');
  });
});
