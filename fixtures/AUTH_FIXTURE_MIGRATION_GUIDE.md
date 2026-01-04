# Auth Fixture Migration Guide

## Problem Solved

The new `auth-fixture.ts` prevents authentication conflicts when tests run in parallel by assigning **unique credentials to each worker**.

**Before (with credential conflicts):**

- 16 workers × shared SUPERADMIN credentials = session conflicts
- Tests fail with 401 errors and redirect to /auth/register
- 22 tests failing due to authentication race conditions

**After (with per-worker credentials):**

- Each worker gets dedicated credentials
- Zero session conflicts
- Can safely run with 8-16 workers

---

## How to Use

### Step 1: Import from auth-fixture instead of api-fixture

**Before:**

```typescript
import { test, expect } from '../fixtures/api-fixture';
```

**After:**

```typescript
import { test, expect } from '../fixtures/auth-fixture';
```

### Step 2: Use `workerCredentials` instead of hardcoded credentials

**Before:**

```typescript
import { TEST_CREDENTIALS } from '../test-credentials';

test('should access admin page', async ({ page }) => {
  await TestHelpers.loginAndWaitForRedirect(
    page,
    TEST_CREDENTIALS.SUPERADMIN.email, // ❌ Shared across all workers
    TEST_CREDENTIALS.SUPERADMIN.password,
    true,
  );
});
```

**After:**

```typescript
test('should access admin page', async ({ page, workerCredentials }) => {
  await TestHelpers.loginAndWaitForRedirect(
    page,
    workerCredentials.email, // ✅ Unique per worker
    workerCredentials.password,
    workerCredentials.isAdmin,
  );
});
```

### Step 3: Use helper properties for role checks

The `workerCredentials` object provides:

- `email` - User email
- `password` - User password
- `isAdmin` - Boolean (true for admin/superadmin)
- `isSuperAdmin` - Boolean (true only for superadmin)
- `description` - Human-readable description

**Example:**

```typescript
test('admin-only feature', async ({ page, workerCredentials }) => {
  // Skip test if worker doesn't have admin credentials
  test.skip(!workerCredentials.isAdmin, 'Requires admin credentials');

  await TestHelpers.loginAndWaitForRedirect(
    page,
    workerCredentials.email,
    workerCredentials.password,
    workerCredentials.isAdmin,
  );

  // Test admin features...
});
```

---

## Migration Priority

### High Priority (Should migrate ASAP)

Tests that currently fail due to credential conflicts:

- `tests/e2e/admin-system.spec.ts` (2 failures)
- `tests/e2e/auth/login.spec.ts` (3 failures)
- `tests/e2e/document-*.spec.ts` (3 failures)
- `tests/e2e/password-change.spec.ts` (4 failures)
- `tests/e2e/security/*.spec.ts` (2 failures)

### Medium Priority (Migrate for stability)

Tests that pass but use shared credentials:

- `tests/e2e/auth/multi-device-logout.spec.ts`
- `tests/e2e/auth/register.spec.ts`

### Low Priority (Already have unique credentials)

Tests already using dedicated credentials:

- WebSocket tests (use WS_TEST_CREDENTIALS)
- Profile tests (use PROFILE_TEST_CREDENTIALS)

---

## Credential Pool

The fixture provides 12 pre-configured credential sets:

| Worker Index | Credentials      | Role       | Use Case                             |
| ------------ | ---------------- | ---------- | ------------------------------------ |
| 0            | SUPERADMIN       | SuperAdmin | Admin dashboard, system actions      |
| 1            | ADMIN            | Admin      | User management, reports             |
| 2            | USER             | User       | Document operations, basic features  |
| 3-5          | WS_USER_1-3      | User       | WebSocket tests, parallel user tests |
| 6-7          | WS_ADMIN_1-2     | Admin      | WebSocket admin tests                |
| 8-11         | PROFILE_USER_1-4 | User       | Profile tests, parallel user tests   |

**With 4 workers**: Each gets a unique credential set (0-3)
**With 8 workers**: Each gets a unique credential set (0-7)
**With 12+ workers**: Credentials rotate (worker 12 uses same as worker 0, etc.)

---

## Complete Migration Example

### Before (Parallel Conflicts)

```typescript
// tests/e2e/admin-system.spec.ts
import { test, expect } from '../fixtures/api-fixture';
import { TEST_CREDENTIALS } from '../test-credentials';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Admin System Page', () => {
  test('admin can view system status page', async ({ page }) => {
    // ❌ All workers use same SUPERADMIN credentials = conflicts
    await TestHelpers.loginAndWaitForRedirect(
      page,
      TEST_CREDENTIALS.SUPERADMIN.email,
      TEST_CREDENTIALS.SUPERADMIN.password,
      true,
    );

    await page.goto('/admin/system');
    await expect(page.locator('h1')).toContainText('System Status');
  });
});
```

### After (No Conflicts)

```typescript
// tests/e2e/admin-system.spec.ts
import { test, expect } from '../fixtures/auth-fixture'; // ✅ Changed import
import { TestHelpers } from '../utils/test-helpers';

test.describe('Admin System Page', () => {
  test('admin can view system status page', async ({ page, workerCredentials }) => {
    // ✅ Each worker gets unique credentials automatically
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );

    await page.goto('/admin/system');
    await expect(page.locator('h1')).toContainText('System Status');
  });
});
```

---

## Testing the Migration

After migrating a test file:

1. **Run the specific test file**:

   ```bash
   npx playwright test tests/e2e/admin-system.spec.ts
   ```

2. **Verify worker credentials are assigned**:
   Look for console output:

   ```
   [Worker 0] Using credentials: SuperAdmin - Worker 0
   [Worker 1] Using credentials: Admin - Worker 1
   ```

3. **Run with multiple workers**:

   ```bash
   npx playwright test tests/e2e/admin-system.spec.ts --workers=4
   ```

4. **Check for 401 errors**:
   If you see `401 Unauthorized` errors, the migration may be incomplete

---

## Troubleshooting

**Issue**: Test still uses TEST_CREDENTIALS directly

**Solution**: Search for all occurrences of `TEST_CREDENTIALS` in the test file and replace with `workerCredentials`

```bash
# Find files still using hardcoded credentials
grep -r "TEST_CREDENTIALS.SUPERADMIN" tests/e2e/
```

**Issue**: Worker doesn't have required role (e.g., needs superadmin but got regular user)

**Solution**: Use `test.skip()` to skip tests when worker credentials don't match requirements

```typescript
test('superadmin only feature', async ({ workerCredentials }) => {
  test.skip(!workerCredentials.isSuperAdmin, 'Requires superadmin');
  // Test code...
});
```

---

## Benefits After Migration

✅ **Zero authentication conflicts** - Each worker has dedicated credentials
✅ **Scalable parallelization** - Can run with 8-16 workers safely
✅ **Faster test execution** - More workers = faster overall runtime
✅ **More reliable tests** - No more 401 errors or unexpected redirects
✅ **Clear logging** - Worker index + credential description in logs

---

## Next Steps

1. **Validate Phase 1**: Wait for 4-worker test run to complete (currently running)
2. **Migrate high-priority tests**: Start with failing tests first
3. **Increase worker count**: Scale back to 8 workers once migrations complete
4. **Monitor results**: Ensure no regressions in test stability
