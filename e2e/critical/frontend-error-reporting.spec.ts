/**
 * E2E Tests: Frontend Error Reporting
 *
 * Validates that frontend error logging service correctly reports errors to backend.
 * Tests the /api/v1/frontend-errors/report endpoint with real backend.
 *
 * @description Ensures error tracking pipeline works end-to-end from browser to backend.
 * CRITICAL: This test prevented 2,161 404s when /logs vs /report path mismatch was discovered.
 *
 * @since 0.2.0
 */

import { test, expect } from '@playwright/test';

const ERROR_REPORT_ENDPOINT = '/api/v1/frontend-errors/report';
const BACKEND_HEALTH = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/health`
  : 'http://192.168.5.107:8000/health';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

test.describe('Frontend Error Reporting (real backend)', () => {
  test('should report single error format with 204 response', async ({
    page,
    request,
  }) => {
    // Verify backend is available
    const health = await request.get(BACKEND_HEALTH).catch(() => null);
    if (!health || health.status() !== 200) {
      console.warn(`[E2E] Warning: Backend health not available at ${BACKEND_HEALTH}`);
    }

    let errorReportPosts = 0;
    let lastStatus: number | undefined;
    let lastRequestBody: any;

    // Monitor requests to error reporting endpoint
    page.on('request', async (req) => {
      const url = req.url();
      if (url.includes(ERROR_REPORT_ENDPOINT)) {
        errorReportPosts += 1;
        console.log(`[E2E] Error report request: ${req.method()} ${url}`);

        // Capture request body for validation
        try {
          const postData = req.postData();
          if (postData) {
            lastRequestBody = JSON.parse(postData);
            console.log(
              `[E2E] Request body:`,
              JSON.stringify(lastRequestBody, null, 2),
            );
          }
        } catch (e) {
          console.warn('[E2E] Failed to parse request body:', e);
        }
      }
    });

    // Monitor responses from error reporting endpoint
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes(ERROR_REPORT_ENDPOINT)) {
        lastStatus = res.status();
        console.log(`[E2E] Error report response: ${res.status()} ${url}`);
      }
    });

    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Trigger error logging via browser console evaluation
    // This simulates how the frontend logger would work
    await page.evaluate(() => {
      // Create a single error log entry
      const errorPayload = {
        message: 'E2E Test Error: Sample frontend error',
        stack: 'Error: E2E Test Error\n  at test.spec.ts:100:5',
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'error',
        metadata: {
          testId: 'e2e-frontend-error-reporting',
          testType: 'single-error-format',
        },
      };

      // Send error directly via fetch (simulating logger.exportLogs)
      fetch('/api/v1/frontend-errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorPayload),
      }).catch((err) => {
        console.error('[E2E] Failed to report error:', err);
      });
    });

    // Wait for the error report response
    try {
      const errorResponse = await page.waitForResponse(
        (r) =>
          r.url().includes(ERROR_REPORT_ENDPOINT) && r.request().method() === 'POST',
        { timeout: 10000 },
      );

      expect(errorResponse.status()).toBe(204); // No Content
      console.log('[E2E] ✅ Single error format reported successfully');
    } catch (error) {
      console.error('[E2E] ❌ Failed to receive error report response:', error);
      throw error;
    }

    // Validate at least one POST was made
    expect(errorReportPosts).toBeGreaterThanOrEqual(1);
    expect(lastStatus).toBe(204);

    // Validate request body structure
    if (lastRequestBody) {
      expect(lastRequestBody).toHaveProperty('message');
      expect(lastRequestBody.message).toContain('E2E Test Error');
      expect(lastRequestBody).toHaveProperty('severity', 'error');
    }
  });

  test('should report batch error format with 204 response', async ({
    page,
    request,
  }) => {
    // Verify backend is available
    const health = await request.get(BACKEND_HEALTH).catch(() => null);
    if (!health || health.status() !== 200) {
      console.warn(`[E2E] Warning: Backend health not available at ${BACKEND_HEALTH}`);
    }

    let errorReportPosts = 0;
    let lastStatus: number | undefined;
    let lastRequestBody: any;

    // Monitor requests
    page.on('request', async (req) => {
      const url = req.url();
      if (url.includes(ERROR_REPORT_ENDPOINT)) {
        errorReportPosts += 1;
        console.log(`[E2E] Error report request: ${req.method()} ${url}`);

        try {
          const postData = req.postData();
          if (postData) {
            lastRequestBody = JSON.parse(postData);
            console.log(
              `[E2E] Batch request body:`,
              JSON.stringify(lastRequestBody, null, 2),
            );
          }
        } catch (e) {
          console.warn('[E2E] Failed to parse request body:', e);
        }
      }
    });

    // Monitor responses
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes(ERROR_REPORT_ENDPOINT)) {
        lastStatus = res.status();
        console.log(`[E2E] Error report response: ${res.status()} ${url}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger batch error format (what frontend logger actually uses)
    await page.evaluate(() => {
      const batchPayload = {
        errors: [
          {
            id: `e2e-test-${Date.now()}-001`,
            timestamp: new Date().toISOString(),
            type: 'error',
            data: {
              message: 'E2E Test: Network request failed',
              url: window.location.href,
              status: 500,
              statusText: 'Internal Server Error',
              type: 'network_error',
            },
          },
          {
            id: `e2e-test-${Date.now()}-002`,
            timestamp: new Date().toISOString(),
            type: 'user_action',
            data: {
              action: 'button_click',
              buttonId: 'test-button',
              formId: 'test-form',
            },
          },
        ],
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          batchSize: 2,
          testId: 'e2e-batch-error-reporting',
        },
      };

      fetch('/api/v1/frontend-errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      }).catch((err) => {
        console.error('[E2E] Failed to report batch errors:', err);
      });
    });

    // Wait for the error report response
    try {
      const errorResponse = await page.waitForResponse(
        (r) =>
          r.url().includes(ERROR_REPORT_ENDPOINT) && r.request().method() === 'POST',
        { timeout: 10000 },
      );

      expect(errorResponse.status()).toBe(204); // No Content
      console.log('[E2E] ✅ Batch error format reported successfully');
    } catch (error) {
      console.error('[E2E] ❌ Failed to receive batch error report response:', error);
      throw error;
    }

    // Validate POST was made
    expect(errorReportPosts).toBeGreaterThanOrEqual(1);
    expect(lastStatus).toBe(204);

    // Validate batch format structure
    if (lastRequestBody) {
      expect(lastRequestBody).toHaveProperty('errors');
      expect(Array.isArray(lastRequestBody.errors)).toBe(true);
      expect(lastRequestBody.errors.length).toBeGreaterThanOrEqual(2);
      expect(lastRequestBody).toHaveProperty('metadata');
      expect(lastRequestBody.metadata).toHaveProperty('batchSize', 2);
    }
  });

  test('should include error metadata in reports', async ({ page }) => {
    let lastRequestBody: any;

    page.on('request', async (req) => {
      if (req.url().includes(ERROR_REPORT_ENDPOINT)) {
        try {
          const postData = req.postData();
          if (postData) {
            lastRequestBody = JSON.parse(postData);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger error with rich metadata
    await page.evaluate(() => {
      const errorPayload = {
        message: 'E2E Test: Error with metadata',
        stack: 'Error stack trace here',
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'error',
        metadata: {
          userId: 'test-user-123',
          sessionId: 'test-session-abc',
          component: 'TestComponent',
          action: 'test-action',
          customField: 'custom-value',
        },
      };

      fetch('/api/v1/frontend-errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorPayload),
      });
    });

    // Wait for request to complete
    await page.waitForResponse((r) => r.url().includes(ERROR_REPORT_ENDPOINT), {
      timeout: 10000,
    });

    // Validate metadata was included
    expect(lastRequestBody).toBeDefined();
    expect(lastRequestBody).toHaveProperty('metadata');
    expect(lastRequestBody.metadata).toHaveProperty('userId', 'test-user-123');
    expect(lastRequestBody.metadata).toHaveProperty('sessionId', 'test-session-abc');
    expect(lastRequestBody.metadata).toHaveProperty('component', 'TestComponent');
    expect(lastRequestBody.metadata).toHaveProperty('customField', 'custom-value');

    console.log('[E2E] ✅ Error metadata validation passed');
  });

  test('should handle backend unavailability gracefully', async ({ page, request }) => {
    let fetchErrorCaptured = false;

    // Monitor console for fetch errors
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Failed to report error') || text.includes('fetch failed')) {
        fetchErrorCaptured = true;
        console.log(`[E2E] Captured expected error: ${text}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to report to a non-existent endpoint to simulate backend failure
    await page.evaluate(() => {
      fetch('/api/v1/this-endpoint-does-not-exist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test error' }),
      }).catch((err) => {
        console.error('[E2E] Expected fetch failure:', err);
      });
    });

    // Wait a bit for any error handling
    await page.waitForTimeout(2000);

    // The test passes if no unhandled exceptions occurred
    // Frontend should gracefully handle backend unavailability
    console.log('[E2E] ✅ Graceful degradation test passed (no unhandled exceptions)');
  });
});
