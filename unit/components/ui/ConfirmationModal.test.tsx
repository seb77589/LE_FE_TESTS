/**
 * Tests for ConfirmationModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

// ConfirmationModal doesn't use Modal component, it renders its own structure

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

// ConfirmationModal uses native input, not Input component

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
}));

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('ConfirmationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test Title"
          message="Test Message"
        />,
      );
      expect(screen.getByTestId('modal-title')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      const { container } = render(
        <ConfirmationModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test Title"
          message="Test Message"
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('should display title and message', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Delete Item"
          message="Are you sure you want to delete this item?"
        />,
      );
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(
        screen.getByText('Are you sure you want to delete this item?'),
      ).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render danger variant by default', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
        />,
      );
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          variant="warning"
        />,
      );
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should render info variant', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          variant="info"
        />,
      );
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
        />,
      );
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when cancel button is clicked', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
        />,
      );
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should use custom button text when provided', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          confirmText="Delete"
          cancelText="Keep"
        />,
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
  });

  describe('Typed Confirmation', () => {
    it('should show input field when requireTypedConfirmation is true', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          requireTypedConfirmation={true}
          confirmationPhrase="DELETE"
        />,
      );
      expect(screen.getByTestId('confirmation-input')).toBeInTheDocument();
    });

    it('should disable confirm button when typed text does not match', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          requireTypedConfirmation={true}
          confirmationPhrase="DELETE"
        />,
      );
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'WRONG' } });
      const confirmButton = screen.getByTestId('modal-confirm');
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button when typed text matches', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          requireTypedConfirmation={true}
          confirmationPhrase="DELETE"
        />,
      );
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      const confirmButton = screen.getByTestId('modal-confirm');
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state on confirm button when isLoading is true', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          isLoading={true}
        />,
      );
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      const confirmButton = screen.getByText('Processing...');
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close modal when Escape key is pressed', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
        />,
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should confirm action when Enter key is pressed without typed confirmation', async () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
        />,
      );
      fireEvent.keyDown(document, { key: 'Enter' });
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should not confirm when Enter is pressed with typed confirmation required', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          requireTypedConfirmation={true}
          confirmationPhrase="DELETE"
        />,
      );
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should not close when Escape is pressed during processing', async () => {
      const slowConfirm = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={slowConfirm}
          title="Test"
          message="Test"
        />,
      );

      // Start processing
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      // Try to close with Escape while processing
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
      fireEvent.keyDown(document, { key: 'Escape' });

      // Should not close
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in onConfirm callback', async () => {
      const logger = require('@/lib/logging').default;
      const errorMock = jest
        .fn()
        .mockRejectedValue(new Error('Confirmation failed'));

      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={errorMock}
          title="Test"
          message="Test"
        />,
      );

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'ui',
          'Confirmation action failed',
          expect.objectContaining({
            error: expect.any(Error),
          }),
        );
      });

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Typed Confirmation Guard', () => {
    it('should prevent confirmation when typed text does not match', async () => {
      render(
        <ConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          title="Test"
          message="Test"
          requireTypedConfirmation={true}
          confirmationPhrase="DELETE"
        />,
      );

      // Type wrong text
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'WRONG' } });

      // Try to confirm by clicking disabled button (simulates user action)
      const confirmButton = screen.getByTestId('modal-confirm');
      fireEvent.click(confirmButton);

      // Should not call onConfirm
      await waitFor(() => {
        expect(mockOnConfirm).not.toHaveBeenCalled();
      });
    });
  });
});
