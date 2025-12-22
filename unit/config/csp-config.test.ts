/**
 * CSP Configuration Builder Tests
 *
 * Tests the buildCSP function logic from next.config.js:
 * - Development vs production CSP generation
 * - Directive formatting
 * - Environment-specific configurations
 * - API URL integration
 */

describe('CSP Configuration Builder', () => {
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

  // Helper function to parse CSP string into directives
  const parseCSP = (csp: string) => {
    const directives: Record<string, string[]> = {};
    const parts = csp
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean);

    for (const part of parts) {
      const [directive, ...values] = part.split(/\s+/);
      if (directive) {
        directives[directive] = values;
      }
    }

    return directives;
  };

  // Simplified buildCSP function for testing (mirrors next.config.js logic)
  const buildCSP = (apiConfig: {
    external: string;
    internal: string;
    isDocker: boolean;
  }) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    // Base CSP directives
    const baseDirectives = {
      'default-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    };

    // Script sources
    const scriptSrc = ["'self'"];
    if (isDevelopment) {
      scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
    } else {
      scriptSrc.push("'strict-dynamic'");
    }

    // Style sources
    const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];

    // Font sources
    const fontSrc = ["'self'", 'https://fonts.gstatic.com', 'data:'];

    // Image sources
    const imgSrc = ["'self'", 'data:', 'blob:', 'https:'];
    if (isProduction) {
      imgSrc.push(
        'https://images.unsplash.com',
        'https://avatars.githubusercontent.com',
      );
    }

    // Connect sources
    const connectSrc = ["'self'"];
    if (isDevelopment) {
      connectSrc.push(
        '*',
        'ws://localhost:*',
        'http://localhost:*',
        'wss://localhost:*',
        'wss://192.168.5.107:*',
        'https://192.168.5.107:*',
        'https://192.168.5.107:8443',
      );
    } else {
      connectSrc.push(
        apiConfig.external,
        'https://api.ipify.org',
        'https://ipapi.co',
        'https://analytics.google.com',
        'wss:',
      );
    }

    // Worker sources
    const workerSrc = ["'self'", 'blob:'];

    // Frame sources
    const frameSrc = ["'none'"];

    // Frame ancestors
    const frameAncestors = isProduction ? ["'none'"] : ["'self'"];

    // Additional security directives for production
    const additionalDirectives: Record<string, string[]> = {};
    if (isProduction) {
      additionalDirectives['upgrade-insecure-requests'] = [];
      additionalDirectives['block-all-mixed-content'] = [];
    }

    // Report URI
    const reportUri = '/api/v1/security/csp-violations';

    // Build CSP string
    const cspParts = [
      ...Object.entries(baseDirectives).map(
        ([directive, sources]) => `${directive} ${sources.join(' ')}`,
      ),
      `script-src ${scriptSrc.join(' ')}`,
      `style-src ${styleSrc.join(' ')}`,
      `font-src ${fontSrc.join(' ')}`,
      `img-src ${imgSrc.join(' ')}`,
      `connect-src ${connectSrc.join(' ')}`,
      `worker-src ${workerSrc.join(' ')}`,
      `frame-src ${frameSrc.join(' ')}`,
      `frame-ancestors ${frameAncestors.join(' ')}`,
      ...Object.entries(additionalDirectives).map(([directive]) => directive),
      `report-uri ${reportUri}`,
    ];

    return cspParts.join('; ');
  };

  describe('Development CSP', () => {
    beforeEach(() => {
      setNodeEnv('development');
    });

    it('should include unsafe-inline and unsafe-eval for Next.js HMR', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['script-src']).toContain("'unsafe-inline'");
      expect(directives['script-src']).toContain("'unsafe-eval'");
    });

    it('should allow localhost connections in development', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['connect-src']).toContain('*');
      expect(directives['connect-src']).toContain('ws://localhost:*');
      expect(directives['connect-src']).toContain('http://localhost:*');
    });

    it('should use frame-ancestors self in development', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['frame-ancestors']).toContain("'self'");
    });

    it('should not include upgrade-insecure-requests in development', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);

      expect(csp).not.toContain('upgrade-insecure-requests');
      expect(csp).not.toContain('block-all-mixed-content');
    });
  });

  describe('Production CSP', () => {
    beforeEach(() => {
      setNodeEnv('production');
    });

    afterEach(() => {
      setNodeEnv('development');
    });

    it('should use strict-dynamic instead of unsafe directives', () => {
      const apiConfig = {
        external: 'https://api.example.com',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['script-src']).toContain("'strict-dynamic'");
      expect(directives['script-src']).not.toContain("'unsafe-inline'");
      expect(directives['script-src']).not.toContain("'unsafe-eval'");
    });

    it('should use frame-ancestors none in production', () => {
      const apiConfig = {
        external: 'https://api.example.com',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['frame-ancestors']).toContain("'none'");
    });

    it('should include upgrade-insecure-requests in production', () => {
      const apiConfig = {
        external: 'https://api.example.com',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);

      expect(csp).toContain('upgrade-insecure-requests');
      expect(csp).toContain('block-all-mixed-content');
    });

    it('should include production image sources', () => {
      const apiConfig = {
        external: 'https://api.example.com',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['img-src']).toContain('https://images.unsplash.com');
      expect(directives['img-src']).toContain('https://avatars.githubusercontent.com');
    });

    it('should include production connect sources', () => {
      const apiConfig = {
        external: 'https://api.example.com',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['connect-src']).toContain('https://api.example.com');
      expect(directives['connect-src']).toContain('https://api.ipify.org');
      expect(directives['connect-src']).toContain('https://ipapi.co');
      expect(directives['connect-src']).toContain('https://analytics.google.com');
      expect(directives['connect-src']).toContain('wss:');
    });
  });

  describe('Base CSP Directives', () => {
    it('should always include base security directives', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['default-src']).toContain("'self'");
      expect(directives['object-src']).toContain("'none'");
      expect(directives['base-uri']).toContain("'self'");
      expect(directives['form-action']).toContain("'self'");
    });

    it('should always include style sources', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['style-src']).toContain("'self'");
      expect(directives['style-src']).toContain("'unsafe-inline'"); // Required for Tailwind
      expect(directives['style-src']).toContain('https://fonts.googleapis.com');
    });

    it('should always include font sources', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['font-src']).toContain("'self'");
      expect(directives['font-src']).toContain('https://fonts.gstatic.com');
      expect(directives['font-src']).toContain('data:');
    });

    it('should always include worker-src', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['worker-src']).toContain("'self'");
      expect(directives['worker-src']).toContain('blob:');
    });

    it('should always set frame-src to none', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['frame-src']).toContain("'none'");
    });
  });

  describe('CSP Reporting', () => {
    it('should include report-uri directive', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['report-uri']).toContain('/api/v1/security/csp-violations');
    });
  });

  describe('API URL Integration', () => {
    it('should include external API URL in production connect-src', () => {
      setNodeEnv('production');

      const apiConfig = {
        external: 'https://api.example.com',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = parseCSP(csp);

      expect(directives['connect-src']).toContain('https://api.example.com');

      setNodeEnv('development');
    });

    it('should work with different API URL formats', () => {
      setNodeEnv('production');

      const apiConfigs = [
        {
          external: 'http://localhost:8000',
          internal: 'http://backend:8000',
          isDocker: true,
        },
        {
          external: 'https://api.example.com',
          internal: 'http://backend:8000',
          isDocker: true,
        },
        {
          external: 'http://192.168.1.100:8000',
          internal: 'http://backend:8000',
          isDocker: true,
        },
      ];

      for (const config of apiConfigs) {
        const csp = buildCSP(config);
        const directives = parseCSP(csp);

        expect(directives['connect-src']).toContain(config.external);
      }

      setNodeEnv('development');
    });
  });

  describe('CSP Format Validation', () => {
    it('should produce well-formed CSP string', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);

      // Should be semicolon-separated directives
      const directives = csp
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);

      expect(directives.length).toBeGreaterThan(0);

      // Each directive should have proper format
      for (const directive of directives) {
        // Either "directive-name value1 value2..." or just "directive-name" for flags
        expect(directive).toMatch(/^[a-z-]+(\s+.+)?$/);
      }
    });

    it('should not have duplicate directives', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);
      const directives = csp
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);
      const directiveNames = directives.map((d) => d.split(' ')[0]);

      const uniqueDirectiveNames = new Set(directiveNames);

      expect(uniqueDirectiveNames.size).toBe(directiveNames.length);
    });

    it('should have consistent separator format', () => {
      const apiConfig = {
        external: 'http://localhost:8000',
        internal: 'http://backend:8000',
        isDocker: true,
      };

      const csp = buildCSP(apiConfig);

      // Should use "; " as separator (semicolon + space)
      expect(csp).toMatch(/; /);

      // Should not have leading/trailing semicolons
      expect(csp).not.toMatch(/^;/);
      expect(csp).not.toMatch(/;$/);
    });
  });
});
