/**
 * Shared setup for useAccountUnlock tests
 *
 * @description Common mocks, fixtures, and setup functions for split test files.
 * This allows each test file to run in isolation while sharing common configuration.
 *
 * @module __tests__/unit/hooks/useAccountUnlock/setup
 */

import { LockedAccount } from '@/hooks/admin/useAccountUnlock';

// Mock dependencies - must be called before importing hook
export function setupMocks() {
  jest.mock('@/lib/logging', () => ({
    __esModule: true,
    default: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  }));

  jest.mock('@/lib/api', () => ({
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
    },
  }));
}

// Mock data fixtures
export const mockLockedAccounts: LockedAccount[] = [
  {
    user_id: 1,
    email: 'locked1@example.com',
    full_name: 'Locked User One',
    role: 'user',
    failed_attempts: 5,
    lockout_reason: 'Too many failed login attempts',
    lockout_until: '2024-01-03T12:00:00Z',
    remaining_lockout_minutes: 30,
  },
  {
    user_id: 2,
    email: 'locked2@example.com',
    full_name: 'Locked User Two',
    role: 'user',
    failed_attempts: 5,
    lockout_reason: 'Suspicious activity detected',
    lockout_until: '2024-01-03T15:00:00Z',
    remaining_lockout_minutes: 180,
  },
];

export const mockUnlockResponse = {
  message: 'Account unlocked successfully',
  user_id: 1,
  email: 'locked1@example.com',
  unlocked: true,
  unlocked_by: 'admin@example.com',
  unlock_reason: 'Manual unlock by admin',
};

// Helper to get typed mock API
export function getMockApi(): jest.Mocked<typeof import('@/lib/api').default> {
   
  return require('@/lib/api').default;
}

// Helper to get typed mock logger
export function getMockLogger(): jest.Mocked<typeof import('@/lib/logging').default> {
   
  return require('@/lib/logging').default;
}

// Standard beforeEach setup
export function setupBeforeEach(mockApi: ReturnType<typeof getMockApi>) {
  jest.clearAllMocks();
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.get.mockResolvedValue({
    data: { locked_accounts: mockLockedAccounts },
  });
  mockApi.post.mockResolvedValue({
    data: mockUnlockResponse,
  });
}

// Standard afterEach cleanup
export function setupAfterEach() {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();
}
