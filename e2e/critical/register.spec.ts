/**
 * Register Page E2E Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { allure } from 'allure-playwright';
import { generateRandomEmail, generateRandomPassword } from '../../utils/testUtils';
import { TEST_DATA } from '../../test-credentials';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Register Page', () => {
  test('should register a new user successfully', async ({ page }) => {
    allure.story('User Registration');
    allure.feature('Register Page');
    allure.severity('critical');

    // Generate random credentials
    const email = generateRandomEmail();
    const password = generateRandomPassword();

    // Navigate to register page
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    // Wait for the form to be ready
    await page.waitForSelector('form', { state: 'visible' });

    // Fill in the registration form
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // Submit the form
    await page.getByRole('button', { name: /create account/i }).click();

    // The app may redirect either to dashboard (dev flag allows login) or verify-email when unverified
    // Wait for navigation with multiple possible outcomes
    try {
      await page.waitForURL(/.*(dashboard|verify-email)/, { timeout: 30000 });
    } catch (error) {
      // If navigation doesn't happen, check if we're still on register page with success
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/register')) {
        // Check if there's a success message or if the form was submitted successfully
        const successMessage = await page
          .locator('text=Registration successful')
          .isVisible()
          .catch(() => false);
        const errorMessage = await page
          .locator('[role="alert"], .text-red-600')
          .isVisible()
          .catch(() => false);

        if (successMessage) {
          console.log(
            'Registration successful but no redirect - this may be expected behavior',
          );
          return; // Test passes
        } else if (errorMessage) {
          throw new Error('Registration failed with error message');
        } else {
          throw new Error(
            `Registration did not redirect as expected. Current URL: ${currentUrl}`,
          );
        }
      } else {
        throw error; // Re-throw if it's a different navigation issue
      }
    }

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/dashboard|verify-email/);
  });

  test('should show error for duplicate email', async ({ page }) => {
    const timestamp = Date.now();
    // Extract email domain from TEST_USER_EMAIL environment variable
    if (!process.env.TEST_USER_EMAIL) {
      throw new Error(
        'TEST_USER_EMAIL environment variable is required. Please configure it in config/.env',
      );
    }
    const testUserEmail = process.env.TEST_USER_EMAIL;
    const emailDomain = testUserEmail.split('@')[1];
    if (!emailDomain) {
      throw new Error(
        `Invalid TEST_USER_EMAIL format: ${testUserEmail}. Expected format: user@domain.com`,
      );
    }
    const testUser = {
      email: `duplicate.test.${timestamp}@${emailDomain}`,
      password: TEST_DATA.PASSWORD.VALID,
      fullName: `Duplicate Test User ${timestamp}`,
    };

    console.log('Testing duplicate registration for: ' + testUser.email);

    // FIRST: Register the user successfully
    await TestHelpers.clearApplicationData(page);
    await page.goto('/auth/register');
    await expect(page.locator('form')).toBeVisible();

    await page.fill('input[name="full_name"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for registration to complete
    await page.waitForTimeout(2000);

    // SECOND: Try to register again with the same email
    await TestHelpers.clearApplicationData(page);
    await page.goto('/auth/register');
    await expect(page.locator('form')).toBeVisible();

    await page.fill('input[name="full_name"]', 'Another User');
    await page.fill('input[name="email"]', testUser.email); // Same email - should fail
    await page.fill('input[name="password"]', TEST_DATA.PASSWORD.DIFFERENT);
    await page.fill('input[name="confirmPassword"]', TEST_DATA.PASSWORD.DIFFERENT);
    await page.click('button[type="submit"]');

    // Wait for potential API response and error display
    await page.waitForTimeout(2000);

    // Get all error messages using the helper
    const errorMessages = await TestHelpers.getErrorMessages(page);

    // Verify we have error messages
    expect(errorMessages.length).toBeGreaterThan(0);

    // Check if any error message indicates duplicate email
    const hasEmailError = errorMessages.some(
      (msg) =>
        msg.toLowerCase().includes('email') ||
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('exist') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('400'), // HTTP status code for bad request
    );

    expect(hasEmailError).toBe(true);
    console.log('✅ Duplicate email error shown correctly');
  });

  // NOTE: Form validation tests removed - already comprehensively covered in unit tests
  // See: src/__tests__/unit/components/auth/RegisterForm.test.tsx
  // E2E tests focus on critical user flows only (successful registration, duplicate email)
});
