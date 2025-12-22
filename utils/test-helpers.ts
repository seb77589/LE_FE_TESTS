import { Page, expect, Locator, Request } from '@playwright/test';
import { TEST_DATA } from '../test-credentials';

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role?: 'assistant' | 'manager' | 'superadmin';
}

const adminNetworkTracedPages = new WeakSet<Page>();

export class TestHelpers {
  private static readonly ADMIN_TRACE_DEFAULT_FILTER = /\/api\/v1\/admin\//;

  private static async logAuthCookies(page: Page, context: string) {
    try {
      const cookies = await page.context().cookies();
      const accessCookie = cookies.find(
        (cookie) => cookie.name === 'legalease_access_token',
      );
      const refreshCookie = cookies.find(
        (cookie) => cookie.name === 'legalease_refresh_token',
      );

      console.log('[Auth Helper] Cookie status check', {
        context,
        hasAccessCookie: Boolean(accessCookie),
        hasRefreshCookie: Boolean(refreshCookie),
      });
    } catch (error) {
      console.warn('[Auth Helper] Failed to inspect cookies', {
        context,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private static async detectActiveAuthSession(page: Page): Promise<{
    hasCookie: boolean;
    backendConfirmed: boolean;
  }> {
    const diagnostics = {
      hasCookie: false,
      backendConfirmed: false,
    };

    try {
      const cookies = await page.context().cookies();
      diagnostics.hasCookie = cookies.some(
        (cookie) => cookie.name === 'legalease_access_token',
      );
    } catch (error) {
      console.warn('[Auth Helper] Failed to inspect auth cookies', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (page.isClosed()) {
      return diagnostics;
    }

    try {
      diagnostics.backendConfirmed = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/users/me', {
            method: 'GET',
            credentials: 'include',
          });
          return response.ok;
        } catch (networkError) {
          console.warn('[Auth Helper] Backend session probe failed', {
            error:
              networkError instanceof Error
                ? networkError.message
                : String(networkError),
          });
          return false;
        }
      });
    } catch (error) {
      console.warn('[Auth Helper] Failed to verify backend session', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return diagnostics;
  }

  /**
   * Attach verbose network tracing for admin endpoints to diagnose hanging /admin loads.
   * Logs each /api/v1/admin request lifecycle plus periodic summaries of pending calls.
   */
  static enableAdminNetworkTracing(
    page: Page,
    options?: {
      label?: string;
      filter?: RegExp;
      pendingDumpIntervalMs?: number;
    },
  ) {
    if (adminNetworkTracedPages.has(page)) {
      return;
    }
    adminNetworkTracedPages.add(page);

    const label = options?.label ?? 'AdminNetwork';
    const filter = options?.filter ?? TestHelpers.ADMIN_TRACE_DEFAULT_FILTER;
    const pendingDumpIntervalMs = options?.pendingDumpIntervalMs ?? 8000;
    const pendingRequests = new Map<
      Request,
      { startedAt: number; path: string; host: string }
    >();

    const describeUrl = (url: string): { path: string; host: string } => {
      try {
        const parsed = new URL(url);
        return {
          path: `${parsed.pathname}${parsed.search}`,
          host: parsed.host,
        };
      } catch {
        return { path: url, host: 'unknown' };
      }
    };

    const logPendingSummary = () => {
      if (pendingRequests.size === 0) {
        return;
      }
      const now = Date.now();
      const snapshot = Array.from(pendingRequests.entries()).map(([request, meta]) => ({
        method: request.method(),
        url: meta.path,
        host: meta.host,
        ageMs: now - meta.startedAt,
      }));
      console.log(
        `[${label}] ⏳ Pending admin requests (${snapshot.length})`,
        snapshot,
      );
    };

    const onRequest = (request: Request) => {
      if (!filter.test(request.url())) {
        return;
      }
      const descriptor = describeUrl(request.url());
      pendingRequests.set(request, { startedAt: Date.now(), ...descriptor });
      console.log(`[${label}] ➡️ ${request.method()} ${descriptor.path}`, {
        host: descriptor.host,
      });

      if (descriptor.path.startsWith('/api/v1/admin/activity/stream')) {
        // Fire-and-forget: log headers without awaiting
        request
          .allHeaders()
          .then((headers) => {
            const cookieHeader = headers.cookie ?? headers.Cookie;
            console.log(`[${label}] 🍪 SSE headers`, {
              host: descriptor.host,
              hasCookie: Boolean(cookieHeader),
              cookieLength: cookieHeader?.length ?? 0,
            });
          })
          .catch(() => {
            /* best-effort debug logging */
          });
      }
    };

    const onFinished = async (request: Request) => {
      if (!pendingRequests.has(request)) {
        return;
      }
      const meta = pendingRequests.get(request) ?? {
        startedAt: Date.now(),
        path: describeUrl(request.url()).path,
        host: describeUrl(request.url()).host,
      };
      pendingRequests.delete(request);
      const duration = Date.now() - meta.startedAt;
      const response = await request.response().catch(() => null);
      const status = response?.status() ?? 'unknown';
      const statusText = response?.statusText();
      const statusTextPart = statusText ? ` ${statusText}` : '';
      const statusLabel = `${status}${statusTextPart}`.trim();
      console.log(`[${label}] ✅ ${statusLabel} ${meta.path} (${duration}ms)`, {
        host: meta.host,
      });
    };

    const onFailed = (request: Request) => {
      if (!pendingRequests.has(request)) {
        return;
      }
      const meta = pendingRequests.get(request) ?? {
        startedAt: Date.now(),
        path: describeUrl(request.url()).path,
        host: describeUrl(request.url()).host,
      };
      pendingRequests.delete(request);
      const duration = Date.now() - meta.startedAt;
      const failure = request.failure();
      console.warn(`[${label}] ❌ ${meta.path} failed after ${duration}ms`, {
        host: meta.host,
        ...(failure ? { errorText: failure.errorText } : {}),
      });
    };

    page.on('request', onRequest);
    page.on('requestfinished', onFinished);
    page.on('requestfailed', onFailed);

    const pendingInterval = setInterval(logPendingSummary, pendingDumpIntervalMs);

    page.on('close', () => {
      clearInterval(pendingInterval);
      pendingRequests.clear();
    });
  }

  /**
   * Wait for an API response with retry logic and exponential backoff.
   * Phase 3: Infrastructure resilience improvement.
   *
   * @param page - Playwright page instance
   * @param urlPattern - URL pattern to match (string or RegExp)
   * @param options - Retry options
   * @returns Promise that resolves when API responds successfully
   */
  static async waitForAPIWithRetry(
    page: Page,
    urlPattern: string | RegExp,
    options: { maxRetries?: number; timeout?: number; backoffMs?: number } = {},
  ): Promise<boolean> {
    const { maxRetries = 3, timeout = 10000, backoffMs = 1000 } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.waitForResponse(
          (response) => {
            const url = response.url();
            const matches =
              typeof urlPattern === 'string'
                ? url.includes(urlPattern)
                : urlPattern.test(url);
            return matches && response.status() === 200;
          },
          { timeout },
        );
        return true; // Success
      } catch {
        if (attempt === maxRetries) {
          console.warn(`⚠️ API ${urlPattern} failed after ${maxRetries} attempts`);
          return false; // All retries exhausted
        }
        console.log(
          `⚠️ API ${urlPattern} attempt ${attempt}/${maxRetries} failed, retrying in ${backoffMs * attempt}ms...`,
        );
        await page.waitForTimeout(backoffMs * attempt); // Exponential backoff
      }
    }
    return false;
  }

  /**
   * Wait for a button to become enabled with dynamic polling.
   * Phase 4: Replaces fixed waits with proper state detection.
   *
   * @param page - Playwright page instance
   * @param button - Locator for the button element
   * @param options - Polling options
   * @returns Object with success status and diagnostic info
   */
  static async waitForButtonEnabled(
    page: Page,
    button: Locator,
    options: { maxAttempts?: number; pollInterval?: number } = {},
  ): Promise<{ enabled: boolean; waitTime: number; validationErrors: string[] }> {
    const { maxAttempts = 50, pollInterval = 200 } = options; // 10s total default
    const startTime = Date.now();
    let validationErrors: string[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      const isEnabled = await button.isEnabled().catch(() => false);
      if (isEnabled) {
        return {
          enabled: true,
          waitTime: Date.now() - startTime,
          validationErrors: [],
        };
      }

      // Check for validation errors that might prevent enabling
      if (i > 10) {
        // After 2s, start checking for errors
        const errors = await page
          .locator('.text-red-500, .text-red-600, [role="alert"]')
          .allTextContents()
          .catch(() => []);
        if (errors.length > 0) {
          validationErrors = errors;
        }
      }

      await page.waitForTimeout(pollInterval);
    }

    // Final error collection
    validationErrors = await page
      .locator('.text-red-500, .text-red-600, [role="alert"]')
      .allTextContents()
      .catch(() => []);

    return {
      enabled: false,
      waitTime: Date.now() - startTime,
      validationErrors,
    };
  }

  /**
   * Generate a unique test user with timestamp to avoid conflicts
   * Uses TEST_DATA.PASSWORD.VALID as base with timestamp suffix for uniqueness
   * Uses email domain is extracted from TEST_USER_EMAIL environment variable
   */
  static generateTestUser(): TestUser {
    const timestamp = Date.now();
    // Use base password from environment variables and append timestamp for uniqueness
    // This ensures password meets policy requirements while maintaining uniqueness
    const password = `${TEST_DATA.PASSWORD.VALID}${timestamp.toString().slice(-6)}`;

    // Extract email domain from TEST_USER_EMAIL environment variable
    // Must be set in config/.env - validated by test-credentials.ts
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

    return {
      email: `test.user.${timestamp}@${emailDomain}`,
      password,
      fullName: `Test User ${timestamp}`,
      // Always use 'ASSISTANT' (uppercase) for backend compatibility
      role: 'ASSISTANT' as any,
    };
  }

  /**
   * Register a new user through the UI
   * OPTIMIZED: Parallel API waits, reduced timeouts, validation state detection
   * Target: < 30s total (down from ~120s max)
   */
  static async registerUser(page: Page, user: TestUser): Promise<void> {
    await page.goto('/auth/register');

    // Wait for page to fully load including lazy-loaded form
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Brief wait for Suspense

    // Wait for the form to be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });

    // OPTIMIZATION: Wait for password policy and email validation rules in PARALLEL
    // Phase 3: Uses retry logic with exponential backoff for resilience
    const startTime = Date.now();
    const [passwordPolicyLoaded, emailValidationLoaded] = await Promise.all([
      // Password policy with retry (critical for registration)
      this.waitForAPIWithRetry(page, '/api/v1/auth/password-policy', {
        maxRetries: 3,
        timeout: 10000,
        backoffMs: 1000,
      }).then((success) => {
        if (success) {
          console.log('✅ Password policy loaded');
        } else {
          console.warn('⚠️ Password policy not loaded after retries, proceeding');
        }
        return success;
      }),

      // Email validation rules with retry
      this.waitForAPIWithRetry(page, '/api/v1/validation/rules/email', {
        maxRetries: 3,
        timeout: 10000,
        backoffMs: 1000,
      }).then((success) => {
        if (success) {
          console.log('✅ Email validation rules loaded');
        } else {
          console.warn(
            '⚠️ Email validation rules not loaded after retries, proceeding',
          );
        }
        return success;
      }),
    ]);
    console.log(
      `API preload completed in ${Date.now() - startTime}ms (password: ${passwordPolicyLoaded}, email: ${emailValidationLoaded})`,
    );

    // CRITICAL: Wait for React to process the password policy and update component state
    // The API response arrives, but React needs time to update usePasswordPolicy hook state,
    // trigger re-renders, and re-run usePasswordValidation hook
    await page.waitForTimeout(1000);

    // Fill the registration form - use improved selectors similar to login
    const fullNameInput = page.locator(
      'input[name="full_name"], input[id="full_name"]',
    );
    const emailInput = page.locator('input[name="email"], input[id="email"]');
    const passwordInput = page.locator('input[name="password"], input[id="password"]');
    const confirmPasswordInput = page.locator(
      'input[name="confirmPassword"], input[id="confirmPassword"]',
    );

    // OPTIMIZATION: Check all fields visible in parallel
    await Promise.all([
      expect(fullNameInput).toBeVisible({ timeout: 3000 }),
      expect(emailInput).toBeVisible({ timeout: 3000 }),
      expect(passwordInput).toBeVisible({ timeout: 3000 }),
      expect(confirmPasswordInput).toBeVisible({ timeout: 3000 }),
    ]);

    // Fill fields with reduced individual timeouts
    await fullNameInput.fill(user.fullName, { timeout: 3000 });
    await emailInput.fill(user.email, { timeout: 3000 });
    await passwordInput.fill(user.password, { timeout: 3000 });
    await confirmPasswordInput.fill(user.password, { timeout: 3000 });

    // === CRITICAL FIX: Trigger React Hook Form validation ===
    // React Hook Form uses mode: 'onBlur', which requires blur events
    await fullNameInput.blur();
    await emailInput.blur();
    await passwordInput.blur();
    await confirmPasswordInput.blur();

    // Get submit button reference
    const submitButton = page.locator('button[type="submit"]');

    // Phase 4: Use reusable helper with dynamic polling instead of fixed waits
    // This handles validation debounce automatically via polling
    const buttonResult = await this.waitForButtonEnabled(page, submitButton, {
      maxAttempts: 50, // 10s max (50 * 200ms)
      pollInterval: 200,
    });

    console.log(
      `Submit button ${buttonResult.enabled ? 'enabled' : 'still disabled'} after ${buttonResult.waitTime}ms`,
    );

    if (!buttonResult.enabled) {
      // Log debugging information if button is still disabled
      const isDisabled = await submitButton.getAttribute('disabled');
      const buttonClass = await submitButton.getAttribute('class');
      console.error('❌ Submit button failed to enable:');
      console.error(`   - disabled attribute: ${isDisabled}`);
      console.error(`   - button class: ${buttonClass}`);
      if (buttonResult.validationErrors.length > 0) {
        console.error(
          `   - Validation errors: ${buttonResult.validationErrors.join(', ')}`,
        );
      }
      throw new Error(
        `Submit button not enabled after ${buttonResult.waitTime}ms. Validation errors: ${buttonResult.validationErrors.join(', ') || 'none detected'}`,
      );
    }

    console.log('✅ Submit button enabled successfully');

    // Setup response listener BEFORE clicking
    const registrationPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/auth/register') && response.status() !== 0,
      { timeout: 15000 },
    );

    await submitButton.click();

    // Wait for backend to respond
    try {
      const response = await registrationPromise;
      console.log(`Registration API response: ${response.status()}`);

      // Wait for redirect to dashboard or verify-email page
      await page.waitForURL(/.*(dashboard|verify-email|auth\/register)/, {
        timeout: 15000,
      });

      // Brief wait for frontend state update
      await page.waitForTimeout(500);
    } catch (error) {
      console.warn('Registration API call timeout or error:', error);
      // Check if we're still on register page or have redirected
      const currentUrl = page.url();
      console.log(`Current URL after registration attempt: ${currentUrl}`);

      // If we've redirected somewhere, registration may have succeeded
      if (!currentUrl.includes('/auth/register')) {
        console.log('✅ Registration may have succeeded - redirected to:', currentUrl);
        return;
      }

      // Continue anyway - the test will fail if registration actually failed
      throw error;
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Registration completed in ${totalTime}ms`);
  }

  /**
   * Login a user through the UI
   * Now waits for backend response and handles real backend timing
   */
  static async loginUser(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/auth/login');

    // Wait for page to fully load including lazy-loaded form
    await page.waitForLoadState('networkidle');

    // Wait for the form to be visible - increased timeout for React Suspense
    await expect(page.locator('form')).toBeVisible({ timeout: 20000 });

    // === CRITICAL: Wait for React hydration ===
    // The form has a data-hydrated attribute set by React after mount
    const hydratedForm = page.locator('form[data-hydrated="true"]');
    try {
      await expect(hydratedForm).toBeVisible({ timeout: 10000 });
      console.log('✅ Form hydration confirmed via data-hydrated attribute');
    } catch {
      console.log('⚠️ Form hydration marker not found, using fallback timing');
      await page.waitForTimeout(3000);
    }

    // Now get input references after hydration
    const emailInput = page.locator('input[name="email"], input[id="email"]');
    const passwordInput = page.locator('input[name="password"], input[id="password"]');

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // Fill the form fields
    await emailInput.fill(email);
    await page.waitForTimeout(100);
    await passwordInput.fill(password);
    await page.waitForTimeout(100);

    // Verify values were set correctly
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    if (emailValue !== email || passwordValue !== password) {
      console.error(
        `Form fill verification failed: email="${emailValue}" (expected "${email}"), password length=${passwordValue.length} (expected ${password.length})`,
      );
      throw new Error('Form values not set correctly - possible hydration issue');
    }

    // Trigger blur for React Hook Form validation
    await emailInput.blur();
    await passwordInput.blur();
    await page.waitForTimeout(500);

    // Wait for the login API call to complete (real backend)
    const loginPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/auth/login') && response.status() !== 0,
      { timeout: 30000 },
    );

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for backend to respond
    try {
      const response = await loginPromise;
      console.log(`Login API response: ${response.status()}`);

      // Give time for frontend to process the response and update state
      await page.waitForTimeout(2000);
    } catch (error) {
      console.warn('Login API call timeout or error:', error);
      // Continue anyway - the test will fail if login actually failed
    }
  }

  /**
   * Wait for form hydration to complete
   */
  private static async waitForFormHydration(page: Page): Promise<void> {
    const hydratedForm = page.locator('form[data-hydrated="true"]');
    try {
      await expect(hydratedForm).toBeVisible({ timeout: 10000 });
      console.log('✅ Form hydration confirmed via data-hydrated attribute');
    } catch {
      // Fallback for forms without hydration marker - use timing-based approach
      console.log('⚠️ Form hydration marker not found, using fallback timing');
      await page.waitForTimeout(3000);
    }
  }

  /**
   * Fill login form and trigger validation
   */
  private static async fillLoginForm(
    page: Page,
    email: string,
    password: string,
  ): Promise<void> {
    const emailInput = page.locator('input[name="email"], input[id="email"]');
    const passwordInput = page.locator('input[name="password"], input[id="password"]');

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // Fill the form fields
    await emailInput.fill(email);
    await page.waitForTimeout(100);
    await passwordInput.fill(password);
    await page.waitForTimeout(100);

    // Verify values were set correctly
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    if (emailValue !== email || passwordValue !== password) {
      console.error(
        `Form fill verification failed: email="${emailValue}" (expected "${email}"), password length=${passwordValue.length} (expected ${password.length})`,
      );
      throw new Error('Form values not set correctly - possible hydration issue');
    }

    // Trigger React Hook Form validation
    await emailInput.blur();
    await passwordInput.blur();

    // Wait for validation to complete + throttle window
    await page.waitForTimeout(500);

    // Click submit and wait for navigation to start (handles async form submission)
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);
  }

  /**
   * Wait for login API response
   */
  private static async waitForLoginResponse(page: Page): Promise<void> {
    try {
      const response = await page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/auth/login') && response.status() !== 0,
        { timeout: 30000 },
      );
      console.log(`Login API response: ${response.status()}`);
      await TestHelpers.logAuthCookies(page, 'post-login API response');
    } catch (error) {
      console.warn('Login API call timeout:', error);
    }
  }

  /**
   * Handle login redirect after successful login
   */
  private static async handleLoginRedirect(
    page: Page,
    expectedUrl: string,
    isAdmin: boolean,
  ): Promise<boolean> {
    // Wait for redirect away from login page
    try {
      await page.waitForURL((url) => !url.href.includes('/auth/login'), {
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
    } catch (error) {
      // If we timeout, we'll check the URL below
    }

    const currentUrl = page.url();
    await TestHelpers.logAuthCookies(page, 'post-redirect check');

    // Success cases
    if (currentUrl.includes(expectedUrl)) {
      console.log(`✅ Login successful - redirected to ${expectedUrl}`);
      return true;
    }

    // Allow admin users to briefly land on /dashboard before redirecting to /admin
    if (isAdmin && currentUrl.includes('/dashboard')) {
      console.log(
        '⚠️ Admin landed on /dashboard, waiting for automatic redirect to /admin...',
      );
      try {
        await page.waitForURL('**/admin', { timeout: 15000 });
        await TestHelpers.logAuthCookies(page, 'post-admin-wait check');
        console.log('✅ Admin redirect completed after intermediate /dashboard step');
        return true;
      } catch (error) {
        console.warn('⌛ Still on /dashboard after waiting for /admin redirect', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return false;
  }

  /**
   * Handle login failure cases
   */
  private static async handleLoginFailure(
    page: Page,
    currentUrl: string,
    expectedUrl: string,
  ): Promise<void> {
    const sessionDiagnostics = await TestHelpers.detectActiveAuthSession(page);

    if (sessionDiagnostics.hasCookie || sessionDiagnostics.backendConfirmed) {
      console.log(
        '⚠️  Login UI still visible but backend session detected, forcing navigation',
        sessionDiagnostics,
      );
      try {
        await page.goto(expectedUrl, { waitUntil: 'commit' });
        await page.waitForLoadState('networkidle');
        await TestHelpers.logAuthCookies(page, 'post-manual-navigation');
        const forcedUrl = page.url();
        if (forcedUrl.includes(expectedUrl)) {
          console.log('✅ Manual navigation succeeded despite stalled redirect');
          return;
        }
        console.warn('Manual navigation did not reach expected route', {
          forcedUrl,
          expectedUrl,
        });
      } catch (manualNavError) {
        console.warn('Manual navigation attempt failed', {
          error:
            manualNavError instanceof Error
              ? manualNavError.message
              : String(manualNavError),
        });
      }
    }

    // Try to get error message from the page before screenshot
    let errorMessage: string | null = null;
    try {
      errorMessage = await page
        .locator('[role="alert"], .text-red-600, .error-message')
        .textContent({ timeout: 2000 })
        .catch(() => null);
    } catch (e) {
      // Ignore timeout
    }

    // Take screenshot for debugging
    try {
      if (!page.isClosed()) {
        await page.screenshot({
          path: `test-results/login-failed-${Date.now()}.png`,
        });
      }
    } catch (e) {
      console.warn('Could not take screenshot (page may be closed):', e);
    }

    throw new Error(
      `Login failed - still on login page.\n` +
        `Current URL: ${currentUrl}\n` +
        `Expected: ${expectedUrl}\n` +
        `Error message: ${errorMessage || 'none visible'}`,
    );
  }

  /**
   * Login a user and wait for the appropriate role-based redirect
   * Regular users → /dashboard
   * Admin/Superadmin users → /admin
   */
  static async loginAndWaitForRedirect(
    page: Page,
    email: string,
    password: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    await page.goto('/auth/login');

    // Wait for page to fully load (including lazy-loaded form via Suspense)
    await page.waitForLoadState('networkidle');

    // Wait for the form to be visible - increased timeout for React Suspense
    await expect(page.locator('form')).toBeVisible({ timeout: 20000 });

    // Wait for React hydration
    await TestHelpers.waitForFormHydration(page);

    // Fill form and submit
    await TestHelpers.fillLoginForm(page, email, password);

    // Wait for login API response
    await TestHelpers.waitForLoginResponse(page);

    // Handle redirect
    const expectedUrl = isAdmin ? '/admin' : '/dashboard';
    const redirectSuccess = await TestHelpers.handleLoginRedirect(
      page,
      expectedUrl,
      isAdmin,
    );

    if (redirectSuccess) {
      return;
    }

    // Check if we're still on login page (failure)
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      await TestHelpers.handleLoginFailure(page, currentUrl, expectedUrl);
    }

    // We're on a different page - might be email verification or other intermediate page
    console.log(
      `⚠️  Navigated to ${currentUrl} instead of expected ${expectedUrl} - continuing...`,
    );
  }

  /**
   * Logout the current user
   * Now waits for navigation to complete (fixes timeout issues)
   */
  static async logoutUser(page: Page): Promise<void> {
    // Look for logout button or user menu
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out")',
    );
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu');

    try {
      if (await userMenu.isVisible({ timeout: 5000 })) {
        await userMenu.click();

        // Wait for logout API call to complete
        const logoutPromise = page
          .waitForResponse(
            (response) => response.url().includes('/api/v1/auth/logout'),
            { timeout: 15000 },
          )
          .catch(() => null); // Don't fail if logout API not called

        await page.click('button:has-text("Logout"), button:has-text("Sign out")');
        await logoutPromise;
      } else if (await logoutButton.isVisible({ timeout: 5000 })) {
        // Wait for logout API call to complete
        const logoutPromise = page
          .waitForResponse(
            (response) => response.url().includes('/api/v1/auth/logout'),
            { timeout: 15000 },
          )
          .catch(() => null);

        await logoutButton.click();
        await logoutPromise;
      } else {
        // Fallback: clear cookies and local storage
        await page.context().clearCookies();
        try {
          await page.evaluate(() => {
            if (typeof localStorage !== 'undefined') {
              localStorage.clear();
            }
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.clear();
            }
          });
        } catch (error) {
          // Ignore localStorage/sessionStorage errors
          console.log(
            'Could not clear storage during logout:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // CRITICAL FIX: Wait for navigation to login page
      try {
        await page.waitForURL(/\/auth\/login|\/$/, { timeout: 15000 });
        console.log('✅ Logout successful - redirected to login page');
      } catch (error) {
        console.warn('Logout redirect timeout, manually navigating to home:', error);
        await page.goto('/');
      }

      // Additional wait for client-side state to clear
      await page.waitForTimeout(1000);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout by clearing everything and navigating
      await page.context().clearCookies();
      await page.evaluate(() => {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch (e) {
          console.warn('Storage clear failed:', e);
        }
      });
      await page.goto('/');
    }
  }

  /**
   * Wait for navigation to complete
   */
  static async waitForNavigation(page: Page, expectedUrl?: string): Promise<void> {
    try {
      // First wait for any pending navigation to start
      await page
        .waitForLoadState('domcontentloaded', { timeout: 5000 })
        .catch(() => {});

      // Then wait for network to be idle
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Finally check the URL if specified
      if (expectedUrl) {
        // Try both exact match and pattern match
        try {
          await page.waitForURL(expectedUrl, { timeout: 10000 });
        } catch {
          // If exact match fails, try pattern match
          await page.waitForURL(new RegExp(expectedUrl.replace('/', '\\/')), {
            timeout: 10000,
          });
        }
      }

      // Additional wait to ensure all client-side navigation is complete
      await page.waitForTimeout(1000);
    } catch (error) {
      console.error(
        `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error(`Current URL: ${page.url()}`);
      console.error(`Expected URL: ${expectedUrl}`);
      throw error;
    }
  }

  /**
   * Check if user is authenticated by looking for user-specific elements
   */
  static async isUserAuthenticated(page: Page): Promise<boolean> {
    try {
      // First check if we're on a protected route
      const currentUrl = page.url();
      const protectedRoutes = ['/dashboard', '/documents', '/profile'];
      const isOnProtectedRoute = protectedRoutes.some((route) =>
        currentUrl.includes(route),
      );

      if (isOnProtectedRoute) {
        // If we're on a protected route, check for authentication indicators
        const userIndicators = [
          '[data-testid="user-name"]',
          '[data-testid="user-menu"]',
          '.user-menu',
          'button:has-text("Logout")',
          'button:has-text("Sign out")',
          // Add more specific indicators
          'a[href="/dashboard"]',
          'a[href="/documents"]',
          'a[href="/profile"]',
        ];

        // Wait for any of the indicators to be visible
        for (const selector of userIndicators) {
          try {
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 5000 })) {
              return true;
            }
          } catch {
            // Continue checking other indicators
            continue;
          }
        }

        // If we're on a protected route but don't see indicators, check for redirect
        try {
          await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
          return false;
        } catch {
          // If we're not redirected to login, check for auth token
          const cookies = await page.context().cookies();
          const hasAuthToken = cookies.some(
            (cookie) =>
              cookie.name === 'access_token' && cookie.value && cookie.value.length > 0,
          );

          if (hasAuthToken) {
            return true;
          }

          // If we have no indicators and no token, we're probably not authenticated
          return false;
        }
      }

      // If we're not on a protected route, check for auth token
      const cookies = await page.context().cookies();
      return cookies.some(
        (cookie) =>
          cookie.name === 'access_token' && cookie.value && cookie.value.length > 0,
      );
    } catch (error) {
      console.error(
        `Authentication check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Wait for an element to be visible with custom timeout
   */
  static async waitForElement(
    page: Page,
    selector: string,
    timeout: number = 10000,
  ): Promise<void> {
    await expect(page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * Take a screenshot with a descriptive name
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    try {
      await page.screenshot({
        path: `test-results/screenshots/${name}-${timestamp}.png`,
        fullPage: true,
      });
    } catch (error) {
      console.warn('Screenshot capture failed:', error);
      // Continue without failing the test when running in strict HTTPS mode
    }
  }

  /**
   * Clear all application data (cookies, localStorage, sessionStorage)
   */
  static async clearApplicationData(page: Page): Promise<void> {
    // Clear cookies (always safe to do)
    await page.context().clearCookies();

    // Clear storage - handle navigation/destroyed context gracefully
    try {
      await page.evaluate(() => {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch (e) {
          console.warn('Storage clearing failed:', e);
        }
      });
    } catch (error) {
      // Page may have navigated or context destroyed - this is fine during cleanup
      if (
        error instanceof Error &&
        (error.message.includes('Execution context was destroyed') ||
          error.message.includes('Target closed'))
      ) {
        // Expected during navigation - storage is cleared anyway
        console.debug(
          'Page context destroyed during cleanup (expected after navigation)',
        );
      } else {
        // Unexpected error - log but don't fail the test
        console.warn('Storage clearing failed:', error);
      }
    }

    // Wait for any pending requests to complete (with error handling)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  /**
   * Wait for API request to complete
   */
  static async waitForApiRequest(
    page: Page,
    urlPattern: string | RegExp,
    timeout: number = 10000,
  ): Promise<void> {
    try {
      const response = await page.waitForResponse(
        (response) => {
          const url = response.url();
          if (typeof urlPattern === 'string') {
            return url.includes(urlPattern);
          }
          return urlPattern.test(url);
        },
        { timeout },
      );

      // Check if the response was successful
      if (!response.ok()) {
        throw new Error(
          `API request failed with status ${response.status()}: ${await response.text()}`,
        );
      }
    } catch (error) {
      console.error(
        `API request failed for ${urlPattern}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error; // Re-throw the error to fail the test
    }
  }

  /**
   * Mock API response for testing
   */
  static async mockApiResponse(
    page: Page,
    urlPattern: string | RegExp,
    responseData: any,
    status: number = 200,
  ): Promise<void> {
    await page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Check if a UI element exists and is visible
   * Returns true if element exists and is visible, false otherwise
   */
  static async checkUIElementExists(
    page: Page,
    selector: string | Locator,
    timeout: number = 5000,
  ): Promise<boolean> {
    try {
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      return await locator.isVisible({ timeout });
    } catch {
      return false;
    }
  }

  /**
   * Wait for UI element to appear, or return null if it doesn't exist
   * Returns the locator if found, null if not found
   */
  static async waitForUIElementOrSkip(
    page: Page,
    selector: string | Locator,
    skipReason: string,
    timeout: number = 5000,
  ): Promise<Locator | null> {
    const locator = typeof selector === 'string' ? page.locator(selector) : selector;
    const exists = await this.checkUIElementExists(page, locator, timeout);

    if (!exists) {
      console.log(`ℹ️ UI element not found: ${skipReason}`);
      return null;
    }

    return locator;
  }

  /**
   * Wait for authentication token to be available in storage
   * Used after login to ensure JWT token is stored before WebSocket connections
   */
  static async waitForAuthToken(
    page: Page,
    timeout: number = 10000,
  ): Promise<string | null> {
    try {
      // First try to wait for token in localStorage
      const token = await page.waitForFunction(
        () => {
          // Try multiple storage locations for the token
          const rawToken = window.localStorage.getItem('access_token_raw');
          if (rawToken) return rawToken;

          const legacyToken = window.localStorage.getItem('access_token');
          if (legacyToken) return legacyToken;

          // Try getting from cookie (not HttpOnly ones though)
          const cookies = document.cookie.split('; ');
          const accessTokenCookie = cookies.find((c) => c.startsWith('access_token='));
          if (accessTokenCookie) {
            return accessTokenCookie.split('=')[1];
          }

          return null;
        },
        { timeout },
      );

      const tokenValue = await token.jsonValue();
      if (tokenValue) {
        console.log('✅ Auth token found in localStorage');
        return tokenValue as string;
      }

      // If localStorage didn't have it, check HttpOnly cookies via Playwright API
      const cookies = await page.context().cookies();
      const tokenCookie = cookies.find((c) => c.name === 'legalease_access_token');
      if (tokenCookie?.value) {
        console.log('✅ Auth token found in HttpOnly cookie');
        return tokenCookie.value;
      }

      console.warn('⚠️ Auth token not found in any storage location');
      return null;
    } catch (error) {
      console.warn('⚠️ Timeout waiting for auth token:', error);

      // Try one more time to get from cookies
      const cookies = await page.context().cookies();
      const tokenCookie = cookies.find((c) => c.name === 'legalease_access_token');
      if (tokenCookie?.value) {
        console.log(
          '✅ Auth token found in HttpOnly cookie (after localStorage timeout)',
        );
        return tokenCookie.value;
      }

      return null;
    }
  }

  /**
   * Login via API directly (bypasses UI for faster WebSocket tests)
   * Returns the access token for WebSocket authentication
   */
  static async loginViaAPI(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API login failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(`✅ API login successful for ${email}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      sessionId: data.session_id,
    };
  }

  /**
   * Setup page with API-obtained token for WebSocket tests
   * This bypasses UI login which can be slow/flaky in parallel test execution
   */
  static async setupPageWithToken(
    page: Page,
    email: string,
    password: string,
  ): Promise<string> {
    // Get token via API
    const { accessToken } = await this.loginViaAPI(email, password);

    // Navigate to a page so we have a valid context
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Store token in localStorage for WebSocket tests
    await page.evaluate((token) => {
      localStorage.setItem('access_token_raw', token);
      localStorage.setItem('access_token', token);
    }, accessToken);

    console.log(`✅ Token stored in localStorage for ${email}`);
    return accessToken;
  }

  /**
   * Get error messages from the page
   */
  static async getErrorMessages(page: Page): Promise<string[]> {
    const errorSelectors = [
      '.error-message',
      '.alert-error',
      '[data-testid="error-message"]',
      '.text-red-500',
      '.text-red-600',
      '[role="alert"]', // Alert component uses this
      '.bg-red-50', // Error variant of Alert component
    ];

    const errors: string[] = [];

    for (const selector of errorSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible()) {
          const text = await element.textContent();
          if (text) {
            errors.push(text.trim());
          }
        }
      }
    }

    return errors;
  }
}
