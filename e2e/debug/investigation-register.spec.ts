import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../test-credentials';

test.describe('Registration Flow Investigation', () => {
  test('comprehensive investigation - /auth/register page', async ({ page }) => {
    // Track ALL network requests
    const allRequests: Array<{
      url: string;
      method: string;
      status?: number;
      body?: any;
    }> = [];
    const allResponses: Array<{ url: string; status: number; body?: any }> = [];

    page.on('request', async (request) => {
      const requestData = {
        url: request.url(),
        method: request.method(),
        body: null as any,
      };

      // Capture request body for POST requests
      if (request.method() === 'POST') {
        try {
          requestData.body = await request.postData();
        } catch (e) {
          requestData.body = 'Unable to capture body';
        }
      }

      allRequests.push(requestData);
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      if (requestData.body) {
        console.log(`[REQUEST BODY] ${requestData.body}`);
      }
    });

    page.on('response', async (response) => {
      const responseData = {
        url: response.url(),
        status: response.status(),
        body: null as any,
      };

      // Capture response body for API calls
      if (response.url().includes('/api/')) {
        try {
          responseData.body = await response.text();
        } catch (e) {
          responseData.body = 'Unable to capture body';
        }
      }

      allResponses.push(responseData);
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
      if (responseData.body && response.url().includes('/api/')) {
        console.log(`[RESPONSE BODY] ${responseData.body}`);
      }
    });

    // Track console logs to see if AuthContext functions are called
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('[AuthContext]') ||
        text.includes('[RegisterForm]') ||
        text.includes('register')
      ) {
        console.log(`[BROWSER] ${msg.type()}: ${text}`);
      }
    });

    const timestamp = Date.now();
    // Extract email domain from TEST_USER_EMAIL environment variable
    // Validated by test-credentials.ts import
    if (!process.env.TEST_USER_EMAIL) {
      throw new Error(
        'TEST_USER_EMAIL environment variable is required. Please configure it in config/.env',
      );
    }
    const testUserEmail = process.env.TEST_USER_EMAIL;
    const emailDomain = testUserEmail.split('@')[1];
    if (!emailDomain) {
      throw new Error(
        `Invalid TEST_USER_EMAIL format: ${testUserEmail}. Expected format: user@domain.com`,
      );
    }
    const testUser = {
      email: `investigation.user.${timestamp}@${emailDomain}`,
      password: TEST_DATA.PASSWORD.VALID,
      fullName: `Investigation User ${timestamp}`,
    };

    console.log(`\n=== INVESTIGATION: /auth/register page ===`);
    console.log(`Test user: ${testUser.email}`);

    // Navigate to registration page
    await page.goto('/auth/register');
    console.log(`Navigated to: ${page.url()}`);

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Check what form elements exist
    const formElements = await page.locator('form input').all();
    console.log(`\nForm elements found: ${formElements.length}`);
    for (const element of formElements) {
      const name = await element.getAttribute('name');
      const type = await element.getAttribute('type');
      console.log(`- Input: name="${name}", type="${type}"`);
    }

    // Fill the form
    await page.fill('input[name="full_name"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('Form filled, submitting...');

    // Clear request/response logs before submission
    allRequests.length = 0;
    allResponses.length = 0;

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for any network activity to complete
    await page.waitForTimeout(3000);

    console.log(`\n=== FORM SUBMISSION RESULTS ===`);
    console.log(`Final URL: ${page.url()}`);
    console.log(`Requests made during submission: ${allRequests.length}`);

    allRequests.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      if (req.body) {
        console.log(`     Body: ${req.body}`);
      }
    });

    console.log(`Responses received: ${allResponses.length}`);
    allResponses.forEach((res, index) => {
      console.log(`  ${index + 1}. ${res.status} ${res.url}`);
      if (res.body && res.url.includes('/api/')) {
        console.log(`     Body: ${res.body}`);
      }
    });

    // Check for authentication state
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token');
    console.log(`\nAuthentication token present: ${!!accessToken}`);
    if (accessToken) {
      console.log(`Token value: ${accessToken.value.substring(0, 20)}...`);
    }
  });

  test('comprehensive investigation - /register page', async ({ page }) => {
    // Same comprehensive logging for the older page
    const allRequests: Array<{
      url: string;
      method: string;
      status?: number;
      body?: any;
    }> = [];

    page.on('request', async (request) => {
      const requestData = {
        url: request.url(),
        method: request.method(),
        body: null as any,
      };

      if (request.method() === 'POST') {
        try {
          requestData.body = await request.postData();
        } catch (e) {
          requestData.body = 'Unable to capture body';
        }
      }

      allRequests.push(requestData);
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      if (requestData.body) {
        console.log(`[REQUEST BODY] ${requestData.body}`);
      }
    });

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[AuthContext]') || text.includes('register')) {
        console.log(`[BROWSER] ${msg.type()}: ${text}`);
      }
    });

    const timestamp = Date.now();
    // Extract email domain from TEST_USER_EMAIL environment variable
    // Validated by test-credentials.ts import
    if (!process.env.TEST_USER_EMAIL) {
      throw new Error(
        'TEST_USER_EMAIL environment variable is required. Please configure it in config/.env',
      );
    }
    const testUserEmail = process.env.TEST_USER_EMAIL;
    const emailDomain = testUserEmail.split('@')[1];
    if (!emailDomain) {
      throw new Error(
        `Invalid TEST_USER_EMAIL format: ${testUserEmail}. Expected format: user@domain.com`,
      );
    }
    const testUser = {
      email: `old.page.${timestamp}@${emailDomain}`,
      password: TEST_DATA.PASSWORD.VALID,
      fullName: `Old Page User ${timestamp}`,
    };

    console.log(`\n=== INVESTIGATION: /auth/register page (correct route) ===`);
    console.log(`Test user: ${testUser.email}`);

    await page.goto('/auth/register');
    console.log(`Navigated to: ${page.url()}`);

    await page.waitForLoadState('networkidle');

    // Check form elements
    const formElements = await page.locator('form input').all();
    console.log(`\nForm elements found: ${formElements.length}`);
    for (const element of formElements) {
      const name = await element.getAttribute('name');
      const type = await element.getAttribute('type');
      console.log(`- Input: name="${name}", type="${type}"`);
    }

    // Fill the form (correct field names)
    await page.fill('input[name="full_name"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    console.log('Form filled, submitting...');

    allRequests.length = 0;

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log(`\n=== OLD PAGE FORM SUBMISSION RESULTS ===`);
    console.log(`Final URL: ${page.url()}`);
    console.log(`Requests made: ${allRequests.length}`);

    allRequests.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      if (req.body) {
        console.log(`     Body: ${req.body}`);
      }
    });
  });
});
