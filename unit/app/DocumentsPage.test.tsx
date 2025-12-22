import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentsPage from '@/app/(protected)/dashboard/documents/page';
import useSWR from 'swr';

jest.mock('swr');
const mockMutate = jest.fn();

describe('DocumentsPage', () => {
  beforeEach(() => {
    (useSWR as jest.Mock).mockReturnValue({
      data: {
        documents: [
          {
            id: 1,
            filename: 'doc1.txt',
            mime_type: 'text/plain',
            file_size: 1024,
            upload_date: '2025-01-01T00:00:00Z',
            status: 'uploaded',
          },
          {
            id: 2,
            filename: 'foo.pdf',
            mime_type: 'application/pdf',
            file_size: 2048,
            upload_date: '2025-01-02T00:00:00Z',
            status: 'processed',
          },
        ],
        total: 2,
      },
      error: null,
      mutate: mockMutate,
    });
  });

  it('renders documents list', () => {
    render(<DocumentsPage />);
    expect(screen.getByText(/My Documents/i)).toBeInTheDocument();
    expect(screen.getByText('doc1.txt')).toBeInTheDocument();
    expect(screen.getByText('foo.pdf')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<DocumentsPage />);
    const input = screen.getByPlaceholderText(/search documents/i);
    expect(input).toBeInTheDocument();

    // Test that input can be changed
    fireEvent.change(input, { target: { value: 'foo' } });
    expect(input).toHaveValue('foo');
  });
});
