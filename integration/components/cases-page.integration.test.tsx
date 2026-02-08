/**
 * Cases Page Component Integration Tests
 *
 * Tests the integration of:
 * - Selection mode flow
 * - Bulk action execution
 * - Filter combinations (search + status)
 *
 * @integration
 * @since v0.2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock SWR
const mockMutate = jest.fn();
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn(),
    delete: jest.fn(),
  },
  fetcher: jest.fn(),
}));

// Mock confirm dialog
jest.mock('@/lib/confirm', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock auth context
const mockUser = { id: 1, email: 'manager@test.com', role: 'MANAGER' };
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    token: 'test-token',
  }),
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <span data-testid="file-text-icon">FileText</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  CheckSquare: () => <span data-testid="check-square-icon">CheckSquare</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Filter: () => <span data-testid="filter-icon">Filter</span>,
  Grid: () => <span data-testid="grid-icon">Grid</span>,
  List: () => <span data-testid="list-icon">List</span>,
  BarChart3: () => <span data-testid="bar-chart-icon">BarChart3</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">ChevronDown</span>,
  ChevronUp: () => <span data-testid="chevron-up-icon">ChevronUp</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  ArrowRight: () => <span data-testid="arrow-right-icon">ArrowRight</span>,
}));

// Mock components
jest.mock('@/components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, variant, disabled, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Breadcrumbs', () => ({
  __esModule: true,
  default: () => <nav data-testid="breadcrumbs">Breadcrumbs</nav>,
}));

jest.mock('@/components/ui/LoadingState', () => ({
  PageLoading: ({ text }: { text: string }) => <div data-testid="loading">{text}</div>,
}));

jest.mock('@/components/cases/CaseBulkActionsBar', () => ({
  CaseBulkActionsBar: ({ selectedCount, onClearSelection, onBulkStatusChange }: any) => (
    <div data-testid="bulk-actions-bar">
      <span>{selectedCount} selected</span>
      <button onClick={onClearSelection} data-testid="clear-selection">
        Clear
      </button>
      <button onClick={() => onBulkStatusChange('open')} data-testid="bulk-open">
        Mark Open
      </button>
      <button onClick={() => onBulkStatusChange('closed')} data-testid="bulk-close">
        Mark Closed
      </button>
    </div>
  ),
}));

jest.mock('@/components/cases/CaseCard', () => ({
  CaseCard: ({ id, title, status, isSelected, onSelect, selectionMode }: any) => (
    <div data-testid={`case-card-${id}`} data-selected={isSelected}>
      <span>{title}</span>
      <span data-testid={`status-${id}`}>{status}</span>
      {selectionMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(id, e.target.checked)}
          data-testid={`case-checkbox-${id}`}
        />
      )}
    </div>
  ),
}));

jest.mock('@/components/cases/CaseAnalytics', () => ({
  __esModule: true,
  default: () => <div data-testid="case-analytics">Analytics</div>,
}));

// Import after all mocks
import useSWR from 'swr';

// Sample test cases
const sampleCases = [
  {
    id: 1,
    title: 'Contract Review',
    description: 'Employment contract review',
    status: 'open',
    company_id: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 2,
    title: 'Patent Filing',
    description: 'Patent application',
    status: 'in_progress',
    company_id: 1,
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-04T00:00:00Z',
  },
  {
    id: 3,
    title: 'Settlement Case',
    description: 'Final settlement docs',
    status: 'closed',
    company_id: 1,
    created_at: '2025-01-05T00:00:00Z',
    updated_at: '2025-01-06T00:00:00Z',
  },
];

// Helper to setup SWR mock
function setupSWRMock(data: any, error?: Error) {
  (useSWR as jest.Mock).mockReturnValue({
    data,
    error,
    mutate: mockMutate,
    isLoading: false,
    isValidating: false,
  });
}

// Dynamic import of the component to ensure mocks are in place
async function importCasesPage() {
  const module = await import('@/app/(protected)/cases/page');
  return module.default;
}

describe('Cases Page Integration Tests', () => {
  let CasesPage: React.ComponentType;

  beforeAll(async () => {
    CasesPage = await importCasesPage();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupSWRMock(sampleCases);
  });

  describe('Selection Mode Flow', () => {
    it('should start with selection mode disabled', async () => {
      render(<CasesPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Check that "Select" button is visible (not "Cancel")
      const selectButton = screen.getByRole('button', { name: /select/i });
      expect(selectButton).toBeInTheDocument();

      // Checkboxes should not be visible in table
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBe(0);
    });

    it('should enable selection mode when Select button is clicked', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Click Select button
      const selectButton = screen.getByRole('button', { name: /select/i });
      await user.click(selectButton);

      // Now Cancel button should be visible
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      // Checkboxes should now be visible
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it('should disable selection mode and clear selections on Cancel', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Enable selection mode
      const selectButton = screen.getByRole('button', { name: /select/i });
      await user.click(selectButton);

      // Wait for checkboxes
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Selection mode should be disabled
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
    });

    it('should show bulk action bar when items are selected', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Enable selection mode
      const selectButton = screen.getByRole('button', { name: /select/i });
      await user.click(selectButton);

      // Wait for checkboxes and select one
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is "select all", select the second one (first case)
      await user.click(checkboxes[1]);

      // Bulk action bar should appear
      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument();
      });
    });

    it('should allow selecting all cases', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Enable selection mode
      await user.click(screen.getByRole('button', { name: /select/i }));

      // Click "select all" checkbox
      await waitFor(() => {
        const selectAllCheckbox = screen.getByLabelText(/select all cases/i);
        expect(selectAllCheckbox).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText(/select all cases/i);
      await user.click(selectAllCheckbox);

      // Bulk action bar should show count
      await waitFor(() => {
        const bulkBar = screen.getByTestId('bulk-actions-bar');
        expect(bulkBar).toHaveTextContent('3 selected');
      });
    });
  });

  describe('Bulk Action Execution', () => {
    it('should call bulk status change handler when bulk action is clicked', async () => {
      const user = userEvent.setup();
      const api = require('@/lib/api').default;

      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Enable selection mode and select cases
      await user.click(screen.getByRole('button', { name: /select/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/select all cases/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/select all cases/i));

      // Click bulk close action
      await waitFor(() => {
        expect(screen.getByTestId('bulk-close')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('bulk-close'));

      // API should be called for each selected case
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledTimes(3);
      });

      // Mutate should be called to refresh data
      expect(mockMutate).toHaveBeenCalled();
    });

    it('should clear selection after successful bulk action', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Enable selection mode and select all
      await user.click(screen.getByRole('button', { name: /select/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/select all cases/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/select all cases/i));

      // Click bulk action
      await user.click(screen.getByTestId('bulk-open'));

      // Selection should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument();
      });
    });

    it('should allow clearing selection manually', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Enable selection mode and select all
      await user.click(screen.getByRole('button', { name: /select/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/select all cases/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/select all cases/i));

      // Wait for bulk bar
      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument();
      });

      // Click clear selection
      await user.click(screen.getByTestId('clear-selection'));

      // Bulk action bar should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filter Combinations', () => {
    it('should have search input with correct placeholder', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/search cases/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have status filter dropdown with all options', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Find status filter dropdown
      const statusFilter = screen.getByLabelText(/filter by status/i);
      expect(statusFilter).toBeInTheDocument();

      // Check for key status options
      expect(screen.getByRole('option', { name: /all statuses/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /open/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /closed/i })).toBeInTheDocument();
    });

    it('should update search input value when typing', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search cases/i);
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });

    it('should show clear button when search has value', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search cases/i);
      await user.type(searchInput, 'test');

      // Clear button should appear
      const clearButton = screen.getByLabelText(/clear search/i);
      expect(clearButton).toBeInTheDocument();
    });

    it('should show empty state when no results match filters', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Search for non-existent case
      const searchInput = screen.getByPlaceholderText(/search cases/i);
      await user.type(searchInput, 'xyznonexistent123');

      // Should show "No cases found" message
      await waitFor(() => {
        expect(screen.getByText(/no cases found/i)).toBeInTheDocument();
      });

      // Should show "Clear Filters" button
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('should have list and grid view toggle buttons', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Check for view mode toggle buttons
      const listButton = screen.getByLabelText(/list view/i);
      const gridButton = screen.getByLabelText(/grid view/i);

      expect(listButton).toBeInTheDocument();
      expect(gridButton).toBeInTheDocument();
    });

    it('should toggle between list and grid views', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Default is list view - table should be visible
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Click grid view button
      const gridButton = screen.getByLabelText(/grid view/i);
      await user.click(gridButton);

      // Grid view should be visible (no table)
      await waitFor(() => {
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });

      // Case cards should be visible
      expect(screen.getByTestId('case-card-1')).toBeInTheDocument();
    });

    it('should show case cards in grid view', async () => {
      const user = userEvent.setup();
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Toggle to grid view
      const gridButton = screen.getByLabelText(/grid view/i);
      await user.click(gridButton);

      // All case cards should be visible
      await waitFor(() => {
        expect(screen.getByTestId('case-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('case-card-2')).toBeInTheDocument();
        expect(screen.getByTestId('case-card-3')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access', () => {
    it('should show selection controls for MANAGER role', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Select button should be visible for manager
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
    });

    it('should show analytics for MANAGER role', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Analytics section should be visible
      expect(screen.getByTestId('case-analytics')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show error state when fetch fails', async () => {
      setupSWRMock(undefined, new Error('Failed to fetch'));

      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading cases/i)).toBeInTheDocument();
      });

      // Retry button should be visible
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have "New Case" link to create page', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Check for "New Case" link
      const newCaseLink = screen.getByRole('link', { name: /new case/i });
      expect(newCaseLink).toHaveAttribute('href', '/cases/new');
    });

    it('should display breadcrumbs for navigation', async () => {
      render(<CasesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('cases-page')).toBeInTheDocument();
      });

      // Check breadcrumbs are present
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    });
  });
});
