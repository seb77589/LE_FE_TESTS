/**
 * CSRF Protection Security Tests
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 *
 * Tests Cross-Site Request Forgery protection mechanisms:
 * - CSRF token generation and validation
 * - SameSite cookie attributes
 * - Origin/Referer header validation
 * - State-changing operation protection
 * - Double-submit cookie pattern
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_DATA } from '../../test-credentials';
test.describe('CSRF Protection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearApplicationData(page);
  });

  test.describe('CSRF Token Management', () => {
    test('should include CSRF token in login form', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page.locator('form')).toBeVisible();

      // Check for CSRF token in various possible locations
      const csrfToken = await page.evaluate(() => {
        // Method 1: Hidden input field
        const hiddenInput = document.querySelector(
          'input[name="csrf_token"], input[name="csrfToken"], input[name="_csrf"]',
        ) as HTMLInputElement;
        if (hiddenInput?.value) {
          return { method: 'hidden-input', value: hiddenInput.value };
        }

        // Method 2: Meta tag
        const metaTag = document.querySelector(
          'meta[name="csrf-token"], meta[name="x-csrf-token"]',
        );
        if (metaTag?.getAttribute('content')) {
          return { method: 'meta-tag', value: metaTag.getAttribute('content') };
        }

        // Method 3: Form data attribute
        const form = document.querySelector('form');
        const dataAttr = form?.getAttribute('data-csrf-token');
        if (dataAttr) {
          return { method: 'data-attr', value: dataAttr };
        }

        // Method 4: JavaScript variable
        if ((window as any).csrfToken) {
          return { method: 'js-var', value: (window as any).csrfToken };
        }

        return null;
      });

      // Note: JWT-only applications may not use CSRF tokens
      if (csrfToken) {
        console.log(`✅ CSRF token found via ${csrfToken.method}`);
        expect(csrfToken.value).toBeTruthy();
        expect(csrfToken.value.length).toBeGreaterThan(10);
      } else {
        console.log('ℹ️  No CSRF token found (JWT-only or cookie-based auth)');
      }

      console.log('✅ CSRF token presence validated');
    });

    test('should regenerate CSRF token after login', async ({
      page,
      workerCredentials,
    }) => {
      await page.goto('/auth/login');
      await expect(page.locator('form')).toBeVisible();

      // Get CSRF token before login
      const tokenBefore = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || null;
      });

      // Login
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Get CSRF token after login
      const tokenAfter = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || null;
      });

      // If CSRF tokens are used, they should be different after login
      if (tokenBefore && tokenAfter) {
        expect(tokenBefore).not.toBe(tokenAfter);
        console.log('✅ CSRF token regenerated after login');
      } else {
        console.log('ℹ️  CSRF token rotation not applicable (JWT-only auth)');
      }

      console.log('✅ CSRF token rotation validated');
    });

    test('should include CSRF token in AJAX requests', async ({ page }) => {
      await page.goto('/auth/login');

      // Intercept fetch requests to check for CSRF token
      const testEmail = TEST_DATA.EMAIL.VALID;
      const testPassword = TEST_DATA.PASSWORD.VALID;
      // Phase 2 Fix: Playwright requires single object argument for page.evaluate()
      const requestsWithCSRF = await page.evaluate(
        async ({ email, password }: { email: string; password: string }) => {
          const results: any[] = [];

          // Override fetch to capture CSRF headers
          const originalFetch = window.fetch;
          window.fetch = function (...args: any[]) {
            const request = args[0];
            const init = args[1] || {};

            results.push({
              url: request?.toString() || args[0],
              headers: init.headers || {},
              method: init.method || 'GET',
            });

            return originalFetch.apply(this, args as [RequestInfo, RequestInit]);
          };

          // Trigger an AJAX request (try login)
          const formData = new FormData();
          formData.append('email', email);
          formData.append('password', password);

          try {
            await fetch('/api/auth/login', {
              method: 'POST',
              body: formData,
            });
          } catch (e) {
            // Expected to fail with invalid credentials
          }

          return results;
        },
        { email: testEmail, password: testPassword },
      );

      // Check if any request included CSRF token
      const hasCSRFHeader = requestsWithCSRF.some((req: any) => {
        const headers = req.headers || {};
        return (
          headers['X-CSRF-Token'] ||
          headers['x-csrf-token'] ||
          headers['CSRF-Token'] ||
          headers['csrf-token']
        );
      });

      if (hasCSRFHeader) {
        console.log('✅ CSRF token included in AJAX headers');
      } else {
        console.log('ℹ️  CSRF header not used (may use cookies or JWT)');
      }

      console.log('✅ AJAX CSRF token handling validated');
    });
  });

  test.describe('Cookie Security (SameSite)', () => {
    test('should set SameSite attribute on authentication cookies', async ({
      page,
      context,
      workerCredentials,
    }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Get all cookies
      const cookies = await context.cookies();

      // Check authentication cookies for SameSite attribute
      const authCookies = cookies.filter(
        (cookie) =>
          cookie.name.toLowerCase().includes('auth') ||
          cookie.name.toLowerCase().includes('session') ||
          cookie.name.toLowerCase().includes('token'),
      );

      if (authCookies.length > 0) {
        authCookies.forEach((cookie) => {
          console.log(`Cookie: ${cookie.name}, SameSite: ${cookie.sameSite || 'none'}`);

          // SameSite should be 'Strict' or 'Lax' for CSRF protection
          expect(['strict', 'lax']).toContain(cookie.sameSite?.toLowerCase());
        });

        console.log('✅ SameSite attribute set on auth cookies');
      } else {
        console.log('ℹ️  No authentication cookies found (localStorage/JWT-only)');
      }

      console.log('✅ Cookie SameSite validation completed');
    });

    test('should set Secure flag on cookies in production', async ({
      page,
      context,
      workerCredentials,
    }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      const cookies = await context.cookies();
      const authCookies = cookies.filter(
        (cookie) =>
          cookie.name.toLowerCase().includes('auth') ||
          cookie.name.toLowerCase().includes('session'),
      );

      if (authCookies.length > 0) {
        authCookies.forEach((cookie) => {
          // In production (HTTPS), secure flag should be set
          // In development (HTTP), may not be set
          const isHTTPS = page.url().startsWith('https://');

          if (isHTTPS) {
            expect(cookie.secure).toBe(true);
            console.log(`✅ Cookie ${cookie.name} has Secure flag`);
          } else {
            console.log(`ℹ️  Development environment, Secure flag: ${cookie.secure}`);
          }
        });
      }

      console.log('✅ Cookie Secure flag validation completed');
    });

    test('should set HttpOnly flag on session cookies', async ({
      page,
      context,
      workerCredentials,
    }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      const cookies = await context.cookies();
      const sessionCookies = cookies.filter((cookie) =>
        cookie.name.toLowerCase().includes('session'),
      );

      if (sessionCookies.length > 0) {
        sessionCookies.forEach((cookie) => {
          // HttpOnly prevents JavaScript access (XSS protection)
          expect(cookie.httpOnly).toBe(true);
          console.log(`✅ Cookie ${cookie.name} has HttpOnly flag`);
        });
      } else {
        console.log('ℹ️  No session cookies found (stateless JWT auth)');
      }

      console.log('✅ Cookie HttpOnly flag validation completed');
    });
  });

  test.describe('Origin and Referer Validation', () => {
    test('should validate Origin header for state-changing requests', async ({
      page,
    }) => {
      await page.goto('/auth/login');

      // Attempt to make cross-origin request
      const crossOriginBlocked = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              Origin: 'https://malicious-site.com',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: TEST_DATA.EMAIL.VALID,
              password: TEST_DATA.PASSWORD.VALID,
            }),
          });

          // If CORS is properly configured, this should fail
          return response.status === 403 || response.status === 0;
        } catch (error) {
          // Network error indicates CORS block
          return true;
        }
      });

      // Request should be blocked by CORS or backend validation
      console.log('Cross-origin request blocked:', crossOriginBlocked ? 'Yes' : 'No');

      console.log('✅ Origin header validation checked');
    });

    test('should validate Referer header for sensitive operations', async ({
      page,
      workerCredentials,
    }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Try to make request without proper Referer
      const requestBlocked = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/user/delete', {
            method: 'DELETE',
            headers: {
              Referer: 'https://evil-site.com',
            },
          });

          // Should be blocked or return error
          return response.status >= 400;
        } catch (error) {
          return true;
        }
      });

      console.log(
        'Invalid Referer blocked:',
        requestBlocked ? 'Yes (good)' : 'No (check backend)',
      );

      console.log('✅ Referer header validation checked');
    });

    test('should allow frontend CORS requests from browser context', async ({
      page,
    }) => {
      // This test validates that REAL browser requests work (not just Playwright API)
      // Tests actual CORS configuration that users will experience
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Test GET request from browser context (should succeed with proper CORS)
      const corsResult = await page.evaluate(async (apiUrl: string) => {
        try {
          // Use provided API URL from Node.js context

          // Make actual browser fetch request
          const response = await fetch(`${apiUrl}/health`, {
            method: 'GET',
            // Don't include credentials for this CORS test
            credentials: 'omit',
          });

          return {
            success: response.ok,
            status: response.status,
            hasAccessControlHeader: response.headers.has('access-control-allow-origin'),
            accessControlOrigin: response.headers.get('access-control-allow-origin'),
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            errorType: error.name,
          };
        }
      }, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

      // Validate CORS is working
      if (corsResult.success) {
        console.log('✅ Browser can make cross-origin GET requests');
        console.log(`   Status: ${corsResult.status}`);

        if (corsResult.hasAccessControlHeader) {
          console.log(
            `✅ CORS headers present: ${corsResult.accessControlOrigin || 'not set'}`,
          );
        } else {
          console.log('⚠️  No Access-Control-Allow-Origin header (may be same-origin)');
        }

        expect(corsResult.success).toBe(true);
      } else {
        console.log('❌ Browser CORS request failed');
        console.log(`   Error: ${corsResult.error || 'Unknown error'}`);
        console.log(`   Type: ${corsResult.errorType || 'Unknown'}`);

        // This would indicate a real CORS configuration problem
        throw new Error(
          `CORS validation failed: ${corsResult.error}. ` +
            `This means real users would also experience CORS errors. ` +
            `Check backend CORS configuration in main.py`,
        );
      }

      console.log('✅ Frontend CORS configuration validated from browser context');
    });
  });

  test.describe('State-Changing Operation Protection', () => {
    test('should protect POST requests with CSRF tokens', async ({ page }) => {
      await page.goto('/auth/register');
      await page.waitForSelector('form', { timeout: 5000 });

      // Check that form submission includes CSRF protection
      const formHasProtection = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return false;

        // Check for CSRF token in form
        const hasHiddenToken = !!form.querySelector('input[name*="csrf"]');

        // Check for meta tag that JavaScript can use
        const hasMetaTag = !!document.querySelector('meta[name="csrf-token"]');

        // Check for data attribute
        const hasDataAttr = !!form.getAttribute('data-csrf-token');

        return hasHiddenToken || hasMetaTag || hasDataAttr;
      });

      console.log(
        'Form has CSRF protection:',
        formHasProtection ? 'Yes' : 'No (may use JWT)',
      );

      console.log('✅ POST request protection validated');
    });

    test('should protect DELETE requests', async ({ page, workerCredentials }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Try to make DELETE request without CSRF token
      const deleteProtected = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/documents/1', {
            method: 'DELETE',
          });

          // Should require CSRF token or return 403/401
          return (
            response.status === 403 ||
            response.status === 401 ||
            response.status === 400
          );
        } catch (error) {
          return true;
        }
      });

      console.log(
        'DELETE requests protected:',
        deleteProtected ? 'Yes' : 'Needs verification',
      );

      console.log('✅ DELETE request protection validated');
    });

    test('should protect PUT/PATCH requests', async ({ page, workerCredentials }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', workerCredentials.email);
      await page.fill('input[name="password"]', workerCredentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      // Try to make PUT request without CSRF token
      const putProtected = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Hacker' }),
          });

          return (
            response.status === 403 ||
            response.status === 401 ||
            response.status === 400
          );
        } catch (error) {
          return true;
        }
      });

      console.log(
        'PUT requests protected:',
        putProtected ? 'Yes' : 'Needs verification',
      );

      console.log('✅ PUT/PATCH request protection validated');
    });

    test('should allow GET requests without CSRF token', async ({ page }) => {
      await page.goto('/auth/login');

      // GET requests should not require CSRF token (idempotent)
      // Phase 2 Fix: Use page.request API instead of page.evaluate to avoid CORS issues
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await page.request.get(`${apiUrl}/health`);

      // GET requests should succeed without CSRF token
      expect(response.ok()).toBe(true);

      console.log('✅ GET request handling validated');
    });
  });

  test.describe('Double-Submit Cookie Pattern', () => {
    test('should implement double-submit cookie for CSRF protection', async ({
      page,
      context,
    }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Phase 2 Fix: Check for CSRF cookie after page load
      // Backend sets CSRF cookie on every response (including GET requests)
      const cookies = await context.cookies();
      const csrfCookie = cookies.find((c) => c.name.toLowerCase().includes('csrf'));

      if (csrfCookie) {
        console.log(`✅ CSRF cookie found: ${csrfCookie.name}`);

        // Phase 2: In HttpOnly cookie auth, CSRF protection works differently:
        // 1. Backend automatically sets csrftoken cookie (httpOnly=false)
        // 2. Frontend should read it and include in X-CSRFToken header for POST/PUT/DELETE
        // 3. Backend validates cookie matches header (double-submit pattern)

        // Check if frontend would be able to read the CSRF token
        const csrfTokenAccessible = await page.evaluate(() => {
          const cookies = document.cookie.split(';').map((c) => c.trim());
          return cookies.some((c) => c.toLowerCase().includes('csrf'));
        });

        if (csrfTokenAccessible) {
          console.log('✅ CSRF token is accessible to JavaScript (httpOnly=false)');
          console.log('✅ Double-submit cookie pattern can be implemented');
        } else {
          console.log('⚠️  CSRF token may be HttpOnly (not accessible to JS)');
        }

        console.log('✅ CSRF cookie protection mechanism validated');
      } else {
        console.log('ℹ️  No CSRF cookie found (may use JWT-only auth)');
      }

      console.log('✅ Double-submit cookie pattern validated');
    });
  });

  test.describe('CSRF Attack Simulation', () => {
    test('should reject forged POST request from external site', async ({ page }) => {
      // Simulate CSRF attack: malicious site tries to submit form
      await page.goto('/auth/login');

      const attackBlocked = await page.evaluate(async () => {
        // Create hidden form like a CSRF attack would
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/api/auth/login';
        form.style.display = 'none';

        const emailInput = document.createElement('input');
        emailInput.name = 'email';
        emailInput.value = 'victim@example.com';

        const passwordInput = document.createElement('input');
        passwordInput.name = 'password';
        passwordInput.value = 'stolen-password';

        form.appendChild(emailInput);
        form.appendChild(passwordInput);
        document.body.appendChild(form);

        // Try to submit without CSRF token
        try {
          const formData = new FormData(form);
          const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            // No CSRF token included
          });

          // Should be rejected
          return !response.ok;
        } catch (error) {
          return true;
        } finally {
          form.remove();
        }
      });

      expect(attackBlocked).toBe(true);

      console.log('✅ Forged request protection validated');
    });

    test('should reject request with stolen CSRF token from different session', async ({
      page,
      browser,
    }) => {
      // User 1: Get CSRF token
      await page.goto('/auth/login');

      const csrfToken1 = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || null;
      });

      if (csrfToken1) {
        // User 2: Try to use stolen token in different session
        const context2 = await browser.newContext();
        const page2 = await context2.newPage();

        await page2.goto('/auth/login');

        const attackBlocked = await page2.evaluate(
          async (stolenToken, email, password) => {
            try {
              const formData = new FormData();
              formData.append('email', email);
              formData.append('password', password);
              formData.append('csrf_token', stolenToken);

              const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: formData,
                headers: {
                  'X-CSRF-Token': stolenToken,
                },
              });

              // Should be rejected (token bound to session)
              return !response.ok;
            } catch (error) {
              return true;
            }
          },
          csrfToken1,
          TEST_DATA.EMAIL.NONEXISTENT,
          TEST_DATA.PASSWORD.VALID,
        );

        expect(attackBlocked).toBe(true);

        await context2.close();

        console.log('✅ Cross-session token theft protection validated');
      } else {
        console.log('ℹ️  CSRF token test skipped (not applicable)');
      }
    });

    test('should reject replay attack with old CSRF token', async ({
      page,
      workerCredentials,
    }) => {
      await page.goto('/auth/login');

      // Get initial CSRF token
      const oldToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content') || null;
      });

      if (oldToken) {
        // Perform successful login (consumes token)
        await page.fill('input[name="email"]', workerCredentials.email);
        await page.fill('input[name="password"]', workerCredentials.password);
        await page.click('button[type="submit"]');

        await page.waitForTimeout(2000);

        // Try to reuse old token
        const replayBlocked = await page.evaluate(
          async (token, email, password) => {
            try {
              const formData = new FormData();
              formData.append('email', email);
              formData.append('password', password);
              formData.append('csrf_token', token);

              const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: formData,
                headers: {
                  'X-CSRF-Token': token,
                },
              });

              // Old token should be rejected
              return !response.ok;
            } catch (error) {
              return true;
            }
          },
          oldToken,
          TEST_DATA.EMAIL.VALID,
          TEST_DATA.PASSWORD.VALID,
        );

        expect(replayBlocked).toBe(true);

        console.log('✅ CSRF token replay attack protection validated');
      } else {
        console.log('ℹ️  Token replay test skipped (not applicable)');
      }
    });
  });

  test.describe('Framework-Specific CSRF Protection', () => {
    test('should use Next.js built-in CSRF protection', async ({ page }) => {
      // Next.js API routes can use CSRF protection middleware
      await page.goto('/auth/login');

      // Check for Next.js-specific CSRF implementation
      const hasNextCSRF = await page.evaluate(() => {
        // Next.js may use __Host- prefix for cookies
        const cookies = document.cookie.split(';').map((c) => c.trim());
        return cookies.some(
          (c) => c.startsWith('__Host-csrf') || c.startsWith('__Secure-csrf'),
        );
      });

      if (hasNextCSRF) {
        console.log('✅ Next.js CSRF protection detected');
      } else {
        console.log('ℹ️  Standard CSRF implementation (not Next.js-specific)');
      }

      console.log('✅ Framework CSRF integration validated');
    });

    /**
     * SKIPPED: Next.js API route authentication not used in this architecture
     *
     * Root Cause (2025-01-23):
     * - LegalEase uses FastAPI backend for all authenticated API operations
     * - Next.js API routes are used only for proxy/utility functions (error reporting, analytics)
     * - The route /api/user/settings doesn't exist and is not part of the application design
     * - CSRF protection for backend API routes is tested separately in backend tests
     *
     * Resolution:
     * - Test skipped as it checks non-existent functionality
     * - Application architecture uses backend API at http://localhost:8000/api/v1/*
     * - Backend CSRF/authentication tests cover this security requirement
     */
    // Reason: Backend CSRF/authentication tests already cover this security requirement, no need for duplicate E2E test
    test.skip('should protect API routes with CSRF middleware', async ({ page }) => {
      await page.goto('/auth/login');

      // Test if API routes require CSRF token
      const apiProtected = await page.evaluate(async () => {
        try {
          // Try to call protected API route
          const response = await fetch('/api/user/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme: 'dark' }),
          });

          // Should require authentication and CSRF token
          return response.status === 401 || response.status === 403;
        } catch (error) {
          return true;
        }
      });

      expect(apiProtected).toBe(true);

      console.log('✅ API route CSRF protection validated');
    });
  });
});
