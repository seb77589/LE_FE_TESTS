/**
 * Tests for Card component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/Card';

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('Card', () => {
  describe('Basic Rendering', () => {
    it('should render card', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render card with custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Card Header', () => {
    it('should render card header', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
          Content
        </Card>,
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
    });
  });

  describe('Card Title', () => {
    it('should render card title', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>,
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('Card Content', () => {
    it('should render card content', () => {
      render(
        <Card>
          <CardContent>Body Content</CardContent>
        </Card>,
      );
      expect(screen.getByText('Body Content')).toBeInTheDocument();
    });
  });

  describe('Card Description', () => {
    it('should render card description', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Description</CardDescription>
          </CardHeader>
        </Card>,
      );
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });
});
