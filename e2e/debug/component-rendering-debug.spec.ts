import { test, expect } from '@playwright/test';

test.describe('Component Rendering Debug', () => {
  test('check if RegisterForm component is rendering', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/auth/register');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the form exists
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check if specific form elements exist
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check the page title and heading - use the specific H1 that contains the registration text
    await expect(
      page.locator('h1').filter({ hasText: 'Create your account' }),
    ).toBeVisible();

    // Take a screenshot to see what's rendered
    await page.screenshot({ path: 'register-form-screenshot.png' });

    console.log('Form elements found and visible');
  });
});
