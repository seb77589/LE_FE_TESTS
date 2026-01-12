/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from '@/components/admin/UserManagement';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock child components
jest.mock('@/components/users/UserFormModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, user, onSuccess }: any) =>
    isOpen ? (
      <div data-testid="user-form-modal">
        <span data-testid="modal-user">{user?.email || 'new-user'}</span>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Save User</button>
      </div>
    ) : null,
}));

jest.mock('@/components/users/UserTable', () => ({
  __esModule: true,
  default: ({
    users,
    onEdit,
    onToggleActive,
    loadingUserId,
    showActions,
    selectedUserIds,
    onSelectUser,
    onSelectAll,
    onRowClick,
  }: any) => (
    <div data-testid="user-table">
      <span data-testid="users-count">{users?.length || 0}</span>
      <span data-testid="loading-user">{loadingUserId}</span>
      <span data-testid="show-actions">{showActions ? 'true' : 'false'}</span>
      <span data-testid="selected-count">{selectedUserIds?.length || 0}</span>
      {users?.map((user: any) => (
        <div key={user.id} data-testid={`user-row-${user.id}`}>
          <span>{user.email}</span>
          <button onClick={() => onEdit(user)} data-testid={`edit-${user.id}`}>
            Edit
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.is_active)}
            data-testid={`toggle-${user.id}`}
          >
            Toggle
          </button>
          <button onClick={() => onRowClick(user)} data-testid={`row-click-${user.id}`}>
            Row Click
          </button>
          <input
            type="checkbox"
            onChange={(e) => onSelectUser(user.id, e.target.checked)}
            data-testid={`select-${user.id}`}
          />
        </div>
      ))}
      <button
        onClick={(e: any) => onSelectAll(e.target.checked)}
        data-testid="select-all"
      >
        Select All
      </button>
    </div>
  ),
}));

jest.mock('@/components/users/UserAdvancedFilter', () => ({
  __esModule: true,
  default: ({ values, onChange }: any) => (
    <div data-testid="user-advanced-filter">
      <button
        onClick={() => onChange({ ...values, role: 'admin' })}
        data-testid="filter-admin"
      >
        Filter Admin
      </button>
    </div>
  ),
}));

jest.mock('@/components/users/UserBulkActionsBar', () => ({
  __esModule: true,
  default: ({ selectedCount, onActivate, onDeactivate, onDelete, disabled }: any) => (
    <div data-testid="user-bulk-actions">
      <span data-testid="bulk-selected-count">{selectedCount}</span>
      <span data-testid="bulk-disabled">{disabled ? 'true' : 'false'}</span>
      <button onClick={onActivate} data-testid="bulk-activate">
        Activate
      </button>
      <button onClick={onDeactivate} data-testid="bulk-deactivate">
        Deactivate
      </button>
      <button onClick={onDelete} data-testid="bulk-delete">
        Delete
      </button>
    </div>
  ),
}));

jest.mock('@/components/users/UserDetailsDrawer', () => ({
  UserDetailsDrawer: ({ user, isOpen, onClose, onUpdate }: any) =>
    isOpen ? (
      <div data-testid="user-details-drawer">
        <span data-testid="drawer-user">{user?.email}</span>
        <button onClick={onClose} data-testid="drawer-close">
          Close Drawer
        </button>
        <button onClick={onUpdate} data-testid="drawer-update">
          Update
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/admin/UserAnalytics', () => ({
  UserAnalytics: ({ analytics }: any) => (
    <div data-testid="user-analytics">
      <span data-testid="total-users">{analytics?.total_users}</span>
    </div>
  ),
}));

jest.mock('@/components/admin/UserImport', () => ({
  UserImport: ({ importing, importResult, onImport }: any) => (
    <div data-testid="user-import">
      <span data-testid="importing">{importing ? 'true' : 'false'}</span>
      <span data-testid="import-result">
        {importResult?.success ? 'success' : 'none'}
      </span>
      <button
        onClick={() => onImport([{ email: FRONTEND_TEST_CREDENTIALS.USER.email }])}
        data-testid="import-btn"
      >
        Import
      </button>
    </div>
  ),
}));

// UserManagementError component does not exist - error states use ErrorBanner inline
jest.mock('@/components/ui/ErrorDisplay', () => ({
  ErrorBanner: ({ message }: any) => (
    <div data-testid="error-banner">{message}</div>
  ),
}));

jest.mock('@/components/admin/UserManagementLoading', () => ({
  UserManagementLoading: ({ showHeader, showBackLink }: any) => (
    <div data-testid="user-management-loading">
      <span data-testid="loading-header">{showHeader ? 'true' : 'false'}</span>
      <span data-testid="loading-back-link">{showBackLink ? 'true' : 'false'}</span>
    </div>
  ),
}));

// Mock auth context
const mockCurrentUser = {
  id: 1,
  email: FRONTEND_TEST_CREDENTIALS.ADMIN.email,
  role: 'admin',
};

jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: mockCurrentUser,
  })),
}));

// Mock the useUserManagement hook
const mockMutate = jest.fn();
const mockSetFilterValues = jest.fn();
const mockHandleToggleUserStatus = jest.fn();
const mockHandleBulkAction = jest.fn();
const mockHandleUserSelectionChange = jest.fn();
const mockHandleSelectAllChange = jest.fn();
const mockHandleImport = jest.fn();
const mockClearStatusError = jest.fn();

const defaultHookReturn = {
  users: [
    {
      id: 1,
      email: FRONTEND_TEST_CREDENTIALS.USER1.email,
      is_active: true,
      role: 'user',
    },
    {
      id: 2,
      email: FRONTEND_TEST_CREDENTIALS.USER2.email,
      is_active: false,
      role: 'admin',
    },
  ],
  analytics: { total_users: 100, active_users: 80 },
  isLoading: false,
  error: null,
  selectedUserIds: [],
  filterValues: { role: '', status: '' },
  actionLoading: null,
  statusError: null,
  importing: false,
  importResult: null,
  setFilterValues: mockSetFilterValues,
  handleToggleUserStatus: mockHandleToggleUserStatus,
  handleBulkAction: mockHandleBulkAction,
  handleUserSelectionChange: mockHandleUserSelectionChange,
  handleSelectAllChange: mockHandleSelectAllChange,
  handleImport: mockHandleImport,
  clearStatusError: mockClearStatusError,
  mutate: mockMutate,
};

let mockHookReturn = { ...defaultHookReturn };

jest.mock('@/hooks/admin/useUserManagement', () => ({
  useUserManagement: jest.fn(() => mockHookReturn),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('UserManagement', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = { ...defaultHookReturn };
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<UserManagement />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('← Back to Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('users-list')).toBeInTheDocument();
      expect(screen.getByTestId('user-table')).toBeInTheDocument();
    });

    it('should render without header when showHeader is false', () => {
      render(<UserManagement showHeader={false} />);

      expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      expect(screen.queryByText('← Back to Admin Dashboard')).not.toBeInTheDocument();
    });

    it('should render without back link when showBackLink is false', () => {
      render(<UserManagement showBackLink={false} />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.queryByText('← Back to Admin Dashboard')).not.toBeInTheDocument();
    });

    it('should render analytics when showAnalytics is true', () => {
      render(<UserManagement showAnalytics />);

      expect(screen.getByTestId('user-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('total-users')).toHaveTextContent('100');
    });

    it('should not render analytics when showAnalytics is false', () => {
      render(<UserManagement showAnalytics={false} />);

      expect(screen.queryByTestId('user-analytics')).not.toBeInTheDocument();
    });

    it('should render import section when showImport is true', () => {
      render(<UserManagement showImport />);

      expect(screen.getByTestId('user-import')).toBeInTheDocument();
    });

    it('should not render import section when showImport is false', () => {
      render(<UserManagement showImport={false} />);

      expect(screen.queryByTestId('user-import')).not.toBeInTheDocument();
    });

    it('should render with all features enabled', () => {
      render(<UserManagement showHeader showBackLink showAnalytics showImport />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('← Back to Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('user-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('user-import')).toBeInTheDocument();
    });

    it('should render with all features disabled', () => {
      render(
        <UserManagement
          showHeader={false}
          showBackLink={false}
          showAnalytics={false}
          showImport={false}
        />,
      );

      expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-analytics')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-import')).not.toBeInTheDocument();
    });

    it('should render user table with users', () => {
      render(<UserManagement />);

      expect(screen.getByTestId('users-count')).toHaveTextContent('2');
      expect(screen.getByTestId('show-actions')).toHaveTextContent('true');
    });

    it('should render filter and bulk actions components', () => {
      render(<UserManagement />);

      expect(screen.getByTestId('user-advanced-filter')).toBeInTheDocument();
      expect(screen.getByTestId('user-bulk-actions')).toBeInTheDocument();
    });

    it('should pass selectedUserIds count to bulk actions bar', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        selectedUserIds: [1, 2, 3],
      };

      render(<UserManagement />);

      expect(screen.getByTestId('bulk-selected-count')).toHaveTextContent('3');
    });
  });

  describe('loading state', () => {
    it('should render loading component when isLoading is true', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        isLoading: true,
      };

      render(<UserManagement />);

      expect(screen.getByTestId('user-management-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('users-list')).not.toBeInTheDocument();
    });

    it('should pass showHeader to loading component', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        isLoading: true,
      };

      render(<UserManagement showHeader />);

      expect(screen.getByTestId('loading-header')).toHaveTextContent('true');
    });

    it('should pass showBackLink to loading component', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        isLoading: true,
      };

      render(<UserManagement showBackLink={false} />);

      expect(screen.getByTestId('loading-back-link')).toHaveTextContent('false');
    });
  });

  describe('error state', () => {
    it('should render error banner when error exists', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        error: new Error('Failed to load users'),
      };

      render(<UserManagement />);

      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.queryByTestId('users-list')).not.toBeInTheDocument();
    });

    it('should show header when showHeader is true even with error', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        error: new Error('Test error'),
      };

      render(<UserManagement showHeader />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('should show back link when showBackLink is true with error', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        error: new Error('Test error'),
      };

      render(<UserManagement showHeader showBackLink />);

      expect(screen.getByText(/Back to Admin Dashboard/)).toBeInTheDocument();
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });
  });

  describe('status error', () => {
    it('should render status error when statusError exists', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        statusError: 'Failed to toggle user status',
      };

      render(<UserManagement />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to toggle user status')).toBeInTheDocument();
    });

    it('should not render status error when statusError is null', () => {
      render(<UserManagement />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should call clearStatusError when close button is clicked', async () => {
      mockHookReturn = {
        ...defaultHookReturn,
        statusError: 'Error message',
      };

      render(<UserManagement />);

      await user.click(screen.getByLabelText('Close error message'));

      expect(mockClearStatusError).toHaveBeenCalledTimes(1);
    });
  });

  describe('user interactions - New User button', () => {
    it('should open form modal when New User button is clicked', async () => {
      render(<UserManagement />);

      expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('Create new user'));

      expect(screen.getByTestId('user-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-user')).toHaveTextContent('new-user');
    });

    it('should close form modal when close button is clicked', async () => {
      render(<UserManagement />);

      await user.click(screen.getByLabelText('Create new user'));
      expect(screen.getByTestId('user-form-modal')).toBeInTheDocument();

      await user.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    });
  });

  describe('user interactions - Edit user', () => {
    it('should open form modal with user data when edit is clicked', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('edit-1'));

      expect(screen.getByTestId('user-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER1.email,
      );
    });

    it('should call mutate after user is saved', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('edit-1'));
      await user.click(screen.getByText('Save User'));

      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('user interactions - Row click and drawer', () => {
    it('should open drawer when row is clicked', async () => {
      render(<UserManagement />);

      expect(screen.queryByTestId('user-details-drawer')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('row-click-1'));

      expect(screen.getByTestId('user-details-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER1.email,
      );
    });

    it('should close drawer when close button is clicked', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('row-click-1'));
      expect(screen.getByTestId('user-details-drawer')).toBeInTheDocument();

      await user.click(screen.getByTestId('drawer-close'));
      expect(screen.queryByTestId('user-details-drawer')).not.toBeInTheDocument();
    });

    it('should call mutate when drawer update is triggered', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('row-click-2'));
      await user.click(screen.getByTestId('drawer-update'));

      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('user interactions - Bulk actions', () => {
    it('should call handleBulkAction with activate when bulk activate is clicked', async () => {
      mockHookReturn = {
        ...defaultHookReturn,
        selectedUserIds: [1, 2],
      };

      render(<UserManagement />);

      await user.click(screen.getByTestId('bulk-activate'));

      expect(mockHandleBulkAction).toHaveBeenCalledWith('activate');
    });

    it('should call handleBulkAction with deactivate when bulk deactivate is clicked', async () => {
      mockHookReturn = {
        ...defaultHookReturn,
        selectedUserIds: [1, 2],
      };

      render(<UserManagement />);

      await user.click(screen.getByTestId('bulk-deactivate'));

      expect(mockHandleBulkAction).toHaveBeenCalledWith('deactivate');
    });

    it('should call handleBulkAction with delete when bulk delete is clicked', async () => {
      mockHookReturn = {
        ...defaultHookReturn,
        selectedUserIds: [1, 2],
      };

      render(<UserManagement />);

      await user.click(screen.getByTestId('bulk-delete'));

      expect(mockHandleBulkAction).toHaveBeenCalledWith('delete');
    });

    it('should disable bulk actions when actionLoading is -1', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        actionLoading: -1,
      };

      render(<UserManagement />);

      expect(screen.getByTestId('bulk-disabled')).toHaveTextContent('true');
    });
  });

  describe('user interactions - Filter', () => {
    it('should call setFilterValues when filter is changed', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('filter-admin'));

      expect(mockSetFilterValues).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
      );
    });
  });

  describe('user interactions - Toggle user status', () => {
    it('should pass handleToggleUserStatus to UserTable', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('toggle-1'));

      expect(mockHandleToggleUserStatus).toHaveBeenCalledWith(1, false);
    });

    it('should toggle inactive user to active', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('toggle-2'));

      expect(mockHandleToggleUserStatus).toHaveBeenCalledWith(2, true);
    });

    it('should pass loadingUserId to UserTable', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        actionLoading: 5,
      };

      render(<UserManagement />);

      expect(screen.getByTestId('loading-user')).toHaveTextContent('5');
    });
  });

  describe('user interactions - Import', () => {
    it('should call handleImport when import button is clicked', async () => {
      render(<UserManagement showImport />);

      await user.click(screen.getByTestId('import-btn'));

      expect(mockHandleImport).toHaveBeenCalledWith([
        { email: FRONTEND_TEST_CREDENTIALS.USER.email },
      ]);
    });

    it('should display importing state', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        importing: true,
      };

      render(<UserManagement showImport />);

      expect(screen.getByTestId('importing')).toHaveTextContent('true');
    });

    it('should display import result', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        importResult: { success: true, count: 5 },
      };

      render(<UserManagement showImport />);

      expect(screen.getByTestId('import-result')).toHaveTextContent('success');
    });
  });

  describe('user interactions - Selection', () => {
    it('should call handleUserSelectionChange when user is selected', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('select-1'));

      expect(mockHandleUserSelectionChange).toHaveBeenCalled();
    });

    it('should call handleSelectAllChange when select all is clicked', async () => {
      render(<UserManagement />);

      await user.click(screen.getByTestId('select-all'));

      expect(mockHandleSelectAllChange).toHaveBeenCalled();
    });
  });

  describe('analytics rendering', () => {
    it('should not render analytics when analytics is null', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        analytics: null,
      };

      render(<UserManagement showAnalytics />);

      expect(screen.queryByTestId('user-analytics')).not.toBeInTheDocument();
    });

    it('should render analytics when analytics is present', () => {
      render(<UserManagement showAnalytics />);

      expect(screen.getByTestId('user-analytics')).toBeInTheDocument();
    });
  });

  describe('empty users list', () => {
    it('should handle empty users array', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        users: [],
      };

      render(<UserManagement />);

      expect(screen.getByTestId('users-count')).toHaveTextContent('0');
    });

    it('should handle null users', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        users: null as any,
      };

      render(<UserManagement />);

      expect(screen.getByTestId('users-count')).toHaveTextContent('0');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels on buttons', () => {
      render(<UserManagement />);

      expect(screen.getByLabelText('Create new user')).toBeInTheDocument();
    });

    it('should have accessible status error with role=alert', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        statusError: 'Error message',
      };

      render(<UserManagement />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should have close button with aria-label for status error', () => {
      mockHookReturn = {
        ...defaultHookReturn,
        statusError: 'Error message',
      };

      render(<UserManagement />);

      expect(screen.getByLabelText('Close error message')).toBeInTheDocument();
    });

    it('should have proper link for back to admin dashboard', () => {
      render(<UserManagement />);

      const link = screen.getByText('← Back to Admin Dashboard');
      expect(link).toHaveAttribute('href', '/admin');
    });
  });

  describe('edge cases', () => {
    it('should handle switching between users for editing', async () => {
      render(<UserManagement />);

      // Edit first user
      await user.click(screen.getByTestId('edit-1'));
      expect(screen.getByTestId('modal-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER1.email,
      );

      // Close modal
      await user.click(screen.getByText('Close Modal'));

      // Edit second user
      await user.click(screen.getByTestId('edit-2'));
      expect(screen.getByTestId('modal-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER2.email,
      );
    });

    it('should handle switching between users for drawer', async () => {
      render(<UserManagement />);

      // Open drawer for first user
      await user.click(screen.getByTestId('row-click-1'));
      expect(screen.getByTestId('drawer-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER1.email,
      );

      // Close drawer
      await user.click(screen.getByTestId('drawer-close'));

      // Open drawer for second user
      await user.click(screen.getByTestId('row-click-2'));
      expect(screen.getByTestId('drawer-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER2.email,
      );
    });

    it('should create new user after editing existing user', async () => {
      render(<UserManagement />);

      // Edit existing user
      await user.click(screen.getByTestId('edit-1'));
      expect(screen.getByTestId('modal-user')).toHaveTextContent(
        FRONTEND_TEST_CREDENTIALS.USER1.email,
      );

      // Close modal
      await user.click(screen.getByText('Close Modal'));

      // Create new user
      await user.click(screen.getByLabelText('Create new user'));
      expect(screen.getByTestId('modal-user')).toHaveTextContent('new-user');
    });
  });
});
