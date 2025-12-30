/**
 * Jest Custom Reporter for Test Reliability Monitoring
 *
 * Integrates TestReliabilityMonitor with Jest test runner to automatically
 * track test results, retries, and performance metrics.
 *
 * @module JestReliabilityReporter
 * @since 0.2.0
 */

import type { Reporter, Test, TestResult, AggregatedResult } from '@jest/reporters';
import TestReliabilityMonitor, {
  type TestFlakiness,
  type TestPerformance,
  type TestFailure,
} from './TestReliabilityMonitor.js';

/**
 * Jest custom reporter that feeds test results into TestReliabilityMonitor
 *
 * Usage in jest.config.js:
 * ```javascript
 * module.exports = {
 *   reporters: [
 *     'default',
 *     '<rootDir>/tests/utils/jestReliabilityReporter.ts'
 *   ]
 * };
 * ```
 */
class JestReliabilityReporter implements Reporter {
  private monitor: typeof TestReliabilityMonitor;

  constructor() {
    this.monitor = TestReliabilityMonitor;
  }

  /**
   * Called when a test starts
   */
  onTestStart(test: Test): void {
    // Jest doesn't provide test name at onTestStart, so we handle this in onTestResult
  }

  /**
   * Called when a test completes (pass, fail, or skip)
   */
  onTestResult(
    test: Test,
    testResult: TestResult,
    _aggregatedResult: AggregatedResult,
  ): void {
    const testFile = test.path;

    // Process each test case result
    testResult.testResults.forEach((result) => {
      const testName = result.fullName || result.title;
      let status: 'pass' | 'fail' | 'skip';
      if (result.status === 'passed') {
        status = 'pass';
      } else if (result.status === 'failed') {
        status = 'fail';
      } else {
        status = 'skip';
      }
      const retryCount = (result.invocations || 1) - 1; // invocations includes initial run

      // Record test result
      // Note: We don't call startTest because Jest doesn't provide that hook
      // Instead, we simulate it by using the duration
      this.monitor.startTest(testFile, testName);

      // Simulate duration by waiting (not ideal but works with Jest's timing)
      setTimeout(() => {
        this.monitor.endTest(
          testFile,
          testName,
          status,
          retryCount,
          result.failureMessages[0] ? new Error(result.failureMessages[0]) : undefined,
        );
      }, 0);
    });
  }

  /**
   * Called when all tests complete
   */
  async onRunComplete(): Promise<void> {
    const report = this.monitor.generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('TEST RELIABILITY REPORT');
    console.log('='.repeat(80));
    console.log(`\nGenerated at: ${report.generatedAt.toISOString()}`);
    console.log(`Total tests tracked: ${report.totalTests}`);
    console.log(`Overall health: ${report.overallHealth.toUpperCase()}`);

    if (report.flakyTests.length > 0) {
      console.log(`\n⚠️  FLAKY TESTS (${report.flakyTests.length}):`);
      report.flakyTests.slice(0, 10).forEach((test: TestFlakiness, idx: number) => {
        console.log(`\n${idx + 1}. ${test.testName}`);
        console.log(`   File: ${test.testFile}`);
        console.log(
          `   Flakiness: ${(test.flakinessRate * 100).toFixed(1)}% (${test.failedRuns}/${test.totalRuns} runs)`,
        );
        console.log(`   Recommendation: ${test.recommendation}`);
      });
    }

    if (report.slowTests.length > 0) {
      console.log(`\n🐌 SLOW TESTS (${report.slowTests.length}):`);
      report.slowTests.slice(0, 10).forEach((test: TestPerformance, idx: number) => {
        console.log(`\n${idx + 1}. ${test.testName}`);
        console.log(`   File: ${test.testFile}`);
        console.log(
          `   Average duration: ${(test.averageDuration / 1000).toFixed(2)}s`,
        );
        console.log(`   Slowness factor: ${test.slownessFactor.toFixed(1)}x median`);
      });
    }

    if (report.failingTests.length > 0) {
      console.log(`\n❌ CONSISTENTLY FAILING TESTS (${report.failingTests.length}):`);
      report.failingTests.forEach((test: TestFailure, idx: number) => {
        console.log(`\n${idx + 1}. ${test.testName}`);
        console.log(`   File: ${test.testFile}`);
        console.log(`   Consecutive failures: ${test.consecutiveFailures}`);
        console.log(`   Last failure: ${test.lastFailureTimestamp.toISOString()}`);
        console.log(`   Error: ${test.lastErrorMessage}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Optionally export to file
    if (process.env.TEST_RELIABILITY_REPORT_PATH) {
      await this.monitor.exportReport(process.env.TEST_RELIABILITY_REPORT_PATH);
      console.log(
        `📊 Full report exported to: ${process.env.TEST_RELIABILITY_REPORT_PATH}\n`,
      );
    }
  }
}

export default JestReliabilityReporter;
