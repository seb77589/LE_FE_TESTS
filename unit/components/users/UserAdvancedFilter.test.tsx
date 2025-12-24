/**
 * Tests for UserAdvancedFilter component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserAdvancedFilter, {
  UserAdvancedFilterValues,
} from '@/components/users/UserAdvancedFilter';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

describe('UserAdvancedFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter form', () => {
    render(<UserAdvancedFilter values={{}} onChange={mockOnChange} />);

    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Verified')).toBeInTheDocument();
  });

  it('should call onChange when role filter changes', () => {
    render(<UserAdvancedFilter values={{}} onChange={mockOnChange} />);

    const roleSelect = screen.getByTestId('role-filter');
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

    expect(mockOnChange).toHaveBeenCalledWith({ role: 'ADMIN' });
  });

  it('should call onChange when status filter changes', () => {
    render(<UserAdvancedFilter values={{}} onChange={mockOnChange} />);

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(mockOnChange).toHaveBeenCalledWith({ isActive: true });
  });

  it('should call onChange when verified filter changes', () => {
    render(<UserAdvancedFilter values={{}} onChange={mockOnChange} />);

    const verifiedSelect = screen.getByLabelText('Verified');
    fireEvent.change(verifiedSelect, { target: { value: 'yes' } });

    expect(mockOnChange).toHaveBeenCalledWith({ isVerified: true });
  });

  it('should display current filter values', () => {
    const values: UserAdvancedFilterValues = {
      role: 'ADMIN',
      isActive: true,
      isVerified: false,
    };

    render(<UserAdvancedFilter values={values} onChange={mockOnChange} />);

    expect(screen.getByTestId('role-filter')).toHaveValue('ADMIN');
  });

  it('should handle search input', () => {
    render(<UserAdvancedFilter values={{}} onChange={mockOnChange} />);

    const searchInput = screen.getByTestId('user-search');
    fireEvent.change(searchInput, { target: { value: FRONTEND_TEST_CREDENTIALS.USER.email } });

    expect(mockOnChange).toHaveBeenCalledWith({ search: FRONTEND_TEST_CREDENTIALS.USER.email });
  });
});
