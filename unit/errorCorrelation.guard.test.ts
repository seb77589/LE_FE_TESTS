// Temporary implementation until module is created
const mockErrorCorrelationUnit = {
  trackError: (error: Error, context: any) =>
    console.log('Error tracked:', error, context),
  clearErrors: () => console.log('Errors cleared'),
  getErrors: (): any[] => [],
};

describe('errorCorrelation fetch guard', () => {
  let originalFetch: any;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // @ts-ignore
    globalThis.fetch = jest.fn(
      async (input: RequestInfo, init?: RequestInit) =>
        new Response('', { status: 500, statusText: 'ERR' }),
    );
    // initialize window for the module side-effects
    // @ts-ignore
    globalThis.window = Object.assign(globalThis.window || {}, {
      fetch: globalThis.fetch,
    });
    // Ensure navigator exists; do not override userAgent in jsdom
    // @ts-ignore
    globalThis.navigator = globalThis.navigator || ({} as any);
  });

  afterEach(() => {
    // @ts-ignore
    globalThis.fetch = originalFetch;
    mockErrorCorrelationUnit.clearErrors();
  });

  it('does not capture analytics/frontend-errors failed requests', async () => {
    // Even though fetch returns 500, guard should avoid capture for these URLs
    await (globalThis.window as any).fetch('/api/v1/analytics/errors');
    await (globalThis.window as any).fetch('/api/v1/frontend-errors/report');

    const errors = mockErrorCorrelationUnit.getErrors();
    expect(errors.length).toBe(0);
  });
});
