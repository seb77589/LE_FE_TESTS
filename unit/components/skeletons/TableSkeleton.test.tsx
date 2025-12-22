/**
 * Tests for TableSkeleton component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

describe('TableSkeleton', () => {
  it('should render skeleton with default props', () => {
    const { container } = render(<TableSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('should render table element', () => {
    const { container } = render(<TableSkeleton />);

    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass('min-w-full', 'divide-y', 'divide-gray-200');
  });

  it('should render header by default', () => {
    const { container } = render(<TableSkeleton />);

    const thead = container.querySelector('thead');
    expect(thead).toBeInTheDocument();
    expect(thead).toHaveClass('bg-gray-50');
  });

  it('should hide header when showHeader is false', () => {
    const { container } = render(<TableSkeleton showHeader={false} />);

    const thead = container.querySelector('thead');
    expect(thead).not.toBeInTheDocument();
  });

  it('should render specified number of rows', () => {
    const { container } = render(<TableSkeleton rows={10} />);

    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    expect(rows?.length).toBe(10);
  });

  it('should render specified number of columns', () => {
    const { container } = render(<TableSkeleton columns={6} />);

    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells.length).toBe(6);
  });

  it('should apply custom className', () => {
    const { container } = render(<TableSkeleton className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render with default 5 rows and 4 columns', () => {
    const { container } = render(<TableSkeleton />);

    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    expect(rows?.length).toBe(5);

    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells.length).toBe(4);
  });

  it('should render cells in each row', () => {
    const { container } = render(<TableSkeleton rows={3} columns={5} />);

    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    if (rows) {
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        expect(cells.length).toBe(5);
      }
    }
  });
});
