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

    // Wait for form submission and backend response
    // The backend validates company access immediately (no email sending)
    // Poll for either success redirect or error message
    let registrationComplete = false;
    let companyAccessError = false;
    const startTime = Date.now();
    const maxWaitTime = 60000;

    while (!registrationComplete && Date.now() - startTime < maxWaitTime) {
      // Check if we've been redirected to success page
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('verify-email')) {
        registrationComplete = true;
        break;
      }

      // Check for company access error
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('company access is required')) {
        companyAccessError = true;
        break;
      }

      // Check for other completion indicators
      if (pageContent.toLowerCase().includes('registration successful')) {
        registrationComplete = true;
        break;
      }

      // Wait a bit before polling again
      await page.waitForTimeout(2000);
    }

    if (companyAccessError) {
      test.skip(
        true,
        'Registration requires company access - backend configured to restrict email domains',
      );
      return;
    }

    if (!registrationComplete) {
      throw new Error('Registration timed out without success or error');
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

    // Wait for first registration to complete
    // Poll for either success or company access error
    let firstRegistrationComplete = false;
    let companyAccessError = false;
    const startTime = Date.now();
    const maxWaitTime = 60000;

    while (!firstRegistrationComplete && !companyAccessError && Date.now() - startTime < maxWaitTime) {
      // Check if we've been redirected to success page
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('verify-email')) {
        firstRegistrationComplete = true;
        break;
      }

      // Check for company access error
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('company access is required')) {
        companyAccessError = true;
        break;
      }

      // Check for other completion indicators
      if (pageContent.toLowerCase().includes('registration successful')) {
        firstRegistrationComplete = true;
        break;
      }

      // Wait a bit before polling again
      await page.waitForTimeout(2000);
    }

    if (companyAccessError) {
      test.skip(
        true,
        'Registration requires company access - backend configured to restrict email domains',
      );
      return;
    }

    // SECOND: Try to register again with the same email
    await TestHelpers.clearApplicationData(page);
    await page.goto('/auth/register');
    await expect(page.locator('form')).toBeVisible();

    await page.fill('input[name="full_name"]', 'Another User');
    await page.fill('input[name="email"]', testUser.email); // Same email - should fail
    await page.fill('input[name="password"]', TEST_DATA.PASSWORD.DIFFERENT);
    await page.fill('input[name="confirmPassword"]', TEST_DATA.PASSWORD.DIFFERENT);
    await page.click('button[type="submit"]');

    // Wait for API response and error display
    // The duplicate check should fail fast (no email sending), but wait for UI update
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]');
        const hasError = document.querySelector('[role="alert"], .text-red-600, .text-destructive');
        return (btn && !btn.textContent?.includes('Creating')) || hasError;
      },
      { timeout: 30000 },
    );

    // Get all error messages using the helper
    const errorMessages = await TestHelpers.getErrorMessages(page);

    // Check for company access error on duplicate attempt too
    const hasCompanyAccessError = errorMessages.some((msg) =>
      msg.toLowerCase().includes('company access'),
    );
    if (hasCompanyAccessError) {
      test.skip(
        true,
        'Registration requires company access - backend configured to restrict email domains',
      );
      return;
    }

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
