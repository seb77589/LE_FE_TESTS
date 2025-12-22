import { NextResponse } from 'next/server';
import { proxy } from '@/proxy';

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn().mockImplementation(() => ({
      headers: { set: jest.fn() },
      status: 200,
    })),
    redirect: jest.fn().mockImplementation((url) => ({
      headers: { set: jest.fn() },
      url: url.toString(),
    })),
  },
}));

describe('Proxy', () => {
  let mockRequest: any; // Using any to bypass type issues with mocks
  let mockHeaders: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock headers with a Map to properly simulate Headers object
    mockHeaders = new Map();
    mockHeaders.set('user-agent', 'test-agent');
    mockHeaders.set('x-forwarded-for', '192.168.1.1');

    // Common request setup - using 'any' type to bypass TypeScript errors with mocks
    mockRequest = {
      cookies: {
        get: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
      },
      nextUrl: {
        pathname: '/dashboard',
        href: 'http://localhost:3000/dashboard',
        toString: () => 'http://localhost:3000/dashboard',
      },
      url: 'http://localhost:3000/dashboard',
      method: 'GET',
      headers: {
        get: jest.fn((key) => mockHeaders.get(key) ?? null),
        has: jest.fn((key) => mockHeaders.has(key)),
        forEach: jest.fn(),
      },
      ip: '127.0.0.1',
    };

    // Mock process.env in middleware
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      configurable: true,
    });

    // Mock ENVIRONMENT variable
    Object.defineProperty(process.env, 'ENVIRONMENT', {
      value: 'development',
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original implementations
    jest.restoreAllMocks();
  });

  it('should add security headers to all responses', async () => {
    // Use a non-protected route
    mockRequest.nextUrl.pathname = '/';
    mockRequest.url = 'http://localhost:3000/';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    const result = await proxy(mockRequest);

    // Should call NextResponse.next() and return the response
    expect(NextResponse.next).toHaveBeenCalled();
    expect(result).toBe(mockResponse);

    // Should set security headers
    expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-XSS-Protection',
      '1; mode=block',
    );
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Referrer-Policy',
      'strict-origin-when-cross-origin',
    );
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-DNS-Prefetch-Control',
      'on',
    );
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-Permitted-Cross-Domain-Policies',
      'none',
    );
  });

  it('should set environment-appropriate HSTS header in test environment', async () => {
    // Use a non-protected route
    mockRequest.nextUrl.pathname = '/';
    mockRequest.url = 'http://localhost:3000/';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    await proxy(mockRequest);

    // Should set HSTS header for test environment
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  });

  it('should set development-appropriate permissions policy', async () => {
    // Use a non-protected route
    mockRequest.nextUrl.pathname = '/';
    mockRequest.url = 'http://localhost:3000/';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    await proxy(mockRequest);

    // Should set development permissions policy
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), fullscreen=*, picture-in-picture=*',
    );
  });

  it('should set development-appropriate cross-origin headers', async () => {
    // Use a non-protected route
    mockRequest.nextUrl.pathname = '/';
    mockRequest.url = 'http://localhost:3000/';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    await proxy(mockRequest);

    // Should set development cross-origin headers
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Cross-Origin-Embedder-Policy',
      'unsafe-none',
    );
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Cross-Origin-Opener-Policy',
      'unsafe-none',
    );
  });

  it('should handle static asset paths correctly', async () => {
    // Test with static asset path
    mockRequest.nextUrl.pathname = '/_next/static/css/main.css';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    await proxy(mockRequest);

    // Should still set basic security headers
    expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-XSS-Protection',
      '1; mode=block',
    );

    // Should not set X-Content-Type-Options for static assets in development
    expect(mockResponse.headers.set).not.toHaveBeenCalledWith(
      'X-Content-Type-Options',
      expect.any(String),
    );
  });

  it('should handle API paths correctly', async () => {
    // Test with API path
    mockRequest.nextUrl.pathname = '/api/health';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    await proxy(mockRequest);

    // Should set basic security headers
    expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-XSS-Protection',
      '1; mode=block',
    );

    // Should set Cross-Origin-Resource-Policy for development environment (even for API paths)
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );
  });

  it('should set X-Content-Type-Options for HTML pages', async () => {
    // Test with non-protected HTML page path
    mockRequest.nextUrl.pathname = '/';
    mockRequest.url = 'http://localhost:3000/';

    const mockResponse = { headers: { set: jest.fn() } };
    (NextResponse.next as jest.Mock).mockReturnValueOnce(mockResponse);

    await proxy(mockRequest);

    // Should set X-Content-Type-Options for HTML pages
    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
  });
});
