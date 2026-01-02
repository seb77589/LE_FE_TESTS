const { execSync } = require('node:child_process');
const waitOn = require('wait-on');
const path = require('node:path');

/**
 * Check if Docker is accessible
 */
function checkDockerAccess() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.warn('[jest.global-setup] Docker access check failed:', error.message);
    return false;
  }
}

/**
 * Check if required services are already running
 */
function areServicesRunning(composeCmd, services, rootDir) {
  try {
    const output = execSync(`${composeCmd} ps --services --filter "status=running"`, {
      cwd: rootDir,
      encoding: 'utf8',
    });
    const runningServices = new Set(output.trim().split('\n').filter(Boolean));
    const requiredServices = services.split(' ');
    return requiredServices.every((svc) => runningServices.has(svc));
  } catch (error) {
    console.warn('[jest.global-setup] Error checking running services:', error.message);
    return false;
  }
}

/**
 * Start Docker Compose services
 */
function startServices(composeCmd, services, rootDir) {
  console.log(`[jest.global-setup] Starting backend services via ${composeCmd}…`);
  try {
    execSync(`${composeCmd} up -d ${services}`, {
      stdio: 'inherit',
      cwd: rootDir,
    });
  } catch (error) {
    console.error('[jest.global-setup] Failed to launch docker compose:', error);
    throw error;
  }
}

/**
 * Wait for backend health check
 */
async function waitForBackendHealth(composeCmd, rootDir) {
  const apiUrl = 'http-get://localhost:8000/health';
  try {
    await waitOn({
      resources: [apiUrl],
      delay: 1000,
      interval: 1000,
      timeout: 60_000,
      tcpTimeout: 10_000,
      validateStatus: function (status) {
        return status === 200;
      },
    });
    console.log('[jest.global-setup] Backend is healthy ✅');
  } catch (error) {
    console.error('[jest.global-setup] Backend did not become healthy in time:', error);
    try {
      execSync(`${composeCmd} logs backend`, { stdio: 'inherit', cwd: rootDir });
    } catch (error_) {
      console.warn('[jest.global-setup] Failed to fetch backend logs:', error_.message);
    }
    throw error;
  }
}

/**
 * Get fetch function (Node 18+ or fallback to node-fetch)
 */
async function getFetchFunction() {
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  try {
    const nodeFetch = await import('node-fetch');
    return nodeFetch.default;
  } catch {
    console.warn('[jest.global-setup] node-fetch not available');
    return null;
  }
}

/**
 * Login a user and return the access token
 */
async function loginUser(fetchFn, baseUrl, email, password) {
  const loginResp = await fetchFn(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password: password }),
  });

  if (loginResp.ok) {
    const { access_token } = await loginResp.json();
    return access_token;
  }
  return null;
}

/**
 * Create test user and obtain JWT token
 *
 * CREDENTIAL SECURITY POLICY:
 * All test credentials MUST be loaded from environment variables in config/.env.
 * Hardcoded fallback credentials are NOT allowed - tests will fail-fast if
 * credentials are missing. This enforces the zero-hardcoded-credentials policy.
 *
 * See:
 * - CLAUDE.md#test-credential-management-critical
 * - docs/testing/FRONTEND_TESTING_GUIDE.md
 */
async function setupTestUser(baseUrl) {
  try {
    // Load environment variables from config/.env BEFORE validation
    require('dotenv').config({
      path: path.resolve(__dirname, '..', '..', '..', 'config', '.env'),
    });

    const fetchFn = await getFetchFunction();
    if (!fetchFn) {
      console.warn('[jest.global-setup] Fetch not available, skipping test user setup');
      return;
    }

    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    // Validate credentials exist - fail fast if missing
    if (!testEmail || !testPassword) {
      console.error('ERROR: Missing required test credentials in config/.env:');
      console.error('  - TEST_USER_EMAIL');
      console.error('  - TEST_USER_PASSWORD');
      console.error('\nSee config/.env.example for configuration details.');
      console.error('Run: ./scripts/validate-credentials.sh to verify credentials');
      process.exit(1);
    }

    // Attempt registration (may fail if user already exists)
    await fetchFn(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        full_name: 'Jest Test',
      }),
    }).catch(() => {});

    // Login to get tokens
    const token = await loginUser(fetchFn, baseUrl, testEmail, testPassword);
    if (token) {
      const fs = require('node:fs');
      const tokenPath = path.join(__dirname, '.jest-token');
      fs.writeFileSync(tokenPath, token);
    }
  } catch (error) {
    console.warn('[jest.global-setup] Unable to register/login test user:', error);
  }
}

/**
 * Setup tokens for admin and superadmin users (for real backend integration tests)
 * These users must already exist in the database (created by seed scripts)
 */
async function setupAdminTokens(baseUrl) {
  try {
    // Load environment variables from config/.env BEFORE reading them
    require('dotenv').config({
      path: path.resolve(__dirname, '..', '..', '..', 'config', '.env'),
    });

    const fetchFn = await getFetchFunction();
    if (!fetchFn) {
      return;
    }

    const fs = require('node:fs');
    const tokens = {};

    // Login as admin user
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const adminToken = await loginUser(fetchFn, baseUrl, adminEmail, adminPassword);
      if (adminToken) {
        tokens.admin = adminToken;
        fs.writeFileSync(path.join(__dirname, '.jest-token-admin'), adminToken);
        console.log('[jest.global-setup] Admin token obtained ✅');
      } else {
        console.warn('[jest.global-setup] Failed to login admin user');
      }
    }

    // Login as superadmin user
    const superadminEmail = process.env.TEST_SUPERADMIN_EMAIL;
    const superadminPassword = process.env.TEST_SUPERADMIN_PASSWORD;
    if (superadminEmail && superadminPassword) {
      const superadminToken = await loginUser(
        fetchFn,
        baseUrl,
        superadminEmail,
        superadminPassword,
      );
      if (superadminToken) {
        tokens.superadmin = superadminToken;
        fs.writeFileSync(
          path.join(__dirname, '.jest-token-superadmin'),
          superadminToken,
        );
        console.log('[jest.global-setup] Superadmin token obtained ✅');
      } else {
        console.warn('[jest.global-setup] Failed to login superadmin user');
      }
    }

    // Write combined tokens file for easy access
    if (Object.keys(tokens).length > 0) {
      fs.writeFileSync(
        path.join(__dirname, '.jest-tokens.json'),
        JSON.stringify(tokens, null, 2),
      );
    }
  } catch (error) {
    console.warn('[jest.global-setup] Unable to setup admin tokens:', error.message);
  }
}

/**
 * Jest Global Setup
 *
 * 1. Spins up the backend (and its dependencies) with Docker Compose.
 * 2. Waits for the backend health-check endpoint to respond.
 * 3. Exposes the API URL via NEXT_PUBLIC_API_URL so tests make real HTTP calls.
 *
 * NOTE:  • Skipped automatically when the environment variable SKIP_BACKEND_DOCKER is truthy.
 *        • Requires Docker ⟂ docker-compose available in the PATH.
 */
module.exports = async function globalSetup() {
  // Check if backend setup should be skipped
  if (process.env.SKIP_BACKEND_DOCKER) {
    console.log(
      '[jest.global-setup] SKIP_BACKEND_DOCKER set – skipping backend bootstrap.',
    );
    if (!process.env.NEXT_PUBLIC_API_URL) {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    }
    return;
  }

  // Verify Docker is accessible
  if (!checkDockerAccess()) {
    console.warn(
      '[jest.global-setup] Docker daemon not available or permission denied – running tests without real backend. Set SKIP_BACKEND_DOCKER=1 to silence this message.',
    );
    process.env.SKIP_BACKEND_DOCKER = '1';
    if (!process.env.NEXT_PUBLIC_API_URL) {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    }
    return;
  }

  const composeCmd = process.env.TEST_COMPOSE_CMD || 'docker compose';
  const services = process.env.TEST_COMPOSE_SERVICES || 'db redis backend';
  const rootDir = path.resolve(__dirname, '..');

  // Start services if not already running
  console.log('[jest.global-setup] Checking if backend services are already running…');
  if (areServicesRunning(composeCmd, services, rootDir)) {
    console.log('[jest.global-setup] Backend services already running ✅');
  } else {
    startServices(composeCmd, services, rootDir);
  }

  // Wait for backend to be healthy
  await waitForBackendHealth(composeCmd, rootDir);

  // Expose API URL for client code
  if (!process.env.NEXT_PUBLIC_API_URL) {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  }

  // Create test user and obtain JWT token
  await setupTestUser(process.env.NEXT_PUBLIC_API_URL);

  // Setup admin/superadmin tokens for real backend integration tests
  await setupAdminTokens(process.env.NEXT_PUBLIC_API_URL);
};
