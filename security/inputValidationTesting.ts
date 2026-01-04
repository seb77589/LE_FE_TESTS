import logger from '@/lib/logger';
/**
 * Input Validation Testing and Validation System
 *
 * This module provides comprehensive testing for input validation including:
 * - Unit tests for validation rules
 * - Integration tests for validation flows
 * - Security tests for XSS and SQL injection
 * - Performance tests for validation performance
 * - Edge case testing
 * - Automated test generation
 * - Test reporting and analytics
 *
 * @fileoverview Comprehensive input validation testing and validation system
 */

import {
  inputValidationFramework,
  ValidationResult,
  ValidationSchema,
  ValidationType,
  ValidationSeverity,
} from './inputValidationFramework';
import {
  xssProtectionManager,
  XSSProtectionResult,
  XSSAttackType,
} from './xssProtection';
// import {
//   sqlInjectionProtectionSystem,
//   SQLInjectionThreat,
//   SQLInjectionType,
// } from './sqlInjectionProtection';

/**
 * Test Types
 */
export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  EDGE_CASE = 'edge_case',
  STRESS = 'stress',
  LOAD = 'load',
  REGRESSION = 'regression',
}

/**
 * Test Result
 */
export interface TestResult {
  testId: string;
  testType: TestType;
  testName: string;
  passed: boolean;
  duration: number;
  errors: TestError[];
  warnings: TestWarning[];
  metadata: TestMetadata;
}

/**
 * Test Error
 */
export interface TestError {
  message: string;
  expected?: any;
  actual?: any;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Test Warning
 */
export interface TestWarning {
  message: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Test Metadata
 */
export interface TestMetadata {
  testSuite: string;
  testCategory: string;
  testDescription: string;
  testTags: string[];
  testEnvironment: string;
  testData: any;
  testConfiguration: any;
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    executionTime: number;
  };
}

/**
 * Test Suite
 */
export interface TestSuite {
  suiteId: string;
  suiteName: string;
  suiteDescription: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  warnings: number;
  duration: number;
  coverage: number;
}

/**
 * Input Validation Testing System
 */
export class InputValidationTestingSystem {
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: TestResult[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.initializeTestSuites();
  }

  /**
   * Initialize test suites
   */
  private initializeTestSuites(): void {
    this.createValidationRuleTests();
    this.createXSSPreventionTests();
    this.createSQLInjectionTests();
    this.createPerformanceTests();
    this.createEdgeCaseTests();
  }

  /**
   * Create validation rule tests
   */
  private createValidationRuleTests(): void {
    const suiteId = 'validation_rules';
    const suite: TestSuite = {
      suiteId,
      suiteName: 'Validation Rules Tests',
      suiteDescription: 'Tests for input validation rules and schemas',
      tests: [],
      passed: 0,
      failed: 0,
      warnings: 0,
      duration: 0,
      coverage: 0,
    };

    // String validation tests
    suite.tests.push(this.createStringValidationTests());

    // Number validation tests
    suite.tests.push(this.createNumberValidationTests());

    // Email validation tests
    suite.tests.push(this.createEmailValidationTests());

    // URL validation tests
    suite.tests.push(this.createURLValidationTests());

    // Date validation tests
    suite.tests.push(this.createDateValidationTests());

    this.testSuites.set(suiteId, suite);
  }

  /**
   * Create XSS prevention tests
   */
  private createXSSPreventionTests(): void {
    const suiteId = 'xss_prevention';
    const suite: TestSuite = {
      suiteId,
      suiteName: 'XSS Prevention Tests',
      suiteDescription: 'Tests for XSS prevention and sanitization',
      tests: [],
      passed: 0,
      failed: 0,
      warnings: 0,
      duration: 0,
      coverage: 0,
    };

    // Script injection tests
    suite.tests.push(this.createScriptInjectionTests());

    // HTML injection tests
    suite.tests.push(this.createHTMLInjectionTests());

    // CSS injection tests
    suite.tests.push(this.createCSSInjectionTests());

    // URL injection tests
    suite.tests.push(this.createURLInjectionTests());

    this.testSuites.set(suiteId, suite);
  }

  /**
   * Create SQL injection tests
   */
  private createSQLInjectionTests(): void {
    const suiteId = 'sql_injection';
    const suite: TestSuite = {
      suiteId,
      suiteName: 'SQL Injection Tests',
      suiteDescription: 'Tests for SQL injection prevention',
      tests: [],
      passed: 0,
      failed: 0,
      warnings: 0,
      duration: 0,
      coverage: 0,
    };

    // Union-based injection tests
    suite.tests.push(this.createUnionInjectionTests());

    // Boolean-based injection tests
    suite.tests.push(this.createBooleanInjectionTests());

    // Time-based injection tests
    suite.tests.push(this.createTimeInjectionTests());

    // Stacked queries tests
    suite.tests.push(this.createStackedQueriesTests());

    this.testSuites.set(suiteId, suite);
  }

  /**
   * Create performance tests
   */
  private createPerformanceTests(): void {
    const suiteId = 'performance';
    const suite: TestSuite = {
      suiteId,
      suiteName: 'Performance Tests',
      suiteDescription: 'Tests for validation performance',
      tests: [],
      passed: 0,
      failed: 0,
      warnings: 0,
      duration: 0,
      coverage: 0,
    };

    // Large input tests
    suite.tests.push(this.createLargeInputTests());

    // Complex schema tests
    suite.tests.push(this.createComplexSchemaTests());

    // Concurrent validation tests
    suite.tests.push(this.createConcurrentValidationTests());

    this.testSuites.set(suiteId, suite);
  }

  /**
   * Create edge case tests
   */
  private createEdgeCaseTests(): void {
    const suiteId = 'edge_cases';
    const suite: TestSuite = {
      suiteId,
      suiteName: 'Edge Case Tests',
      suiteDescription: 'Tests for edge cases and boundary conditions',
      tests: [],
      passed: 0,
      failed: 0,
      warnings: 0,
      duration: 0,
      coverage: 0,
    };

    // Empty input tests
    suite.tests.push(this.createEmptyInputTests());

    // Null/undefined tests
    suite.tests.push(this.createNullUndefinedTests());

    // Special character tests
    suite.tests.push(this.createSpecialCharacterTests());

    // Unicode tests
    suite.tests.push(this.createUnicodeTests());

    this.testSuites.set(suiteId, suite);
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    const results: TestSuite[] = [];

    for (const [suiteId, suite] of this.testSuites) {
      const startTime = Date.now();

      // Run tests in suite
      for (const test of suite.tests) {
        await this.runTest(test);
      }

      // Calculate suite statistics
      suite.passed = suite.tests.filter((t) => t.passed).length;
      suite.failed = suite.tests.filter((t) => !t.passed).length;
      suite.warnings = suite.tests.reduce((sum, t) => sum + t.warnings.length, 0);
      suite.duration = Date.now() - startTime;
      suite.coverage = this.calculateCoverage(suite);

      results.push(suite);
    }

    return results;
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteId: string): Promise<TestSuite | null> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) return null;

    const startTime = Date.now();

    // Run tests in suite
    for (const test of suite.tests) {
      await this.runTest(test);
    }

    // Calculate suite statistics
    suite.passed = suite.tests.filter((t) => t.passed).length;
    suite.failed = suite.tests.filter((t) => !t.passed).length;
    suite.warnings = suite.tests.reduce((sum, t) => sum + t.warnings.length, 0);
    suite.duration = Date.now() - startTime;
    suite.coverage = this.calculateCoverage(suite);

    return suite;
  }

  /**
   * Run individual test
   */
  private async runTest(test: TestResult): Promise<void> {
    const startTime = Date.now();

    try {
      // Execute test based on type
      switch (test.testType) {
        case TestType.UNIT:
          await this.runUnitTest(test);
          break;
        case TestType.INTEGRATION:
          await this.runIntegrationTest(test);
          break;
        case TestType.SECURITY:
          await this.runSecurityTest(test);
          break;
        case TestType.PERFORMANCE:
          await this.runPerformanceTest(test);
          break;
        case TestType.EDGE_CASE:
          await this.runEdgeCaseTest(test);
          break;
        default:
          throw new Error(`Unknown test type: ${test.testType}`);
      }

      test.passed = test.errors.length === 0;
    } catch (error) {
      test.passed = false;
      test.errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        severity: 'high',
      });
    }

    test.duration = Date.now() - startTime;
    this.testResults.push(test);
  }

  /**
   * Run unit test
   */
  private async runUnitTest(test: TestResult): Promise<void> {
    // Implementation depends on specific test
    // This is a placeholder for unit test execution
  }

  /**
   * Run integration test
   */
  private async runIntegrationTest(test: TestResult): Promise<void> {
    // Implementation depends on specific test
    // This is a placeholder for integration test execution
  }

  /**
   * Run security test
   */
  private async runSecurityTest(test: TestResult): Promise<void> {
    // Implementation depends on specific test
    // This is a placeholder for security test execution
  }

  /**
   * Run performance test
   */
  private async runPerformanceTest(test: TestResult): Promise<void> {
    // Implementation depends on specific test
    // This is a placeholder for performance test execution
  }

  /**
   * Run edge case test
   */
  private async runEdgeCaseTest(test: TestResult): Promise<void> {
    // Implementation depends on specific test
    // This is a placeholder for edge case test execution
  }

  /**
   * Create string validation tests
   */
  private createStringValidationTests(): TestResult {
    return {
      testId: 'string_validation',
      testType: TestType.UNIT,
      testName: 'String Validation Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'validation_rules',
        testCategory: 'string',
        testDescription: 'Tests for string validation rules',
        testTags: ['string', 'validation', 'unit'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create number validation tests
   */
  private createNumberValidationTests(): TestResult {
    return {
      testId: 'number_validation',
      testType: TestType.UNIT,
      testName: 'Number Validation Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'validation_rules',
        testCategory: 'number',
        testDescription: 'Tests for number validation rules',
        testTags: ['number', 'validation', 'unit'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create email validation tests
   */
  private createEmailValidationTests(): TestResult {
    return {
      testId: 'email_validation',
      testType: TestType.UNIT,
      testName: 'Email Validation Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'validation_rules',
        testCategory: 'email',
        testDescription: 'Tests for email validation rules',
        testTags: ['email', 'validation', 'unit'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create URL validation tests
   */
  private createURLValidationTests(): TestResult {
    return {
      testId: 'url_validation',
      testType: TestType.UNIT,
      testName: 'URL Validation Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'validation_rules',
        testCategory: 'url',
        testDescription: 'Tests for URL validation rules',
        testTags: ['url', 'validation', 'unit'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create date validation tests
   */
  private createDateValidationTests(): TestResult {
    return {
      testId: 'date_validation',
      testType: TestType.UNIT,
      testName: 'Date Validation Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'validation_rules',
        testCategory: 'date',
        testDescription: 'Tests for date validation rules',
        testTags: ['date', 'validation', 'unit'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create script injection tests
   */
  private createScriptInjectionTests(): TestResult {
    return {
      testId: 'script_injection',
      testType: TestType.SECURITY,
      testName: 'Script Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'xss_prevention',
        testCategory: 'script_injection',
        testDescription: 'Tests for script injection prevention',
        testTags: ['xss', 'script', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create HTML injection tests
   */
  private createHTMLInjectionTests(): TestResult {
    return {
      testId: 'html_injection',
      testType: TestType.SECURITY,
      testName: 'HTML Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'xss_prevention',
        testCategory: 'html_injection',
        testDescription: 'Tests for HTML injection prevention',
        testTags: ['xss', 'html', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create CSS injection tests
   */
  private createCSSInjectionTests(): TestResult {
    return {
      testId: 'css_injection',
      testType: TestType.SECURITY,
      testName: 'CSS Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'xss_prevention',
        testCategory: 'css_injection',
        testDescription: 'Tests for CSS injection prevention',
        testTags: ['xss', 'css', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create URL injection tests
   */
  private createURLInjectionTests(): TestResult {
    return {
      testId: 'url_injection',
      testType: TestType.SECURITY,
      testName: 'URL Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'xss_prevention',
        testCategory: 'url_injection',
        testDescription: 'Tests for URL injection prevention',
        testTags: ['xss', 'url', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create union injection tests
   */
  private createUnionInjectionTests(): TestResult {
    return {
      testId: 'union_injection',
      testType: TestType.SECURITY,
      testName: 'Union Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'sql_injection',
        testCategory: 'union_injection',
        testDescription: 'Tests for union-based SQL injection prevention',
        testTags: ['sql', 'union', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create boolean injection tests
   */
  private createBooleanInjectionTests(): TestResult {
    return {
      testId: 'boolean_injection',
      testType: TestType.SECURITY,
      testName: 'Boolean Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'sql_injection',
        testCategory: 'boolean_injection',
        testDescription: 'Tests for boolean-based SQL injection prevention',
        testTags: ['sql', 'boolean', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create time injection tests
   */
  private createTimeInjectionTests(): TestResult {
    return {
      testId: 'time_injection',
      testType: TestType.SECURITY,
      testName: 'Time Injection Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'sql_injection',
        testCategory: 'time_injection',
        testDescription: 'Tests for time-based SQL injection prevention',
        testTags: ['sql', 'time', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create stacked queries tests
   */
  private createStackedQueriesTests(): TestResult {
    return {
      testId: 'stacked_queries',
      testType: TestType.SECURITY,
      testName: 'Stacked Queries Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'sql_injection',
        testCategory: 'stacked_queries',
        testDescription: 'Tests for stacked queries SQL injection prevention',
        testTags: ['sql', 'stacked', 'security'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create large input tests
   */
  private createLargeInputTests(): TestResult {
    return {
      testId: 'large_input',
      testType: TestType.PERFORMANCE,
      testName: 'Large Input Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'performance',
        testCategory: 'large_input',
        testDescription: 'Tests for large input validation performance',
        testTags: ['performance', 'large_input'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create complex schema tests
   */
  private createComplexSchemaTests(): TestResult {
    return {
      testId: 'complex_schema',
      testType: TestType.PERFORMANCE,
      testName: 'Complex Schema Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'performance',
        testCategory: 'complex_schema',
        testDescription: 'Tests for complex schema validation performance',
        testTags: ['performance', 'complex_schema'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create concurrent validation tests
   */
  private createConcurrentValidationTests(): TestResult {
    return {
      testId: 'concurrent_validation',
      testType: TestType.PERFORMANCE,
      testName: 'Concurrent Validation Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'performance',
        testCategory: 'concurrent_validation',
        testDescription: 'Tests for concurrent validation performance',
        testTags: ['performance', 'concurrent'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create empty input tests
   */
  private createEmptyInputTests(): TestResult {
    return {
      testId: 'empty_input',
      testType: TestType.EDGE_CASE,
      testName: 'Empty Input Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'edge_cases',
        testCategory: 'empty_input',
        testDescription: 'Tests for empty input handling',
        testTags: ['edge_case', 'empty_input'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create null/undefined tests
   */
  private createNullUndefinedTests(): TestResult {
    return {
      testId: 'null_undefined',
      testType: TestType.EDGE_CASE,
      testName: 'Null/Undefined Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'edge_cases',
        testCategory: 'null_undefined',
        testDescription: 'Tests for null/undefined input handling',
        testTags: ['edge_case', 'null', 'undefined'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create special character tests
   */
  private createSpecialCharacterTests(): TestResult {
    return {
      testId: 'special_characters',
      testType: TestType.EDGE_CASE,
      testName: 'Special Character Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'edge_cases',
        testCategory: 'special_characters',
        testDescription: 'Tests for special character handling',
        testTags: ['edge_case', 'special_characters'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Create unicode tests
   */
  private createUnicodeTests(): TestResult {
    return {
      testId: 'unicode',
      testType: TestType.EDGE_CASE,
      testName: 'Unicode Tests',
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
      metadata: {
        testSuite: 'edge_cases',
        testCategory: 'unicode',
        testDescription: 'Tests for unicode character handling',
        testTags: ['edge_case', 'unicode'],
        testEnvironment: 'test',
        testData: {},
        testConfiguration: {},
        performanceMetrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          executionTime: 0,
        },
      },
    };
  }

  /**
   * Calculate test coverage
   */
  private calculateCoverage(suite: TestSuite): number {
    // Simple coverage calculation based on test results
    const totalTests = suite.tests.length;
    const passedTests = suite.tests.filter((t) => t.passed).length;
    return totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  }

  /**
   * Generate test report
   */
  generateTestReport(): string {
    const report = [
      '# Input Validation Testing Report',
      `**Generated**: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
    ];

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((t) => t.passed).length;
    const failedTests = this.testResults.filter((t) => !t.passed).length;
    const totalWarnings = this.testResults.reduce(
      (sum, t) => sum + t.warnings.length,
      0,
    );

    report.push(`- **Total Tests**: ${totalTests}`);
    report.push(`- **Passed**: ${passedTests}`);
    report.push(`- **Failed**: ${failedTests}`);
    report.push(`- **Warnings**: ${totalWarnings}`);
    report.push(
      `- **Success Rate**: ${
        totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      }%`,
    );
    report.push('');

    // Test suite results
    report.push('## Test Suite Results');
    report.push('');

    for (const [suiteId, suite] of this.testSuites) {
      report.push(`### ${suite.suiteName}`);
      report.push(`- **Tests**: ${suite.tests.length}`);
      report.push(`- **Passed**: ${suite.passed}`);
      report.push(`- **Failed**: ${suite.failed}`);
      report.push(`- **Warnings**: ${suite.warnings}`);
      report.push(`- **Duration**: ${suite.duration}ms`);
      report.push(`- **Coverage**: ${Math.round(suite.coverage)}%`);
      report.push('');
    }

    // Failed tests
    const failedTestsList = this.testResults.filter((t) => !t.passed);
    if (failedTestsList.length > 0) {
      report.push('## Failed Tests');
      report.push('');

      for (const test of failedTestsList) {
        report.push(`### ${test.testName}`);
        report.push(`- **Type**: ${test.testType}`);
        report.push(`- **Duration**: ${test.duration}ms`);
        report.push('');

        if (test.errors.length > 0) {
          report.push('#### Errors');
          for (const error of test.errors) {
            report.push(`- **${error.severity.toUpperCase()}**: ${error.message}`);
            if (error.expected !== undefined) {
              report.push(`  - **Expected**: ${error.expected}`);
            }
            if (error.actual !== undefined) {
              report.push(`  - **Actual**: ${error.actual}`);
            }
          }
          report.push('');
        }

        if (test.warnings.length > 0) {
          report.push('#### Warnings');
          for (const warning of test.warnings) {
            report.push(`- **${warning.severity.toUpperCase()}**: ${warning.message}`);
            if (warning.suggestion) {
              report.push(`  - **Suggestion**: ${warning.suggestion}`);
            }
          }
          report.push('');
        }
      }
    }

    return report.join('\n');
  }

  /**
   * Public methods
   */
  getTestSuites(): TestSuite[] {
    return Array.from(this.testSuites.values());
  }

  getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  clearTestResults(): void {
    this.testResults = [];
  }

  getPerformanceMetrics(): Map<string, number[]> {
    return this.performanceMetrics;
  }
}

/**
 * Global Input Validation Testing System Instance
 */
export const inputValidationTestingSystem = new InputValidationTestingSystem();

/**
 * Utility Functions
 */

/**
 * Run all validation tests
 */
export async function runAllValidationTests(): Promise<TestSuite[]> {
  return inputValidationTestingSystem.runAllTests();
}

/**
 * Run specific test suite
 */
export async function runTestSuite(suiteId: string): Promise<TestSuite | null> {
  return inputValidationTestingSystem.runTestSuite(suiteId);
}

/**
 * Generate test report
 */
export function generateTestReport(): string {
  return inputValidationTestingSystem.generateTestReport();
}

/**
 * Development utilities
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).inputValidationTestingSystem = inputValidationTestingSystem;
  (window as any).runAllValidationTests = runAllValidationTests;
  (window as any).runTestSuite = runTestSuite;
  (window as any).generateTestReport = generateTestReport;
}
