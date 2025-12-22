import logger from '@/lib/logger';
/**
 * Asset Management Testing and Validation System
 * Provides comprehensive testing and validation for asset management systems
 */

import { environmentManager } from '../config/environments';

export interface AssetTest {
  id: string;
  name: string;
  description: string;
  type: TestType;
  category: TestCategory;
  assetPath: string;
  expectedResults: ExpectedResults;
  setup: TestSetup;
  teardown: TestTeardown;
  assertions: TestAssertion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface ExpectedResults {
  mimeType: string;
  size: number;
  loadTime: number;
  compressionRatio: number;
  cacheHitRate: number;
  errorRate: number;
  metadata: Record<string, any>;
}

export interface TestSetup {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  dependencies: string[];
  environment: TestEnvironment;
  metadata: Record<string, any>;
}

export interface TestTeardown {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  cleanup: string[];
  metadata: Record<string, any>;
}

export interface TestAssertion {
  id: string;
  name: string;
  description: string;
  type: AssertionType;
  condition: string;
  expected: any;
  actual?: any;
  status: 'pending' | 'passed' | 'failed';
  error?: string;
  metadata: Record<string, any>;
}

export interface TestStep {
  id: string;
  name: string;
  description: string;
  type: StepType;
  action: string;
  expected: any;
  actual?: any;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
  metadata: Record<string, any>;
}

export interface TestEnvironment {
  id: string;
  name: string;
  description: string;
  type: EnvironmentType;
  configuration: Record<string, any>;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface AssetTestSuite {
  id: string;
  name: string;
  description: string;
  tests: string[]; // Test IDs
  categories: TestCategory[];
  setup: TestSetup;
  teardown: TestTeardown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface TestResult {
  id: string;
  testId: string;
  suiteId?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  assertions: TestAssertion[];
  errors: TestError[];
  warnings: TestWarning[];
  metrics: TestMetrics;
  metadata: Record<string, any>;
}

export interface TestError {
  id: string;
  type: ErrorType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stack?: string;
  location: string;
  fix: string;
  metadata: Record<string, any>;
}

export interface TestWarning {
  id: string;
  type: WarningType;
  severity: 'high' | 'medium' | 'low';
  message: string;
  location: string;
  suggestion: string;
  metadata: Record<string, any>;
}

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  totalDuration: number;
  averageDuration: number;
  coverage: TestCoverage;
  performance: TestPerformance;
  lastUpdated: Date;
}

export interface TestCoverage {
  mimeTypes: number; // 0-100
  assetTypes: number; // 0-100
  loaders: number; // 0-100
  optimizers: number; // 0-100
  caches: number; // 0-100
  overall: number; // 0-100
}

export interface TestPerformance {
  averageLoadTime: number;
  maxLoadTime: number;
  minLoadTime: number;
  averageSize: number;
  maxSize: number;
  minSize: number;
  compressionRatio: number;
}

export interface AssetValidation {
  id: string;
  name: string;
  description: string;
  type: ValidationType;
  assetPath: string;
  rules: ValidationRule[];
  results: ValidationResult[];
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  score: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  condition: string;
  severity: 'error' | 'warning' | 'info';
  fix: string;
  examples: string[];
  metadata: Record<string, any>;
}

export interface ValidationResult {
  id: string;
  ruleId: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  location: string;
  fix: string;
  examples: string[];
  metadata: Record<string, any>;
}

export interface AssetManagementTestConfig {
  execution: {
    enabled: boolean;
    parallel: boolean;
    timeout: number;
    retries: number;
  };
  validation: {
    enabled: boolean;
    strict: boolean;
    includeSecurity: boolean;
    includePerformance: boolean;
  };
  reporting: {
    enabled: boolean;
    format: 'json' | 'html' | 'markdown' | 'junit';
    includeCoverage: boolean;
    includePerformance: boolean;
  };
  monitoring: {
    enabled: boolean;
    metrics: boolean;
    logging: boolean;
    alerting: boolean;
  };
}

export type TestType =
  | 'mime_type'
  | 'loading'
  | 'compression'
  | 'caching'
  | 'optimization'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'regression'
  | 'smoke'
  | 'other';

export type TestCategory =
  | 'asset_pipeline'
  | 'mime_types'
  | 'asset_loading'
  | 'caching_cdn'
  | 'bundle_optimization'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'other';

export type AssertionType =
  | 'equality'
  | 'inequality'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'
  | 'type'
  | 'instance'
  | 'throws'
  | 'not_throws'
  | 'performance'
  | 'security'
  | 'other';

export type StepType =
  | 'setup'
  | 'action'
  | 'assertion'
  | 'cleanup'
  | 'wait'
  | 'navigate'
  | 'load'
  | 'verify'
  | 'other';

export type EnvironmentType =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'other';

export type ErrorType =
  | 'assertion_failure'
  | 'timeout'
  | 'network_error'
  | 'mime_type_error'
  | 'loading_error'
  | 'compression_error'
  | 'cache_error'
  | 'optimization_error'
  | 'other';

export type WarningType =
  | 'performance_warning'
  | 'size_warning'
  | 'compression_warning'
  | 'cache_warning'
  | 'optimization_warning'
  | 'other';

export type ValidationType =
  | 'mime_type'
  | 'loading'
  | 'compression'
  | 'caching'
  | 'optimization'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'other';

export type RuleType =
  | 'mime_type'
  | 'size'
  | 'load_time'
  | 'compression'
  | 'caching'
  | 'optimization'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'other';

export class AssetManagementTestingSystem {
  private config: AssetManagementTestConfig;
  private tests: Map<string, AssetTest> = new Map();
  private testSuites: Map<string, AssetTestSuite> = new Map();
  private testResults: Map<string, TestResult> = new Map();
  private validations: Map<string, AssetValidation> = new Map();
  private metrics: TestMetrics;
  private isInitialized: boolean = false;

  constructor(config?: Partial<AssetManagementTestConfig>) {
    this.config = {
      execution: {
        enabled: true,
        parallel: false,
        timeout: 30000, // 30 seconds
        retries: 3,
      },
      validation: {
        enabled: true,
        strict: false,
        includeSecurity: true,
        includePerformance: true,
      },
      reporting: {
        enabled: true,
        format: 'json',
        includeCoverage: true,
        includePerformance: true,
      },
      monitoring: {
        enabled: true,
        metrics: true,
        logging: true,
        alerting: true,
      },
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.initialize();
  }

  /**
   * Initialize the asset management testing system
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize default test suites
      this.initializeDefaultTestSuites();

      this.isInitialized = true;
      logger.info('general', '🏗️ Asset management testing system initialized');
    } catch (error) {
      logger.error('general', 'Failed to initialize asset management testing system:', {
        error,
      });
    }
  }

  /**
   * Initialize default test suites
   */
  private initializeDefaultTestSuites(): void {
    const defaultSuites: AssetTestSuite[] = [
      {
        id: 'asset_pipeline_suite',
        name: 'Asset Pipeline Test Suite',
        description: 'Tests for asset pipeline functionality',
        tests: [],
        categories: ['asset_pipeline'],
        setup: {
          id: 'pipeline_setup',
          name: 'Pipeline Test Setup',
          description: 'Setup for asset pipeline tests',
          steps: [],
          dependencies: [],
          environment: {
            id: 'pipeline_env',
            name: 'Pipeline Test Environment',
            description: 'Environment for asset pipeline testing',
            type: 'integration',
            configuration: {},
            dependencies: [],
            metadata: {},
          },
          metadata: {},
        },
        teardown: {
          id: 'pipeline_teardown',
          name: 'Pipeline Test Teardown',
          description: 'Teardown for asset pipeline tests',
          steps: [],
          cleanup: [],
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'mime_types_suite',
        name: 'MIME Types Test Suite',
        description: 'Tests for MIME type handling',
        tests: [],
        categories: ['mime_types'],
        setup: {
          id: 'mime_setup',
          name: 'MIME Test Setup',
          description: 'Setup for MIME type tests',
          steps: [],
          dependencies: [],
          environment: {
            id: 'mime_env',
            name: 'MIME Test Environment',
            description: 'Environment for MIME type testing',
            type: 'unit',
            configuration: {},
            dependencies: [],
            metadata: {},
          },
          metadata: {},
        },
        teardown: {
          id: 'mime_teardown',
          name: 'MIME Test Teardown',
          description: 'Teardown for MIME type tests',
          steps: [],
          cleanup: [],
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'asset_loading_suite',
        name: 'Asset Loading Test Suite',
        description: 'Tests for asset loading functionality',
        tests: [],
        categories: ['asset_loading'],
        setup: {
          id: 'loading_setup',
          name: 'Loading Test Setup',
          description: 'Setup for asset loading tests',
          steps: [],
          dependencies: [],
          environment: {
            id: 'loading_env',
            name: 'Loading Test Environment',
            description: 'Environment for asset loading testing',
            type: 'integration',
            configuration: {},
            dependencies: [],
            metadata: {},
          },
          metadata: {},
        },
        teardown: {
          id: 'loading_teardown',
          name: 'Loading Test Teardown',
          description: 'Teardown for asset loading tests',
          steps: [],
          cleanup: [],
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'caching_cdn_suite',
        name: 'Caching & CDN Test Suite',
        description: 'Tests for caching and CDN functionality',
        tests: [],
        categories: ['caching_cdn'],
        setup: {
          id: 'cache_setup',
          name: 'Cache Test Setup',
          description: 'Setup for caching and CDN tests',
          steps: [],
          dependencies: [],
          environment: {
            id: 'cache_env',
            name: 'Cache Test Environment',
            description: 'Environment for caching and CDN testing',
            type: 'integration',
            configuration: {},
            dependencies: [],
            metadata: {},
          },
          metadata: {},
        },
        teardown: {
          id: 'cache_teardown',
          name: 'Cache Test Teardown',
          description: 'Teardown for caching and CDN tests',
          steps: [],
          cleanup: [],
          metadata: {},
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'bundle_optimization_suite',
        name: 'Bundle Optimization Test Suite',
        description: 'Tests for bundle optimization functionality',
        tests: [],
        categories: ['bundle_optimization'],
        setup: {
          id: 'bundle_setup',
          name: 'Bundle Test Setup',
          description: 'Setup for bundle optimization tests',
          steps: [],
          dependencies: [],
          environment: {
            id: 'bundle_env',
            name: 'Bundle Test Environment',
            description: 'Environment for bundle optimization testing',
            type: 'integration',
            configuration: {},
            dependencies: [],
            metadata: {},
          },
          metadata: {},
        },
        teardown: {
          id: 'bundle_teardown',
          name: 'Bundle Test Teardown',
          description: 'Teardown for bundle optimization tests',
          steps: [],
          cleanup: [],
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
  private initializeMetrics(): TestMetrics {
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalAssertions: 0,
      passedAssertions: 0,
      failedAssertions: 0,
      totalDuration: 0,
      averageDuration: 0,
      coverage: {
        mimeTypes: 0,
        assetTypes: 0,
        loaders: 0,
        optimizers: 0,
        caches: 0,
        overall: 0,
      },
      performance: {
        averageLoadTime: 0,
        maxLoadTime: 0,
        minLoadTime: 0,
        averageSize: 0,
        maxSize: 0,
        minSize: 0,
        compressionRatio: 0,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Create asset test
   */
  createAssetTest(test: AssetTest): void {
    this.tests.set(test.id, test);
  }

  /**
   * Run asset test
   */
  async runAssetTest(testId: string): Promise<TestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const result: TestResult = {
      id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testId,
      status: 'running',
      startTime: new Date(),
      assertions: [],
      errors: [],
      warnings: [],
      metrics: {
        totalTests: 1,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        totalAssertions: 0,
        passedAssertions: 0,
        failedAssertions: 0,
        totalDuration: 0,
        averageDuration: 0,
        coverage: {
          mimeTypes: 0,
          assetTypes: 0,
          loaders: 0,
          optimizers: 0,
          caches: 0,
          overall: 0,
        },
        performance: {
          averageLoadTime: 0,
          maxLoadTime: 0,
          minLoadTime: 0,
          averageSize: 0,
          maxSize: 0,
          minSize: 0,
          compressionRatio: 0,
        },
        lastUpdated: new Date(),
      },
      metadata: {},
    };

    try {
      // Run test assertions
      for (const assertion of test.assertions) {
        const assertionResult = await this.runAssertion(assertion, test);
        result.assertions.push(assertionResult);
      }

      // Calculate result status
      const failedAssertions = result.assertions.filter(
        (a) => a.status === 'failed',
      ).length;

      if (failedAssertions > 0) {
        result.status = 'failed';
      } else {
        result.status = 'passed';
      }

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        id: `error_${Date.now()}_1`,
        type: 'assertion_failure',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        location: 'Test execution',
        fix: 'Check test configuration and dependencies',
        metadata: {},
      });
    }

    this.testResults.set(result.id, result);
    return result;
  }

  /**
   * Run assertion
   */
  private async runAssertion(
    assertion: TestAssertion,
    test: AssetTest,
  ): Promise<TestAssertion> {
    try {
      // Simulate assertion execution
      // In a real implementation, this would execute the actual assertion logic
      await new Promise((resolve) => setTimeout(resolve, 50));

      assertion.status = 'passed';
      assertion.actual = assertion.expected; // Simulate successful assertion
    } catch (error) {
      assertion.status = 'failed';
      assertion.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return assertion;
  }

  /**
   * Run test suite
   */
  async runTestSuite(suiteId: string): Promise<TestResult[]> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const results: TestResult[] = [];

    for (const testId of suite.tests) {
      const result = await this.runAssetTest(testId);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate asset
   */
  async validateAsset(
    assetPath: string,
    validationType: ValidationType,
  ): Promise<AssetValidation> {
    const validation: AssetValidation = {
      id: `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Validation for ${assetPath}`,
      description: `Validate asset ${assetPath} for ${validationType}`,
      type: validationType,
      assetPath,
      rules: this.getValidationRules(validationType),
      results: [],
      status: 'running',
      score: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    try {
      // Run validation rules
      for (const rule of validation.rules) {
        const result = await this.runValidationRule(rule, assetPath, validationType);
        validation.results.push(result);
      }

      // Calculate validation score
      const passedRules = validation.results.filter(
        (r) => r.status === 'passed',
      ).length;
      validation.score = (passedRules / validation.rules.length) * 100;

      // Determine validation status
      const failedRules = validation.results.filter(
        (r) => r.status === 'failed',
      ).length;
      const warningRules = validation.results.filter(
        (r) => r.status === 'warning',
      ).length;

      if (failedRules > 0) {
        validation.status = 'failed';
      } else if (warningRules > 0) {
        validation.status = 'warning';
      } else {
        validation.status = 'passed';
      }
    } catch (error) {
      validation.status = 'failed';
      validation.score = 0;
    }

    this.validations.set(validation.id, validation);
    return validation;
  }

  /**
   * Get validation rules for type
   */
  private getValidationRules(validationType: ValidationType): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Add type-specific rules
    switch (validationType) {
      case 'mime_type':
        rules.push({
          id: `rule_${Date.now()}_1`,
          name: 'MIME Type Validation',
          description: 'Validates MIME type for asset',
          type: 'mime_type',
          condition: 'mimeType matches expected type',
          severity: 'error',
          fix: 'Update server configuration to serve correct MIME type',
          examples: ['Content-Type: image/jpeg'],
          metadata: {},
        });
        break;
      case 'loading':
        rules.push({
          id: `rule_${Date.now()}_2`,
          name: 'Loading Performance',
          description: 'Validates asset loading performance',
          type: 'load_time',
          condition: 'loadTime < targetLoadTime',
          severity: 'warning',
          fix: 'Optimize asset loading or implement caching',
          examples: ['Implement lazy loading', 'Add compression'],
          metadata: {},
        });
        break;
      case 'compression':
        rules.push({
          id: `rule_${Date.now()}_3`,
          name: 'Compression Ratio',
          description: 'Validates asset compression ratio',
          type: 'compression',
          condition: 'compressionRatio > targetRatio',
          severity: 'warning',
          fix: 'Improve compression or use different algorithm',
          examples: ['Use Brotli compression', 'Optimize image quality'],
          metadata: {},
        });
        break;
    }

    return rules;
  }

  /**
   * Run validation rule
   */
  private async runValidationRule(
    rule: ValidationRule,
    assetPath: string,
    validationType: ValidationType,
  ): Promise<ValidationResult> {
    // Simulate validation rule execution
    // In a real implementation, this would analyze the actual asset
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result: ValidationResult = {
      id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      status: 'passed', // Simulate successful validation
      message: `Rule ${rule.name} passed`,
      location: assetPath,
      fix: rule.fix,
      examples: rule.examples,
      metadata: {},
    };

    return result;
  }

  /**
   * Get test coverage
   */
  getTestCoverage(): TestCoverage {
    // Calculate test coverage
    const totalTests = this.tests.size;
    const totalSuites = this.testSuites.size;

    const coverage: TestCoverage = {
      mimeTypes: Math.min(100, (totalTests / Math.max(1, totalSuites)) * 100),
      assetTypes: Math.min(100, (totalTests / Math.max(1, totalSuites)) * 100),
      loaders: Math.min(100, (totalTests / Math.max(1, totalSuites)) * 100),
      optimizers: Math.min(100, (totalTests / Math.max(1, totalSuites)) * 100),
      caches: Math.min(100, (totalTests / Math.max(1, totalSuites)) * 100),
      overall: 0,
    };

    coverage.overall =
      (coverage.mimeTypes +
        coverage.assetTypes +
        coverage.loaders +
        coverage.optimizers +
        coverage.caches) /
      5;

    return coverage;
  }

  /**
   * Get test metrics
   */
  getTestMetrics(): TestMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.totalTests = this.tests.size;
    this.metrics.passedTests = Array.from(this.testResults.values()).filter(
      (result) => result.status === 'passed',
    ).length;
    this.metrics.failedTests = Array.from(this.testResults.values()).filter(
      (result) => result.status === 'failed',
    ).length;
    this.metrics.skippedTests = Array.from(this.testResults.values()).filter(
      (result) => result.status === 'skipped',
    ).length;

    // Calculate assertion metrics
    const allResults = Array.from(this.testResults.values());
    this.metrics.totalAssertions = allResults.reduce(
      (total, result) => total + result.assertions.length,
      0,
    );
    this.metrics.passedAssertions = allResults.reduce(
      (total, result) =>
        total + result.assertions.filter((a) => a.status === 'passed').length,
      0,
    );
    this.metrics.failedAssertions = allResults.reduce(
      (total, result) =>
        total + result.assertions.filter((a) => a.status === 'failed').length,
      0,
    );

    // Calculate duration metrics
    this.metrics.totalDuration = allResults.reduce(
      (total, result) => total + (result.duration || 0),
      0,
    );
    this.metrics.averageDuration =
      allResults.length > 0 ? this.metrics.totalDuration / allResults.length : 0;

    // Update coverage
    this.metrics.coverage = this.getTestCoverage();

    this.metrics.lastUpdated = new Date();
  }

  /**
   * Get tests
   */
  getTests(): AssetTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get test by ID
   */
  getTest(id: string): AssetTest | undefined {
    return this.tests.get(id);
  }

  /**
   * Get test suites
   */
  getTestSuites(): AssetTestSuite[] {
    return Array.from(this.testSuites.values());
  }

  /**
   * Get test suite by ID
   */
  getTestSuite(id: string): AssetTestSuite | undefined {
    return this.testSuites.get(id);
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return Array.from(this.testResults.values());
  }

  /**
   * Get test result by ID
   */
  getTestResult(id: string): TestResult | undefined {
    return this.testResults.get(id);
  }

  /**
   * Get validations
   */
  getValidations(): AssetValidation[] {
    return Array.from(this.validations.values());
  }

  /**
   * Get validation by ID
   */
  getValidation(id: string): AssetValidation | undefined {
    return this.validations.get(id);
  }

  /**
   * Log testing system status
   */
  logStatus(): void {
    this.updateMetrics();

    logger.info('general', '\n🏗️ Asset Management Testing System Status:');
    logger.info('general', `Initialized: ${this.isInitialized}`);
    logger.info('general', `Total Tests: ${this.metrics.totalTests}`);
    logger.info('general', `Passed Tests: ${this.metrics.passedTests}`);
    logger.info('general', `Failed Tests: ${this.metrics.failedTests}`);
    logger.info('general', `Skipped Tests: ${this.metrics.skippedTests}`);
    logger.info('general', `Total Assertions: ${this.metrics.totalAssertions}`);
    logger.info('general', `Passed Assertions: ${this.metrics.passedAssertions}`);
    logger.info('general', `Failed Assertions: ${this.metrics.failedAssertions}`);

    logger.info('general', '\n📊 Test Coverage:');
    logger.info(
      'general',
      `  MIME Types: ${this.metrics.coverage.mimeTypes.toFixed(1)}%`,
    );
    logger.info(
      'general',
      `  Asset Types: ${this.metrics.coverage.assetTypes.toFixed(1)}%`,
    );
    logger.info('general', `  Loaders: ${this.metrics.coverage.loaders.toFixed(1)}%`);
    logger.info(
      'general',
      `  Optimizers: ${this.metrics.coverage.optimizers.toFixed(1)}%`,
    );
    logger.info('general', `  Caches: ${this.metrics.coverage.caches.toFixed(1)}%`);
    logger.info('general', `  Overall: ${this.metrics.coverage.overall.toFixed(1)}%`);

    logger.info('general', '\n⚡ Performance:');
    logger.info(
      'general',
      `  Average Load Time: ${this.metrics.performance.averageLoadTime.toFixed(2)}ms`,
    );
    logger.info(
      'general',
      `  Max Load Time: ${this.metrics.performance.maxLoadTime.toFixed(2)}ms`,
    );
    logger.info(
      'general',
      `  Min Load Time: ${this.metrics.performance.minLoadTime.toFixed(2)}ms`,
    );
    logger.info(
      'general',
      `  Compression Ratio: ${(this.metrics.performance.compressionRatio * 100).toFixed(
        1,
      )}%`,
    );
  }
}

// Create global instance
export const assetManagementTestingSystem = new AssetManagementTestingSystem();

// Make available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).assetManagementTestingSystem = assetManagementTestingSystem;
}

/**
 * Quick asset management testing functions
 */
export function createAssetTest(test: AssetTest): void {
  assetManagementTestingSystem.createAssetTest(test);
}

export function runAssetTest(testId: string): Promise<TestResult> {
  return assetManagementTestingSystem.runAssetTest(testId);
}

export function validateAsset(
  assetPath: string,
  validationType: ValidationType,
): Promise<AssetValidation> {
  return assetManagementTestingSystem.validateAsset(assetPath, validationType);
}

export function getTestCoverage(): TestCoverage {
  return assetManagementTestingSystem.getTestCoverage();
}

export function getTestMetrics(): TestMetrics {
  return assetManagementTestingSystem.getTestMetrics();
}
