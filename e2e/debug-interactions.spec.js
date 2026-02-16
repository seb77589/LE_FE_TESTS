// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const LOGIN_URL = `${BASE_URL}/auth/login`;
const SCREENSHOT_DIR = '/home/duck/legalease/.playwright-mcp/interactions';

// Credentials from config/.env
const CREDENTIALS = {
  email: 'manual-manager@legalease.com',
  password: 'M@nager!Qw3rty$9',
};

test.describe('LegalEase Interaction Testing as Manager', () => {
  // Collect all errors
  let allConsoleErrors = [];
  let allConsoleWarnings = [];
  let allNetworkErrors = [];
  let allJsErrors = [];

  test.beforeAll(async () => {
    // Create screenshot directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Test interactive features', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for comprehensive testing

    // Set up error collection
    page.on('console', (msg) => {
      const text = `[${page.url()}] ${msg.text()}`;
      if (msg.type() === 'error') {
        console.log(`CONSOLE ERROR: ${msg.text()}`);
        allConsoleErrors.push(text);
      } else if (msg.type() === 'warning') {
        allConsoleWarnings.push(text);
      }
    });

    page.on('pageerror', (error) => {
      console.log(`JS ERROR: ${error.message}`);
      allJsErrors.push(error.message);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        const errorInfo = `NETWORK ERROR ${response.status()}: ${response.url()}`;
        console.log(errorInfo);
        allNetworkErrors.push(errorInfo);
      }
    });

    // Login
    console.log('=== LOGGING IN ===');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.fill('input[name="email"], input[type="email"]', CREDENTIALS.email);
    await page.fill(
      'input[name="password"], input[type="password"]',
      CREDENTIALS.password,
    );
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Login successful!');
    await page.waitForTimeout(2000);

    // Test 1: Dashboard interactions
    console.log('\n=== TESTING DASHBOARD ===');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-dashboard.png'),
      fullPage: true,
    });

    // Click "Browse All" if available
    const browseAllBtn = page
      .locator('button:has-text("Browse All"), a:has-text("Browse All")')
      .first();
    if (await browseAllBtn.isVisible()) {
      console.log('  Clicking "Browse All"...');
      await browseAllBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-browse-all.png'),
        fullPage: true,
      });
    }

    // Test 2: Documents page - Upload button
    console.log('\n=== TESTING DOCUMENTS PAGE ===');
    await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-documents.png'),
      fullPage: true,
    });

    const uploadBtn = page.locator('button:has-text("Upload")').first();
    if (await uploadBtn.isVisible()) {
      console.log('  Clicking "Upload Document"...');
      await uploadBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-upload-modal.png'),
        fullPage: true,
      });

      // Close modal if open
      const closeBtn = page
        .locator(
          '[aria-label="Close"], button:has-text("Cancel"), button:has-text("Close")',
        )
        .first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Test 3: Cases page
    console.log('\n=== TESTING CASES PAGE ===');
    await page.goto(`${BASE_URL}/cases`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-cases.png'),
      fullPage: true,
    });

    // Click on a case if available
    const caseLink = page
      .locator('table tbody tr a, [data-testid="case-link"]')
      .first();
    if (await caseLink.isVisible()) {
      console.log('  Clicking on first case...');
      await caseLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-case-detail.png'),
        fullPage: true,
      });
    }

    // Test 4: Templates page - Create Template
    console.log('\n=== TESTING TEMPLATES PAGE ===');
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-templates.png'),
      fullPage: true,
    });

    const createTemplateBtn = page
      .locator('button:has-text("Create Template")')
      .first();
    if (await createTemplateBtn.isVisible()) {
      console.log('  Clicking "Create Template"...');
      await createTemplateBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-create-template.png'),
        fullPage: true,
      });

      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // Test 5: Settings page - Toggle theme
    console.log('\n=== TESTING SETTINGS PAGE ===');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-settings.png'),
      fullPage: true,
    });

    // Try toggling dark mode
    const darkBtn = page.locator('button:has-text("dark")').first();
    if (await darkBtn.isVisible()) {
      console.log('  Toggling dark mode...');
      await darkBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '10-dark-mode.png'),
        fullPage: true,
      });

      // Toggle back to light
      const lightBtn = page.locator('button:has-text("light")').first();
      if (await lightBtn.isVisible()) {
        await lightBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Test 6: Profile page - Edit Profile
    console.log('\n=== TESTING PROFILE PAGE ===');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-profile.png'),
      fullPage: true,
    });

    const editProfileBtn = page.locator('button:has-text("Edit Profile")').first();
    if (await editProfileBtn.isVisible()) {
      console.log('  Clicking "Edit Profile"...');
      await editProfileBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '12-edit-profile.png'),
        fullPage: true,
      });
    }

    // Test 7: Notifications page - Mark All as Read
    console.log('\n=== TESTING NOTIFICATIONS PAGE ===');
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13-notifications.png'),
      fullPage: true,
    });

    // Toggle unread filter
    const unreadBtn = page.locator('button:has-text("Unread")').first();
    if (await unreadBtn.isVisible()) {
      console.log('  Clicking "Unread" filter...');
      await unreadBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '14-notifications-unread.png'),
        fullPage: true,
      });
    }

    // Test 8: Users management page - New User button
    console.log('\n=== TESTING USERS PAGE ===');
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '15-users.png'),
      fullPage: true,
    });

    const newUserBtn = page.locator('button:has-text("New User")').first();
    if (await newUserBtn.isVisible()) {
      console.log('  Clicking "New User"...');
      await newUserBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '16-new-user-modal.png'),
        fullPage: true,
      });

      // Close modal
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Test 9: Activity page - Filters and Export
    console.log('\n=== TESTING ACTIVITY PAGE ===');
    await page.goto(`${BASE_URL}/activity`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '17-activity.png'),
      fullPage: true,
    });

    const filtersBtn = page.locator('button:has-text("Filters")').first();
    if (await filtersBtn.isVisible()) {
      console.log('  Clicking "Filters"...');
      await filtersBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '18-activity-filters.png'),
        fullPage: true,
      });
    }

    // Test 10: Admin Dashboard tabs
    console.log('\n=== TESTING ADMIN DASHBOARD ===');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '19-admin-dashboard.png'),
      fullPage: true,
    });

    // Click through tabs
    const tabs = ['Overview', 'Users', 'Documents', 'Cases', 'Activity'];
    for (const tabName of tabs) {
      const tab = page
        .locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`)
        .first();
      if (await tab.isVisible()) {
        console.log(`  Clicking "${tabName}" tab...`);
        await tab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `20-admin-tab-${tabName.toLowerCase()}.png`),
          fullPage: true,
        });
      }
    }

    // Test 11: Admin Users page - Edit user
    console.log('\n=== TESTING ADMIN USERS ===');
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '21-admin-users.png'),
      fullPage: true,
    });

    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      console.log('  Clicking first "Edit" button...');
      await editBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '22-edit-user-modal.png'),
        fullPage: true,
      });

      // Close modal
      const cancelBtn = page
        .locator('button:has-text("Cancel"), [aria-label="Close"]')
        .first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Test 12: Admin Companies page
    console.log('\n=== TESTING ADMIN COMPANIES ===');
    await page.goto(`${BASE_URL}/admin/companies`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '23-admin-companies.png'),
      fullPage: true,
    });

    // Test 13: Admin Audit page with filters
    console.log('\n=== TESTING ADMIN AUDIT ===');
    await page.goto(`${BASE_URL}/admin/audit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '24-admin-audit.png'),
      fullPage: true,
    });

    // Test 14: Test navigation menu (hamburger on mobile or sidebar links)
    console.log('\n=== TESTING NAVIGATION MENU ===');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check for nav links
    const navLinks = await page.locator('nav a').allTextContents();
    console.log(`  Nav links found: ${navLinks.filter((l) => l.trim()).join(', ')}`);

    // Test 15: User menu dropdown
    console.log('\n=== TESTING USER MENU ===');
    const userMenuBtn = page
      .locator('[data-testid="user-menu"], button:has-text("MANAGER")')
      .first();
    if (await userMenuBtn.isVisible()) {
      console.log('  Clicking user menu...');
      await userMenuBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '25-user-menu-open.png'),
        fullPage: true,
      });

      // Close by clicking elsewhere
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Write comprehensive debug report
    const report = {
      timestamp: new Date().toISOString(),
      user: CREDENTIALS.email,
      testsRun: 15,
      summary: {
        consoleErrors: allConsoleErrors.length,
        consoleWarnings: allConsoleWarnings.length,
        networkErrors: allNetworkErrors.length,
        jsErrors: allJsErrors.length,
      },
      consoleErrors: allConsoleErrors,
      consoleWarnings: allConsoleWarnings,
      networkErrors: allNetworkErrors,
      jsErrors: allJsErrors,
    };

    const reportPath = '/home/duck/legalease/.playwright-mcp/interactions-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n\nInteraction report written to: ${reportPath}`);

    // Print summary
    console.log('\n=== INTERACTION TEST SUMMARY ===');
    console.log(`Console errors: ${allConsoleErrors.length}`);
    console.log(`Console warnings: ${allConsoleWarnings.length}`);
    console.log(`Network errors: ${allNetworkErrors.length}`);
    console.log(`JS errors: ${allJsErrors.length}`);

    if (allConsoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      allConsoleErrors.forEach((e) => console.log(`  - ${e}`));
    }

    if (allNetworkErrors.length > 0) {
      console.log('\nNetwork Errors:');
      allNetworkErrors.forEach((e) => console.log(`  - ${e}`));
    }

    if (allJsErrors.length > 0) {
      console.log('\nJS Errors:');
      allJsErrors.forEach((e) => console.log(`  - ${e}`));
    }
  });
});
