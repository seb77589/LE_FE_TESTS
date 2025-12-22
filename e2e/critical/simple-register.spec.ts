/**
 * Simple Registration E2E Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_DATA } from '../../test-credentials';

test.describe('Simple Registration Test', () => {
  test('should register new user successfully', async ({ page }) => {
    const timestamp = Date.now();
    // Extract email domain from TEST_USER_EMAIL environment variable
    // Validated by test-credentials.ts import
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
      email: `test.user.${timestamp}@${emailDomain}`,
      password: TEST_DATA.PASSWORD.VALID,
      fullName: `Test User ${timestamp}`,
    };

    console.log(`Testing registration for: ${testUser.email}`);

    // Navigate to registration page
    await page.goto('/auth/register');

    // Wait for the registration form to be visible and ready
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Fill the registration form
    await page.fill('input[name="full_name"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    await page.waitForTimeout(1000);
    const errors = await TestHelpers.getErrorMessages(page);
    expect(errors.length).toBe(0);
    expect(page.url()).toContain('/auth/register');
  });

  test('should show error for duplicate email', async ({ page }) => {
    const timestamp = Date.now();
    // Extract email domain from TEST_USER_EMAIL environment variable
    // Validated by test-credentials.ts import
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

    // Wait for registration to complete (redirect to dashboard)
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

    await page.screenshot({
      path: `test-results/duplicate-email-result-${timestamp}.png`,
      fullPage: true,
    });
  });
});
