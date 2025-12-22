import React from 'react';
import { render, screen } from '@testing-library/react';
import VerifyEmailPage from '@/app/(public)/verify-email/page';
import { useSearchParams } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('VerifyEmailPage', () => {
  it('shows error if no token is provided', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: (): string | null => null,
    });
    render(<VerifyEmailPage />);
    expect(screen.getByText(/errorNoToken/i)).toBeInTheDocument();
  });
});
