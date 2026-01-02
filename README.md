# Test Organization

This document describes the test organization strategy for the LegalEase frontend.

## Test Structure

### Unit Tests

**Location:** `src/**/__tests__/` (co-located with source)

Unit tests are co-located with their source files for better discoverability and maintainability.

Examples:

- `src/components/ui/__tests__/Button.test.tsx`
- `src/lib/api/__tests__/profile.test.ts`
- `src/__tests__/unit/lib/datetime.test.ts`

### Integration Tests

**Location:** `src/__tests__/integration/`

Integration tests verify interactions between multiple components or modules.

Examples:

- `src/__tests__/integration/api/users.integration.test.ts`
- `src/__tests__/integration/auth-flow.test.tsx`
- `src/__tests__/integration/lib/sessionManager.integration.test.ts`

### E2E Tests (Playwright)

**Location:** `tests/e2e/`

End-to-end tests verify complete user workflows using Playwright.

Examples:

- `tests/e2e/smoke.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/debug-register.spec.ts`

### Test Fixtures

**Location:** `tests/fixtures/`

Shared test data and utilities used across multiple test files.

## Running Tests

```bash
# Run all unit and integration tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- Button.test.tsx

# Run E2E test file
npm run test:e2e -- smoke.spec.ts
```

## Credential Management

### Zero-Hardcoded Credentials Policy

All test credentials are loaded from `config/.env` with fail-fast validation. This ensures:

- ✅ No hardcoded credentials in test files
- ✅ Consistent credential management across frontend and backend
- ✅ Clear error messages when credentials are missing
- ✅ Production-ready security practices

**Credential Files:**

- **E2E Tests (Playwright):** `test-credentials.ts` (56 environment variables)
- **Unit/Integration Tests (Jest):** `jest-test-credentials.ts` (65+ environment variables)
- **Global Setup:** `setup/jest.global-setup.js` (validates before tests run)

### Credential Pools

**E2E Tests (Playwright):**
- 12-worker pool for parallel execution
- Credentials: SuperAdmin → Profile User 4
- Worker isolation prevents session conflicts
- Role-aware fixtures (isAdmin, isSuperAdmin metadata)

**Unit/Integration Tests (Jest):**
- 6-worker pool for parallel execution
- Credentials: Regular User → Current User
- Automatic worker assignment via `JEST_WORKER_ID`
- Worker-specific credential pools in `setup/jest.setup.js`

### Test Data vs Real Credentials

It's important to distinguish between test data and real credentials:

**Test Data** (form validation payloads - NOT login credentials):
```typescript
// ✅ SAFE - Used in form field validation tests
fireEvent.change(passwordInput, { target: { value: 'password123' } });
expect(validatePassword('NewPassword123!')).toEqual({ isValid: false });
```

**Real Credentials** (from environment - used for actual login):
```typescript
// ✅ CORRECT - Uses environment variable
import { TEST_CREDENTIALS } from './test-credentials';
await login(TEST_CREDENTIALS.USER.email, TEST_CREDENTIALS.USER.password);
```

**Never do this:**
```typescript
// ❌ WRONG - Hardcoded credentials
await login('test@example.com', 'password123');
```

### Quick Setup

```bash
# Validate all credentials are present
./scripts/validate-credentials.sh

# Run E2E tests against real Docker backend
cd frontend
npm run test:e2e:real

# Run unit/integration tests
npm test
```

### Credential Validation

Both credential files validate environment variables on import:

```typescript
// E2E (test-credentials.ts)
validateTestEnvironment(); // Exits with error if missing

// Jest (jest-test-credentials.ts)
if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
  validateFrontendTestEnvironment(); // Only validates in Jest context
}
```

### Real Backend Testing

All E2E and integration tests run against the real Docker backend:

- **E2E Tests:** Real Docker services at `http://localhost:8000`
- **Integration Tests:** Real API endpoints via `NEXT_PUBLIC_API_URL`
- **Unit Tests:** Component isolation (no backend needed)
- **Mock Mode:** Removed - all tests require real backend for production parity

**Service Validation:**
- Playwright global setup checks backend availability
- Jest global setup starts Docker services if needed
- Tests fail fast if backend unavailable

### Troubleshooting

**Missing Credentials Error:**
```
ERROR: Missing required test credentials in config/.env:
  - TEST_USER_EMAIL
  - TEST_USER_PASSWORD
```

**Solution:**
```bash
# Verify credentials exist
grep "TEST_USER_EMAIL\|TEST_ADMIN_EMAIL" config/.env

# Restore from template if needed
./scripts/setup-credentials.sh --backup

# Run validation
./scripts/validate-credentials.sh
```

**See Also:**
- [Backend Credential Management](../../CLAUDE.md#test-credential-management-critical)
- [E2E Testing Guide](../../docs/testing/FRONTEND_TESTING_GUIDE.md)
- [Credential Validation Script](../../scripts/validate-credentials.sh)

---

## Jest Configuration

Tests are discovered using the following patterns (configured in `jest.config.js`):

- `src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}` - Co-located component tests
- `src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}` - Centralized unit/integration tests
- `tests/**/*.{test,spec}.{js,jsx,ts,tsx}` - E2E and other test files

## Best Practices

1. **Co-locate unit tests** with source files when possible
2. **Use descriptive test names** that explain what is being tested
3. **Keep tests focused** - one test should verify one behavior
4. **Mock external dependencies** - don't make real API calls in unit tests
5. **Use E2E tests sparingly** - they're slower and more brittle than unit tests

## Migration Notes

- Root `__tests__/` directory has been consolidated into `src/__tests__/`
- All test files follow the `.test.ts` or `.test.tsx` naming convention
- E2E tests use `.spec.ts` convention for Playwright compatibility
