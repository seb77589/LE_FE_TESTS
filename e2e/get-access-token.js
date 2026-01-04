// Simple helper to login and print the access_token cookie
const { chromium } = require('playwright');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from config/.env
dotenv.config({
  path: path.resolve(__dirname, '..', '..', 'config', '.env'),
  override: false,
});

(async () => {
  // Validate required environment variables
  if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
    console.error('ERROR: Missing required environment variables:');
    if (!process.env.SUPERADMIN_EMAIL) {
      console.error('  - SUPERADMIN_EMAIL');
    }
    if (!process.env.SUPERADMIN_PASSWORD) {
      console.error('  - SUPERADMIN_PASSWORD');
    }
    console.error('\nPlease ensure all credentials are configured in config/.env');
    process.exit(1);
  }

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const EMAIL = process.env.SUPERADMIN_EMAIL;
  const PASS = process.env.SUPERADMIN_PASSWORD;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await page.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });

  const emailLocator = page
    .locator(
      'input[type="email"], input[name*="email" i], input[autocomplete="username"]',
    )
    .first();
  const passLocator = page
    .locator(
      'input[type="password"], input[name*="password" i], input[autocomplete="current-password"]',
    )
    .first();
  await emailLocator.fill(EMAIL);
  await passLocator.fill(PASS);

  const submitBtn = page
    .locator(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")',
    )
    .first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Wait for either dashboard URL or successful /auth/me
  const dashboardNav = page
    .waitForURL(/.*\/dashboard.*/, { timeout: 20000 })
    .catch(() => null);
  const meResp = page
    .waitForResponse((r) => r.url().includes('/api/v1/auth/me') && r.status() === 200, {
      timeout: 20000,
    })
    .catch(() => null);
  await Promise.race([dashboardNav, meResp]);

  // Extract access_token cookie and also print cookies for diagnostics
  const cookies = await context.cookies();
  try {
    console.error(
      'cookies:',
      JSON.stringify(
        cookies.map((c) => ({ name: c.name, domain: c.domain, path: c.path })),
        null,
        2,
      ),
    );
  } catch {}
  const access = cookies.find((c) => c.name === 'access_token');
  console.log(access ? access.value : '');

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
