import { test, expect } from '@playwright/test';

/**
 * Webpack Module Resolution Validation Test
 * 
 * This test verifies that webpack module factory errors are resolved
 * by checking specific pages for console errors.
 */

const pages = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/templates', name: 'Templates' },
  { path: '/cases', name: 'Cases' },
  { path: '/admin', name: 'Admin' },
  { path: '/notifications', name: 'Notifications' }
];

test.describe('Webpack Module Resolution', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manual-manager@legalease.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="submit"]');
    await page.waitForURL('/dashboard', { timeout: 30000 });
  });

  for (const pageInfo of pages) {
    test(`${pageInfo.name} page should load without webpack errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      
      // Capture console errors
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Cannot read properties of undefined (reading \'call\')')) {
          consoleErrors.push(msg.text());
        }
      });

      // Navigate to page
      await page.goto(pageInfo.path);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Give time for any lazy loading
      await page.waitForTimeout(3000);
      
      // Check if page loaded successfully
      const pageTitle = await page.title();
      expect(pageTitle).toContain('LegalEase');
      
      // Verify no webpack module factory errors
      expect(consoleErrors).toHaveLength(0);
      
      console.log(`✅ ${pageInfo.name} page: ${consoleErrors.length} webpack errors`);
    });
  }
});