import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DocumentsPageRedirect from '@/app/(protected)/dashboard/documents/page';

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    replace: mockReplace,
  })),
}));

describe('DocumentsPageRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders redirect message', () => {
    render(<DocumentsPageRedirect />);
    expect(screen.getByText(/redirecting to cases/i)).toBeInTheDocument();
    expect(
      screen.getByText(/documents are now managed within cases/i),
    ).toBeInTheDocument();
  });

  it('redirects to /cases on mount', async () => {
    render(<DocumentsPageRedirect />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/cases');
    });
  });
});
