/**
 * Playwright Global Setup
 *
 * Validates that required services are running before executing E2E tests.
 * Fails fast with helpful error messages if services are unavailable.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('\n🔍 [Playwright Global Setup] Checking service availability...\n');

  const frontendUrl =
    process.env.FRONTEND_URL ||
    `http://localhost:${process.env.PLAYWRIGHT_PORT || '3000'}`;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  console.log(`📍 [Playwright Global Setup] Frontend URL: ${frontendUrl}`);
  console.log(`📍 [Playwright Global Setup] Backend URL: ${backendUrl}`);

  // Launch a browser to check service availability
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  let servicesAvailable = true;
  const errors: string[] = [];

  // Check Frontend availability
  try {
    console.log('🔄 [Playwright Global Setup] Checking frontend availability...');
    const response = await page.goto(frontendUrl, {
      timeout: 15000, // Increased from 10000 for dev server startup
      waitUntil: 'domcontentloaded',
    });

    if (response && response.ok()) {
      console.log('✅ [Playwright Global Setup] Frontend is accessible');
    } else {
      throw new Error(`Frontend returned status: ${response?.status()}`);
    }
  } catch (error: any) {
    servicesAvailable = false;
    const errorMsg = `❌ Frontend not accessible at ${frontendUrl}`;
    console.error(errorMsg);
    console.error(`   Error: ${error.message}`);
    errors.push(errorMsg);
    errors.push(`   Make sure the frontend is running: cd frontend && npm run dev`);
  }

  // Check Backend availability
  try {
    console.log('🔄 [Playwright Global Setup] Checking backend availability...');
    const response = await page.request.get(`${backendUrl}/health`, {
      timeout: 15000, // Increased from 10000 for backend + DB init
      ignoreHTTPSErrors: true,
    });

    if (response.ok()) {
      console.log('✅ [Playwright Global Setup] Backend is accessible');
    } else {
      throw new Error(`Backend returned status: ${response.status()}`);
    }
  } catch (error: any) {
    servicesAvailable = false;
    const errorMsg = `❌ Backend not accessible at ${backendUrl}/health`;
    console.error(errorMsg);
    console.error(`   Error: ${error.message}`);
    errors.push(errorMsg);
    errors.push(`   Make sure services are running: docker compose up -d`);
  }

  // Phase 2: Check critical APIs that registration depends on
  if (servicesAvailable) {
    const criticalAPIs = [
      { path: '/api/v1/auth/password-policy', name: 'Password Policy' },
      { path: '/api/v1/validation/rules/email', name: 'Email Validation' },
    ];

    for (const api of criticalAPIs) {
      try {
        console.log(`🔄 [Playwright Global Setup] Checking ${api.name} API...`);
        const response = await page.request.get(`${backendUrl}${api.path}`, {
          timeout: 10000,
          ignoreHTTPSErrors: true,
        });
        if (!response.ok()) {
          throw new Error(`${api.name} API returned ${response.status()}`);
        }
        console.log(`✅ [Playwright Global Setup] ${api.name} API is available`);
      } catch (error: any) {
        servicesAvailable = false;
        const errorMsg = `❌ ${api.name} API not accessible at ${backendUrl}${api.path}`;
        console.error(errorMsg);
        console.error(`   Error: ${error.message}`);
        errors.push(errorMsg);
        errors.push(`   This API is required for user registration to work`);
      }
    }
  }

  await browser.close();

  // Fail fast if services are not available
  if (!servicesAvailable) {
    console.error('\n' + '='.repeat(80));
    console.error('🚨 E2E TESTS CANNOT RUN - REQUIRED SERVICES ARE NOT AVAILABLE');
    console.error('='.repeat(80));
    console.error('\nErrors found:');
    errors.forEach((error) => console.error(`  ${error}`));
    console.error('\n' + '='.repeat(80));
    console.error('SOLUTIONS:');
    console.error('  1. Start all services: docker compose up -d');
    console.error('  2. Start frontend only: cd frontend && npm run dev');
    console.error('  3. Check service health: npm run check-services');
    console.error('='.repeat(80) + '\n');

    throw new Error('E2E tests aborted: Required services are not running');
  }

  console.log(
    '\n✅ [Playwright Global Setup] All services are available - proceeding with tests\n',
  );

  // Seed test users with forced password reset to ensure clean state
  // Phase 1: Make seeding failures fatal - tests cannot run without baseline users
  try {
    console.log(
      '🔄 [Playwright Global Setup] Seeding test users with password reset...',
    );
    const { execSync } = require('node:child_process');
    execSync(
      'docker exec legalease-backend-1 python -m scripts.app_scripts.seed_baseline_data --force-update',
      {
        stdio: 'pipe', // Capture output for better error messages
        timeout: 60000, // 60 second timeout for seeding
      },
    );
    console.log('✅ [Playwright Global Setup] Test users seeded successfully');
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('🚨 FATAL: Failed to seed test users');
    console.error('='.repeat(80));
    console.error(`Error: ${error.message}`);
    if (error.stderr) {
      console.error(`Stderr: ${error.stderr.toString()}`);
    }
    console.error('\nPossible causes:');
    console.error('  1. Docker container legalease-backend-1 not running');
    console.error('  2. Database migrations not completed');
    console.error('  3. Backend service still initializing');
    console.error('\nSolutions:');
    console.error('  1. Run: docker compose up -d');
    console.error('  2. Wait a few seconds and try again');
    console.error('  3. Check: docker logs legalease-backend-1');
    console.error('='.repeat(80) + '\n');

    throw new Error(
      `[Playwright Global Setup] FATAL: Test user seeding failed - tests cannot proceed.\n` +
        `Seeding error: ${error.message}`,
    );
  }
}

export default globalSetup;
