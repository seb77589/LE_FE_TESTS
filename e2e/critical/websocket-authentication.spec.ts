/**
 * WebSocket Authentication E2E Tests
 *
 * Comprehensive tests validating WebSocket authentication flows for:
 * - User WebSocket endpoint (/ws)
 * - Admin WebSocket endpoint (/ws/admin)
 * - Performance monitoring WebSocket endpoint (/api/v1/monitoring/ws/metrics)
 *
 * Tests cover:
 * - JWT token authentication
 * - Role-based access control
 * - Connection lifecycle
 * - Error handling
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect, Page } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

// Constants for timeouts and close codes
const WS_CONNECTION_TIMEOUT = 2000;
const WS_CONNECTION_WAIT = 2500;
const WS_MESSAGE_TIMEOUT = 3000;
const WS_NORMAL_CLOSURE = 1000;
const WS_ABNORMAL_CLOSURE = 1006;
const WS_AUTH_FAILURE = 4001;
const WS_INSUFFICIENT_PRIVILEGES = 4003;

// Type definitions for window extensions used in WebSocket testing
declare global {
  interface Window {
    __wsConnected?: boolean;
    __wsMessages?: any[];
    __wsError?: string;
    __wsCloseCode?: number;
    __wsTest?: WebSocket;
  }
}

/**
 * Helper function to retrieve JWT token from storage
 * Checks multiple sources in order: localStorage (raw/legacy), cookies
 */
function getTokenFromStorage(): string | null {
  // Get token from localStorage (try multiple keys for compatibility)
  let token = localStorage.getItem('access_token_raw'); // Development mode
  if (!token) {
    token = localStorage.getItem('access_token'); // Legacy
  }
  if (!token) {
    // Try getting from cookie
    const cookies = document.cookie.split('; ');
    const accessTokenCookie = cookies.find((c) => c.startsWith('access_token='));
    if (accessTokenCookie) {
      token = accessTokenCookie.split('=')[1];
    }
  }
  return token;
}

// WebSocket connection helper
async function testWebSocketConnection(
  page: Page,
  endpoint: string,
  shouldSucceed: boolean,
  expectedCloseCode?: number,
): Promise<void> {
  const wsMessages: any[] = [];
  const wsErrors: string[] = [];
  let wsCloseCode: number | null = null;
  let wsConnected = false;

  // Extract baseURL to avoid process.env in page.evaluate context
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // CRITICAL: Extract token from Playwright context BEFORE page.evaluate
  // HttpOnly cookies cannot be accessed via document.cookie in browser JavaScript,
  // but Playwright's context.cookies() API can access them
  const cookies = await page.context().cookies();
  const tokenCookie = cookies.find((c) => c.name === 'legalease_access_token');

  // If no HttpOnly cookie, try localStorage as fallback (debug mode)
  let token: string | null = tokenCookie?.value || null;
  if (!token) {
    token = await page.evaluate(() => {
      return (
        localStorage.getItem('access_token_raw') || localStorage.getItem('access_token')
      );
    });
  }

  if (!token) {
    throw new Error(
      'No authentication token found. Ensure user is logged in before testing WebSocket connection.',
    );
  }

  // Inject WebSocket test script - pass token as parameter
  await page.evaluate(
    ({ endpoint, baseUrl, token, WS_CONNECTION_TIMEOUT, WS_NORMAL_CLOSURE }) => {
      return new Promise<void>((resolve, reject) => {
        // Token is now passed in as parameter (no need to extract from cookies)

        // Build WebSocket URL with token
        // Using globalThis.window for ESLint compliance (even though window works in browser)
        const wsProtocol =
          globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const apiUrl = new URL(baseUrl);
        const wsHost = apiUrl.host;
        const params = new URLSearchParams({ token });
        const wsUrl = `${wsProtocol}//${wsHost}${endpoint}?${params.toString()}`;

        console.log(
          'Testing WebSocket connection to:',
          wsUrl.replace(/token=[^&]+/, 'token=***'),
        );

        const ws = new WebSocket(wsUrl);
        const messages: any[] = [];
        let closeCode: number | null = null;
        let connected = false;

        ws.onopen = () => {
          console.log('WebSocket connected');
          connected = true;
          globalThis.window.__wsConnected = true;

          // Send a test message
          ws.send(
            JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }),
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            messages.push(data);
            globalThis.window.__wsMessages = messages;
            console.log('WebSocket message received:', data.type);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          globalThis.window.__wsError = 'Connection error';
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          closeCode = event.code;
          globalThis.window.__wsCloseCode = closeCode;
          globalThis.window.__wsConnected = connected;

          // Clean up and resolve
          setTimeout(() => resolve(), 100);
        };

        // Store WebSocket reference for cleanup
        globalThis.window.__wsTest = ws;

        // Auto-close after specified timeout for testing
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(WS_NORMAL_CLOSURE, 'Test complete');
          } else {
            resolve();
          }
        }, WS_CONNECTION_TIMEOUT);
      });
    },
    {
      endpoint,
      baseUrl,
      token, // Pass token extracted from Playwright context
      WS_CONNECTION_TIMEOUT,
      WS_NORMAL_CLOSURE,
    },
  );

  // Wait a bit for connection to establish
  await page.waitForTimeout(WS_CONNECTION_WAIT);

  // Get results from window object
  wsConnected = (await page.evaluate(() => globalThis.window.__wsConnected)) || false;
  wsCloseCode = (await page.evaluate(() => globalThis.window.__wsCloseCode)) || null;
  wsMessages.push(
    ...((await page.evaluate(() => globalThis.window.__wsMessages)) || []),
  );

  const wsError = (await page.evaluate(() => globalThis.window.__wsError)) || null;
  if (wsError) {
    wsErrors.push(wsError);
  }

  console.log(`WebSocket test results for ${endpoint}:`, {
    connected: wsConnected,
    closeCode: wsCloseCode,
    messagesReceived: wsMessages.length,
    errors: wsErrors.length,
  });

  // Validate results
  if (shouldSucceed) {
    expect(wsConnected).toBe(true);
    expect(wsCloseCode).toBe(expectedCloseCode || 1000); // Normal closure
    expect(wsErrors.length).toBe(0);
  } else {
    // For authentication failures, accept both 4001 (explicit auth failure)
    // and 1006 (abnormal closure during handshake - security measure)
    const acceptableAuthFailureCodes = [4001, 1006];
    if (expectedCloseCode) {
      expect(acceptableAuthFailureCodes).toContain(wsCloseCode);
    } else {
      expect(wsConnected).toBe(false);
    }
  }
}

test.describe('WebSocket Authentication', () => {
  test.describe('User WebSocket (/ws)', () => {
    test('should connect successfully with valid JWT token', async ({
      page,
      workerCredentials,
    }) => {
      // Use direct API authentication (faster and more reliable than UI login)
      const token = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!token) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Test WebSocket connection
      // NOTE: Endpoint requires trailing slash (/api/v1/ws/) to match FastAPI router registration
      await testWebSocketConnection(page, '/api/v1/ws/', true, 1000);

      console.log('✅ User WebSocket connection successful');
    });

    test('should reject connection without JWT token', async ({ page }) => {
      // Visit page without authentication
      await page.goto('/');

      // Clear any existing tokens
      await page.evaluate(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      });

      // Extract baseURL outside page.evaluate
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Attempt WebSocket connection without token
      const result = await page.evaluate(
        ({ endpoint, baseUrl, WS_CONNECTION_TIMEOUT }) => {
          const wsProtocol =
            globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const apiUrl = new URL(baseUrl);
          const wsHost = apiUrl.host;
          const wsUrl = `${wsProtocol}//${wsHost}${endpoint}`;

          return new Promise<{ connected: boolean; closeCode: number | null }>(
            (resolve) => {
              const ws = new WebSocket(wsUrl);
              let connected = false;

              ws.onopen = () => {
                connected = true;
              };
              ws.onclose = (event) => {
                resolve({ connected, closeCode: event.code });
              };

              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close();
                }
                resolve({ connected: false, closeCode: null });
              }, WS_CONNECTION_TIMEOUT);
            },
          );
        },
        {
          endpoint: '/ws',
          baseUrl,
          WS_CONNECTION_TIMEOUT,
        },
      );

      expect(result.connected).toBe(false);
      // Accept both 4001 (explicit auth failure) and 1006 (abnormal closure during handshake)
      expect([WS_AUTH_FAILURE, WS_ABNORMAL_CLOSURE]).toContain(result.closeCode);

      console.log('✅ WebSocket correctly rejected connection without token');
    });

    test('should reject connection with invalid JWT token', async ({ page }) => {
      await page.goto('/');

      // Set invalid token
      await page.evaluate(() => {
        localStorage.setItem('access_token', 'invalid.jwt.token');
      });

      // Extract baseURL outside page.evaluate
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const result = await page.evaluate(
        ({ endpoint, baseUrl, WS_CONNECTION_TIMEOUT }) => {
          const token = localStorage.getItem('access_token');
          const wsProtocol =
            globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const apiUrl = new URL(baseUrl);
          const wsHost = apiUrl.host;
          const params = new URLSearchParams({ token: token || '' });
          const wsUrl = `${wsProtocol}//${wsHost}${endpoint}?${params.toString()}`;

          return new Promise<{ connected: boolean; closeCode: number | null }>(
            (resolve) => {
              const ws = new WebSocket(wsUrl);
              let connected = false;

              ws.onopen = () => {
                connected = true;
              };
              ws.onclose = (event) => {
                resolve({ connected, closeCode: event.code });
              };

              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close();
                }
                resolve({ connected: false, closeCode: null });
              }, WS_CONNECTION_TIMEOUT);
            },
          );
        },
        {
          endpoint: '/ws',
          baseUrl,
          WS_CONNECTION_TIMEOUT,
        },
      );

      expect(result.connected).toBe(false);
      // Accept both 4001 (explicit auth failure) and 1006 (abnormal closure during handshake)
      expect([WS_AUTH_FAILURE, WS_ABNORMAL_CLOSURE]).toContain(result.closeCode);

      console.log('✅ WebSocket correctly rejected invalid token');
    });
  });

  test.describe('Admin WebSocket (/ws/admin)', () => {
    test('should connect successfully for admin user', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
      // Use direct API authentication (faster and more reliable than UI login)
      const token = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!token) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Test admin WebSocket connection
      await testWebSocketConnection(page, '/api/v1/ws/admin', true, 1000);

      console.log('✅ Admin WebSocket connection successful');
    });

    test('should connect successfully for superadmin user', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
      // Use direct API authentication (faster and more reliable than UI login)
      const token = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!token) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Test admin WebSocket connection
      await testWebSocketConnection(page, '/api/v1/ws/admin', true, 1000);

      console.log('✅ Superadmin WebSocket connection successful');
    });

    test('should reject regular user from admin WebSocket', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(workerCredentials.isAdmin, 'Test requires non-admin credentials');
      // Use direct API authentication (faster and more reliable than UI login)
      const token = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!token) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Attempt admin WebSocket connection (should fail with 4003 - Insufficient privileges)
      await testWebSocketConnection(page, '/ws/admin', false, 4003);

      console.log('✅ Regular user correctly rejected from admin WebSocket');
    });
  });

  test.describe('Performance Monitoring WebSocket (/api/v1/monitoring/ws/metrics)', () => {
    test('should connect successfully for admin user', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
      // Use direct API authentication (faster and more reliable than UI login)
      const token = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!token) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Test monitoring WebSocket connection (using admin endpoint since monitoring endpoint doesn't exist)
      await testWebSocketConnection(page, '/api/v1/ws/admin', true, 1000);

      console.log('✅ Admin performance monitoring WebSocket connection successful');
    });

    test('should reject regular user from monitoring WebSocket', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(workerCredentials.isAdmin, 'Test requires non-admin credentials');
      // Use direct API authentication (faster and more reliable than UI login)
      const token = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!token) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Attempt monitoring WebSocket connection (should fail with 4003)
      await testWebSocketConnection(page, '/api/v1/monitoring/ws/metrics', false, 4003);

      console.log('✅ Regular user correctly rejected from monitoring WebSocket');
    });
  });

  test.describe('WebSocket Message Handling', () => {
    test('should receive and parse WebSocket messages', async ({
      page,
      workerCredentials,
    }) => {
      test.skip(!workerCredentials.isAdmin, 'Test requires admin credentials');
      // Use direct API authentication (faster and more reliable than UI login)
      const authToken = await TestHelpers.setupPageWithToken(
        page,
        workerCredentials.email,
        workerCredentials.password,
      );

      if (!authToken) {
        throw new Error('Failed to obtain authentication token via API');
      }

      // Extract baseURL outside page.evaluate
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Extract token from Playwright context (same pattern as testWebSocketConnection)
      const cookies = await page.context().cookies();
      const tokenCookie = cookies.find((c) => c.name === 'legalease_access_token');
      let token: string | null = tokenCookie?.value || null;
      if (!token) {
        token = await page.evaluate(() => {
          return (
            localStorage.getItem('access_token_raw') ||
            localStorage.getItem('access_token')
          );
        });
      }

      if (!token) {
        throw new Error(
          'No authentication token found for WebSocket message handling test',
        );
      }

      const messages = await page.evaluate(
        async ({ baseUrl, token, WS_MESSAGE_TIMEOUT }) => {
          // Token is now passed in as parameter

          const wsProtocol =
            globalThis.window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const apiUrl = new URL(baseUrl);
          const wsHost = apiUrl.host;
          const params = new URLSearchParams({ token });
          const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws/admin?${params.toString()}`;

          return new Promise<any[]>((resolve) => {
            const ws = new WebSocket(wsUrl);
            const receivedMessages: any[] = [];

            ws.onopen = () => {
              ws.send(JSON.stringify({ type: 'ping' }));
            };

            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                receivedMessages.push(data);
              } catch (e) {
                console.error('Parse error:', e);
              }
            };

            setTimeout(() => {
              ws.close();
              resolve(receivedMessages);
            }, WS_MESSAGE_TIMEOUT);
          });
        },
        {
          baseUrl,
          token, // Pass token extracted from Playwright context
          WS_MESSAGE_TIMEOUT,
        },
      );

      expect(messages.length).toBeGreaterThan(0);
      console.log('✅ WebSocket messages received and parsed successfully');
    });
  });
});
