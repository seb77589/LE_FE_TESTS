'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/page';
import { useAuth } from '@/lib/context/ConsolidatedAuthContext';
import { useRouter } from 'next/navigation';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock the ConsolidatedAuthContext
jest.mock('@/lib/context/ConsolidatedAuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('HomePage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders loading state when isLoading is true', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(<HomePage />);

    expect(
      screen.getByText('Loading LegalEase (Modernized Dev Environment)...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Hot reload is working!')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to dashboard when user is logged in', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: FRONTEND_TEST_CREDENTIALS.USER.email },
      isLoading: false,
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to login when user is not logged in', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });
});
