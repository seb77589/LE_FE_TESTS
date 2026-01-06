import { test, expect } from '@playwright/test';

test.describe('HMR noise budget on login page', () => {
  test('no red-console errors for known CSS/RSC/AB tests in dev', async ({
    page,
    browserName,
  }) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
    const messages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') messages.push(msg.text());
    });

    await page.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // give HMR a moment

    const redErrors = messages.filter(
      (m) =>
        m.includes('illegal character U+0040') ||
        m.includes('/api/v1/analytics/ab-tests') ||
        m.includes('Failed to fetch RSC payload'),
    );

    expect(redErrors.length).toBe(0);
  });
});
