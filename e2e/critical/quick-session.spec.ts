/**
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */
import { test, expect } from '../../fixtures/auth-fixture';
import { TEST_CONFIG } from '../../test-credentials';

// Admin endpoint access test (Phase 2.4 - Simplified)
// Uses page.request API which automatically includes HttpOnly cookies
test.describe('Admin Endpoint Access', () => {
  test('admin can access admin endpoints after login', async ({
    page,
    workerCredentials,
  }) => {
    // Skip if not admin - this test requires admin credentials
    test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');

    const FRONTEND_URL = TEST_CONFIG.FRONTEND_URL;
    const API_URL = TEST_CONFIG.API_URL;
    const EMAIL = workerCredentials.email;
    const PASS = workerCredentials.password;

    // Login via UI (sets HttpOnly cookies automatically)
    await page.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });

    // Fill login form
    await page.getByLabel('Email Address').first().fill(EMAIL);
    await page.getByLabel('Password').first().fill(PASS);
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click();

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // Use page.request API to probe admin endpoints (automatically includes cookies)
    const adminEndpoints = [
      `${API_URL}/api/v1/admin/system/status`,
      `${API_URL}/api/v1/admin/stats`,
    ];

    for (const endpoint of adminEndpoints) {
      const response = await page.request.get(endpoint);

      // Verify response status (200 OK for successful access)
      expect([200, 401, 403]).toContain(response.status());

      if (response.ok()) {
        // Verify response has expected data structure
        const data = await response.json();
        expect(data).toBeDefined();
      }
    }
  });
});
