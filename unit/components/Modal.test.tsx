import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@/components/ui/Modal';

// Mock console.log to suppress logs during tests
jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock HTMLDialogElement API (not fully supported in jsdom)
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

describe('Modal Component', () => {
  const mockClose = jest.fn();
  const title = 'Test Modal';
  const children = <div>Modal content</div>;

  beforeEach(() => {
    // Reset mocks
    mockClose.mockReset();
    // Restore original body style
    document.body.style.overflow = '';
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    // When isOpen is false, Modal returns null, so no dialog element should exist
    const dialog = container.querySelector('dialog');
    expect(dialog).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside the modal', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    // The backdrop click handler checks if e.target === dialog
    // We need to click on the dialog element itself (which represents the backdrop)
    const dialog = container.querySelector('dialog');
    expect(dialog).toBeInTheDocument();

    // Simulate clicking on the dialog backdrop (not on children)
    if (dialog) {
      fireEvent.click(dialog);
      expect(mockClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not call onClose when clicking inside the modal', () => {
    render(
      <Modal isOpen={true} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    // Simulate clicking inside the modal
    fireEvent.mouseDown(screen.getByText('Modal content'));

    expect(mockClose).not.toHaveBeenCalled();
  });

  it('should prevent body scroll when modal is open', () => {
    render(
      <Modal isOpen={true} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body scroll when modal is closed', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={mockClose} title={title}>
        {children}
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('unset');
  });
});
