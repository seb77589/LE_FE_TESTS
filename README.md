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
