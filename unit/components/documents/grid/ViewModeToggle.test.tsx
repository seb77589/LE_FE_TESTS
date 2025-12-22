/**
 * Tests for ViewModeToggle component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeToggle } from '@/components/documents/grid/ViewModeToggle';

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({
    children,
    onClick,
    variant,
    size,
    className,
    'data-testid': testId,
    'aria-label': ariaLabel,
  }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      data-testid={testId}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Grid: () => <div data-testid="grid-icon">Grid</div>,
  List: () => <div data-testid="list-icon">List</div>,
}));

describe('ViewModeToggle', () => {
  const mockOnViewModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render view mode toggle', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.getByText('10 documents')).toBeInTheDocument();
    });

    it('should display document count', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={5}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.getByText('5 documents')).toBeInTheDocument();
    });

    it('should display singular form for one document', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={1}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.getByText('1 document')).toBeInTheDocument();
    });

    it('should display selected count when greater than 0', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={10}
          selectedCount={3}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('should not display selected count when 0', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.queryByText('0 selected')).not.toBeInTheDocument();
    });
  });

  describe('View Mode Buttons', () => {
    it('should render grid and list view buttons', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      expect(screen.getByTestId('grid-view')).toBeInTheDocument();
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('should highlight grid view when active', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      const gridButton = screen.getByTestId('grid-view');
      expect(gridButton).toHaveAttribute('data-variant', 'primary');
    });

    it('should highlight list view when active', () => {
      render(
        <ViewModeToggle
          viewMode="list"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      const listButton = screen.getByTestId('list-view');
      expect(listButton).toHaveAttribute('data-variant', 'primary');
    });
  });

  describe('Callbacks', () => {
    it('should call onViewModeChange when grid button is clicked', () => {
      render(
        <ViewModeToggle
          viewMode="list"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      const gridButton = screen.getByTestId('grid-view');
      fireEvent.click(gridButton);
      expect(mockOnViewModeChange).toHaveBeenCalledWith('grid');
    });

    it('should call onViewModeChange when list button is clicked', () => {
      render(
        <ViewModeToggle
          viewMode="grid"
          documentCount={10}
          selectedCount={0}
          onViewModeChange={mockOnViewModeChange}
        />,
      );
      const listButton = screen.getByTestId('list-view');
      fireEvent.click(listButton);
      expect(mockOnViewModeChange).toHaveBeenCalledWith('list');
    });
  });
});
