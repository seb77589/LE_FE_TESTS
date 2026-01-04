# Frontend Performance Testing

This directory contains frontend performance tests using Lighthouse and Playwright for measuring Core Web Vitals, bundle sizes, and overall page performance.

## Overview

The performance testing infrastructure includes:

1. **Lighthouse CI** - Automated performance audits
2. **Core Web Vitals** - FCP, LCP, CLS, TBT measurements
3. **Bundle Analysis** - JavaScript, CSS, and image size monitoring
4. **Page Load Tests** - Real-world performance measurements

## Quick Start

### Prerequisites

1. **Docker services running**:

   ```bash
   docker compose --env-file config/.env up -d
   ```

2. **Frontend dev server running**:
   ```bash
   npm run dev
   ```

### Running Tests

```bash
# Run all Lighthouse tests
npm run test:lighthouse

# Run with visible browser (for debugging)
npm run test:lighthouse:headed

# Run with Playwright UI
npm run test:lighthouse:ui

# Run Lighthouse CI with configuration
npm run lhci
```

## Test Structure

### `lighthouse.spec.ts`

Comprehensive performance tests organized into three categories:

#### 1. Lighthouse Performance Audits

Tests performance metrics against defined thresholds for:

- Homepage (unauthenticated)
- Login page
- Documents list (authenticated)
- Admin dashboard (authenticated)

**Thresholds:**

- Performance: ≥80%
- Accessibility: ≥90%
- Best Practices: ≥90%
- SEO: ≥90%

#### 2. Core Web Vitals

Measures critical user-centric performance metrics:

| Metric                             | Threshold | Description                  |
| ---------------------------------- | --------- | ---------------------------- |
| **FCP** (First Contentful Paint)   | <1.8s     | When first content renders   |
| **LCP** (Largest Contentful Paint) | <2.5s     | When main content is visible |
| **CLS** (Cumulative Layout Shift)  | <0.1      | Visual stability score       |
| **TBT** (Total Blocking Time)      | <300ms    | Main thread blocking time    |

#### 3. Bundle Size Analysis

Monitors asset sizes against budgets:

| Asset Type | Budget | Current  |
| ---------- | ------ | -------- |
| JavaScript | 500 KB | Measured |
| CSS        | 100 KB | Measured |
| Images     | 500 KB | Measured |
| HTML       | 50 KB  | Measured |
| Fonts      | 200 KB | Measured |

## Configuration

### `.lighthouserc.js`

Lighthouse CI configuration with:

- Test URLs for key pages
- Performance budgets
- Assertion thresholds
- Report generation settings

**Key Settings:**

```javascript
{
  numberOfRuns: 3,              // Run each test 3 times for consistency
  preset: 'desktop',            // Desktop device emulation
  minScore: {
    performance: 0.8,           // 80%+ performance score
    accessibility: 0.9,         // 90%+ accessibility
  }
}
```

### Environment Requirements

- **Node.js**: v18+ (for Lighthouse v12)
- **Chromium**: Installed via Playwright
- **Backend**: Running at `http://localhost:8000`
- **Frontend**: Running at `http://localhost:3000`

## Understanding Results

### Lighthouse Reports

After running tests, HTML and JSON reports are generated in:

```
tests/performance/lighthouse-reports/
```

**Report Contents:**

- Performance score breakdown
- Core Web Vitals metrics
- Opportunities for improvement
- Diagnostics and warnings
- Screenshots and filmstrip

### Reading Scores

| Score  | Performance | Action      |
| ------ | ----------- | ----------- |
| 90-100 | Excellent   | Maintain    |
| 50-89  | Good        | Monitor     |
| 0-49   | Poor        | Investigate |

### Common Issues & Fixes

#### Low Performance Score

**Causes:**

- Large JavaScript bundles
- Unoptimized images
- Render-blocking resources
- Too many network requests

**Fixes:**

- Code splitting with Next.js dynamic imports
- Image optimization with Next/Image
- Font preloading
- Bundle analysis with `npm run build:analyze`

#### Poor FCP/LCP

**Causes:**

- Slow server response time
- Render-blocking CSS/JS
- Large above-the-fold content

**Fixes:**

- Optimize backend API response times
- Inline critical CSS
- Lazy load below-the-fold content
- Use Next.js Image component

#### High CLS

**Causes:**

- Images without dimensions
- Dynamic content injection
- Web fonts causing layout shift

**Fixes:**

- Always specify image dimensions
- Reserve space for dynamic content
- Use `font-display: swap` with fallback fonts

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Lighthouse CI

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lhci
      - uses: actions/upload-artifact@v3
        with:
          name: lighthouse-reports
          path: tests/performance/lighthouse-reports
```

## Performance Budget Enforcement

### Automatic Failures

Tests will fail automatically if:

- Performance score < 80%
- FCP > 2.0s
- LCP > 2.5s
- CLS > 0.1
- TBT > 300ms
- JavaScript bundle > 500KB
- Total page weight > 2MB

### Budget Alerts

Monitor trends over time to prevent performance regressions:

- Track scores in CI/CD pipeline
- Set up alerts for score drops
- Review reports before merging PRs

## Troubleshooting

### Test Timeouts

If tests timeout during authentication:

- Increase waitForURL timeout
- Check backend API response times
- Verify Docker services are healthy

### Port Conflicts

If Chrome debugging port (9222) is in use:

- Change port in test configuration
- Kill existing Chrome processes
- Use different port in launchOptions

### Inconsistent Results

If scores vary between runs:

- Increase numberOfRuns in `.lighthouserc.js`
- Run tests on clean environment
- Check system resource usage
- Disable browser extensions

## Best Practices

### 1. Baseline Before Optimizing

Run tests before making changes:

```bash
npm run test:lighthouse > baseline.txt
```

### 2. Test Realistic Scenarios

- Use authenticated user flows
- Test with realistic data volumes
- Simulate slow networks (3G/4G)

### 3. Monitor Trends

- Track performance over time
- Set up performance dashboards
- Alert on regressions

### 4. Optimize Iteratively

- Fix highest-impact issues first
- Measure after each change
- Document optimizations

## Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Playwright Lighthouse Integration](https://github.com/mxschmitt/playwright-lighthouse)

## Contributing

When adding new performance tests:

1. Add test to `lighthouse.spec.ts`
2. Update thresholds in `.lighthouserc.js`
3. Document test purpose in this README
4. Ensure tests pass in CI/CD
5. Update performance baseline documentation

---

**Last Updated:** 2025-11-25
**Phase:** 3.1 - Frontend Performance Testing
**Status:** ✅ Lighthouse CI Configured
