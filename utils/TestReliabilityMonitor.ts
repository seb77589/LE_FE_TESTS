/**
 * Test Reliability Monitor - Production-grade test monitoring for Docker-backed tests
 * 
 * Tracks test flakiness, retry patterns, and performance metrics for integration
 * and E2E tests running against real Docker containers.
 * 
 * @module TestReliabilityMonitor
 * @since 0.2.0
 */

export interface TestResult {
  testName: string;
  testFile: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  timestamp: Date;
  retryCount: number;
  errorMessage?: string;
  errorStack?: string;
}

export interface TestMetrics {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  flakinessRate: number; // 0-1, where 0 is never flaky, 1 is always flaky
  lastFailureTimestamp?: Date;
  consecutiveFailures: number;
}

export interface ReliabilityReport {
  generatedAt: Date;
  totalTests: number;
  flakyTests: TestFlakiness[];
  slowTests: TestPerformance[];
  failingTests: TestFailure[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TestFlakiness {
  testName: string;
  testFile: string;
  flakinessRate: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  recommendation: string;
}

export interface TestPerformance {
  testName: string;
  testFile: string;
  averageDuration: number;
  maxDuration: number;
  slownessFactor: number; // how many times slower than median
}

export interface TestFailure {
  testName: string;
  testFile: string;
  consecutiveFailures: number;
  lastFailureTimestamp: Date;
  lastErrorMessage: string;
}

/**
 * Test Reliability Monitor - Tracks test health metrics for Docker-backed tests
 * 
 * Features:
 * - Flakiness detection (tests that pass sometimes, fail sometimes)
 * - Retry tracking (how many retries before success/failure)
 * - Performance monitoring (duration tracking and slowness detection)
 * - Failure pattern analysis (consecutive failures, error clustering)
 * - Comprehensive reporting (health score, recommendations)
 * 
 * @example
 * ```typescript
 * // In test setup
 * const monitor = TestReliabilityMonitor.getInstance();
 * monitor.startTest('user-login.spec.ts', 'should login successfully');
 * 
 * // In test teardown
 * monitor.endTest(
 *   'user-login.spec.ts',
 *   'should login successfully',
 *   testStatus,
 *   retryCount
 * );
 * 
 * // Generate report
 * const report = monitor.generateReport();
 * console.log(JSON.stringify(report, null, 2));
 * ```
 */
export class TestReliabilityMonitor {
  private static instance: TestReliabilityMonitor;
  private testMetrics: Map<string, TestMetrics> = new Map();
  private testResults: TestResult[] = [];
  private currentTest: Map<string, { startTime: number }> = new Map();

  // Configuration
  private readonly FLAKINESS_THRESHOLD = 0.2; // 20% failure rate = flaky
  private readonly SLOW_TEST_THRESHOLD = 30000; // 30 seconds
  private readonly MAX_RESULTS_STORED = 1000; // Limit memory usage
  private readonly CONSECUTIVE_FAILURE_THRESHOLD = 3;

  private constructor() {
    // Singleton pattern
  }

  /**
   * Get singleton instance of TestReliabilityMonitor
   */
  public static getInstance(): TestReliabilityMonitor {
    if (!TestReliabilityMonitor.instance) {
      TestReliabilityMonitor.instance = new TestReliabilityMonitor();
    }
    return TestReliabilityMonitor.instance;
  }

  /**
   * Start tracking a test
   * 
   * @param testFile - File path of the test
   * @param testName - Name of the test
   */
  public startTest(testFile: string, testName: string): void {
    const key = this.getTestKey(testFile, testName);
    this.currentTest.set(key, { startTime: Date.now() });
  }

  /**
   * End test tracking and record result
   * 
   * @param testFile - File path of the test
   * @param testName - Name of the test
   * @param status - Test result status
   * @param retryCount - Number of retries before final result (default: 0)
   * @param error - Error object if test failed
   */
  public endTest(
    testFile: string,
    testName: string,
    status: 'pass' | 'fail' | 'skip',
    retryCount: number = 0,
    error?: Error
  ): void {
    const key = this.getTestKey(testFile, testName);
    const testStart = this.currentTest.get(key);

    if (!testStart) {
      console.warn(`[TestReliabilityMonitor] No start time found for test: ${key}`);
      return;
    }

    const duration = Date.now() - testStart.startTime;
    this.currentTest.delete(key);

    // Record test result
    const result: TestResult = {
      testName,
      testFile,
      status,
      duration,
      timestamp: new Date(),
      retryCount,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };

    this.testResults.push(result);

    // Limit stored results to prevent memory issues
    if (this.testResults.length > this.MAX_RESULTS_STORED) {
      this.testResults.shift(); // Remove oldest result
    }

    // Update metrics
    this.updateMetrics(key, result);
  }

  /**
   * Update test metrics based on new result
   */
  private updateMetrics(testKey: string, result: TestResult): void {
    let metrics = this.testMetrics.get(testKey);

    if (!metrics) {
      metrics = {
        totalRuns: 0,
        passedRuns: 0,
        failedRuns: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        flakinessRate: 0,
        consecutiveFailures: 0,
      };
      this.testMetrics.set(testKey, metrics);
    }

    // Update run counts
    metrics.totalRuns++;
    if (result.status === 'pass') {
      metrics.passedRuns++;
      metrics.consecutiveFailures = 0; // Reset on success
    } else if (result.status === 'fail') {
      metrics.failedRuns++;
      metrics.consecutiveFailures++;
      metrics.lastFailureTimestamp = result.timestamp;
    }

    // Update duration metrics
    metrics.minDuration = Math.min(metrics.minDuration, result.duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, result.duration);
    
    // Calculate rolling average duration
    const previousAverage = metrics.averageDuration;
    metrics.averageDuration =
      (previousAverage * (metrics.totalRuns - 1) + result.duration) / metrics.totalRuns;

    // Calculate flakiness rate (percentage of runs that failed)
    metrics.flakinessRate = metrics.failedRuns / metrics.totalRuns;
  }

  /**
   * Generate comprehensive reliability report
   * 
   * @returns Reliability report with flaky tests, slow tests, and health score
   */
  public generateReport(): ReliabilityReport {
    const flakyTests: TestFlakiness[] = [];
    const slowTests: TestPerformance[] = [];
    const failingTests: TestFailure[] = [];

    // Calculate median duration for slowness comparison
    const allDurations = Array.from(this.testMetrics.values()).map(m => m.averageDuration);
    const medianDuration = this.calculateMedian(allDurations);

    // Analyze each test
    for (const [testKey, metrics] of this.testMetrics.entries()) {
      const [testFile, testName] = this.parseTestKey(testKey);

      // Check for flakiness
      if (metrics.flakinessRate >= this.FLAKINESS_THRESHOLD && metrics.totalRuns >= 5) {
        flakyTests.push({
          testName,
          testFile,
          flakinessRate: metrics.flakinessRate,
          totalRuns: metrics.totalRuns,
          passedRuns: metrics.passedRuns,
          failedRuns: metrics.failedRuns,
          recommendation: this.getFlakinessRecommendation(metrics.flakinessRate),
        });
      }

      // Check for slowness
      if (metrics.averageDuration > this.SLOW_TEST_THRESHOLD) {
        slowTests.push({
          testName,
          testFile,
          averageDuration: metrics.averageDuration,
          maxDuration: metrics.maxDuration,
          slownessFactor: metrics.averageDuration / medianDuration,
        });
      }

      // Check for consecutive failures
      if (metrics.consecutiveFailures >= this.CONSECUTIVE_FAILURE_THRESHOLD) {
        failingTests.push({
          testName,
          testFile,
          consecutiveFailures: metrics.consecutiveFailures,
          lastFailureTimestamp: metrics.lastFailureTimestamp!,
          lastErrorMessage: this.getLastErrorMessage(testFile, testName),
        });
      }
    }

    // Sort by severity
    flakyTests.sort((a, b) => b.flakinessRate - a.flakinessRate);
    slowTests.sort((a, b) => b.slownessFactor - a.slownessFactor);
    failingTests.sort((a, b) => b.consecutiveFailures - a.consecutiveFailures);

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(flakyTests, failingTests);

    return {
      generatedAt: new Date(),
      totalTests: this.testMetrics.size,
      flakyTests,
      slowTests,
      failingTests,
      overallHealth,
    };
  }

  /**
   * Get flakiness recommendation based on rate
   */
  private getFlakinessRecommendation(flakinessRate: number): string {
    if (flakinessRate >= 0.5) {
      return 'CRITICAL: Test is highly unstable. Consider disabling or rewriting.';
    } else if (flakinessRate >= 0.3) {
      return 'HIGH: Add wait conditions, increase timeouts, or check for race conditions.';
    } else {
      return 'MEDIUM: Monitor closely. May need minor adjustments to selectors or waits.';
    }
  }

  /**
   * Calculate overall test suite health
   */
  private calculateOverallHealth(
    flakyTests: TestFlakiness[],
    failingTests: TestFailure[]
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const flakyCount = flakyTests.length;
    const failingCount = failingTests.length;
    const totalTests = this.testMetrics.size;

    const flakyPercentage = flakyCount / totalTests;
    const failingPercentage = failingCount / totalTests;

    if (flakyPercentage === 0 && failingPercentage === 0) {
      return 'excellent';
    } else if (flakyPercentage < 0.05 && failingPercentage < 0.05) {
      return 'good';
    } else if (flakyPercentage < 0.15 && failingPercentage < 0.15) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Get last error message for a test
   */
  private getLastErrorMessage(testFile: string, testName: string): string {
    const key = this.getTestKey(testFile, testName);
    const relevantResults = this.testResults
      .filter(r => this.getTestKey(r.testFile, r.testName) === key && r.status === 'fail')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return relevantResults[0]?.errorMessage || 'Unknown error';
  }

  /**
   * Calculate median value from array
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Generate test key from file and name
   */
  private getTestKey(testFile: string, testName: string): string {
    return `${testFile}::${testName}`;
  }

  /**
   * Parse test key back to file and name
   */
  private parseTestKey(testKey: string): [string, string] {
    const [testFile, testName] = testKey.split('::');
    return [testFile, testName];
  }

  /**
   * Export metrics to JSON file
   * 
   * @param filePath - Path to save JSON report
   */
  public async exportReport(filePath: string): Promise<void> {
    const report = this.generateReport();
    const fs = await import('node:fs/promises');
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * Clear all stored metrics (useful for testing)
   */
  public clearMetrics(): void {
    this.testMetrics.clear();
    this.testResults = [];
    this.currentTest.clear();
  }

  /**
   * Get metrics for a specific test
   * 
   * @param testFile - File path of the test
   * @param testName - Name of the test
   * @returns Test metrics or undefined if not found
   */
  public getTestMetrics(testFile: string, testName: string): TestMetrics | undefined {
    const key = this.getTestKey(testFile, testName);
    return this.testMetrics.get(key);
  }
}

// Export singleton instance
export default TestReliabilityMonitor.getInstance();
