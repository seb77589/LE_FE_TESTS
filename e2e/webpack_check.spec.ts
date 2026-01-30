/**
 * Webpack HMR Check Test
 * 
 * Quick test to verify webpack module loading is working correctly
 */

import { test, expect } from '@playwright/test';

async function loginAndNavigate(page: any, targetPath: string): Promise<{ webpackErrors: string[], pageErrors: string[] }> {
  const webpackErrors: string[] = [];
  const pageErrors: string[] = [];
  
  // Listen for console errors
  page.on('console', (msg: any) => {
    const text = msg.text();
    if (text.includes("Cannot read properties of undefined (reading 'call')") ||
        text.includes('options.factory')) {
      webpackErrors.push(text);
    }
  });

  // Listen for page errors with full stack trace
  page.on('pageerror', (error: any) => {
    const message = error.message;
    pageErrors.push(`${message}\n${error.stack || ''}`);
    if (message.includes("Cannot read properties of undefined (reading 'call')") ||
        message.includes('options.factory')) {
      webpackErrors.push(message);
    }
  });

  // Login manually
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'manual-manager@legalease.com');
  await page.fill('input[name="password"]', 'M@nager!Qw3rty$9');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  
  // Clear errors captured during login
  webpackErrors.length = 0;
  pageErrors.length = 0;
  
  // Navigate to target path
  await page.goto(targetPath);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  return { webpackErrors, pageErrors };
}

test.describe('Webpack Module Check', () => {
  test('Dashboard should load without webpack errors', async ({ page }) => {
    const { webpackErrors, pageErrors } = await loginAndNavigate(page, '/dashboard');
    
    // Check for dashboard content OR error boundary
    const hasContent = await page.locator('[data-testid="dashboard-content"]').count() > 0;
    const hasError = await page.locator('text=Try again').count() > 0;
    
    console.log('Dashboard content found:', hasContent);
    console.log('Error boundary triggered:', hasError);
    console.log('Webpack errors captured:', webpackErrors.length);
    console.log('Page errors:', pageErrors.length);
    
    expect(webpackErrors).toHaveLength(0);
    expect(hasError).toBe(false);
    expect(hasContent).toBe(true);
  });

  test('Cases page should load without webpack errors', async ({ page }) => {
    const { webpackErrors, pageErrors } = await loginAndNavigate(page, '/cases');
    
    // Check for cases content OR error boundary
    const hasContent = await page.locator('[data-testid="cases-container"], h1:has-text("Cases"), [data-testid="empty-state"]').count() > 0;
    const hasError = await page.locator('text=Try again').count() > 0;
    
    console.log('Cases content found:', hasContent);
    console.log('Error boundary triggered:', hasError);
    console.log('Webpack errors captured:', webpackErrors.length);
    
    if (webpackErrors.length > 0) {
      console.log('\n=== WEBPACK ERRORS ===');
      webpackErrors.forEach((err, i) => console.log(`${i + 1}. ${err.slice(0, 500)}`));
    }
    
    if (pageErrors.length > 0) {
      console.log('\n=== ALL PAGE ERRORS ===');
      pageErrors.forEach((err, i) => console.log(`${i + 1}. ${err.slice(0, 1000)}`));
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/cases-webpack-test.png', fullPage: true });
    
    expect(webpackErrors).toHaveLength(0);
    expect(hasError).toBe(false);
  });
});