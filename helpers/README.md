# Jest Test Helpers for Real Backend Integration

This directory contains helper utilities for running Jest tests against the real Docker backend.

## Overview

LegalEase Jest tests support two modes:
1. **Mocked tests** - Traditional unit tests with mocked API responses (default jsdom environment)
2. **Real backend integration tests** - Tests that hit the actual Docker backend (Node environment)

## Worker Credential Pool

To prevent session conflicts when running tests in parallel, a credential pool is available in `jest.setup.js`:

```typescript
import { getTestCredentials, getRoleCredentials, getWorkerCredentials } from '../../../jest.setup';

// Get credentials for current Jest worker (parallel-safe)
const credentials = getTestCredentials();

// Get credentials for a specific role
const adminCredentials = getRoleCredentials('admin');
const userCredentials = getRoleCredentials('user');
const superadminCredentials = getRoleCredentials('superadmin');

// Get credentials for a specific worker index
const worker0Credentials = getWorkerCredentials(0);
```

**Available credential pools:**
- Worker 0: Regular user (`TEST_USER_EMAIL`)
- Worker 1: Admin user (`TEST_ADMIN_EMAIL`)
- Worker 2: User1 (`TEST_USER1_EMAIL`)
- Worker 3: User2 (`TEST_USER2_EMAIL`)
- Worker 4: John (`TEST_JOHN_EMAIL`)
- Worker 5: Current (`TEST_CURRENT_EMAIL`)

## API Test Utilities

The `api-test-utils.ts` file provides reusable functions for real backend tests:

```typescript
import {
  loginTestUser,
  logoutTestUser,
  cleanupTestSession,
  createAuthenticatedClient,
  setupAuthenticatedTest,
  waitForAPI
} from './api-test-utils';
```

### Functions

#### `loginTestUser(role?: string)`
Logs in a test user and returns authentication token.

```typescript
// Login with worker-specific credentials (parallel-safe)
const { token, user, credentials } = await loginTestUser();

// Login as specific role
const { token } = await loginTestUser('admin');
```

#### `logoutTestUser()`
Logs out the current test user (ignores errors if not logged in).

```typescript
afterEach(async () => {
  await logoutTestUser();
});
```

#### `cleanupTestSession()`
Comprehensive cleanup: logs out, clears cookies, and clears localStorage.

```typescript
afterEach(async () => {
  await cleanupTestSession();
});
```

#### `createAuthenticatedClient(token: string)`
Creates an axios instance with Authorization header pre-configured.

```typescript
const { token } = await loginTestUser('admin');
const authenticatedApi = createAuthenticatedClient(token);
const response = await authenticatedApi.get('/api/v1/admin/users');
```

#### `setupAuthenticatedTest(role?: string)`
Convenience function that logs in and returns both authenticated client and user info.

```typescript
let authenticatedApi: any;
let user: any;

beforeEach(async () => {
  ({ authenticatedApi, user } = await setupAuthenticatedTest('admin'));
});
```

#### `waitForAPI(apiCall, options)`
Retry wrapper for flaky API calls.

```typescript
const response = await waitForAPI(
  () => api.get('/api/v1/users/me'),
  { maxRetries: 3, retryDelay: 1000 }
);
```

## Writing Real Backend Integration Tests

### 1. Use Node Environment

For tests that make real HTTP calls to the backend, use the Node environment:

```typescript
/**
 * @jest-environment node
 */
```

This is required because:
- jsdom's `window.location.origin` defaults to `http://localhost` (port 80)
- Node environment uses server-side URL resolution which correctly uses `NEXT_PUBLIC_API_URL`

### 2. Keep Framework Mocks

Always mock framework utilities that don't affect API calls:

```typescript
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));
```

### 3. Add Session Cleanup

Always clean up sessions in `afterEach` to prevent test pollution:

```typescript
afterEach(async () => {
  await cleanupTestSession();
});
```

### 4. Example: Real Backend Integration Test

```typescript
/**
 * @integration
 * @jest-environment node
 */

import api, { handleApiError } from '@/lib/api/client';
import { cleanupTestSession } from '../../helpers/api-test-utils';

jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/errors', () => ({
  handleError: jest.fn(),
}));

describe('My Real Backend Tests', () => {
  afterEach(async () => {
    await cleanupTestSession();
  });

  it('should connect to real backend', async () => {
    const response = await api.get('/health');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
    expect(response.data.status).toBe('healthy');
  });
});
```

## Test Categories

### Real Backend Tests (Node environment)
Use for:
- Health check endpoints
- API connectivity validation
- Authentication flows (login/logout)
- Basic CRUD operations that need real database

Files:
- `health-check.integration.test.ts`
- `api-connectivity.integration.test.ts`

### Mocked Tests (jsdom environment)
Use for:
- Error handling scenarios (401, 403, 404, 422, 429, 500)
- API client interceptor behavior
- Rate limiting handling
- Validation error formatting
- Component rendering with API calls

Files:
- `admin.integration.test.ts`
- `auth-security-api.integration.test.ts`
- `document.integration.test.ts`
- etc.

## Running Tests

```bash
# Run all API integration tests
npm test -- --testPathPatterns="integration/api"

# Run specific test file
npm test -- --testPathPatterns="health-check"

# Run with verbose output
npm test -- --testPathPatterns="integration/api" --verbose

# Run with coverage
npm test -- --testPathPatterns="integration/api" --coverage
```

## Troubleshooting

### ECONNREFUSED 127.0.0.1:80
**Cause**: Test running in jsdom environment trying to make real HTTP calls.
**Solution**: Add `@jest-environment node` directive at the top of the file.

### Session Conflicts
**Cause**: Multiple parallel workers using the same credentials.
**Solution**: Use `getTestCredentials()` which returns worker-specific credentials.

### Test Pollution
**Cause**: Session state leaking between tests.
**Solution**: Add `await cleanupTestSession()` in `afterEach`.

### Timeout Errors
**Cause**: Backend not responding within test timeout.
**Solution**: Increase test timeout with `jest.setTimeout(60000)` or use `waitForAPI` with retry logic.
