/**
 * Syntax Validation Testing
 *
 * Tests for CSS and JavaScript syntax errors that could
 * cause runtime issues or parsing problems.
 */

import { test, expect } from '../../fixtures/api-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_DATA } from '../../test-credentials';

test.describe('Syntax Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearApplicationData(page);
  });

  test('should not have JavaScript syntax errors', async ({ page }) => {
    try {
      const jsErrors: string[] = [];
      const syntaxErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          jsErrors.push(text);

          // Check for syntax errors specifically
          if (
            text.includes('SyntaxError') ||
            text.includes('unterminated') ||
            text.includes('Unexpected token') ||
            text.includes('literal not terminated')
          ) {
            syntaxErrors.push(text);
          }
        }
      });

      // Listen for page errors
      page.on('pageerror', (error) => {
        if (
          error.message.includes('SyntaxError') ||
          error.message.includes('unterminated') ||
          error.message.includes('Unexpected token')
        ) {
          syntaxErrors.push(error.message);
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Wait a bit more to catch any delayed errors
      await page.waitForTimeout(2000);

      // Check for syntax errors
      expect(syntaxErrors.length).toBe(0);

      if (syntaxErrors.length > 0) {
        console.error('JavaScript syntax errors found:', syntaxErrors);
      }

      // Log all JS errors for debugging
      if (jsErrors.length > 0) {
        console.log('JavaScript errors found:', jsErrors);
      }

      // Page should still be functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'js-syntax-validation-failed');
      throw error;
    }
  });

  test('should not have CSS parsing errors', async ({ page }) => {
    try {
      const cssErrors: string[] = [];
      const parsingErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          cssErrors.push(text);

          // Check for CSS parsing errors
          if (
            text.includes('CSS') &&
            (text.includes('parsing') ||
              text.includes('invalid') ||
              text.includes('ignored') ||
              text.includes('bad selector'))
          ) {
            parsingErrors.push(text);
          }
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Wait for CSS to load
      await page.waitForTimeout(1000);

      // Check for CSS parsing errors
      expect(parsingErrors.length).toBe(0);

      if (parsingErrors.length > 0) {
        console.error('CSS parsing errors found:', parsingErrors);
      }

      // Log all CSS errors for debugging
      if (cssErrors.length > 0) {
        console.log('CSS errors found:', cssErrors);
      }

      // Page should still be functional and styled
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();

      // Check if form has proper styling (not unstyled)
      const formStyles = await loginForm.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          border: styles.border,
          borderRadius: styles.borderRadius,
        };
      });

      // Form should have some styling (not just default browser styles)
      // Check for any non-default styling
      const hasCustomStyling =
        formStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        formStyles.border !== '0px none rgb(0, 0, 0)' ||
        formStyles.borderRadius !== '0px';
      expect(hasCustomStyling).toBe(true);
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'css-syntax-validation-failed');
      throw error;
    }
  });

  test('should not have template literal syntax errors', async ({ page }) => {
    try {
      const templateErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();

          // Check for template literal errors
          if (
            text.includes('literal not terminated') ||
            text.includes('template') ||
            text.includes('backtick') ||
            text.includes('`')
          ) {
            templateErrors.push(text);
          }
        }
      });

      // Listen for page errors
      page.on('pageerror', (error) => {
        if (
          error.message.includes('literal not terminated') ||
          error.message.includes('template')
        ) {
          templateErrors.push(error.message);
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Interact with form to trigger any template literal usage
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);

      // Wait for any dynamic content to load
      await page.waitForTimeout(1000);

      // Check for template literal errors
      expect(templateErrors.length).toBe(0);

      if (templateErrors.length > 0) {
        console.error('Template literal errors found:', templateErrors);
      }

      // Page should still be functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'template-literal-validation-failed');
      throw error;
    }
  });

  test('should not have JSON parsing errors', async ({ page }) => {
    try {
      const jsonErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();

          // Check for JSON parsing errors
          if (
            text.includes('JSON') &&
            (text.includes('parse') ||
              text.includes('invalid') ||
              text.includes('unexpected'))
          ) {
            jsonErrors.push(text);
          }
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Try to submit form to trigger any JSON operations
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
      await page.click('button[type="submit"]');

      // Wait for any JSON operations to complete
      await page.waitForTimeout(2000);

      // Check for JSON parsing errors
      expect(jsonErrors.length).toBe(0);

      if (jsonErrors.length > 0) {
        console.error('JSON parsing errors found:', jsonErrors);
      }

      // Page should still be functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'json-parsing-validation-failed');
      throw error;
    }
  });

  test('should not have HTML parsing errors', async ({ page }) => {
    try {
      const htmlErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();

          // Check for HTML parsing errors
          if (
            text.includes('HTML') &&
            (text.includes('parse') ||
              text.includes('invalid') ||
              text.includes('malformed'))
          ) {
            htmlErrors.push(text);
          }
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Check for HTML parsing errors
      expect(htmlErrors.length).toBe(0);

      if (htmlErrors.length > 0) {
        console.error('HTML parsing errors found:', htmlErrors);
      }

      // Page should be properly rendered
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();

      // Check if form elements are properly rendered
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'html-parsing-validation-failed');
      throw error;
    }
  });

  test('should not have React component syntax errors', async ({ page }) => {
    try {
      const reactErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();

          // Check for React errors
          if (
            text.includes('React') ||
            text.includes('component') ||
            text.includes('JSX') ||
            text.includes('render')
          ) {
            reactErrors.push(text);
          }
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Interact with components to trigger any React errors
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);

      // Wait for any React operations to complete
      await page.waitForTimeout(1000);

      // Check for React errors
      expect(reactErrors.length).toBe(0);

      if (reactErrors.length > 0) {
        console.error('React errors found:', reactErrors);
      }

      // Page should be properly rendered
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'react-syntax-validation-failed');
      throw error;
    }
  });

  test('should not have TypeScript compilation errors', async ({ page }) => {
    try {
      const tsErrors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();

          // Check for TypeScript errors
          if (
            text.includes('TypeScript') ||
            text.includes('type') ||
            text.includes('interface') ||
            (text.includes('Property') && text.includes('does not exist'))
          ) {
            tsErrors.push(text);
          }
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Interact with form to trigger any TypeScript operations
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);

      // Wait for any TypeScript operations to complete
      await page.waitForTimeout(1000);

      // Check for TypeScript errors
      expect(tsErrors.length).toBe(0);

      if (tsErrors.length > 0) {
        console.error('TypeScript errors found:', tsErrors);
      }

      // Page should be properly rendered
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'typescript-validation-failed');
      throw error;
    }
  });
});
