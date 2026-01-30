/**
 * Debug Navigation Script for LegalEase
 * Run with: npx playwright test scripts/debug-navigation.spec.js --headed
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/auth/login`;
const CREDENTIALS = {
  email: 'manual-manager@legalease.com',
  password: 'M@nager!Qw3rty$9'
};

const SCREENSHOT_DIR = '/home/duck/legalease/.playwright-mcp/debug-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Global collectors
const allConsoleErrors = [];
const allConsoleWarnings = [];
const allNetworkErrors = [];
const allJsErrors = [];

test.describe('LegalEase Debug Navigation as Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Set up listeners
    page.on('console', msg => {
      if (msg.type() === 'error') {
        allConsoleErrors.push(`[${page.url()}] ${msg.text()}`);
        console.log('CONSOLE ERROR:', msg.text());
      } else if (msg.type() === 'warning') {
        allConsoleWarnings.push(`[${page.url()}] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      allJsErrors.push(`[${page.url()}] ${error.message}`);
      console.log('PAGE ERROR:', error.message);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        allNetworkErrors.push({
          url: response.url(),
          status: response.status(),
          page: page.url()
        });
        console.log(`NETWORK ERROR ${response.status()}: ${response.url()}`);
      }
    });
  });

  test('Login and navigate all pages', async ({ page }) => {
    // Increase timeout for this comprehensive test
    test.setTimeout(180000);
    
    // Go to login page
    console.log('Navigating to login page...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-page.png'), fullPage: true });
    
    // Wait for login form
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 15000 });
    
    // Fill in credentials
    console.log('Filling in credentials...');
    await page.fill('input[name="email"], input[type="email"]', CREDENTIALS.email);
    await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-filled.png'), fullPage: true });
    
    // Click login button
    console.log('Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    try {
      await page.waitForURL('**/dashboard**', { timeout: 20000 });
      console.log('Login successful! On dashboard now.');
    } catch (e) {
      console.log('Did not redirect to dashboard, checking current URL...');
      console.log('Current URL:', page.url());
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b-after-login.png'), fullPage: true });
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-dashboard.png'), fullPage: true });

    // Navigation pages to test as manager
    const pagesToVisit = [
      { url: `${BASE_URL}/dashboard`, name: 'dashboard' },
      { url: `${BASE_URL}/documents`, name: 'documents' },
      { url: `${BASE_URL}/cases`, name: 'cases' },
      { url: `${BASE_URL}/templates`, name: 'templates' },
      { url: `${BASE_URL}/settings`, name: 'settings' },
      { url: `${BASE_URL}/profile`, name: 'profile' },
      { url: `${BASE_URL}/notifications`, name: 'notifications' },
      { url: `${BASE_URL}/users`, name: 'users' },
      { url: `${BASE_URL}/activity`, name: 'activity' },
      { url: `${BASE_URL}/admin`, name: 'admin' },
      { url: `${BASE_URL}/admin/users`, name: 'admin-users' },
      { url: `${BASE_URL}/admin/companies`, name: 'admin-companies' },
      { url: `${BASE_URL}/admin/settings`, name: 'admin-settings' },
      { url: `${BASE_URL}/admin/analytics`, name: 'admin-analytics' },
      { url: `${BASE_URL}/admin/security`, name: 'admin-security' },
      { url: `${BASE_URL}/admin/audit`, name: 'admin-audit' },
      { url: `${BASE_URL}/admin/compliance`, name: 'admin-compliance' },
      { url: `${BASE_URL}/admin/documents`, name: 'admin-documents' },
      { url: `${BASE_URL}/admin/cases`, name: 'admin-cases' },
      { url: `${BASE_URL}/admin/system`, name: 'admin-system' },
      { url: `${BASE_URL}/admin/platform`, name: 'admin-platform' },
    ];

    let pageIndex = 4;
    for (const pageInfo of pagesToVisit) {
      console.log(`\nNavigating to: ${pageInfo.name} (${pageInfo.url})`);
      
      try {
        // Use domcontentloaded instead of networkidle to avoid hanging on SWR polling
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Wait for some time for JS to execute
        await page.waitForTimeout(3000);
        
        // Take screenshot
        const screenshotPath = path.join(SCREENSHOT_DIR, `${String(pageIndex).padStart(2, '0')}-${pageInfo.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // List all visible buttons
        const buttons = await page.locator('button:visible').allTextContents();
        console.log(`  Buttons found: ${buttons.filter(b => b.trim()).join(', ') || 'none'}`);
        
        // List all visible links
        const links = await page.locator('a:visible').count();
        console.log(`  Links found: ${links}`);
        
        // Check for error messages on page
        const errorMessages = await page.locator('.error, .alert-error, [role="alert"], .text-red-500, .text-destructive').allTextContents();
        if (errorMessages.length > 0) {
          console.log(`  Page errors: ${errorMessages.join(', ')}`);
        }
        
        pageIndex++;
      } catch (e) {
        console.error(`  Error navigating to ${pageInfo.name}:`, e.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${String(pageIndex).padStart(2, '0')}-${pageInfo.name}-error.png`) });
        pageIndex++;
      }
    }

    // Write debug report
    const report = {
      timestamp: new Date().toISOString(),
      user: CREDENTIALS.email,
      summary: {
        consoleErrors: allConsoleErrors.length,
        consoleWarnings: allConsoleWarnings.length,
        networkErrors: allNetworkErrors.length,
        jsErrors: allJsErrors.length
      },
      consoleErrors: allConsoleErrors,
      consoleWarnings: allConsoleWarnings,
      networkErrors: allNetworkErrors,
      jsErrors: allJsErrors
    };

    const reportPath = '/home/duck/legalease/.playwright-mcp/debug-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n\nDebug report written to: ${reportPath}`);

    // Print summary
    console.log('\n=== DEBUG SUMMARY ===');
    console.log(`Console errors: ${allConsoleErrors.length}`);
    console.log(`Console warnings: ${allConsoleWarnings.length}`);
    console.log(`Network errors: ${allNetworkErrors.length}`);
    console.log(`JS errors: ${allJsErrors.length}`);
  });
});
