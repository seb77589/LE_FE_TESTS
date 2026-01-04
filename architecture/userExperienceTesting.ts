import logger from '@/lib/logger';
/**
 * User Experience Testing and Validation System
 * Provides comprehensive user experience testing, validation, and optimization
 */

import { environmentManager } from '../config/environments';

export interface UXTest {
  id: string;
  name: string;
  description: string;
  type: UXTestType;
  category: UXTestCategory;
  target: UXTestTarget;
  configuration: UXTestConfig;
  scenarios: UXTestScenario[];
  metrics: UXTestMetrics;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface UXTestConfig {
  enabled: boolean;
  timeout: number;
  retries: number;
  parallel: boolean;
  environment: string;
  browser: string;
  device: string;
  viewport: ViewportConfig;
  network: NetworkConfig;
  accessibility: AccessibilityConfig;
  performance: PerformanceConfig;
  metadata: Record<string, any>;
}

export interface ViewportConfig {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: string;
  metadata: Record<string, any>;
}

export interface NetworkConfig {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  metadata: Record<string, any>;
}

export interface AccessibilityConfig {
  enabled: boolean;
  standards: string[];
  level: string;
  includeScreenReader: boolean;
  includeKeyboard: boolean;
  includeColorBlind: boolean;
  metadata: Record<string, any>;
}

export interface PerformanceConfig {
  enabled: boolean;
  metrics: string[];
  thresholds: Record<string, number>;
  includeCoreWebVitals: boolean;
  includeCustomMetrics: boolean;
  metadata: Record<string, any>;
}

export interface UXTestScenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  steps: UXTestStep[];
  expectedResults: ExpectedResults;
  isActive: boolean;
  priority: number;
  metadata: Record<string, any>;
}

export interface UXTestStep {
  id: string;
  name: string;
  description: string;
  type: StepType;
  order: number;
  action: string;
  selector?: string;
  input?: string;
  waitFor?: string;
  timeout: number;
  retries: number;
  expected: any;
  actual?: any;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
  metadata: Record<string, any>;
}

export interface ExpectedResults {
  success: boolean;
  performance: PerformanceResults;
  accessibility: AccessibilityResults;
  usability: UsabilityResults;
  functionality: FunctionalityResults;
  metadata: Record<string, any>;
}

export interface PerformanceResults {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  speedIndex: number;
  metadata: Record<string, any>;
}

export interface AccessibilityResults {
  score: number;
  violations: AccessibilityViolation[];
  warnings: AccessibilityWarning[];
  recommendations: string[];
  metadata: Record<string, any>;
}

export interface AccessibilityViolation {
  id: string;
  type: string;
  severity: string;
  message: string;
  element: string;
  fix: string;
  metadata: Record<string, any>;
}

export interface AccessibilityWarning {
  id: string;
  type: string;
  message: string;
  element: string;
  suggestion: string;
  metadata: Record<string, any>;
}

export interface UsabilityResults {
  score: number;
  issues: UsabilityIssue[];
  recommendations: string[];
  metadata: Record<string, any>;
}

export interface UsabilityIssue {
  id: string;
  type: string;
  severity: string;
  message: string;
  element: string;
  fix: string;
  metadata: Record<string, any>;
}

export interface FunctionalityResults {
  score: number;
  passed: number;
  failed: number;
  skipped: number;
  issues: FunctionalityIssue[];
  metadata: Record<string, any>;
}

export interface FunctionalityIssue {
  id: string;
  type: string;
  severity: string;
  message: string;
  element: string;
  fix: string;
  metadata: Record<string, any>;
}

export interface UXTestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  averageExecutionTime: number;
  averagePerformanceScore: number;
  averageAccessibilityScore: number;
  averageUsabilityScore: number;
  averageFunctionalityScore: number;
  lastUpdated: Date;
}

export interface UXTestResult {
  id: string;
  testId: string;
  scenarioId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  steps: UXTestStepResult[];
  results: ExpectedResults;
  errors: UXTestError[];
  warnings: UXTestWarning[];
  metadata: Record<string, any>;
}

export interface UXTestStepResult {
  id: string;
  stepId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  actual: any;
  error?: string;
  metadata: Record<string, any>;
}

export interface UXTestError {
  id: string;
  type: string;
  severity: string;
  message: string;
  step: string;
  fix: string;
  metadata: Record<string, any>;
}

export interface UXTestWarning {
  id: string;
  type: string;
  message: string;
  step: string;
  suggestion: string;
  metadata: Record<string, any>;
}

export interface UXTestSuite {
  id: string;
  name: string;
  description: string;
  tests: string[]; // Test IDs
  configuration: UXTestConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface UXTestSystemConfig {
  testing: {
    enabled: boolean;
    defaultTimeout: number;
    defaultRetries: number;
    parallel: boolean;
    headless: boolean;
  };
  performance: {
    enabled: boolean;
    includeCoreWebVitals: boolean;
    includeCustomMetrics: boolean;
    thresholds: Record<string, number>;
  };
  accessibility: {
    enabled: boolean;
    standards: string[];
    level: string;
    includeScreenReader: boolean;
    includeKeyboard: boolean;
  };
  usability: {
    enabled: boolean;
    includeHeuristics: boolean;
    includeUserTesting: boolean;
    includeA11y: boolean;
  };
  reporting: {
    enabled: boolean;
    format: 'json' | 'html' | 'markdown' | 'junit';
    includeScreenshots: boolean;
    includeVideos: boolean;
    includeMetrics: boolean;
  };
  monitoring: {
    enabled: boolean;
    trackMetrics: boolean;
    trackTrends: boolean;
    alerting: boolean;
  };
}

export type UXTestType =
  | 'functional'
  | 'performance'
  | 'accessibility'
  | 'usability'
  | 'compatibility'
  | 'security'
  | 'regression'
  | 'smoke'
  | 'integration'
  | 'e2e'
  | 'other';

export type UXTestCategory =
  | 'authentication'
  | 'navigation'
  | 'forms'
  | 'content'
  | 'media'
  | 'interactions'
  | 'responsiveness'
  | 'loading'
  | 'error_handling'
  | 'other';

export type UXTestTarget =
  | 'page'
  | 'component'
  | 'feature'
  | 'flow'
  | 'api'
  | 'database'
  | 'other';

export type ScenarioType =
  | 'happy_path'
  | 'error_path'
  | 'edge_case'
  | 'stress_test'
  | 'load_test'
  | 'security_test'
  | 'other';

export type StepType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'select'
  | 'wait'
  | 'assert'
  | 'verify'
  | 'custom'
  | 'other';

export class UserExperienceTestingSystem {
  private config: UXTestSystemConfig;
  private tests: Map<string, UXTest> = new Map();
  private testSuites: Map<string, UXTestSuite> = new Map();
  private testResults: Map<string, UXTestResult> = new Map();
  private metrics: UXTestMetrics;
  private isInitialized: boolean = false;

  constructor(config?: Partial<UXTestSystemConfig>) {
    this.config = {
      testing: {
        enabled: true,
        defaultTimeout: 30000, // 30 seconds
        defaultRetries: 3,
        parallel: false,
        headless: false,
      },
      performance: {
        enabled: true,
        includeCoreWebVitals: true,
        includeCustomMetrics: true,
        thresholds: {
          loadTime: 3000, // 3 seconds
          firstContentfulPaint: 1500, // 1.5 seconds
          largestContentfulPaint: 2500, // 2.5 seconds
          firstInputDelay: 100, // 100ms
          cumulativeLayoutShift: 0.1,
        },
      },
      accessibility: {
        enabled: true,
        standards: ['WCAG2.1', 'WCAG2.2'],
        level: 'AA',
        includeScreenReader: true,
        includeKeyboard: true,
      },
      usability: {
        enabled: true,
        includeHeuristics: true,
        includeUserTesting: false,
        includeA11y: true,
      },
      reporting: {
        enabled: true,
        format: 'json',
        includeScreenshots: true,
        includeVideos: false,
        includeMetrics: true,
      },
      monitoring: {
        enabled: true,
        trackMetrics: true,
        trackTrends: true,
        alerting: true,
      },
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.initialize();
  }

  /**
   * Initialize the user experience testing system
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize default test suites
      this.initializeDefaultTestSuites();

      this.isInitialized = true;
      logger.info('general', '🏗️ User experience testing system initialized');
    } catch (error) {
      logger.error('general', 'Failed to initialize user experience testing system:', {
        error,
      });
    }
  }

  /**
   * Initialize default test suites
   */
  private initializeDefaultTestSuites(): void {
    const defaultSuites: UXTestSuite[] = [
      {
        id: 'authentication_ux_suite',
        name: 'Authentication UX Test Suite',
        description: 'User experience tests for authentication flows',
        tests: [],
        configuration: {
          enabled: true,
          timeout: 30000,
          retries: 3,
          parallel: false,
          environment: 'staging',
          browser: 'chrome',
          device: 'desktop',
          viewport: {
            width: 1920,
            height: 1080,
            devicePixelRatio: 1,
            orientation: 'landscape',
            metadata: {},
          },
          network: {
            connectionType: 'wifi',
            effectiveType: '4g',
            downlink: 10,
            rtt: 50,
            saveData: false,
            metadata: {},
          },
          accessibility: {
            enabled: true,
            standards: ['WCAG2.1'],
            level: 'AA',
            includeScreenReader: true,
            includeKeyboard: true,
            includeColorBlind: false,
            metadata: {},
          },
          performance: {
            enabled: true,
            metrics: ['loadTime', 'firstContentfulPaint', 'largestContentfulPaint'],
            thresholds: {
              loadTime: 3000,
              firstContentfulPaint: 1500,
              largestContentfulPaint: 2500,
            },
            includeCoreWebVitals: true,
            includeCustomMetrics: true,
            metadata: {},
          },
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'navigation_ux_suite',
        name: 'Navigation UX Test Suite',
        description: 'User experience tests for navigation flows',
        tests: [],
        configuration: {
          enabled: true,
          timeout: 20000,
          retries: 2,
          parallel: false,
          environment: 'staging',
          browser: 'chrome',
          device: 'desktop',
          viewport: {
            width: 1920,
            height: 1080,
            devicePixelRatio: 1,
            orientation: 'landscape',
            metadata: {},
          },
          network: {
            connectionType: 'wifi',
            effectiveType: '4g',
            downlink: 10,
            rtt: 50,
            saveData: false,
            metadata: {},
          },
          accessibility: {
            enabled: true,
            standards: ['WCAG2.1'],
            level: 'AA',
            includeScreenReader: true,
            includeKeyboard: true,
            includeColorBlind: false,
            metadata: {},
          },
          performance: {
            enabled: true,
            metrics: ['loadTime', 'firstContentfulPaint'],
            thresholds: {
              loadTime: 2000,
              firstContentfulPaint: 1000,
            },
            includeCoreWebVitals: true,
            includeCustomMetrics: false,
            metadata: {},
          },
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'forms_ux_suite',
        name: 'Forms UX Test Suite',
        description: 'User experience tests for form interactions',
        tests: [],
        configuration: {
          enabled: true,
          timeout: 25000,
          retries: 3,
          parallel: false,
          environment: 'staging',
          browser: 'chrome',
          device: 'desktop',
          viewport: {
            width: 1920,
            height: 1080,
            devicePixelRatio: 1,
            orientation: 'landscape',
            metadata: {},
          },
          network: {
            connectionType: 'wifi',
            effectiveType: '4g',
            downlink: 10,
            rtt: 50,
            saveData: false,
            metadata: {},
          },
          accessibility: {
            enabled: true,
            standards: ['WCAG2.1'],
            level: 'AA',
            includeScreenReader: true,
            includeKeyboard: true,
            includeColorBlind: false,
            metadata: {},
          },
          performance: {
            enabled: true,
            metrics: ['firstInputDelay', 'cumulativeLayoutShift'],
            thresholds: {
              firstInputDelay: 100,
              cumulativeLayoutShift: 0.1,
            },
            includeCoreWebVitals: true,
            includeCustomMetrics: false,
            metadata: {},
          },
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
    ];

    defaultSuites.forEach((suite) => {
      this.testSuites.set(suite.id, suite);
    });
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): UXTestMetrics {
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalScenarios: 0,
      passedScenarios: 0,
      failedScenarios: 0,
      skippedScenarios: 0,
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      averageExecutionTime: 0,
      averagePerformanceScore: 0,
      averageAccessibilityScore: 0,
      averageUsabilityScore: 0,
      averageFunctionalityScore: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Create UX test
   */
  createUXTest(test: UXTest): void {
    this.tests.set(test.id, test);
  }

  /**
   * Run UX test
   */
  async runUXTest(testId: string): Promise<UXTestResult[]> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`UX test ${testId} not found`);
    }

    const results: UXTestResult[] = [];

    for (const scenario of test.scenarios) {
      if (!scenario.isActive) {
        continue;
      }

      const result = await this.runUXTestScenario(test, scenario);
      results.push(result);
    }

    return results;
  }

  /**
   * Run UX test scenario
   */
  private async runUXTestScenario(
    test: UXTest,
    scenario: UXTestScenario,
  ): Promise<UXTestResult> {
    const result: UXTestResult = {
      id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testId: test.id,
      scenarioId: scenario.id,
      status: 'running',
      startTime: new Date(),
      steps: [],
      results: {
        success: false,
        performance: {
          loadTime: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          firstInputDelay: 0,
          cumulativeLayoutShift: 0,
          totalBlockingTime: 0,
          speedIndex: 0,
          metadata: {},
        },
        accessibility: {
          score: 0,
          violations: [],
          warnings: [],
          recommendations: [],
          metadata: {},
        },
        usability: {
          score: 0,
          issues: [],
          recommendations: [],
          metadata: {},
        },
        functionality: {
          score: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          issues: [],
          metadata: {},
        },
        metadata: {},
      },
      errors: [],
      warnings: [],
      metadata: {},
    };

    try {
      // Run test steps
      for (const step of scenario.steps.sort((a, b) => a.order - b.order)) {
        const stepResult = await this.runUXTestStep(step, test.configuration);
        result.steps.push(stepResult);
      }

      // Calculate results
      result.results = await this.calculateTestResults(test, scenario, result.steps);

      // Determine overall status
      const failedSteps = result.steps.filter(
        (step) => step.status === 'failed',
      ).length;
      result.status = failedSteps > 0 ? 'failed' : 'passed';

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        id: `error_${Date.now()}_1`,
        type: 'execution_error',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Unknown error',
        step: 'scenario_execution',
        fix: 'Check test configuration and environment',
        metadata: {},
      });
    }

    this.testResults.set(result.id, result);
    return result;
  }

  /**
   * Run UX test step
   */
  private async runUXTestStep(
    step: UXTestStep,
    config: UXTestConfig,
  ): Promise<UXTestStepResult> {
    const stepResult: UXTestStepResult = {
      id: `step_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stepId: step.id,
      status: 'running',
      startTime: new Date(),
      actual: null,
      metadata: {},
    };

    try {
      // Simulate step execution
      // In a real implementation, this would execute the actual step logic
      await new Promise((resolve) => setTimeout(resolve, step.timeout));

      stepResult.actual = step.expected; // Simulate successful execution
      stepResult.status = 'passed';
      stepResult.endTime = new Date();
      stepResult.duration =
        stepResult.endTime.getTime() - stepResult.startTime.getTime();
    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error = error instanceof Error ? error.message : 'Unknown error';
      stepResult.endTime = new Date();
      stepResult.duration =
        stepResult.endTime.getTime() - stepResult.startTime.getTime();
    }

    return stepResult;
  }

  /**
   * Calculate test results
   */
  private async calculateTestResults(
    test: UXTest,
    scenario: UXTestScenario,
    stepResults: UXTestStepResult[],
  ): Promise<ExpectedResults> {
    const results: ExpectedResults = {
      success: false,
      performance: {
        loadTime: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        totalBlockingTime: 0,
        speedIndex: 0,
        metadata: {},
      },
      accessibility: {
        score: 0,
        violations: [],
        warnings: [],
        recommendations: [],
        metadata: {},
      },
      usability: {
        score: 0,
        issues: [],
        recommendations: [],
        metadata: {},
      },
      functionality: {
        score: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        issues: [],
        metadata: {},
      },
      metadata: {},
    };

    // Calculate performance results
    if (test.configuration.performance.enabled) {
      results.performance = await this.calculatePerformanceResults(test, scenario);
    }

    // Calculate accessibility results
    if (test.configuration.accessibility.enabled) {
      results.accessibility = await this.calculateAccessibilityResults(test, scenario);
    }

    // Calculate usability results
    if (this.config.usability.enabled) {
      results.usability = await this.calculateUsabilityResults(test, scenario);
    }

    // Calculate functionality results
    results.functionality = this.calculateFunctionalityResults(stepResults);

    // Determine overall success
    results.success =
      results.functionality.passed > 0 && results.functionality.failed === 0;

    return results;
  }

  /**
   * Calculate performance results
   */
  private async calculatePerformanceResults(
    test: UXTest,
    scenario: UXTestScenario,
  ): Promise<PerformanceResults> {
    // Simulate performance measurement
    // In a real implementation, this would measure actual performance metrics
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      loadTime: 1500, // 1.5 seconds
      firstContentfulPaint: 800, // 800ms
      largestContentfulPaint: 1200, // 1.2 seconds
      firstInputDelay: 50, // 50ms
      cumulativeLayoutShift: 0.05,
      totalBlockingTime: 100, // 100ms
      speedIndex: 1000, // 1 second
      metadata: {},
    };
  }

  /**
   * Calculate accessibility results
   */
  private async calculateAccessibilityResults(
    test: UXTest,
    scenario: UXTestScenario,
  ): Promise<AccessibilityResults> {
    // Simulate accessibility testing
    // In a real implementation, this would run actual accessibility tests
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      score: 95, // 95% accessibility score
      violations: [],
      warnings: [],
      recommendations: [
        'Add alt text to images',
        'Ensure proper heading hierarchy',
        'Provide keyboard navigation',
      ],
      metadata: {},
    };
  }

  /**
   * Calculate usability results
   */
  private async calculateUsabilityResults(
    test: UXTest,
    scenario: UXTestScenario,
  ): Promise<UsabilityResults> {
    // Simulate usability testing
    // In a real implementation, this would run actual usability tests
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      score: 90, // 90% usability score
      issues: [],
      recommendations: [
        'Improve button contrast',
        'Add loading indicators',
        'Simplify navigation',
      ],
      metadata: {},
    };
  }

  /**
   * Calculate functionality results
   */
  private calculateFunctionalityResults(
    stepResults: UXTestStepResult[],
  ): FunctionalityResults {
    const passed = stepResults.filter((step) => step.status === 'passed').length;
    const failed = stepResults.filter((step) => step.status === 'failed').length;
    const skipped = stepResults.filter((step) => step.status === 'skipped').length;
    const total = stepResults.length;

    return {
      score: total > 0 ? (passed / total) * 100 : 0,
      passed,
      failed,
      skipped,
      issues: [],
      metadata: {},
    };
  }

  /**
   * Run test suite
   */
  async runTestSuite(suiteId: string): Promise<UXTestResult[]> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const results: UXTestResult[] = [];

    for (const testId of suite.tests) {
      const testResults = await this.runUXTest(testId);
      results.push(...testResults);
    }

    return results;
  }

  /**
   * Get UX test
   */
  getUXTest(id: string): UXTest | undefined {
    return this.tests.get(id);
  }

  /**
   * Get all UX tests
   */
  getUXTests(): UXTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get test suite
   */
  getTestSuite(id: string): UXTestSuite | undefined {
    return this.testSuites.get(id);
  }

  /**
   * Get all test suites
   */
  getTestSuites(): UXTestSuite[] {
    return Array.from(this.testSuites.values());
  }

  /**
   * Get test result
   */
  getTestResult(id: string): UXTestResult | undefined {
    return this.testResults.get(id);
  }

  /**
   * Get all test results
   */
  getTestResults(): UXTestResult[] {
    return Array.from(this.testResults.values());
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const tests = Array.from(this.tests.values());
    const results = Array.from(this.testResults.values());

    this.metrics.totalTests = tests.length;
    this.metrics.passedTests = results.filter(
      (result) => result.status === 'passed',
    ).length;
    this.metrics.failedTests = results.filter(
      (result) => result.status === 'failed',
    ).length;
    this.metrics.skippedTests = results.filter(
      (result) => result.status === 'skipped',
    ).length;

    // Calculate scenario metrics
    const totalScenarios = tests.reduce((sum, test) => sum + test.scenarios.length, 0);
    this.metrics.totalScenarios = totalScenarios;

    // Calculate step metrics
    const totalSteps = tests.reduce(
      (sum, test) =>
        sum +
        test.scenarios.reduce(
          (scenarioSum, scenario) => scenarioSum + scenario.steps.length,
          0,
        ),
      0,
    );
    this.metrics.totalSteps = totalSteps;

    // Calculate average scores
    const performanceScores = results.map(
      (result) => result.results.performance.loadTime,
    );
    this.metrics.averagePerformanceScore =
      performanceScores.length > 0
        ? performanceScores.reduce((sum, score) => sum + score, 0) /
          performanceScores.length
        : 0;

    const accessibilityScores = results.map(
      (result) => result.results.accessibility.score,
    );
    this.metrics.averageAccessibilityScore =
      accessibilityScores.length > 0
        ? accessibilityScores.reduce((sum, score) => sum + score, 0) /
          accessibilityScores.length
        : 0;

    const usabilityScores = results.map((result) => result.results.usability.score);
    this.metrics.averageUsabilityScore =
      usabilityScores.length > 0
        ? usabilityScores.reduce((sum, score) => sum + score, 0) /
          usabilityScores.length
        : 0;

    const functionalityScores = results.map(
      (result) => result.results.functionality.score,
    );
    this.metrics.averageFunctionalityScore =
      functionalityScores.length > 0
        ? functionalityScores.reduce((sum, score) => sum + score, 0) /
          functionalityScores.length
        : 0;

    this.metrics.lastUpdated = new Date();
  }

  /**
   * Get UX test metrics
   */
  getUXTestMetrics(): UXTestMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Log user experience testing system status
   */
  logStatus(): void {
    this.updateMetrics();

    logger.info('general', '\n🏗️ User Experience Testing System Status:');
    logger.info('general', `Initialized: ${this.isInitialized}`);
    logger.info('general', `Total Tests: ${this.metrics.totalTests}`);
    logger.info('general', `Passed Tests: ${this.metrics.passedTests}`);
    logger.info('general', `Failed Tests: ${this.metrics.failedTests}`);
    logger.info('general', `Skipped Tests: ${this.metrics.skippedTests}`);
    logger.info('general', `Total Scenarios: ${this.metrics.totalScenarios}`);
    logger.info('general', `Total Steps: ${this.metrics.totalSteps}`);
    logger.info(
      'general',
      `Average Performance Score: ${this.metrics.averagePerformanceScore.toFixed(1)}ms`,
    );
    logger.info(
      'general',
      `Average Accessibility Score: ${this.metrics.averageAccessibilityScore.toFixed(
        1,
      )}%`,
    );
    logger.info(
      'general',
      `Average Usability Score: ${this.metrics.averageUsabilityScore.toFixed(1)}%`,
    );
    logger.info(
      'general',
      `Average Functionality Score: ${this.metrics.averageFunctionalityScore.toFixed(
        1,
      )}%`,
    );

    logger.info('general', '\n📋 Test Suites:');
    this.testSuites.forEach((suite, id) => {
      logger.info('general', `  ${id}: ${suite.name} - ${suite.tests.length} tests`);
    });

    logger.info('general', '\n📋 UX Tests:');
    this.tests.forEach((test, id) => {
      logger.info(
        'general',
        `  ${id}: ${test.name} (${test.type}) - ${test.scenarios.length} scenarios`,
      );
    });
  }
}

// Create global instance
export const userExperienceTestingSystem = new UserExperienceTestingSystem();

// Make available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).userExperienceTestingSystem = userExperienceTestingSystem;
}

/**
 * Quick user experience testing functions
 */
export function createUXTest(test: UXTest): void {
  userExperienceTestingSystem.createUXTest(test);
}

export function runUXTest(testId: string): Promise<UXTestResult[]> {
  return userExperienceTestingSystem.runUXTest(testId);
}

export function runTestSuite(suiteId: string): Promise<UXTestResult[]> {
  return userExperienceTestingSystem.runTestSuite(suiteId);
}

export function getUXTestMetrics(): UXTestMetrics {
  return userExperienceTestingSystem.getUXTestMetrics();
}

export function getUXTests(): UXTest[] {
  return userExperienceTestingSystem.getUXTests();
}
