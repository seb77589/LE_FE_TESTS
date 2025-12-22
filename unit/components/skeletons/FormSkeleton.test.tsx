/**
 * Tests for FormSkeleton component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';

describe('FormSkeleton', () => {
  it('should render skeleton with default props', () => {
    const { container } = render(<FormSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('should render title by default', () => {
    const { container } = render(<FormSkeleton />);

    const title = container.querySelector('.h-6.bg-gray-300');
    expect(title).toBeInTheDocument();
  });

  it('should hide title when showTitle is false', () => {
    const { container } = render(<FormSkeleton showTitle={false} />);

    const title = container.querySelector('.h-6.bg-gray-300');
    expect(title).not.toBeInTheDocument();
  });

  it('should render submit button by default', () => {
    const { container } = render(<FormSkeleton />);

    const buttons = container.querySelectorAll('.h-10.bg-gray-200');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render cancel button when showCancel is true', () => {
    const { container } = render(<FormSkeleton showCancel={true} />);

    const buttons = container.querySelectorAll('.h-10.bg-gray-200');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should render specified number of fields', () => {
    const { container } = render(<FormSkeleton fields={6} />);

    const fields = container.querySelectorAll('.h-10.bg-gray-200');
    // Should have 6 field inputs + submit button (and optionally cancel)
    expect(fields.length).toBeGreaterThanOrEqual(6);
  });

  it('should apply custom className', () => {
    const { container } = render(<FormSkeleton className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render with default 4 fields', () => {
    const { container } = render(<FormSkeleton />);

    const fieldContainers = container.querySelectorAll('.space-y-6 > div');
    expect(fieldContainers.length).toBe(4);
  });
});
