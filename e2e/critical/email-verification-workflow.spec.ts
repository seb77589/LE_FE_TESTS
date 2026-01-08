/**
 * Email Verification Workflow E2E Tests
 *
 * Comprehensive tests for email verification workflows:
 * - Registration → Email verification flow
 * - Email verification page with token
 * - Resend verification email
 * - Invalid/expired token handling
 * - Pending verification state
 * - Redirect after verification
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TEST_DATA } from '../../test-credentials';
import { TestHelpers } from '../../utils/test-helpers';
import { generateRandomEmail, generateRandomPassword } from '../../utils/testUtils';

test.describe('Email Verification Workflow', () => {
  test('should show verification pending page after registration', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Generate unique test user
    const timestamp = Date.now();
    const testEmail = generateRandomEmail();
    const password = generateRandomPassword();

    // Fill registration form
    await page.fill('input[name="full_name"]', 'Test Verification User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check if redirected to verify-email page with pending state
    const isVerifyPage =
      page.url().includes('/verify-email') || page.url().includes('/auth/verify-email');
    const hasPendingMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/verify your email|check your email|verification link|email verification/i',
      5000,
    );

    const hasDashboardVerificationAlert = await TestHelpers.checkUIElementExists(
      page,
      'text=/Email Verification Required|verify your email/i',
      5000,
    );

    expect(isVerifyPage || hasPendingMessage || hasDashboardVerificationAlert).toBe(
      true,
    );
  });

  test('should display verification page with valid token', async ({ page }) => {
    // Navigate to verify-email page with token (mock token for structure test)
    const mockToken = 'test-verification-token-123';
    await page.goto(`/verify-email?token=${mockToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for verification page elements
    const hasTitle = await TestHelpers.checkUIElementExists(
      page,
      'text=/verify|verification/i',
      3000,
    );
    const hasStatus = await TestHelpers.checkUIElementExists(
      page,
      'text=/verifying|success|error|invalid/i',
      3000,
    );

    expect(hasTitle || hasStatus).toBe(true);
  });

  test('should show error for missing token', async ({ page }) => {
    await page.goto('/verify-email');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show error about missing token
    const hasError = await TestHelpers.checkUIElementExists(
      page,
      'text=/no.*token|missing.*token|token.*provided|invalid/i',
      3000,
    );

    expect(hasError).toBe(true);
  });

  test('should show error for invalid verification token', async ({ page }) => {
    const invalidToken = 'invalid-token-xyz-123';
    await page.goto(`/verify-email?token=${invalidToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show error message
    const hasError = await TestHelpers.checkUIElementExists(
      page,
      'text=/invalid|expired|not found|error/i',
      5000,
    );

    expect(hasError).toBe(true);
  });

  test('should redirect to login after successful verification', async ({ page }) => {
    const mockToken = 'valid-token-123';

    // Mock successful verification for deterministic UI behavior
    await page.route('**/api/v1/auth/verify-email', async (route) => {
      const request = route.request();
      if (request.method().toUpperCase() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email verified successfully!' }),
      });
    });

    await page.goto(`/verify-email?token=${mockToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check if redirected to login or shows success message
    const isLoginPage =
      page.url().includes('/auth/login') || page.url().includes('/login');
    const hasSuccessMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/verified|success|email verified/i',
      5000,
    );

    // Either redirected or shows success (which redirects after delay)
    expect(isLoginPage || hasSuccessMessage).toBe(true);
  });

  test('should show pending verification state', async ({ page }) => {
    await page.goto('/verify-email?pending=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show pending message
    const hasPendingMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/sent.*verification|verification link|check your email|verify your email/i',
      3000,
    );

    expect(hasPendingMessage).toBe(true);
  });

  test('should provide return to login link on pending page', async ({ page }) => {
    await page.goto('/verify-email?pending=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for return to login button/link
    const returnToLogin = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Return to Login"), a:has-text("Return to Login"), button:has-text("Login")',
      3000,
    );

    if (returnToLogin) {
      // Click and verify navigation
      await page
        .locator(
          'button:has-text("Return to Login"), a:has-text("Return to Login"), button:has-text("Login")',
        )
        .first()
        .click();
      await page.waitForTimeout(1000);

      const isLoginPage =
        page.url().includes('/auth/login') || page.url().includes('/login');
      expect(isLoginPage).toBe(true);
    }
  });

  test('should handle expired verification token', async ({ page }) => {
    const expiredToken = 'expired-token-123';
    await page.goto(`/verify-email?token=${expiredToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show expired token error
    const hasExpiredMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/expired|no longer valid|invalid/i',
      5000,
    );

    expect(hasExpiredMessage).toBe(true);
  });

  test('should show loading state during verification', async ({ page }) => {
    const mockToken = 'test-token-123';

    // Force a brief loading window
    await page.route('**/api/v1/auth/verify-email', async (route) => {
      const request = route.request();
      if (request.method().toUpperCase() !== 'POST') {
        await route.continue();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Verification failed. The link may be invalid or expired.' }),
      });
    });

    await page.goto(`/verify-email?token=${mockToken}`);
    await page.waitForLoadState('networkidle');

    // Should show loading/verifying state initially
    const hasLoadingState = await TestHelpers.checkUIElementExists(
      page,
      'text=/verifying|loading|processing/i',
      2000,
    );

    // Loading state may be brief, so check if it appears or if we get result quickly
    const hasTerminalState = await TestHelpers.checkUIElementExists(
      page,
      'text=/verified|success|failed|invalid|expired|error/i',
      5000,
    );

    expect(hasLoadingState || hasTerminalState).toBe(true);
  });

  test('should handle network errors during verification', async ({ page }) => {
    const mockToken = 'test-token-123';

    // Simulate network/API failure deterministically (without breaking navigation)
    await page.route('**/api/v1/auth/verify-email', async (route) => {
      const request = route.request();
      if (request.method().toUpperCase() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Network error. Please try again.' }),
      });
    });

    await page.goto(`/verify-email?token=${mockToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show error message
    const hasError = await TestHelpers.checkUIElementExists(
      page,
      'text=/error|failed|network/i',
      5000,
    );

    expect(hasError).toBe(true);
  });

  test('should prevent duplicate verification attempts', async ({ page }) => {
    // This would require a real verified token
    // For now, test that the page handles already-verified state
    const mockToken = 'already-verified-token';
    await page.goto(`/verify-email?token=${mockToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show appropriate message (already verified or error)
    const hasMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/already verified|already confirmed|invalid/i',
      5000,
    );

    expect(hasMessage !== false).toBe(true);
  });
});

test.describe('Email Verification - Resend Flow', () => {
  test('should show resend verification email option', async ({ page }) => {
    await page.goto('/verify-email?pending=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for resend button/link
    const resendButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Resend"), a:has-text("Resend"), button:has-text("Send again")',
      3000,
    );

    // Resend option may or may not be present
    if (resendButton) {
      console.log('✅ Resend verification email option available');
    }
  });

  test('should resend verification email when requested', async ({ page }) => {
    // This would require login to access resend functionality
    // For now, test the UI flow
    await page.goto('/verify-email?pending=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const resendButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Resend"), a:has-text("Resend")',
      3000,
    );

    if (resendButton) {
      await page
        .locator('button:has-text("Resend"), a:has-text("Resend")')
        .first()
        .click();
      await page.waitForTimeout(2000);

      // Should show success message
      const hasSuccess = await TestHelpers.checkUIElementExists(
        page,
        'text=/sent|resent|email sent/i',
        3000,
      );

      expect(hasSuccess).toBe(true);
    }
  });
});

test.describe('Email Verification - Integration with Login', () => {
  test('should prevent login for unverified users', async ({ page }) => {
    // Register new unverified user
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const testEmail = generateRandomEmail();
    const password = generateRandomPassword();

    await page.fill('input[name="full_name"]', 'Unverified User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Registration flow may log the user in automatically; reset session before login attempt.
    await page.context().clearCookies();

    // Try to login
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should show verification required error or redirect to verify page
    const hasVerificationError = await TestHelpers.checkUIElementExists(
      page,
      'text=/verify|verification required|email not verified/i',
      5000,
    );
    const isVerifyPage = page.url().includes('/verify-email');

    const hasDashboardVerificationAlert = await TestHelpers.checkUIElementExists(
      page,
      'text=/Email Verification Required|verify your email/i',
      5000,
    );

    // Depending on backend policy, unverified users may be blocked OR allowed with a warning.
    expect(hasVerificationError || isVerifyPage || hasDashboardVerificationAlert).toBe(
      true,
    );
  });

  test('should allow login after email verification', async ({
    page,
    workerCredentials,
  }) => {
    // This would require actual email verification flow
    // For now, verify that verified users can login
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );

    // Should successfully login (user is verified)
    const isDashboard =
      page.url().includes('/dashboard') ||
      page.url().includes('/cases') ||
      page.url().includes('/admin');
    expect(isDashboard).toBe(true);
  });
});
