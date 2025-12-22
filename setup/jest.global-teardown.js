/**
 * Jest Global Teardown
 *
 * Previously stopped docker compose services, but this is unnecessary and disruptive.
 * The containers should remain running for subsequent test runs and development.
 *
 * This file is kept for compatibility but performs no operations.
 */
module.exports = async function globalTeardown() {
  console.log(
    '[jest.global-teardown] Skipping container shutdown – containers remain running for development.',
  );
  // No-op: containers remain running
};
