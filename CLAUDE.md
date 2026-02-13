# CLAUDE.md — LegalEase Frontend Tests (LE_FE_TESTS)

## Purpose
Coding guidance for AI-assisted development and automated code review (Greptile) on the
LegalEase frontend test submodule.

## Project Context
This repo is a **Git submodule** of `seb77589/LE_FE` (mounted at `tests/`) and transitively
of the monorepo `seb77589/legalease` (at `frontend/tests/`).
Split exists for SonarQube scanning isolation — test quality is scanned independently.

## Tech Stack
- **E2E**: Playwright (Chromium + Firefox + WebKit)
- **Unit/Integration**: Jest + React Testing Library
- **Credentials**: Environment-based (zero hardcoded) — loaded from `config/.env`

## Directory Structure
- `e2e/` — Playwright E2E specs (production-grade)
- `unit/` — Jest unit tests
- `integration/` — Jest integration tests
- `components/` — Component-specific tests
- `contract/` — API contract tests
- `security/` — Security-focused tests
- `performance/` — Performance benchmark tests
- `fixtures/` — Test fixtures and data
- `helpers/` — Shared test helpers
- `mocks/` — Mock implementations
- `setup/` — Test setup and configuration
- `utils/` — Test utility functions

## Golden Rules (CRITICAL)

### 1. Production-Grade First
- DEFAULT to Docker-backed runs: `PLAYWRIGHT_MOCK=false npm run test:e2e`
- Mock mode (`npm run test:e2e:mock`) is diagnostic ONLY — never sufficient for release
- Always run `npm run check-services` before E2E tests to validate Docker stack

### 2. Zero Hardcoded Credentials
- ALL test credentials loaded from environment variables (`config/.env`)
- E2E credentials: `test-credentials.ts` (56 required env vars)
- Jest credentials: `jest-test-credentials.ts` (65+ required env vars)
- Validation: `./scripts/validate-credentials.sh` — fails fast if missing
- 29 unique test accounts for parallel execution with per-worker isolation

### 3. Protected Manual Test Accounts
- NEVER use `MANUAL_SUPERADMIN_*`, `MANUAL_MANAGER_*`, `MANUAL_ASSISTANT_*` in automated tests
- These are EXCLUSIVELY for manual QA — test credential files enforce exclusion

### 4. Test File Conventions
- E2E specs: `*.e2e.spec.ts` or `*.spec.ts` in `e2e/`
- Unit tests: `*.test.ts` or `*.test.tsx` in `unit/`
- Integration tests: `*.test.ts` in `integration/`
- ❌ NEVER create `__tests__/` directories in `src/` (removed in v0.2.0)
- Use `@tests/*` path alias for imports from test utilities

### 5. E2E Test Modes
| Mode | Command | Use Case |
|------|---------|----------|
| Production-grade | `npm run test:e2e` | **Required before merge** |
| Mock mode | `npm run test:e2e:mock` | Fast iteration (diagnostic) |
| Safe mode | `npm run test:e2e:safe` | Pre-flight health check + tests |
| Interactive | `npm run test:e2e:ui` | Visual debugging |
| Headed | `npm run test:e2e:headed` | Browser-visible debugging |
| Debug | `npm run test:e2e:debug` | Step-through with breakpoints |

### 6. Assertion Patterns
- Use Playwright's built-in assertions (`expect(locator).toBeVisible()`)
- Avoid `page.waitForTimeout()` — use `page.waitForSelector()` or auto-waiting
- Always clean up test state (log out after login tests, delete created resources)
