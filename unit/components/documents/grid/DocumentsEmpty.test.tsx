/**
 * Tests for DocumentsEmpty component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocumentsEmpty } from '@/components/documents/grid/DocumentsEmpty';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-icon">File</div>,
}));

describe('DocumentsEmpty', () => {
  describe('Basic Rendering', () => {
    it('should render documents empty state', () => {
      render(<DocumentsEmpty />);
      expect(screen.getByText('No documents found')).toBeInTheDocument();
    });

    it('should render file icon', () => {
      render(<DocumentsEmpty />);
      expect(screen.getByTestId('file-icon')).toBeInTheDocument();
    });
  });
});
