import { test, expect } from '@playwright/test';

test.describe('JavaScript Error Debug', () => {
  test('capture all console output and JavaScript errors', async ({ page }) => {
    // Capture all console messages
    const allConsoleLogs: string[] = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      allConsoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      errors.push(`Page error: ${err.message}`);
    });

    // Navigate to the registration page
    await page.goto('/auth/register');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Wait a bit more to ensure all console logs are captured
    await page.waitForTimeout(3000);

    console.log('=== ALL CONSOLE LOGS ===');
    allConsoleLogs.forEach((log) => console.log(log));

    console.log('=== JAVASCRIPT ERRORS ===');
    errors.forEach((error) => console.log(error));

    // Check if the form is actually present
    const formExists = await page.locator('form').count();
    console.log(`Form elements found: ${formExists}`);

    // Check if RegisterForm console logs are present
    const registerFormLogs = allConsoleLogs.filter((log) =>
      log.includes('[RegisterForm]'),
    );
    console.log(`RegisterForm logs found: ${registerFormLogs.length}`);
    registerFormLogs.forEach((log) => console.log(`  ${log}`));

    // Basic assertion
    expect(formExists).toBeGreaterThan(0);
  });
});
