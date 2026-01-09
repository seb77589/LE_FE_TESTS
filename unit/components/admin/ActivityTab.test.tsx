/**
 * ActivityTab was removed as part of the admin UI simplification.
 *
 * This file used to import removed modules and crash Jest at import-time.
 * Keep a skipped suite as a guardrail to prevent stale expectations.
 */

describe.skip('ActivityTab (removed)', () => {
  it('is no longer part of the admin UI', () => {
    expect(true).toBe(true);
  });
});

export {};
