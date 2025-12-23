/**
 * Unit Tests for Modal Component
 *
 * Coverage: Rendering, open/close behavior, backdrop click, keyboard events
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@/components/ui/Modal';

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock HTMLDialogElement methods (not fully supported in jsdom)
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe('Modal', () => {
  const defaultProps = {
    isOpen: false,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders title correctly', () => {
      render(<Modal {...defaultProps} isOpen={true} title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <Modal {...defaultProps} isOpen={true}>
          <div>Custom content</div>
        </Modal>,
      );
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });

    it('has correct test id', () => {
      const { container } = render(<Modal {...defaultProps} isOpen={true} />);
      const dialog = container.querySelector('dialog');
      expect(dialog).toHaveAttribute('data-testid', 'document-preview');
    });
  });

  describe('Open/Close Behavior', () => {
    it('shows modal when isOpen is true', async () => {
      const { container } = render(<Modal {...defaultProps} isOpen={true} />);
      const dialog = container.querySelector('dialog') as HTMLDialogElement;

      await waitFor(() => {
        expect(dialog.open).toBe(true);
      });
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    });

    it('hides modal when isOpen is false', () => {
      const { container } = render(<Modal {...defaultProps} isOpen={false} />);
      // When isOpen is false, Modal returns null, so no dialog element should exist
      const dialog = container.querySelector('dialog');
      expect(dialog).not.toBeInTheDocument();
    });

    it('prevents body scroll when modal is open', async () => {
      render(<Modal {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('restores body scroll when modal closes', async () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      rerender(<Modal {...defaultProps} isOpen={false} />);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('unset');
      });
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      render(<Modal {...defaultProps} isOpen={true} />);
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close modal');
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop Click', () => {
    it('calls onClose when backdrop is clicked', async () => {
      const onClose = jest.fn();
      const { container } = render(
        <Modal {...defaultProps} isOpen={true} onClose={onClose} />,
      );
      const dialog = container.querySelector('dialog') as HTMLDialogElement;

      // Simulate backdrop click (clicking the dialog element itself)
      await waitFor(() => {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: dialog, writable: false });
        dialog.dispatchEvent(clickEvent);
      });

      await waitFor(
        () => {
          expect(onClose).toHaveBeenCalledTimes(1);
        },
        { timeout: 1000 },
      );
    });

    it('does not call onClose when content is clicked', async () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} isOpen={true} onClose={onClose} />);

      const content = screen.getByText('Modal content');
      await userEvent.click(content);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Events', () => {
    it('calls onClose when Escape key is pressed', async () => {
      const onClose = jest.fn();
      const { container } = render(
        <Modal {...defaultProps} isOpen={true} onClose={onClose} />,
      );
      const dialog = container.querySelector('dialog') as HTMLDialogElement;

      // Simulate cancel event (Escape key)
      const cancelEvent = new Event('cancel', { bubbles: true });
      dialog.dispatchEvent(cancelEvent);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('has aria-labelledby pointing to title', () => {
      const { container } = render(<Modal {...defaultProps} isOpen={true} />);
      const dialog = container.querySelector('dialog');
      const title = screen.getByText('Test Modal');

      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(title).toHaveAttribute('id', 'modal-title');
    });

    it('has correct dialog role', () => {
      const { container } = render(<Modal {...defaultProps} isOpen={true} />);
      const dialog = container.querySelector('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct classes', () => {
      const { container } = render(<Modal {...defaultProps} isOpen={true} />);
      const dialog = container.querySelector('dialog');
      expect(dialog).toHaveClass(
        'bg-white',
        'rounded-lg',
        'shadow-xl',
        'w-full',
        'max-w-md',
      );
    });
  });
});
