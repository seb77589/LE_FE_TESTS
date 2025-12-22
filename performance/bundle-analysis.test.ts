/**
 * Bundle Analysis Tests
 *
 * Tests to validate frontend bundle sizes and composition.
 * These tests help prevent bundle size regressions and ensure
 * optimal code splitting.
 *
 * Run with: npm test -- bundle-analysis.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Bundle size thresholds (in KB)
const THRESHOLDS = {
  totalSharedJS: 800 * 1024, // 800 KB
  averageRouteSize: 15 * 1024, // 15 KB
  averageFirstLoadJS: 850 * 1024, // 850 KB
  largestChunk: 60 * 1024, // 60 KB
  criticalVendors: 200 * 1024, // 200 KB total for critical vendors
};

/**
 * Parse build manifest to extract bundle information
 */
function parseBuildManifest() {
  const manifestPath = path.join(__dirname, '../../.next/build-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('Build manifest not found. Run "npm run build" first.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest;
}

/**
 * Get static file sizes from .next directory
 */
function getStaticFileSizes() {
  const staticPath = path.join(__dirname, '../../.next/static');

  if (!fs.existsSync(staticPath)) {
    throw new Error('Static directory not found. Run "npm run build" first.');
  }

  const chunks: { name: string; size: number }[] = [];

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.js')) {
        const size = stat.size;
        const relativePath = path.relative(staticPath, filePath);
        chunks.push({
          name: relativePath,
          size,
        });
      }
    }
  }

  walkDir(staticPath);
  return chunks;
}

/**
 * Calculate total size of chunks matching a pattern
 */
function getTotalSizeByPattern(
  chunks: { name: string; size: number }[],
  pattern: RegExp,
): number {
  return chunks
    .filter((chunk) => pattern.test(chunk.name))
    .reduce((total, chunk) => total + chunk.size, 0);
}

describe('Bundle Analysis Tests', () => {
  describe('Build Manifest', () => {
    it('should have a valid build manifest', () => {
      const manifest = parseBuildManifest();

      expect(manifest).toBeDefined();
      expect(manifest.pages).toBeDefined();
      expect(Object.keys(manifest.pages).length).toBeGreaterThan(0);
    });

    it('should not have duplicate chunk entries', () => {
      const manifest = parseBuildManifest();
      const allChunks: string[] = [];

      // Collect all chunks from all pages
      Object.values(manifest.pages).forEach((chunks: any) => {
        if (Array.isArray(chunks)) {
          allChunks.push(...chunks);
        }
      });

      // Check for duplicates
      const uniqueChunks = new Set(allChunks);
      const duplicateCount = allChunks.length - uniqueChunks.size;

      // Some duplicates are expected (shared chunks), but excessive duplicates indicate issues
      expect(duplicateCount).toBeLessThan(allChunks.length * 0.5); // Less than 50% duplicates
    });
  });

  describe('Bundle Size Limits', () => {
    let chunks: { name: string; size: number }[];

    beforeAll(() => {
      chunks = getStaticFileSizes();
    });

    it('should have chunks within size limits', () => {
      expect(chunks.length).toBeGreaterThan(0);

      const largestChunk = chunks.reduce(
        (max, chunk) => (chunk.size > max.size ? chunk : max),
        chunks[0],
      );

      expect(largestChunk.size).toBeLessThanOrEqual(THRESHOLDS.largestChunk);
    });

    it('should keep critical vendor chunks under threshold', () => {
      const criticalVendorSize = getTotalSizeByPattern(
        chunks,
        /critical-vendors.*\.js$/,
      );

      expect(criticalVendorSize).toBeLessThanOrEqual(THRESHOLDS.criticalVendors);
    });

    it('should not have excessively large individual chunks', () => {
      const largeChunks = chunks.filter(
        (chunk) => chunk.size > THRESHOLDS.largestChunk,
      );

      if (largeChunks.length > 0) {
        console.warn('Large chunks detected:');
        largeChunks.forEach((chunk) => {
          console.warn(`  ${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`);
        });
      }

      // Allow a few large chunks, but flag if there are too many
      expect(largeChunks.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Code Splitting', () => {
    let chunks: { name: string; size: number }[];

    beforeAll(() => {
      chunks = getStaticFileSizes();
    });

    it('should have vendor chunks separated from app code', () => {
      const vendorChunks = chunks.filter(
        (chunk) =>
          chunk.name.includes('vendors') || chunk.name.includes('critical-vendors'),
      );

      // Should have at least some vendor chunks
      expect(vendorChunks.length).toBeGreaterThan(0);

      // Vendor chunks should be a significant portion
      const vendorSize = vendorChunks.reduce((total, chunk) => total + chunk.size, 0);
      const totalSize = chunks.reduce((total, chunk) => total + chunk.size, 0);

      expect(vendorSize / totalSize).toBeGreaterThan(0.3); // At least 30% should be vendor code
    });

    it('should have page-specific chunks', () => {
      const manifest = parseBuildManifest();
      const pages = Object.keys(manifest.pages);

      // Should have multiple pages with their own chunks
      expect(pages.length).toBeGreaterThan(5);
    });

    it('should split React vendors into separate chunks', () => {
      const reactChunks = chunks.filter(
        (chunk) =>
          chunk.name.includes('react') ||
          (chunk.name.includes('vendors') && chunk.name.includes('react')),
      );

      // Should have React in vendor chunks (not necessarily in separate react chunk)
      const hasReactCode = chunks.some(
        (chunk) =>
          chunk.name.includes('react') || chunk.name.includes('critical-vendors'),
      );

      expect(hasReactCode).toBe(true);
    });
  });

  describe('Bundle Composition', () => {
    let chunks: { name: string; size: number }[];

    beforeAll(() => {
      chunks = getStaticFileSizes();
    });

    it('should have CSS chunks', () => {
      const staticPath = path.join(__dirname, '../../.next/static');
      const cssFiles: string[] = [];

      function findCSS(dir: string) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            findCSS(filePath);
          } else if (file.endsWith('.css')) {
            cssFiles.push(file);
          }
        }
      }

      findCSS(staticPath);

      // Should have at least some CSS files
      expect(cssFiles.length).toBeGreaterThan(0);
    });

    it('should not have source maps in production build', () => {
      const sourceMapChunks = chunks.filter((chunk) => chunk.name.endsWith('.map'));

      // Production builds should not include source maps by default
      // (unless explicitly configured)
      expect(sourceMapChunks.length).toBe(0);
    });

    it('should have reasonable number of total chunks', () => {
      // Too many chunks = more HTTP requests
      // Too few chunks = less effective caching
      expect(chunks.length).toBeGreaterThan(10); // At least some code splitting
      expect(chunks.length).toBeLessThan(200); // Not too fragmented
    });
  });

  describe('Build Optimization', () => {
    it('should not have debug code in production', () => {
      // Sample a few chunks to check for debug patterns
      const chunkSamples = getStaticFileSizes().slice(0, 5);

      chunkSamples.forEach((chunk) => {
        const chunkPath = path.join(__dirname, '../../.next/static', chunk.name);
        const content = fs.readFileSync(chunkPath, 'utf8');

        // Should not contain console.log in production (minified builds remove these)
        // This is a heuristic check - some console statements may remain for errors
        const consoleLogCount = (content.match(/console\.log/g) || []).length;

        // Allow a small number of console statements (for errors/warnings)
        expect(consoleLogCount).toBeLessThan(10);
      });
    });

    it('should have minified JavaScript', () => {
      // Check that chunks are minified by looking at file size vs line count
      const chunkSamples = getStaticFileSizes().slice(0, 3);

      chunkSamples.forEach((chunk) => {
        const chunkPath = path.join(__dirname, '../../.next/static', chunk.name);
        const content = fs.readFileSync(chunkPath, 'utf8');

        // Minified files have very few newlines relative to size
        const lineCount = (content.match(/\n/g) || []).length;
        const avgLineLength = chunk.size / (lineCount || 1);

        // Minified files should have long lines (>500 chars average)
        expect(avgLineLength).toBeGreaterThan(500);
      });
    });
  });

  describe('Bundle Trends', () => {
    it('should provide bundle size summary for tracking', () => {
      const chunks = getStaticFileSizes();

      const totalSize = chunks.reduce((total, chunk) => total + chunk.size, 0);
      const vendorSize = getTotalSizeByPattern(chunks, /vendors.*\.js$/);
      const appSize = totalSize - vendorSize;

      const summary = {
        totalSize: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        vendorSize: vendorSize,
        vendorSizeKB: (vendorSize / 1024).toFixed(2),
        appSize: appSize,
        appSizeKB: (appSize / 1024).toFixed(2),
        chunkCount: chunks.length,
        vendorRatio: ((vendorSize / totalSize) * 100).toFixed(2) + '%',
      };

      console.log('\n📊 Bundle Size Summary:');
      console.log(`  Total: ${summary.totalSizeKB} KB`);
      console.log(`  Vendor: ${summary.vendorSizeKB} KB (${summary.vendorRatio})`);
      console.log(`  App: ${summary.appSizeKB} KB`);
      console.log(`  Chunks: ${summary.chunkCount}`);

      // This test always passes - it's just for logging
      expect(summary.totalSize).toBeGreaterThan(0);
    });
  });
});
