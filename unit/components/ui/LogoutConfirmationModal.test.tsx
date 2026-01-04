/**
 * Tests for LogoutConfirmationModal component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogoutConfirmationModal } from '@/components/ui/LogoutConfirmationModal';

// Mock Modal component
jest.mock('@/components/ui/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    );
  },
}));

describe('LogoutConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<LogoutConfirmationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('should render current logout modal by default', () => {
    render(<LogoutConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Log out?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to log out/i)).toBeInTheDocument();
  });

  it('should render all devices logout modal when logoutType is all', () => {
    render(<LogoutConfirmationModal {...defaultProps} logoutType="all" />);

    expect(screen.getByText('Log out from all devices?')).toBeInTheDocument();
    expect(
      screen.getByText(/This will end all your active sessions/i),
    ).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button clicked', () => {
    const mockOnConfirm = jest.fn();
    render(<LogoutConfirmationModal {...defaultProps} onConfirm={mockOnConfirm} />);

    const confirmButton = screen.getByText('Log Out');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('should call onClose when cancel button clicked', () => {
    const mockOnClose = jest.fn();
    render(<LogoutConfirmationModal {...defaultProps} onClose={mockOnClose} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show destructive variant for all devices logout', () => {
    render(<LogoutConfirmationModal {...defaultProps} logoutType="all" />);

    const confirmButton = screen.getByText('Log Out Everywhere');
    expect(confirmButton).toBeInTheDocument();
  });
});
