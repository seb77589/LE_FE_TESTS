import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAccountPage from '@/app/(protected)/settings/delete-account/page';
import { FRONTEND_TEST_CREDENTIALS } from '@tests/jest-test-credentials';

// Mock the API module
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
  },
}));

// Import after mock
import api from '@/lib/api';

describe('DeleteAccountPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the delete function to resolve successfully
    (api.delete as jest.Mock).mockResolvedValue({});
  });

  it('submits password for account deletion', async () => {
    render(<DeleteAccountPage />);

    fireEvent.change(screen.getByLabelText(/Type DELETE/i), {
      target: { value: 'DELETE' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: FRONTEND_TEST_CREDENTIALS.USER.password },
    });
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/v1/profile/me', {
        data: {
          password: FRONTEND_TEST_CREDENTIALS.USER.password,
        },
      });
    });
  });
});
