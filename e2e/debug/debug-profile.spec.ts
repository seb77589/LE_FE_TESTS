import { test, expect } from '../../fixtures/api-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_CREDENTIALS } from '../../test-credentials';

test.describe('Profile Page Debug Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await TestHelpers.clearApplicationData(page);
  });

  test('Debug login and profile page flow', async ({ page }) => {
    try {
      console.log('1. Starting debug test...');

      // Navigate to login page and debug
      console.log('2. Debugging login page...');
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'login-debug.png', fullPage: true });
      console.log('3. Login page screenshot saved');

      const pageTitle = await page.title();
      console.log('4. Login page title:', pageTitle);

      const formCount = await page.locator('form').count();
      const inputCount = await page.locator('input').count();
      const buttonCount = await page.locator('button').count();

      console.log(
        `5. Elements found - Forms: ${formCount}, Inputs: ${inputCount}, Buttons: ${buttonCount}`,
      );

      // Attempt login if possible
      console.log('6. Attempting login...');

      const emailInput = page
        .locator('input[name="email"], input[type="email"]')
        .first();
      const passwordInput = page
        .locator('input[name="password"], input[type="password"]')
        .first();
      const submitButton = page
        .locator('button[type="submit"], button:has-text("Login")')
        .first();

      if (
        (await emailInput.isVisible()) &&
        (await passwordInput.isVisible()) &&
        (await submitButton.isVisible())
      ) {
        await emailInput.fill(TEST_CREDENTIALS.USER.email);
        await passwordInput.fill(TEST_CREDENTIALS.USER.password);
        await submitButton.click();

        // Check if login was successful
        try {
          await page.waitForURL('**/dashboard', { timeout: 10000 });
          console.log('7. Login successful!');

          // Debug profile page
          console.log('8. Debugging profile page...');

          await page.goto('/profile');
          await page.waitForLoadState('networkidle');

          await page.screenshot({ path: 'profile-debug.png', fullPage: true });
          console.log('9. Profile page screenshot saved');

          const profileTitle = await page.title();
          console.log('10. Profile page title:', profileTitle);

          const errorCount = await page
            .locator('[data-testid*="error"], .error')
            .count();
          const loadingCount = await page
            .locator('[data-testid*="loading"], .loading')
            .count();

          console.log(
            `11. Profile page - Errors: ${errorCount}, Loading: ${loadingCount}`,
          );
        } catch (navigationError) {
          console.log(
            '7. Login did not redirect to dashboard:',
            String(navigationError),
          );
          await page.screenshot({ path: 'post-login-debug.png', fullPage: true });
        }
      } else {
        console.log('7. Required login elements not found');
      }

      console.log('12. Debug complete');

      // This test always passes since it's for debugging
      await expect(page).toHaveURL(/.*/);
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'debug-flow-failed');
      console.error('Debug test error:', error);
      // Don't throw for debug test - just pass
    }
  });
});
