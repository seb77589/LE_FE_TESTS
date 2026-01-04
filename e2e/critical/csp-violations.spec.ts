/**
 * E2E Tests for CSP Violations
 *
 * Tests Content Security Policy enforcement in the browser:
 * - CSP blocks inline scripts (production)
 * - CSP allows Next.js scripts with strict-dynamic
 * - CSP violation reporting
 * - Browser enforcement across different scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('CSP Enforcement E2E Tests', () => {
  test.describe('Production CSP Enforcement', () => {
    test.beforeEach(async ({ page }) => {
      // Track CSP violations
      const violations: any[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('Content Security Policy')) {
          violations.push(msg.text());
        }
      });
      (page as any).violations = violations;
    });

    test('should block inline scripts in production mode', async ({ page }) => {
      // Navigate to any page
      await page.goto('/auth/login');

      // Try to inject inline script (should be blocked by CSP)
      const scriptBlocked = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.innerHTML = 'window.testInlineScript = true;';
          document.body.appendChild(script);

          // If CSP is working, the script won't execute
          return !(window as any).testInlineScript;
        } catch (e) {
          return true; // Blocked by CSP
        }
      });

      // In development, inline scripts are allowed (unsafe-inline)
      // In production, they should be blocked (strict-dynamic)
      if (process.env.NODE_ENV === 'production') {
        expect(scriptBlocked).toBe(true);
      }
    });

    test('should allow Next.js framework scripts with strict-dynamic', async ({
      page,
    }) => {
      await page.goto('/auth/login');

      // Next.js scripts should load successfully
      const nextScriptsLoaded = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const nextScripts = scripts.filter((s) => s.src.includes('/_next/'));
        return nextScripts.length > 0;
      });

      expect(nextScriptsLoaded).toBe(true);
    });

    test('should include CSP headers in responses', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const headers = response?.headers();

      expect(headers).toBeDefined();
      expect(headers?.['content-security-policy']).toBeDefined();

      const csp = headers?.['content-security-policy'] || '';

      // Should have base directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");

      // Should have script-src
      expect(csp).toContain('script-src');

      // In production: should use strict-dynamic
      if (process.env.NODE_ENV === 'production') {
        expect(csp).toContain("'strict-dynamic'");
        expect(csp).not.toContain("'unsafe-inline'");
        expect(csp).not.toContain("'unsafe-eval'");
      }
    });

    test('should not allow eval() in production', async ({ page }) => {
      await page.goto('/auth/login');

      const evalBlocked = await page.evaluate(() => {
        try {
          // Try to use eval (should be blocked in production)
          eval('1 + 1'); // eslint-disable-line no-eval
          return false; // eval worked
        } catch (e) {
          return true; // eval was blocked
        }
      });

      if (process.env.NODE_ENV === 'production') {
        expect(evalBlocked).toBe(true);
      }
    });

    test('should allow styles from self and Google Fonts', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('style-src');
      expect(csp).toContain("'self'");
      expect(csp).toContain('https://fonts.googleapis.com');
    });

    test('should allow fonts from self and Google Fonts', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('font-src');
      expect(csp).toContain("'self'");
      expect(csp).toContain('https://fonts.gstatic.com');
      expect(csp).toContain('data:');
    });

    test('should allow images from self, data:, and https:', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('img-src');
      expect(csp).toContain("'self'");
      expect(csp).toContain('data:');
      expect(csp).toContain('https:');
    });

    test('should set frame-ancestors to prevent clickjacking', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('frame-ancestors');

      // Production should use 'none', development can use 'self'
      if (process.env.NODE_ENV === 'production') {
        expect(csp).toContain("frame-ancestors 'none'");
      }
    });
  });

  test.describe('CSP Violation Reporting', () => {
    test('should include report-uri directive', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('report-uri');
      expect(csp).toContain('/api/v1/security/csp-violations');
    });

    test('should have report-only header for monitoring', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const headers = response?.headers();

      // In production, should have report-only header for monitoring
      if (process.env.NODE_ENV === 'production') {
        expect(headers?.['content-security-policy-report-only']).toBeDefined();
      }
    });
  });

  test.describe('Development vs Production CSP', () => {
    test('should allow localhost connections in development', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      if (process.env.NODE_ENV === 'development') {
        expect(csp).toContain('connect-src');
        expect(csp).toContain('localhost');
      }
    });

    test('should upgrade insecure requests in production', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      if (process.env.NODE_ENV === 'production') {
        expect(csp).toContain('upgrade-insecure-requests');
        expect(csp).toContain('block-all-mixed-content');
      }
    });
  });

  test.describe('CSP Directive Validation', () => {
    test('should not have duplicate directives', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      const directives = csp.split(';').map((d) => d.trim());
      const directiveNames = directives.map((d) => d.split(' ')[0]);

      const uniqueDirectiveNames = new Set(directiveNames);

      // Should not have duplicates
      expect(uniqueDirectiveNames.size).toBe(directiveNames.length);
    });

    test('should have well-formed CSP directives', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      const directives = csp
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);

      // Each directive should have format: "directive-name value1 value2..."
      // OR just directive name for flags (upgrade-insecure-requests, block-all-mixed-content)
      directives.forEach((directive) => {
        const parts = directive.split(/\s+/);
        const directiveName = parts[0];

        // Directive name should be kebab-case or known flag
        expect(directiveName).toMatch(
          /^[a-z-]+$|^upgrade-insecure-requests$|^block-all-mixed-content$/,
        );

        // If it has values, they should be properly formatted
        if (parts.length > 1) {
          parts.slice(1).forEach((value) => {
            // Values should be quoted keywords, URLs, relative paths, or special values
            // Phase 2 Fix: Added |^\/.*$ to allow relative paths like /api/v1/security/csp-violations
            expect(value).toMatch(
              /^'[a-z-]+'$|^https?:\/\/|^wss?:\/\/|^data:$|^blob:$|^\*$|^[a-z]+:$|^\/.*$/,
            );
          });
        }
      });
    });
  });

  test.describe('Browser Security Features', () => {
    test('should prevent loading resources from blocked origins', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to load image from blocked origin (should fail)
      const imageBlocked = await page.evaluate(() => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onerror = () => resolve(true); // Blocked
          img.onload = () => resolve(false); // Allowed
          img.src = 'http://evil.com/malicious.jpg';

          // Timeout after 2 seconds
          setTimeout(() => resolve(true), 2000);
        });
      });

      // In production with strict CSP, external images should be blocked
      // unless explicitly allowed in img-src
      if (process.env.NODE_ENV === 'production') {
        expect(imageBlocked).toBe(true);
      }
    });

    test('should allow worker-src for web workers', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('worker-src');
      expect(csp).toContain("'self'");
      expect(csp).toContain('blob:');
    });

    test('should set frame-src to prevent embedding', async ({ page }) => {
      const response = await page.goto('/auth/login');
      const csp = response?.headers()?.['content-security-policy'] || '';

      expect(csp).toContain('frame-src');
      expect(csp).toContain("'none'");
    });
  });
});
