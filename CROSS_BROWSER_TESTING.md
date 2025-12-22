# Cross-Browser Testing Guide

This guide explains how to run Playwright E2E tests across multiple browsers and devices.

## Default Configuration

By default, tests run only on **Chromium** to ensure fast feedback during development. Additional browsers can be enabled via environment variables.

## Available Browser Configurations

### Desktop Browsers

#### 1. Firefox

Enable Firefox testing:

```bash
ENABLE_FIREFOX=true npm run test:e2e:real
```

#### 2. Webkit (Safari)

Enable Webkit/Safari testing:

```bash
ENABLE_WEBKIT=true npm run test:e2e:real
```

**Note**: Webkit may have compatibility issues in Docker/Linux environments. Best results on macOS.

#### 3. Branded Browsers (Edge, Chrome)

Enable Microsoft Edge and Google Chrome:

```bash
ENABLE_BRANDED=true npm run test:e2e:real
```

### Mobile Devices

Enable mobile device emulation (Pixel 5, iPhone 12):

```bash
ENABLE_MOBILE=true npm run test:e2e:real
```

## Running Tests Across All Browsers

### All Desktop Browsers

```bash
ENABLE_FIREFOX=true ENABLE_WEBKIT=true npm run test:e2e:real
```

### All Browsers Including Mobile

```bash
ENABLE_FIREFOX=true ENABLE_WEBKIT=true ENABLE_MOBILE=true npm run test:e2e:real
```

### Complete Suite (All Browsers + Branded)

```bash
ENABLE_FIREFOX=true ENABLE_WEBKIT=true ENABLE_MOBILE=true ENABLE_BRANDED=true npm run test:e2e:real
```

## Package.json Scripts

Add these convenience scripts to `frontend/package.json`:

```json
{
  "scripts": {
    "test:e2e:firefox": "ENABLE_FIREFOX=true npm run test:e2e:real",
    "test:e2e:webkit": "ENABLE_WEBKIT=true npm run test:e2e:real",
    "test:e2e:mobile": "ENABLE_MOBILE=true npm run test:e2e:real",
    "test:e2e:all-browsers": "ENABLE_FIREFOX=true ENABLE_WEBKIT=true npm run test:e2e:real",
    "test:e2e:full-suite": "ENABLE_FIREFOX=true ENABLE_WEBKIT=true ENABLE_MOBILE=true ENABLE_BRANDED=true npm run test:e2e:real"
  }
}
```

## CI/CD Configuration

### GitHub Actions Example

```yaml
name: Cross-Browser E2E Tests

on: [push, pull_request]

jobs:
  test-chromium:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install chromium
      - name: Run Chromium tests
        run: npm run test:e2e:real

  test-firefox:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install firefox
      - name: Run Firefox tests
        run: ENABLE_FIREFOX=true npm run test:e2e:real

  test-webkit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install webkit
      - name: Run Webkit tests
        run: ENABLE_WEBKIT=true npm run test:e2e:real
```

## Browser-Specific Considerations

### Firefox

- **Pros**: Good Linux/Docker compatibility
- **Cons**: Slightly slower than Chromium
- **Best For**: Testing Firefox-specific behaviors

### Webkit (Safari)

- **Pros**: Tests Safari-specific behaviors
- **Cons**: Limited Linux support, may fail in Docker
- **Best For**: macOS development environments
- **Issues**: "Target page, context or browser has been closed" errors in Docker

### Mobile Emulation

- **Devices**: Pixel 5 (Android), iPhone 12 (iOS)
- **Best For**: Testing responsive design and touch interactions
- **Note**: Emulation, not real devices

## Troubleshooting

### Webkit Fails in Docker

Webkit tests may fail with context closure errors in Docker/Linux. Solutions:

1. Run Webkit tests only on macOS
2. Disable Webkit in CI for Linux runners
3. Use `slowMo: 50` option (already configured)

### Firefox Not Found

Install Firefox browser:

```bash
npx playwright install firefox
```

### All Browsers Missing

Install all Playwright browsers:

```bash
npx playwright install
```

## Performance Considerations

Running tests across multiple browsers increases execution time:

- **Chromium only**: ~10-15 minutes
- **+ Firefox**: ~20-25 minutes
- **+ Webkit**: ~30-35 minutes
- **+ Mobile**: ~40-50 minutes
- **Full suite**: ~60-90 minutes

**Recommendation**: Run Chromium tests on every commit, full cross-browser suite on:

- Pull requests
- Before releases
- Nightly CI runs

## Selective Browser Testing

Run specific test files with specific browsers:

```bash
# Run document tests on Firefox only
ENABLE_FIREFOX=true npx playwright test tests/e2e/document-management.spec.ts --project=firefox

# Run mobile tests on Mobile Chrome only
ENABLE_MOBILE=true npx playwright test tests/e2e/mobile-responsive.spec.ts --project="Mobile Chrome"
```

## Debugging Cross-Browser Issues

### Run tests in headed mode

```bash
ENABLE_FIREFOX=true npm run test:e2e:headed
```

### Debug specific browser

```bash
ENABLE_WEBKIT=true npm run test:e2e:debug
```

### View traces

```bash
npx playwright show-trace trace.zip
```

## Best Practices

1. **Default to Chromium** for rapid development
2. **Run Firefox** before commits to main branch
3. **Run full suite** before releases
4. **Skip Webkit** in Docker CI environments
5. **Use mobile emulation** for responsive design tests
6. **Monitor test execution time** and adjust CI strategy accordingly

## Environment Variables Summary

| Variable              | Effect                     | Use Case                   |
| --------------------- | -------------------------- | -------------------------- |
| `ENABLE_FIREFOX=true` | Enable Firefox tests       | Cross-browser validation   |
| `ENABLE_WEBKIT=true`  | Enable Webkit/Safari tests | macOS Safari compatibility |
| `ENABLE_MOBILE=true`  | Enable mobile emulation    | Responsive design testing  |
| `ENABLE_BRANDED=true` | Enable Edge/Chrome         | Complete browser coverage  |

## Reporting

Test results for each browser are reported separately in:

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results.json`
- **Allure Report**: Available via `npm run test:e2e:report`

View results for specific browsers:

```bash
npx playwright show-report
```

## Future Enhancements

Planned improvements:

- [ ] BrowserStack/Sauce Labs integration for real device testing
- [ ] Visual regression testing across browsers
- [ ] Automated screenshot comparison
- [ ] Performance metrics comparison across browsers
- [ ] Real mobile device testing (not just emulation)
