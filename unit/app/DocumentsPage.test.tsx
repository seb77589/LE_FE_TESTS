import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentsPage from '@/app/(protected)/dashboard/documents/page';
import useSWR from 'swr';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

jest.mock('swr');
const mockMutate = jest.fn();

// Mock auth context
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 1,
      email: FRONTEND_TEST_CREDENTIALS.USER.email,
      role: 'assistant',
    },
    isAuthenticated: true,
    isLoading: false,
    isAdmin: jest.fn(() => false),
    isSuperAdmin: jest.fn(() => false),
    hasRole: jest.fn(() => false),
    token: 'mock-token',
    logout: jest.fn(),
  })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/documents',
  })),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

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
