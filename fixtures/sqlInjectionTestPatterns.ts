/**
 * Shared SQL Injection Test Patterns
 *
 * This file contains SQL injection attack patterns used across multiple
 * test suites and security utilities. Consolidating these patterns ensures
 * consistency and prevents duplication.
 *
 * Used by:
 * - src/utils/sqlInjectionProtection.ts
 * - src/utils/securityTestingFramework.ts
 */

/**
 * Common SQL injection patterns that should be detected and blocked
 * by any SQL injection protection system.
 */
export const COMMON_SQL_INJECTION_PATTERNS = [
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "'; EXEC xp_cmdshell('dir'); --",
  "' AND (SELECT COUNT(*) FROM users) > 0 --",
  "'; WAITFOR DELAY '00:00:05'; --",
  "' OR 1=1 --",
  "admin'--",
  "admin'/*",
  "' OR 'x'='x",
  "') OR ('1'='1",
  "' OR 1=1 LIMIT 1 --",
  "'; INSERT INTO users VALUES ('hacker', 'password'); --",
  "' OR EXISTS(SELECT * FROM users WHERE username='manager') --",
  "'; UPDATE users SET password='hacked' WHERE username='manager'; --",
] as const;

/**
 * Advanced SQL injection patterns for comprehensive security testing.
 * These patterns test more sophisticated attack vectors.
 */
export const ADVANCED_SQL_INJECTION_PATTERNS = [
  "' OR (SELECT COUNT(*) FROM information_schema.tables) > 0 --",
  "'; SELECT * FROM users WHERE username='manager' AND password='password' --",
  "' OR (SELECT SUBSTRING(password,1,1) FROM users WHERE username='manager')='a' --",
  "'; SELECT * FROM users WHERE username='manager' AND ASCII(SUBSTRING(password,1,1))>97 --",
  "' OR (SELECT COUNT(*) FROM users WHERE username='manager' AND LENGTH(password)>5) > 0 --",
] as const;

/**
 * Destructive SQL injection patterns that attempt to modify or destroy data.
 * These should be blocked with highest priority.
 */
export const DESTRUCTIVE_SQL_INJECTION_PATTERNS = [
  "'; DROP TABLE users; --",
  "'; DELETE FROM users; --",
  "'; TRUNCATE TABLE users; --",
] as const;

/**
 * All SQL injection test patterns combined.
 * Use this for comprehensive validation.
 */
export const ALL_SQL_INJECTION_PATTERNS = [
  ...COMMON_SQL_INJECTION_PATTERNS,
  ...ADVANCED_SQL_INJECTION_PATTERNS,
  ...DESTRUCTIVE_SQL_INJECTION_PATTERNS,
] as const;

/**
 * Type for SQL injection test patterns
 */
export type SqlInjectionPattern = (typeof ALL_SQL_INJECTION_PATTERNS)[number];
