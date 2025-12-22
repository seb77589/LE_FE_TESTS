/**
 * @fileoverview Comprehensive unit tests for gridUtils utility
 *
 * Tests cover:
 * - formatFileSize: formatting bytes to human-readable strings
 * - getFileIcon: returning appropriate icons for mime types
 * - Edge cases: boundary values, invalid inputs, special cases
 *
 * @module tests/gridUtils.test
 * @since 0.2.0
 */

import React from 'react';
import { formatFileSize, getFileIcon } from '@/components/documents/grid/gridUtils';

// Helper to safely get className from React element
const getIconClassName = (icon: React.ReactElement): string => {
  return (icon.props as { className?: string }).className || '';
};

// ==============================================================================
// Test Suites
// ==============================================================================

describe('gridUtils', () => {
  // ==========================================================================
  // formatFileSize Tests
  // ==========================================================================
  describe('formatFileSize', () => {
    describe('zero and boundary values', () => {
      it('should return "0 Bytes" for 0 bytes', () => {
        expect(formatFileSize(0)).toBe('0 Bytes');
      });

      it('should handle 1 byte', () => {
        expect(formatFileSize(1)).toBe('1 Bytes');
      });

      it('should handle exactly 1024 bytes (1 KB)', () => {
        expect(formatFileSize(1024)).toBe('1 KB');
      });

      it('should handle exactly 1 MB', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      });

      it('should handle exactly 1 GB', () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      });
    });

    describe('bytes range (0 - 1023)', () => {
      it('should format small byte values', () => {
        expect(formatFileSize(100)).toBe('100 Bytes');
      });

      it('should format values just under 1 KB', () => {
        expect(formatFileSize(1023)).toBe('1023 Bytes');
      });

      it('should format 512 bytes', () => {
        expect(formatFileSize(512)).toBe('512 Bytes');
      });
    });

    describe('kilobytes range (1KB - 1MB)', () => {
      it('should format small KB values', () => {
        expect(formatFileSize(1536)).toBe('1.5 KB');
      });

      it('should format medium KB values', () => {
        expect(formatFileSize(10 * 1024)).toBe('10 KB');
      });

      it('should format values just under 1 MB', () => {
        expect(formatFileSize(1024 * 1024 - 1)).toBe('1024 KB');
      });

      it('should format 500 KB', () => {
        expect(formatFileSize(500 * 1024)).toBe('500 KB');
      });
    });

    describe('megabytes range (1MB - 1GB)', () => {
      it('should format small MB values', () => {
        expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      });

      it('should format medium MB values', () => {
        expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
      });

      it('should format large MB values', () => {
        expect(formatFileSize(500 * 1024 * 1024)).toBe('500 MB');
      });

      it('should format values just under 1 GB', () => {
        const justUnderGB = 1024 * 1024 * 1024 - 1;
        expect(formatFileSize(justUnderGB)).toBe('1024 MB');
      });
    });

    describe('gigabytes range', () => {
      it('should format small GB values', () => {
        expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
      });

      it('should format medium GB values', () => {
        expect(formatFileSize(10 * 1024 * 1024 * 1024)).toBe('10 GB');
      });

      it('should format large GB values', () => {
        expect(formatFileSize(100 * 1024 * 1024 * 1024)).toBe('100 GB');
      });
    });

    describe('decimal precision', () => {
      it('should show 2 decimal places when needed', () => {
        expect(formatFileSize(1234)).toBe('1.21 KB');
      });

      it('should show 2 decimal places for MB', () => {
        expect(formatFileSize(1234567)).toBe('1.18 MB');
      });

      it('should not show unnecessary decimals', () => {
        expect(formatFileSize(2048)).toBe('2 KB');
      });
    });
  });

  // ==========================================================================
  // getFileIcon Tests
  // ==========================================================================
  describe('getFileIcon', () => {
    describe('image mime types', () => {
      it('should return image icon for image/jpeg', () => {
        const icon = getFileIcon('image/jpeg');
        expect(React.isValidElement(icon)).toBe(true);
        expect(getIconClassName(icon)).toContain('text-blue-500');
      });

      it('should return image icon for image/png', () => {
        const icon = getFileIcon('image/png');
        expect(React.isValidElement(icon)).toBe(true);
        expect(getIconClassName(icon)).toContain('text-blue-500');
      });

      it('should return image icon for image/gif', () => {
        const icon = getFileIcon('image/gif');
        expect(getIconClassName(icon)).toContain('text-blue-500');
      });

      it('should return image icon for image/webp', () => {
        const icon = getFileIcon('image/webp');
        expect(getIconClassName(icon)).toContain('text-blue-500');
      });

      it('should return image icon for image/svg+xml', () => {
        const icon = getFileIcon('image/svg+xml');
        expect(getIconClassName(icon)).toContain('text-blue-500');
      });
    });

    describe('PDF mime type', () => {
      it('should return FileText icon with red color for PDF', () => {
        const icon = getFileIcon('application/pdf');
        expect(React.isValidElement(icon)).toBe(true);
        expect(getIconClassName(icon)).toContain('text-red-500');
      });
    });

    describe('default/other mime types', () => {
      it('should return FileText icon with gray color for unknown types', () => {
        const icon = getFileIcon('application/octet-stream');
        expect(React.isValidElement(icon)).toBe(true);
        expect(getIconClassName(icon)).toContain('text-gray-500');
      });

      it('should return gray icon for text/plain', () => {
        const icon = getFileIcon('text/plain');
        expect(getIconClassName(icon)).toContain('text-gray-500');
      });

      it('should return gray icon for application/json', () => {
        const icon = getFileIcon('application/json');
        expect(getIconClassName(icon)).toContain('text-gray-500');
      });

      it('should return gray icon for Word documents', () => {
        const icon = getFileIcon('application/msword');
        expect(getIconClassName(icon)).toContain('text-gray-500');
      });

      it('should return gray icon for Excel files', () => {
        const icon = getFileIcon('application/vnd.ms-excel');
        expect(getIconClassName(icon)).toContain('text-gray-500');
      });

      it('should return gray icon for empty string', () => {
        const icon = getFileIcon('');
        expect(getIconClassName(icon)).toContain('text-gray-500');
      });
    });

    describe('icon structure', () => {
      it('should return valid React element', () => {
        const icon = getFileIcon('image/jpeg');
        expect(React.isValidElement(icon)).toBe(true);
      });

      it('should have h-4 w-4 class for consistent sizing', () => {
        const imageIcon = getFileIcon('image/png');
        const pdfIcon = getFileIcon('application/pdf');
        const defaultIcon = getFileIcon('text/plain');

        expect(getIconClassName(imageIcon)).toContain('h-4 w-4');
        expect(getIconClassName(pdfIcon)).toContain('h-4 w-4');
        expect(getIconClassName(defaultIcon)).toContain('h-4 w-4');
      });
    });
  });
});
