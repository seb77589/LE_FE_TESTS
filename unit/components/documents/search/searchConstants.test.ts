/**
 * @fileoverview Comprehensive unit tests for searchConstants utility
 *
 * Tests cover:
 * - fileTypes: array structure and values
 * - statusOptions: status filter options
 * - sortOptions: sorting options
 * - sizePresets: file size preset ranges
 * - datePresets: date filter presets
 * - formatFileSize: duplicate function (same as gridUtils)
 *
 * @module tests/searchConstants.test
 * @since 0.2.0
 */

import React from 'react';
import {
  fileTypes,
  statusOptions,
  sortOptions,
  sizePresets,
  datePresets,
  formatFileSize,
} from '@/components/documents/search/searchConstants';

// ==============================================================================
// Test Suites
// ==============================================================================

describe('searchConstants', () => {
  // ==========================================================================
  // fileTypes Tests
  // ==========================================================================
  describe('fileTypes', () => {
    it('should be an array', () => {
      expect(Array.isArray(fileTypes)).toBe(true);
    });

    it('should have at least 5 file type options', () => {
      expect(fileTypes.length).toBeGreaterThanOrEqual(5);
    });

    it('should have "All Types" option first with empty value', () => {
      const allTypes = fileTypes[0];
      expect(allTypes.value).toBe('');
      expect(allTypes.label).toBe('All Types');
    });

    it('should have Images option', () => {
      const imagesOption = fileTypes.find((t) => t.value === 'image');
      expect(imagesOption).toBeDefined();
      expect(imagesOption?.label).toBe('Images');
    });

    it('should have PDFs option', () => {
      const pdfOption = fileTypes.find((t) => t.value === 'application/pdf');
      expect(pdfOption).toBeDefined();
      expect(pdfOption?.label).toBe('PDFs');
    });

    it('should have Text Files option', () => {
      const textOption = fileTypes.find((t) => t.value === 'text');
      expect(textOption).toBeDefined();
      expect(textOption?.label).toBe('Text Files');
    });

    it('should have Word Docs option', () => {
      const wordOption = fileTypes.find((t) => t.value === 'application/msword');
      expect(wordOption).toBeDefined();
      expect(wordOption?.label).toBe('Word Docs');
    });

    it('should have icons for non-All options', () => {
      const optionsWithIcons = fileTypes.filter(
        (t) => t.value !== '' && 'icon' in t,
      );
      expect(optionsWithIcons.length).toBeGreaterThan(0);

      for (const option of optionsWithIcons) {
        expect(React.isValidElement(option.icon)).toBe(true);
      }
    });

    it('should have unique values', () => {
      const values = fileTypes.map((t) => t.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have unique labels', () => {
      const labels = fileTypes.map((t) => t.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    describe('each file type', () => {
      for (const type of fileTypes) {
        it(`should have valid structure for "${type.label}"`, () => {
          expect(typeof type.value).toBe('string');
          expect(typeof type.label).toBe('string');
          expect(type.label.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ==========================================================================
  // statusOptions Tests
  // ==========================================================================
  describe('statusOptions', () => {
    it('should be an array', () => {
      expect(Array.isArray(statusOptions)).toBe(true);
    });

    it('should have exactly 5 status options', () => {
      expect(statusOptions.length).toBe(5);
    });

    it('should have "All Status" option first with empty value', () => {
      const allStatus = statusOptions[0];
      expect(allStatus.value).toBe('');
      expect(allStatus.label).toBe('All Status');
    });

    it('should have uploaded status', () => {
      const uploaded = statusOptions.find((s) => s.value === 'uploaded');
      expect(uploaded).toBeDefined();
      expect(uploaded?.label).toBe('Uploaded');
    });

    it('should have processing status', () => {
      const processing = statusOptions.find((s) => s.value === 'processing');
      expect(processing).toBeDefined();
      expect(processing?.label).toBe('Processing');
    });

    it('should have processed status', () => {
      const processed = statusOptions.find((s) => s.value === 'processed');
      expect(processed).toBeDefined();
      expect(processed?.label).toBe('Processed');
    });

    it('should have error status', () => {
      const error = statusOptions.find((s) => s.value === 'error');
      expect(error).toBeDefined();
      expect(error?.label).toBe('Error');
    });

    it('should have unique values', () => {
      const values = statusOptions.map((s) => s.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    describe('each status option', () => {
      for (const option of statusOptions) {
        it(`should have valid structure for "${option.label}"`, () => {
          expect(typeof option.value).toBe('string');
          expect(typeof option.label).toBe('string');
          expect(option.label.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ==========================================================================
  // sortOptions Tests
  // ==========================================================================
  describe('sortOptions', () => {
    it('should be an array', () => {
      expect(Array.isArray(sortOptions)).toBe(true);
    });

    it('should have at least 5 sort options', () => {
      expect(sortOptions.length).toBeGreaterThanOrEqual(5);
    });

    it('should have filename sort option', () => {
      const filename = sortOptions.find((s) => s.value === 'filename');
      expect(filename).toBeDefined();
      expect(filename?.label).toBe('Filename');
    });

    it('should have upload_date sort option', () => {
      const uploadDate = sortOptions.find((s) => s.value === 'upload_date');
      expect(uploadDate).toBeDefined();
      expect(uploadDate?.label).toBe('Upload Date');
    });

    it('should have file_size sort option', () => {
      const fileSize = sortOptions.find((s) => s.value === 'file_size');
      expect(fileSize).toBeDefined();
      expect(fileSize?.label).toBe('File Size');
    });

    it('should have mime_type sort option', () => {
      const mimeType = sortOptions.find((s) => s.value === 'mime_type');
      expect(mimeType).toBeDefined();
      expect(mimeType?.label).toBe('File Type');
    });

    it('should have status sort option', () => {
      const status = sortOptions.find((s) => s.value === 'status');
      expect(status).toBeDefined();
      expect(status?.label).toBe('Status');
    });

    it('should have unique values', () => {
      const values = sortOptions.map((s) => s.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    describe('each sort option', () => {
      for (const option of sortOptions) {
        it(`should have valid structure for "${option.label}"`, () => {
          expect(typeof option.value).toBe('string');
          expect(typeof option.label).toBe('string');
          expect(option.value.length).toBeGreaterThan(0);
          expect(option.label.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ==========================================================================
  // sizePresets Tests
  // ==========================================================================
  describe('sizePresets', () => {
    it('should be an array', () => {
      expect(Array.isArray(sizePresets)).toBe(true);
    });

    it('should have exactly 4 size presets', () => {
      expect(sizePresets.length).toBe(4);
    });

    it('should have Small preset', () => {
      const small = sizePresets.find((p) => p.label.includes('Small'));
      expect(small).toBeDefined();
      expect(small?.min).toBe(0);
      expect(small?.max).toBe(1024 * 1024); // 1 MB
    });

    it('should have Medium preset', () => {
      const medium = sizePresets.find((p) => p.label.includes('Medium'));
      expect(medium).toBeDefined();
      expect(medium?.min).toBe(1024 * 1024); // 1 MB
      expect(medium?.max).toBe(10 * 1024 * 1024); // 10 MB
    });

    it('should have Large preset', () => {
      const large = sizePresets.find(
        (p) => p.label.includes('Large') && !p.label.includes('Very'),
      );
      expect(large).toBeDefined();
      expect(large?.min).toBe(10 * 1024 * 1024); // 10 MB
      expect(large?.max).toBe(100 * 1024 * 1024); // 100 MB
    });

    it('should have Very Large preset', () => {
      const veryLarge = sizePresets.find((p) => p.label.includes('Very Large'));
      expect(veryLarge).toBeDefined();
      expect(veryLarge?.min).toBe(100 * 1024 * 1024); // 100 MB
      expect(veryLarge?.max).toBe(Infinity);
    });

    it('should have contiguous ranges (no gaps)', () => {
      const sorted = [...sizePresets].sort((a, b) => a.min - b.min);
      for (let i = 1; i < sorted.length - 1; i++) {
        expect(sorted[i].min).toBe(sorted[i - 1].max);
      }
    });

    describe('each size preset', () => {
      for (const preset of sizePresets) {
        it(`should have valid structure for "${preset.label}"`, () => {
          expect(typeof preset.label).toBe('string');
          expect(typeof preset.min).toBe('number');
          expect(typeof preset.max).toBe('number');
          expect(preset.min).toBeGreaterThanOrEqual(0);
          expect(preset.max).toBeGreaterThan(preset.min);
        });
      }
    });
  });

  // ==========================================================================
  // datePresets Tests
  // ==========================================================================
  describe('datePresets', () => {
    it('should be an array', () => {
      expect(Array.isArray(datePresets)).toBe(true);
    });

    it('should have at least 5 date presets', () => {
      expect(datePresets.length).toBeGreaterThanOrEqual(5);
    });

    it('should have Today preset with days=0', () => {
      const today = datePresets.find((p) => p.label === 'Today');
      expect(today).toBeDefined();
      expect(today?.days).toBe(0);
    });

    it('should have Last 7 days preset', () => {
      const last7 = datePresets.find((p) => p.label === 'Last 7 days');
      expect(last7).toBeDefined();
      expect(last7?.days).toBe(7);
    });

    it('should have Last 30 days preset', () => {
      const last30 = datePresets.find((p) => p.label === 'Last 30 days');
      expect(last30).toBeDefined();
      expect(last30?.days).toBe(30);
    });

    it('should have Last 90 days preset', () => {
      const last90 = datePresets.find((p) => p.label === 'Last 90 days');
      expect(last90).toBeDefined();
      expect(last90?.days).toBe(90);
    });

    it('should have Last year preset', () => {
      const lastYear = datePresets.find((p) => p.label === 'Last year');
      expect(lastYear).toBeDefined();
      expect(lastYear?.days).toBe(365);
    });

    it('should have unique labels', () => {
      const labels = datePresets.map((p) => p.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should have increasing days values', () => {
      for (let i = 1; i < datePresets.length; i++) {
        expect(datePresets[i].days).toBeGreaterThan(datePresets[i - 1].days);
      }
    });

    describe('each date preset', () => {
      for (const preset of datePresets) {
        it(`should have valid structure for "${preset.label}"`, () => {
          expect(typeof preset.label).toBe('string');
          expect(typeof preset.days).toBe('number');
          expect(preset.days).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  // ==========================================================================
  // formatFileSize Tests (duplicate function)
  // ==========================================================================
  describe('formatFileSize', () => {
    it('should return "0 Bytes" for 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatFileSize(100)).toBe('100 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});
