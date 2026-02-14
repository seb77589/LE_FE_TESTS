/**
 * Tests for CaseCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CaseCard from '@/components/cases/CaseCard';

// Mock utility modules
jest.mock('@/lib/utils', () => ({
  formatDateTime: jest.fn((date: string) => `Formatted: ${date}`),
  getStatusColor: jest.fn((status: string) =>
    status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
  ),
  getStatusLabel: jest.fn((status: string) => status),
}));

jest.mock('@/lib/utils/utils', () => ({
  cn: jest.fn((...classes: unknown[]) => classes.filter(Boolean).join(' ')),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, size, 'data-testid': testId }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      data-testid={testId}
    >
      {children}
    </button>
  ),
}));

// Mock TemplateTypeBadge
jest.mock('@/components/ui/TemplateTypeBadge', () => ({
  TemplateTypeBadge: () => null,
}));

// Mock lucide-react icons used by CaseCard
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  FileText: () => <div data-testid="filetext-icon">FileText</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
}));

describe('CaseCard', () => {
  const mockCase = {
    id: 1,
    title: 'Test Case',
    description: 'Test Description',
    status: 'OPEN' as const,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  };

  const mockOnClick = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render case card', () => {
      render(<CaseCard {...mockCase} />);
      expect(screen.getByTestId('case-card-1')).toBeInTheDocument();
    });

    it('should display case title', () => {
      render(<CaseCard {...mockCase} />);
      expect(screen.getByText('Test Case')).toBeInTheDocument();
    });

    it('should display case description', () => {
      render(<CaseCard {...mockCase} />);
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should display case status label', () => {
      render(<CaseCard {...mockCase} />);
      expect(screen.getByText('OPEN')).toBeInTheDocument();
    });

    it('should render file icon', () => {
      render(<CaseCard {...mockCase} />);
      expect(screen.getByTestId('filetext-icon')).toBeInTheDocument();
    });

    it('should render calendar icon for created date', () => {
      render(<CaseCard {...mockCase} />);
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onClick when card is clicked', () => {
      render(<CaseCard {...mockCase} onClick={mockOnClick} />);
      const card = screen.getByTestId('case-card-1');
      fireEvent.click(card);
      expect(mockOnClick).toHaveBeenCalledWith(mockCase.id);
    });

    it('should call onEdit when edit button is clicked', () => {
      render(<CaseCard {...mockCase} onEdit={mockOnEdit} />);
      const editButton = screen.getByTestId('edit-case-1');
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalledWith(mockCase.id);
    });

    it('should call onDelete when delete button is clicked', () => {
      render(<CaseCard {...mockCase} onDelete={mockOnDelete} />);
      const deleteButton = screen.getByTestId('delete-case-1');
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith(mockCase.id);
    });
  });
});
