import { test, expect } from '@playwright/test';

test.describe('Analytics proxy route', () => {
  test('POST /api/analytics/events returns 2xx in development', async ({ request }) => {
    // Always use HTTPS frontend URL for this test
    const FRONTEND_URL = 'http://localhost:3000';
    const url = `${FRONTEND_URL.replace(/\/$/, '')}/api/analytics/events`;
    const payload = {
      events: [
        {
          event_type: 'custom',
          event_name: 'proxy_smoke',
          timestamp: Date.now(),
          session_id: 'smoke',
          url: FRONTEND_URL,
        },
      ],
      metadata: { sessionId: 'smoke' },
    };

    const res = await request.post(url, {
      data: payload,
      headers: { 'content-type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    console.log(`Analytics proxy test: ${url} -> ${res.status()}`);

    // In development, the route returns 202 even if backend fails
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(300);
  });
});
