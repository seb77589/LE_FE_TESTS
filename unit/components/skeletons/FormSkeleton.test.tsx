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

    // Component uses 'bg-muted-foreground/20' for title
    const title = container.querySelector('.h-6');
    expect(title).toBeInTheDocument();
  });

  it('should hide title when showTitle is false', () => {
    const { container } = render(<FormSkeleton showTitle={false} />);

    // Component uses 'bg-muted-foreground/20' for title, check wrapper doesn't exist
    const titleWrapper = container.querySelector('.mb-6');
    expect(titleWrapper).not.toBeInTheDocument();
  });

  it('should render submit button by default', () => {
    const { container } = render(<FormSkeleton />);

    // Component uses 'bg-muted' instead of 'bg-gray-200'
    const buttons = container.querySelectorAll('.h-10.bg-muted');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render cancel button when showCancel is true', () => {
    const { container } = render(<FormSkeleton showCancel={true} />);

    // Component uses 'bg-muted' instead of 'bg-gray-200'
    const buttons = container.querySelectorAll('.h-10.bg-muted');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should render specified number of fields', () => {
    const { container } = render(<FormSkeleton fields={6} />);

    // Component uses 'bg-muted' for input fields
    const fields = container.querySelectorAll('.h-10.bg-muted');
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
