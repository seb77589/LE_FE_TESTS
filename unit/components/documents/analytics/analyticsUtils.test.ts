/**
 * Tests for Document Analytics Utilities
 *
 * @description Tests for analyticsUtils.ts - file size formatting, icon selection, and status colors.
 * Target: 62.5% → 100% coverage
 */

import {
  formatFileSize,
  getFileTypeIcon,
  getStatusColor,
} from '@/components/documents/analytics/analyticsUtils';

describe('analyticsUtils', () => {
  describe('formatFileSize', () => {
    it('should return "0 Bytes" for 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1)).toBe('1 Bytes');
      expect(formatFileSize(999)).toBe('999 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should format terabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('should handle decimal precision', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('getFileTypeIcon', () => {
    it('should return image emoji for image types', () => {
      expect(getFileTypeIcon('image/jpeg')).toBe('🖼️');
      expect(getFileTypeIcon('image/png')).toBe('🖼️');
      expect(getFileTypeIcon('image/gif')).toBe('🖼️');
      expect(getFileTypeIcon('image/webp')).toBe('🖼️');
      expect(getFileTypeIcon('image/svg+xml')).toBe('🖼️');
    });

    it('should return document emoji for PDF', () => {
      expect(getFileTypeIcon('application/pdf')).toBe('📄');
    });

    it('should return text emoji for text types', () => {
      expect(getFileTypeIcon('text/plain')).toBe('📝');
      expect(getFileTypeIcon('text/html')).toBe('📝');
      expect(getFileTypeIcon('text/css')).toBe('📝');
    });

    it('should return text emoji for word documents', () => {
      expect(getFileTypeIcon('application/msword')).toBe('📝');
      expect(getFileTypeIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('📝');
    });

    it('should return paperclip emoji for unknown types', () => {
      expect(getFileTypeIcon('application/json')).toBe('📎');
      expect(getFileTypeIcon('application/zip')).toBe('📎');
      expect(getFileTypeIcon('unknown/type')).toBe('📎');
      expect(getFileTypeIcon('')).toBe('📎');
    });
  });

  describe('getStatusColor', () => {
    it('should return green for uploaded status', () => {
      expect(getStatusColor('uploaded')).toBe('bg-green-100 text-green-800');
      expect(getStatusColor('UPLOADED')).toBe('bg-green-100 text-green-800');
      expect(getStatusColor('Uploaded')).toBe('bg-green-100 text-green-800');
    });

    it('should return yellow for processing status', () => {
      expect(getStatusColor('processing')).toBe('bg-yellow-100 text-yellow-800');
      expect(getStatusColor('PROCESSING')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return blue for processed status', () => {
      expect(getStatusColor('processed')).toBe('bg-blue-100 text-blue-800');
      expect(getStatusColor('PROCESSED')).toBe('bg-blue-100 text-blue-800');
    });

    it('should return red for error status', () => {
      expect(getStatusColor('error')).toBe('bg-red-100 text-red-800');
      expect(getStatusColor('ERROR')).toBe('bg-red-100 text-red-800');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800');
      expect(getStatusColor('pending')).toBe('bg-gray-100 text-gray-800');
      expect(getStatusColor('draft')).toBe('bg-gray-100 text-gray-800');
      expect(getStatusColor('')).toBe('bg-gray-100 text-gray-800');
    });

    it('should be case insensitive', () => {
      expect(getStatusColor('uploaded')).toBe(getStatusColor('UPLOADED'));
      expect(getStatusColor('processing')).toBe(getStatusColor('Processing'));
    });
  });
});
