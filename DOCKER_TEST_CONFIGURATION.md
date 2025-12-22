# Docker Test Configuration Guide

## Overview

This document provides guidance for running E2E tests against Docker containers, including performance tuning and troubleshooting flaky tests.

## Test Environment

### Docker Services Required

- **Backend** (`legalease-backend-1`): FastAPI application
- **Frontend** (`legalease-frontend-1`): Next.js application
- **Database** (`legalease-db-1`): PostgreSQL 15
- **Redis** (`legalease-redis-1`): Redis 7 Alpine

### Health Check Status

All services must show `(healthy)` status before running tests:

```bash
docker compose ps
```

## Running Tests

### Full Test Suite

```bash
cd frontend
PLAYWRIGHT_MOCK=false timeout 300 npx playwright test --reporter=list
```

### Individual Test Files

```bash
# Run specific test file
PLAYWRIGHT_MOCK=false npx playwright test tests/e2e/auth/login.spec.ts

# Run specific test by name
PLAYWRIGHT_MOCK=false npx playwright test -g "should login successfully"
```

### Debug Mode

```bash
# Run with headed browser
PLAYWRIGHT_MOCK=false npx playwright test --headed --workers=1

# Run with debug mode
PLAYWRIGHT_MOCK=false npx playwright test --debug
```

## Performance Considerations

### Resource Allocation

**Recommended Docker Resources:**

- CPU: 4+ cores
- Memory: 8GB+ RAM
- Disk: 20GB+ available space

### Test Parallelization

The test suite uses Playwright's `fullyParallel: true` configuration. For Docker environments:

**Optimal Settings:**

```typescript
// playwright.config.ts
workers: process.env.CI ? 1 : undefined, // Auto in local, 1 in CI
retries: process.env.CI ? 2 : 0,         // Retry in CI only
```

**For Resource-Constrained Environments:**

```bash
# Run tests sequentially
PLAYWRIGHT_MOCK=false npx playwright test --workers=1

# With retry logic
PLAYWRIGHT_MOCK=false npx playwright test --workers=1 --retries=2
```

## Known Flaky Tests

### Timing-Sensitive Tests

The following tests may fail intermittently in the full suite due to resource contention:

1. **Auth Tests**
   - `should show error for invalid email`
   - `should show error with duplicate email`
   - **Reason**: Timing between API calls and error display
   - **Fix**: Run individually or increase workers

2. **Performance Budget Tests**
   - `should load login page within performance budget`
   - `should maintain performance across page navigation`
   - `should meet network request performance budget`
   - **Reason**: Docker overhead affects timing measurements
   - **Fix**: Adjust timeout thresholds or skip in Docker environments

### Gracefully Skipped Tests

These tests skip automatically when features aren't available:

1. **Monitoring Tests** (11 tests)
   - Skip when monitoring systems aren't initialized
   - Expected in production builds

2. **UI Feature Tests**
   - Logout button test
   - Admin health check button
   - Skip when UI components aren't accessible

## Troubleshooting

### Tests Timing Out

**Symptoms:**

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded
```

**Solutions:**

1. Increase timeout values:

   ```typescript
   await page.waitForURL('**/dashboard', { timeout: 30000 });
   ```

2. Check Docker container health:

   ```bash
   docker compose ps
   docker compose logs backend
   ```

3. Restart containers:
   ```bash
   docker compose restart
   ```

### High Failure Rate

**Symptoms:**

- > 10% test failure rate in full suite
- Tests pass individually but fail in suite

**Solutions:**

1. Run with fewer workers:

   ```bash
   PLAYWRIGHT_MOCK=false npx playwright test --workers=2
   ```

2. Add retry logic:

   ```bash
   PLAYWRIGHT_MOCK=false npx playwright test --retries=2
   ```

3. Check system resources:
   ```bash
   docker stats
   ```

### Container Not Healthy

**Symptoms:**

```
[Playwright Global Setup] Backend did not become healthy in time
```

**Solutions:**

1. Check container logs:

   ```bash
   docker compose logs backend --tail=50
   ```

2. Verify port availability:

   ```bash
   netstat -tulpn | grep -E "3000|3443|8000|8443"
   ```

3. Restart services:
   ```bash
   docker compose down
   docker compose up -d
   ```

## Test Metrics

### Expected Performance

**Full Suite (116 tests):**

- **Runtime**: 1-2 minutes (Docker)
- **Pass Rate**: 95-100% (individual runs)
- **Pass Rate**: 85-95% (full suite, resource-dependent)
- **Skipped**: 10-15 tests (feature-dependent)

**Individual Test:**

- **Runtime**: 2-10 seconds per test
- **Pass Rate**: 99%+ (stable tests)

### Baseline Results

**Recent Run (Docker Environment):**

```
97 passed
5 failed (flaky, timing-related)
14 skipped (feature-dependent)
Total runtime: 1.7 minutes
```

**Optimal Run (Sequential, --workers=1):**

```
101-102 passed
0-1 failed
13-14 skipped
Total runtime: 3-4 minutes
```

## Configuration Files

### Key Configuration Files

- `playwright.config.ts`: Main Playwright configuration
- `jest.config.js`: Jest configuration for unit tests
- `jest.global-setup.js`: Docker Compose bootstrap
- `jest.global-teardown.js`: Docker Compose cleanup
- `tests/global-setup.ts`: Playwright service validation
- `tests/global-teardown.ts`: Playwright cleanup

### Environment Variables

**Required:**

```bash
# Test mode
PLAYWRIGHT_MOCK=false
NODE_ENV=development

# Service URLs
NEXT_PUBLIC_API_URL=https://localhost:8443
FRONTEND_URL=http://localhost:3000

# Test credentials (from config/.env)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@legalease.com
TEST_ADMIN_PASSWORD=Admin123!
TEST_SUPERADMIN_EMAIL=superadmin@legalease.com
TEST_SUPERADMIN_PASSWORD=Test123!
```

## Best Practices

### 1. Pre-Test Verification

Always verify Docker services are healthy before running tests:

```bash
# Check services
docker compose ps

# Verify health endpoints
curl -k https://localhost:8443/health
curl https://localhost:3000/api/health
```

### 2. Resource Management

- Close unnecessary applications
- Monitor Docker resource usage: `docker stats`
- Consider sequential execution for stability

### 3. Test Isolation

- Tests use random user generation to avoid collisions
- Database is shared but tests clean up after themselves
- Use `TestHelpers.clearApplicationData()` for state reset

### 4. Debugging Failed Tests

```bash
# Run with screenshots and traces
PLAYWRIGHT_MOCK=false npx playwright test --trace on

# View test report
npx playwright show-report

# View specific test trace
npx playwright show-trace trace.zip
```

### 5. CI/CD Integration

For CI/CD pipelines, use:

```yaml
- name: Run E2E Tests
  run: |
    docker compose up -d
    cd frontend
    PLAYWRIGHT_MOCK=false npx playwright test --workers=1 --retries=2
  timeout-minutes: 10
```

## Monitoring Test Health

### Success Criteria

- ✅ Pass rate ≥ 95% on individual runs
- ✅ Pass rate ≥ 85% on full suite (Docker)
- ✅ No persistent failures (same test failing repeatedly)
- ✅ Skipped tests have clear reasons

### Warning Signs

- ⚠️ Pass rate < 85% consistently
- ⚠️ Same tests failing every run
- ⚠️ Increasing test duration (>3 minutes full suite)
- ⚠️ Container unhealthy states

### Action Items

When test health degrades:

1. Review recent code changes
2. Check Docker resource allocation
3. Review test logs for patterns
4. Consider adding retry logic to flaky tests
5. Update timeout thresholds if needed

## Summary

This test suite is designed to be robust and production-ready while handling the real-world challenges of Docker-based E2E testing. The key to success is:

1. **Understanding flakiness**: Some tests are timing-sensitive by nature
2. **Resource awareness**: Docker overhead affects performance measurements
3. **Graceful degradation**: Tests skip appropriately when features are unavailable
4. **Retry strategies**: Important tests have built-in retry logic
5. **Comprehensive coverage**: 116 tests covering all critical user flows

**Remember**: A few flaky tests in a large suite running against Docker is normal. Focus on the trend rather than individual runs.
