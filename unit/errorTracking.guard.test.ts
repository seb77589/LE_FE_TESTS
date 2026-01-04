import { ErrorTrackingService } from '@/lib/errors';

describe('ErrorTracking fetch interception', () => {
  let originalFetch: any;
  const realNow = Date.now;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // @ts-ignore
    globalThis.fetch = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
      return new Response('', { status: 201 });
    });
    // Ensure window exists and has fetch
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
    // @ts-ignore
    Date.now = realNow;
  });

  it('does not log slow requests for analytics and frontend-errors endpoints', async () => {
    const svc = new ErrorTrackingService({ enableConsoleLogging: false });
    const spy = jest.spyOn<any, any>(svc as any, 'captureMessage');

    // Simulate slow duration by mocking Date.now
    let t = 0;
    // @ts-ignore
    Date.now = jest.fn(() => (t === 0 ? ((t = 9000), 0) : 9000));
    // @ts-ignore
    globalThis.fetch = jest.fn(async () => new Response('', { status: 201 }));

    // analytics path
    await (globalThis.window as any).fetch('/api/v1/analytics/errors');
    // frontend-errors path
    await (globalThis.window as any).fetch('/api/v1/frontend-errors/report');

    // Should not call captureMessage for slow warnings on these endpoints
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('Slow network request'),
      expect.anything(),
      expect.anything(),
    );
  });
});
