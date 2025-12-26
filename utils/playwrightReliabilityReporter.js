/**
 * Playwright Custom Reporter for Test Reliability Monitoring
 *
 * Integrates TestReliabilityMonitor with Playwright test runner to automatically
 * track E2E test results, retries, and performance metrics.
 *
 * @module PlaywrightReliabilityReporter
 * @since 0.2.0
 */
import TestReliabilityMonitor from './TestReliabilityMonitor.js';
/**
 * Playwright custom reporter that feeds test results into TestReliabilityMonitor
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * export default defineConfig({
 *   reporter: [
 *     ['list'],
 *     ['./tests/utils/playwrightReliabilityReporter.ts']
 *   ]
 * });
 * ```
 */
class PlaywrightReliabilityReporter {
    constructor() {
        this.monitor = TestReliabilityMonitor;
    }
    /**
     * Called once before running tests
     */
    onBegin(config, suite) {
        // Optional: Clear previous run metrics
        // this.monitor.clearMetrics();
    }
    /**
     * Called when a test starts
     */
    onTestBegin(test) {
        const testFile = test.location.file;
        const testName = test.title;
        this.monitor.startTest(testFile, testName);
    }
    /**
     * Called when a test completes (pass, fail, or skip)
     */
    onTestEnd(test, result) {
        const testFile = test.location.file;
        const testName = test.title;
        let status;
        if (result.status === 'passed') {
            status = 'pass';
        }
        else if (result.status === 'failed') {
            status = 'fail';
        }
        else {
            status = 'skip';
        }
        const retryCount = result.retry || 0;
        const error = result.error ? new Error(result.error.message) : undefined;
        this.monitor.endTest(testFile, testName, status, retryCount, error);
    }
    /**
     * Called when all tests complete
     */
    async onEnd(result) {
        const report = this.monitor.generateReport();
        console.log('\n' + '='.repeat(80));
        console.log('PLAYWRIGHT E2E TEST RELIABILITY REPORT');
        console.log('='.repeat(80));
        console.log(`\nGenerated at: ${report.generatedAt.toISOString()}`);
        console.log(`Total E2E tests tracked: ${report.totalTests}`);
        console.log(`Overall health: ${report.overallHealth.toUpperCase()}`);
        if (report.flakyTests.length > 0) {
            console.log(`\n⚠️  FLAKY E2E TESTS (${report.flakyTests.length}):`);
            console.log('   These tests pass sometimes and fail sometimes against the real Docker backend.\n');
            report.flakyTests.slice(0, 10).forEach((test, idx) => {
                console.log(`${idx + 1}. ${test.testName}`);
                console.log(`   File: ${test.testFile}`);
                console.log(`   Flakiness: ${(test.flakinessRate * 100).toFixed(1)}% (${test.failedRuns}/${test.totalRuns} runs)`);
                console.log(`   ${test.recommendation}\n`);
            });
        }
        if (report.slowTests.length > 0) {
            console.log(`\n🐌 SLOW E2E TESTS (${report.slowTests.length}):`);
            console.log('   These tests take significantly longer than the median test duration.\n');
            report.slowTests.slice(0, 10).forEach((test, idx) => {
                console.log(`${idx + 1}. ${test.testName}`);
                console.log(`   File: ${test.testFile}`);
                console.log(`   Average: ${(test.averageDuration / 1000).toFixed(2)}s | Max: ${(test.maxDuration / 1000).toFixed(2)}s`);
                console.log(`   Slowness: ${test.slownessFactor.toFixed(1)}x median\n`);
            });
        }
        if (report.failingTests.length > 0) {
            console.log(`\n❌ CONSISTENTLY FAILING E2E TESTS (${report.failingTests.length}):`);
            console.log('   These tests have failed multiple times in a row - likely real issues.\n');
            report.failingTests.forEach((test, idx) => {
                console.log(`${idx + 1}. ${test.testName}`);
                console.log(`   File: ${test.testFile}`);
                console.log(`   Consecutive failures: ${test.consecutiveFailures}`);
                console.log(`   Last failure: ${test.lastFailureTimestamp.toISOString()}`);
                console.log(`   Error: ${test.lastErrorMessage}\n`);
            });
        }
        if (report.flakyTests.length === 0 && report.failingTests.length === 0) {
            console.log('\n✅ All E2E tests are stable! No flakiness or consistent failures detected.');
        }
        console.log('\n' + '='.repeat(80));
        console.log('RECOMMENDATIONS FOR DOCKER-BACKED TESTS:');
        console.log('='.repeat(80));
        console.log('1. For flaky tests: Increase wait timeouts or add explicit wait conditions');
        console.log('2. For slow tests: Optimize database queries or reduce test scope');
        console.log('3. For failing tests: Check Docker service health and logs');
        console.log('4. Monitor backend logs: docker compose logs -f backend');
        console.log('5. Check database state: docker exec -it legalease-db psql -U ...');
        console.log('='.repeat(80) + '\n');
        // Export to file if path specified
        if (process.env.E2E_RELIABILITY_REPORT_PATH) {
            await this.monitor.exportReport(process.env.E2E_RELIABILITY_REPORT_PATH);
            console.log(`📊 Full E2E report exported to: ${process.env.E2E_RELIABILITY_REPORT_PATH}\n`);
        }
    }
}
export default PlaywrightReliabilityReporter;
