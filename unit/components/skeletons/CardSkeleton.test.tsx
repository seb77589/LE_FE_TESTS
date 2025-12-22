/**
 * Tests for CardSkeleton component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';

describe('CardSkeleton', () => {
  it('should render skeleton with default props', () => {
    const { container } = render(<CardSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('should render header by default', () => {
    const { container } = render(<CardSkeleton />);

    const header = container.querySelector('.px-6.py-4.border-b');
    expect(header).toBeInTheDocument();
  });

  it('should hide header when showHeader is false', () => {
    const { container } = render(<CardSkeleton showHeader={false} />);

    const header = container.querySelector('.px-6.py-4.border-b');
    expect(header).not.toBeInTheDocument();
  });

  it('should render footer when showFooter is true', () => {
    const { container } = render(<CardSkeleton showFooter={true} />);

    const footer = container.querySelector('.px-6.py-4.border-t');
    expect(footer).toBeInTheDocument();
  });

  it('should render image placeholder when showImage is true', () => {
    const { container } = render(<CardSkeleton showImage={true} />);

    const image = container.querySelector('.h-48.bg-gray-200');
    expect(image).toBeInTheDocument();
  });

  it('should render specified number of lines', () => {
    const { container } = render(<CardSkeleton lines={5} />);

    const lines = container.querySelectorAll('.h-4.bg-gray-200');
    expect(lines.length).toBe(5);
  });

  it('should apply custom className', () => {
    const { container } = render(<CardSkeleton className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render with default 3 lines', () => {
    const { container } = render(<CardSkeleton />);

    const lines = container.querySelectorAll('.h-4.bg-gray-200');
    expect(lines.length).toBe(3);
  });
});
