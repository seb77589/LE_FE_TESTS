/**
 * Playwright Global Teardown
 *
 * Cleanup actions after all E2E tests complete.
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 [Playwright Global Teardown] Cleaning up after tests...\n');

  // Add any cleanup logic here if needed
  // For now, just log completion

  console.log('✅ [Playwright Global Teardown] Cleanup complete\n');
}

export default globalTeardown;
