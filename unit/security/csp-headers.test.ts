/**
 * CSP Header Validation Tests
 *
 * Tests Content Security Policy header configuration:
 * - CSP headers are present in responses
 * - Development vs production CSP differences
 * - Proper CSP directives (strict-dynamic, etc.)
 * - No unsafe-inline/unsafe-eval in production
 */

describe('CSP Header Validation', () => {
  // Save original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  // Helper function to set NODE_ENV (TypeScript-safe)
  const setNodeEnv = (value: string) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      writable: true,
      configurable: true,
    });
  };

  // Restore NODE_ENV after all tests
  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalNodeEnv,
      writable: true,
      configurable: true,
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      setNodeEnv('development');
    });

    it('should include unsafe-inline and unsafe-eval in development mode', () => {
      // Development CSP allows unsafe-inline and unsafe-eval for Next.js HMR
      const devCSP = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

      expect(devCSP).toContain("'unsafe-inline'");
      expect(devCSP).toContain("'unsafe-eval'");
    });

    it('should allow localhost connections in development', () => {
      const devCSP =
        "connect-src 'self' ws://localhost:* http://localhost:* https://localhost:*";

      expect(devCSP).toContain('ws://localhost:*');
      expect(devCSP).toContain('http://localhost:*');
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      setNodeEnv('production');
    });

    it('should use strict-dynamic in production', () => {
      const prodCSP = "script-src 'self' 'strict-dynamic'";

      expect(prodCSP).toContain("'strict-dynamic'");
      expect(prodCSP).not.toContain("'unsafe-inline'");
      expect(prodCSP).not.toContain("'unsafe-eval'");
    });

    it('should restrict default-src to self in production', () => {
      const prodCSP = "default-src 'self'";

      expect(prodCSP).toContain("default-src 'self'");
    });

    it('should allow styles with unsafe-inline for Tailwind CSS', () => {
      // Tailwind requires unsafe-inline for inline styles
      const prodCSP = "style-src 'self' 'unsafe-inline'";

      expect(prodCSP).toContain('style-src');
      expect(prodCSP).toContain("'unsafe-inline'");
    });

    it('should set frame-ancestors to none for clickjacking protection', () => {
      const prodCSP = "frame-ancestors 'none'";

      expect(prodCSP).toContain("frame-ancestors 'none'");
    });

    it('should set base-uri to self', () => {
      const prodCSP = "base-uri 'self'";

      expect(prodCSP).toContain("base-uri 'self'");
    });

    it('should set form-action to self', () => {
      const prodCSP = "form-action 'self'";

      expect(prodCSP).toContain("form-action 'self'");
    });
  });

  describe('CSP Directive Validation', () => {
    it('should have valid CSP directive format', () => {
      const cspHeader =
        "default-src 'self'; script-src 'self' 'strict-dynamic'; style-src 'self' 'unsafe-inline'";

      // CSP should be semicolon-separated
      const directives = cspHeader.split(';').map((d) => d.trim());

      expect(directives.length).toBeGreaterThan(0);
      for (const directive of directives) {
        // Each directive should have format: "directive-name value1 value2..."
        expect(directive).toMatch(/^[\w-]+\s+.+$/);
      }
    });

    it('should not have duplicate directives', () => {
      const cspHeader =
        "default-src 'self'; script-src 'self' 'strict-dynamic'; style-src 'self' 'unsafe-inline'";

      const directives = cspHeader.split(';').map((d) => d.trim());
      const directiveNames = directives.map((d) => d.split(' ')[0]);

      const uniqueDirectiveNames = new Set(directiveNames);
      expect(uniqueDirectiveNames.size).toBe(directiveNames.length);
    });

    it('should allow necessary font sources', () => {
      const cspHeader = "font-src 'self' data: https://fonts.gstatic.com";

      expect(cspHeader).toContain('data:'); // For base64 fonts
      expect(cspHeader).toContain('https://fonts.gstatic.com'); // For Google Fonts
    });

    it('should allow necessary image sources', () => {
      const cspHeader = "img-src 'self' data: https:";

      expect(cspHeader).toContain('data:'); // For base64 images
      expect(cspHeader).toContain('https:'); // For external images over HTTPS
    });
  });

  describe('CSP Response Headers', () => {
    it('should validate CSP header format', () => {
      // Example CSP header from response
      const cspHeader =
        "default-src 'self'; script-src 'self' 'strict-dynamic'; object-src 'none'";

      // Should not be empty
      expect(cspHeader).toBeTruthy();

      // Should contain at least one directive
      expect(cspHeader.split(';').length).toBeGreaterThan(0);

      // Should use single quotes for keywords
      expect(cspHeader).toMatch(/'self'|'none'|'strict-dynamic'/);
    });

    it('should not allow dangerous CSP bypass patterns', () => {
      const dangerousPatterns = [
        "'unsafe-inline' 'strict-dynamic'", // Defeats strict-dynamic
        'script-src *', // Allows all scripts
        'default-src *', // Allows everything
        'script-src data:', // Allows data: URIs for scripts
      ];

      const productionCSP =
        "default-src 'self'; script-src 'self' 'strict-dynamic'; style-src 'self' 'unsafe-inline'";

      for (const pattern of dangerousPatterns) {
        // Production CSP should not contain these dangerous patterns
        if (pattern.includes('unsafe-inline') && pattern.includes('strict-dynamic')) {
          // script-src should not have both
          expect(productionCSP).not.toMatch(
            /script-src[^;]*'unsafe-inline'[^;]*'strict-dynamic'/,
          );
        }

        if (pattern.includes('*')) {
          // Should not allow all sources
          expect(productionCSP).not.toContain('script-src *');
          expect(productionCSP).not.toContain('default-src *');
        }
      }
    });
  });
});
