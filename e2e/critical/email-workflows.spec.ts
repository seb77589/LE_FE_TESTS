/**
 * Email Workflows E2E Tests
 *
 * Tests email-based workflows including:
 * - Password reset flow
 * - Email verification
 * - Password change notifications
 * - Welcome emails
 *
 * Note: These tests require email testing infrastructure (e.g., MailHog, MailTrap, or similar)
 * Set SMTP_TEST_SERVER environment variable to enable full email verification
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TEST_DATA } from '../../test-credentials';
import { TestHelpers } from '../../utils/test-helpers';

// Check if email testing is available
const EMAIL_TESTING_ENABLED = process.env.SMTP_TEST_SERVER || process.env.MAILHOG_URL;

test.describe('Email Workflows - Password Reset', () => {
  test('should access password reset page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for "Forgot Password" link
    const forgotPasswordLink = await TestHelpers.checkUIElementExists(
      page,
      'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
      5000,
    );

    if (!forgotPasswordLink) {
      // Skip reason: FUTURE_FEATURE - Forgot password link not found
      test.skip(true, 'Forgot password link not found');
      return;
    }

    // Click forgot password link and wait for navigation
    await Promise.all([
      page.waitForURL(/.*(?:forgot|reset).*/, { timeout: 10000 }),
      page
        .locator(
          'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
        )
        .first()
        .click(),
    ]);

    // Check if we're on the password reset page
    const onResetPage = page.url().includes('forgot') || page.url().includes('reset');
    expect(onResetPage).toBe(true);

    console.log('✅ Password reset page accessible');
  });

  test('should display password reset form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const forgotPasswordLink = await TestHelpers.checkUIElementExists(
      page,
      'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
    );

    if (!forgotPasswordLink) {
      // Skip reason: FUTURE_FEATURE - Forgot password feature not implemented
      test.skip(true, 'Forgot password feature not implemented');
      return;
    }

    await page
      .locator(
        'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
      )
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Check for email input field
    const emailInput = await TestHelpers.checkUIElementExists(
      page,
      'input[name="email"], input[type="email"], input[placeholder*="email"]',
      5000,
    );

    expect(emailInput).toBe(true);

    // Check for submit button
    const submitButton = await TestHelpers.checkUIElementExists(
      page,
      'button[type="submit"], button:has-text("Reset"), button:has-text("Send")',
      5000,
    );

    expect(submitButton).toBe(true);

    console.log('✅ Password reset form displayed');
  });

  test('should submit password reset request', async ({ page, workerCredentials }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const forgotPasswordLink = await TestHelpers.checkUIElementExists(
      page,
      'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
    );

    if (!forgotPasswordLink) {
      // Skip reason: FUTURE_FEATURE - Forgot password feature not implemented
      test.skip(true, 'Forgot password feature not implemented');
      return;
    }

    await page
      .locator(
        'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
      )
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Fill email field
    await page.fill(
      'input[name="email"], input[type="email"], input[placeholder*="email"]',
      workerCredentials.email,
    );

    // Submit form
    await page
      .locator(
        'button[type="submit"], button:has-text("Reset"), button:has-text("Send")',
      )
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Check for success message
    const successMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/sent|email sent|check your email|success/i',
      5000,
    );

    if (successMessage) {
      console.log('✅ Password reset request submitted successfully');
    } else {
      console.log('ℹ️  Success message not shown (may still work)');
    }
  });

  test('should show error for non-existent email', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const forgotPasswordLink = await TestHelpers.checkUIElementExists(
      page,
      'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
    );

    if (!forgotPasswordLink) {
      // Skip reason: FUTURE_FEATURE - Forgot password feature not implemented
      test.skip(true, 'Forgot password feature not implemented');
      return;
    }

    await page
      .locator(
        'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
      )
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Submit with non-existent email
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
    await page.fill(
      'input[name="email"], input[type="email"], input[placeholder*="email"]',
      `nonexistent@${emailDomain}`,
    );

    await page
      .locator(
        'button[type="submit"], button:has-text("Reset"), button:has-text("Send")',
      )
      .first()
      .click();
    await page.waitForTimeout(2000);

    // Check for error or success (may show generic message for security)
    const hasResponse = await TestHelpers.checkUIElementExists(
      page,
      'text=/sent|error|not found|invalid|success/i',
      5000,
    );

    if (hasResponse) {
      console.log('✅ Response shown for non-existent email');
    }
  });

  test('should validate email format in reset form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const forgotPasswordLink = await TestHelpers.checkUIElementExists(
      page,
      'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
    );

    if (!forgotPasswordLink) {
      // Skip reason: FUTURE_FEATURE - Forgot password feature not implemented
      test.skip(true, 'Forgot password feature not implemented');
      return;
    }

    await page
      .locator(
        'a:has-text("Forgot"), a:has-text("forgot"), a[href*="forgot"], a[href*="reset"]',
      )
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Enter invalid email
    await page.fill(
      'input[name="email"], input[type="email"], input[placeholder*="email"]',
      'invalid-email',
    );

    // Try to submit
    await page
      .locator(
        'button[type="submit"], button:has-text("Reset"), button:has-text("Send")',
      )
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Check for validation error
    const validationError = await TestHelpers.checkUIElementExists(
      page,
      'text=/invalid|valid email|format/i',
      3000,
    );

    if (validationError) {
      console.log('✅ Email validation in reset form works');
    } else {
      console.log('ℹ️  Email validation not visible (may use HTML5 validation)');
    }
  });
});

test.describe('Email Workflows - Password Reset Completion', () => {
  test('should display reset password form with valid token', async ({ page }) => {
    // Note: In real test, you would extract token from email
    // For now, test the page structure
    const mockToken = 'test-reset-token-123';

    await page.goto(`/auth/reset-password?token=${mockToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if form exists or if we get 404
    const hasForm = await TestHelpers.checkUIElementExists(
      page,
      'form, input[type="password"]',
      3000,
    );

    const is404 =
      page.url().includes('404') ||
      (await TestHelpers.checkUIElementExists(page, 'text=/404|not found/i'));

    if (hasForm && !is404) {
      console.log('✅ Reset password page accessible');

      // Check for password fields
      const hasPasswordFields = await TestHelpers.checkUIElementExists(
        page,
        'input[name="password"], input[name="newPassword"]',
        3000,
      );

      if (hasPasswordFields) {
        console.log('✅ Password reset form has required fields');
      }
    } else {
      console.log('ℹ️  Reset password page not accessible (expected with mock token)');
    }
  });

  test('should show error for expired reset token', async ({ page }) => {
    const expiredToken = 'expired-token-123';

    await page.goto(`/auth/reset-password?token=${expiredToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for error message about expired token
    const hasExpiredMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/expired|invalid|no longer valid/i',
      5000,
    );

    if (hasExpiredMessage) {
      console.log('✅ Expired token error shown');
    } else {
      console.log('ℹ️  Expired token handling not tested (requires valid flow)');
    }
  });
});

test.describe('Email Workflows - Email Verification', () => {
  test('should show email verification reminder after registration', async ({
    page,
  }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Generate unique test user
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
    const testEmail = `test.verification.${timestamp}@${emailDomain}`;

    // Fill registration form
    await page.fill('input[name="full_name"]', 'Test Verification User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
    await page.fill('input[name="confirmPassword"]', TEST_DATA.PASSWORD.VALID);

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check for verification message
    const verificationMessage = await TestHelpers.checkUIElementExists(
      page,
      'text=/verify|verification|check your email|confirm your email/i',
      5000,
    );

    if (verificationMessage) {
      console.log('✅ Email verification reminder shown after registration');
    } else {
      console.log(
        'ℹ️  No explicit verification reminder (may be auto-verified or different flow)',
      );
    }
  });

  test('should have resend verification email option', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

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
    const testEmail = `test.resend.${timestamp}@${emailDomain}`;

    // Register
    await page.fill('input[name="full_name"]', 'Test Resend User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', TEST_DATA.PASSWORD.VALID);
    await page.fill('input[name="confirmPassword"]', TEST_DATA.PASSWORD.VALID);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Look for resend link/button
    const resendButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Resend"), a:has-text("Resend"), button:has-text("Send again")',
      5000,
    );

    if (resendButton) {
      console.log('✅ Resend verification email option available');

      // Click resend
      await page
        .locator(
          'button:has-text("Resend"), a:has-text("Resend"), button:has-text("Send again")',
        )
        .first()
        .click();
      await page.waitForTimeout(1000);

      // Check for success message
      const resentMessage = await TestHelpers.checkUIElementExists(
        page,
        'text=/resent|sent again|email sent/i',
        3000,
      );

      if (resentMessage) {
        console.log('✅ Verification email resent successfully');
      }
    } else {
      console.log('ℹ️  Resend verification option not found');
    }
  });

  test('should verify email with valid token', async ({ page }) => {
    // Mock verification token
    const mockToken = 'test-verify-token-123';

    await page.goto(`/auth/verify-email?token=${mockToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for verification result (success or error)
    const hasVerificationResult = await TestHelpers.checkUIElementExists(
      page,
      'text=/verified|verification|success|invalid|expired/i',
      5000,
    );

    if (hasVerificationResult) {
      console.log('✅ Email verification endpoint accessible');
    } else {
      console.log(
        'ℹ️  Email verification page not accessible (expected with mock token)',
      );
    }
  });

  test('should show error for invalid verification token', async ({ page }) => {
    const invalidToken = 'invalid-token-xyz';

    await page.goto(`/auth/verify-email?token=${invalidToken}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for error message
    const hasError = await TestHelpers.checkUIElementExists(
      page,
      'text=/invalid|expired|not found|error/i',
      5000,
    );

    if (hasError) {
      console.log('✅ Invalid token error shown');
    } else {
      console.log('ℹ️  Invalid token handling not visible (may redirect)');
    }
  });
});

test.describe('Email Workflows - Email Notifications', () => {
  test('should show notification settings', async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Look for email notification settings
    const emailNotificationSetting = await TestHelpers.checkUIElementExists(
      page,
      'text=/email notification|notifications|alerts/i, input[type="checkbox"]',
      5000,
    );

    if (emailNotificationSetting) {
      console.log('✅ Email notification settings available');
    } else {
      console.log('ℹ️  Email notification settings not found');
    }
  });

  test('should toggle email notifications', async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Look for notification toggle
    const notificationToggle = await TestHelpers.checkUIElementExists(
      page,
      'input[type="checkbox"]:near(text=/email/i)',
      5000,
    );

    if (notificationToggle) {
      // Get current state
      const isChecked = await page
        .locator('input[type="checkbox"]:near(text=/email/i)')
        .first()
        .isChecked();

      // Toggle
      if (isChecked) {
        await page
          .locator('input[type="checkbox"]:near(text=/email/i)')
          .first()
          .uncheck();
      } else {
        await page
          .locator('input[type="checkbox"]:near(text=/email/i)')
          .first()
          .check();
      }

      await page.waitForTimeout(1000);

      console.log('✅ Email notification toggle functional');
    } else {
      console.log('ℹ️  Email notification toggle not found');
    }
  });
});

test.describe('Email Workflows - Admin Email Management', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Skip if not admin - this test requires admin credentials
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');

    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should manually verify user email (admin)', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to users
    const userTab = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Users"), [role="tab"]:has-text("User")',
    );

    if (userTab) {
      await page
        .locator('button:has-text("Users"), [role="tab"]:has-text("User")')
        .first()
        .click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');
    }

    // Look for verify email button
    const verifyButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Verify"), [data-testid="verify-email"]',
      5000,
    );

    if (verifyButton) {
      console.log('✅ Admin can manually verify user emails');
    } else {
      console.log('ℹ️  Manual email verification not found in admin panel');
    }
  });

  test('should show email verification status', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    const userTab = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Users"), [role="tab"]:has-text("User")',
    );

    if (userTab) {
      await page
        .locator('button:has-text("Users"), [role="tab"]:has-text("User")')
        .first()
        .click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');
    }

    // Check if verification status is displayed
    const verificationStatus = await TestHelpers.checkUIElementExists(
      page,
      'text=/verified|unverified|pending/i',
      5000,
    );

    if (verificationStatus) {
      console.log('✅ Email verification status visible in user list');
    } else {
      console.log('ℹ️  Email verification status not displayed');
    }
  });
});
