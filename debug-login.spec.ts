import { test } from '@playwright/test';
import { TEST_CREDENTIALS, TEST_CONFIG } from './test-credentials';

test('Debug login flow for test_user', async ({ page }) => {
  console.log('1. Starting test...');

  // Navigate to login page
  console.log('2. Navigating to login page...');
  await page.goto(`${TEST_CONFIG.FRONTEND_URL}/auth/login`);

  // Wait for page to load
  console.log('3. Waiting for page to load...');
  await page.waitForLoadState('networkidle');

  console.log('4. Current URL:', page.url());

  // Fill login form
  console.log('5. Filling login form...');
  await page.fill('input[name="email"]', TEST_CREDENTIALS.USER.email);
  await page.fill('input[name="password"]', TEST_CREDENTIALS.USER.password);

  // Check if submit button exists and is enabled
  console.log('6. Checking submit button...');
  const submitButton = page.getByRole('button', { name: /sign in/i });
  const buttonExists = await submitButton.count();
  console.log('Submit button count:', buttonExists);

  if (buttonExists > 0) {
    const isEnabled = await submitButton.isEnabled();
    console.log('Submit button enabled:', isEnabled);

    if (isEnabled) {
      console.log('7. Clicking submit button...');
      await submitButton.click();

      // Wait for response
      console.log('8. Waiting for response...');
      await page.waitForTimeout(3000);
      console.log('Current URL after login:', page.url());
    } else {
      console.log('Submit button is disabled, checking after delay...');
      await page.waitForTimeout(2000);
      const isEnabledAfterWait = await submitButton.isEnabled();
      console.log('Submit button enabled after wait:', isEnabledAfterWait);
    }
  }

  console.log('9. Test completed.');
});
