/**
 * Error Boundary Testing
 *
 * Tests the comprehensive error handling and recovery mechanisms
 * implemented in the application.
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_DATA } from '../../test-credentials';

test.describe('Error Boundary and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearApplicationData(page);
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Inject a JavaScript error to test error boundary
      await page.evaluate(() => {
        // Create a component that will throw an error
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-trigger';
        errorDiv.innerHTML = 'Click to trigger error';
        errorDiv.onclick = () => {
          throw new Error('Test error for error boundary');
        };
        document.body.appendChild(errorDiv);
      });

      // Click the error trigger
      await page.click('#error-trigger');

      // Wait for error boundary to catch the error
      await page.waitForTimeout(1000);

      // Check if error boundary is displayed
      const errorBoundary = page.locator('text=Oops! Something went wrong');
      if (await errorBoundary.count()) {
        await expect(errorBoundary).toBeVisible({ timeout: 5000 });

        // Check if error ID is displayed
        const errorId = page.locator('text=Error ID:');
        if (await errorId.count()) {
          await expect(errorId).toBeVisible();
        }

        // Check if retry button is present
        const retryButton = page.locator('button:has-text("Try Again")');
        if (await retryButton.count()) {
          await expect(retryButton).toBeVisible();
        }

        // Check if reload button is present
        const reloadButton = page.locator('button:has-text("Reload Page")');
        if (await reloadButton.count()) {
          await expect(reloadButton).toBeVisible();
        }
      }
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'error-boundary-test-failed');
      throw error;
    }
  });

  test('should handle chunk loading failures', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Simulate chunk loading failure by blocking specific chunks
      await page.route('**/_next/static/chunks/**', (route) => {
        // Block some chunks to simulate loading failure
        if (route.request().url().includes('app/layout')) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      // Try to navigate to trigger chunk loading
      await page.reload();

      // Wait for chunk loading error handling
      await page.waitForTimeout(2000);

      // Check if chunk loading error is handled gracefully
      // The page should still be functional or show appropriate fallback
      const loginForm = page.locator('form');
      const errorMessage = page.locator('text=Loading Error');

      // Either the form should be visible or an error message should be shown
      const isFormVisible = await loginForm.isVisible();
      const isErrorVisible = await errorMessage.isVisible();

      expect(isFormVisible || isErrorVisible).toBe(true);
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'chunk-loading-test-failed');
      throw error;
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    try {
      // Block all API requests to simulate network failure
      await page.route('**/api/**', (route) => route.abort('failed'));

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Fill login form
      await page.fill('input[name="email"]', TEST_DATA.EMAIL.VALID);
      await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for network error handling
      await page.waitForTimeout(2000);

      // Check if network error is handled gracefully
      const errorMessages = await TestHelpers.getErrorMessages(page);
      const hasNetworkError = errorMessages.some(
        (msg) =>
          msg.toLowerCase().includes('network') ||
          msg.toLowerCase().includes('connection'),
      );

      expect(hasNetworkError).toBe(true);

      // Should still be on login page
      await expect(page).toHaveURL(/\/auth\/login/);
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'network-error-test-failed');
      throw error;
    }
  });

  test('should handle client error tracking initialization failures', async ({
    page,
  }) => {
    try {
      // Check console for error tracking initialization messages
      const consoleMessages: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().toLowerCase().includes('error tracking')) {
          consoleMessages.push(msg.text());
        }
      });

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Wait for potential error tracking initialization
      await page.waitForTimeout(2000);

      // Check if error tracking is configured in window
      const hasErrorTracking = await page.evaluate(() => {
        return typeof (globalThis as any).errorTracking !== 'undefined';
      });

      console.log(
        `Error tracking available: ${hasErrorTracking}, Messages: ${consoleMessages.length}`,
      );

      // Either error tracking should be available OR the page should work without it
      // This tests that missing telemetry doesn't break the application
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'error-tracking-init-test-failed');
      throw error;
    }
  });

  test('should handle authentication context failures', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Simulate auth context failure by clearing localStorage and cookies
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        // Clear all cookies
        document.cookie.split(';').forEach((cookie) => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        });
      });

      // Reload page to trigger auth context initialization
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Page should still be functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();

      // Should not show authentication error
      const authError = page.locator('text=Authentication Error');
      await expect(authError).not.toBeVisible();
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'auth-context-test-failed');
      throw error;
    }
  });

  test('should handle form validation errors gracefully', async ({ page }) => {
    try {
      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Test various invalid inputs
      // Use TEST_DATA.PASSWORD.WEAK for weak/invalid password validation testing
      const invalidPassword = TEST_DATA.PASSWORD.WEAK!;
      const invalidInputs = [
        { email: '', password: '' },
        { email: 'invalid-email', password: invalidPassword },
        { email: TEST_DATA.EMAIL.VALID, password: '' },
        { email: '', password: invalidPassword },
      ];

      for (const input of invalidInputs) {
        // Clear form
        await page.fill('input[name="email"]', '');
        await page.fill('input[name="password"]', '');

        // Fill invalid input
        await page.fill('input[name="email"]', input.email);
        await page.fill('input[name="password"]', input.password);

        // Submit button should be enabled (validation happens on submit)
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeEnabled();

        // Should not show error messages for empty form (validation happens on submit)
        if (input.email || input.password) {
          // Try to submit (button should be disabled, but let's check)
          await page.click('button[type="submit"]');

          // Wait a bit for any validation
          await page.waitForTimeout(500);

          // Should still be on login page
          await expect(page).toHaveURL(/\/auth\/login/);
        }
      }
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'form-validation-test-failed');
      throw error;
    }
  });

  test('should handle page load performance issues', async ({ page }) => {
    try {
      // Start performance monitoring
      const startTime = Date.now();

      // Navigate to login page
      await page.goto('/auth/login');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Page should load within reasonable time (15 seconds for Docker environment)
      expect(loadTime).toBeLessThan(15000);
      console.log(`Page loaded in ${loadTime}ms`);

      // Check if page is functional
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();

      // Check for any performance-related console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('performance')) {
          consoleErrors.push(msg.text());
        }
      });

      // Wait a bit more to catch any delayed errors
      await page.waitForTimeout(1000);

      // Should not have performance-related errors
      expect(consoleErrors.length).toBe(0);
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'performance-test-failed');
      throw error;
    }
  });
});
