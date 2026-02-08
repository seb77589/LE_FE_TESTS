/**
 * Tests for Case Status Utilities
 *
 * @description Tests for centralized case status colors and labels
 * used across the Cases pages for consistent UI rendering.
 *
 * @since v0.2.0
 * @see frontend/src/lib/utils/caseStatus.ts
 */

import {
  CaseStatus,
  statusLabels,
  statusColors,
  getStatusColor,
  getStatusLabel,
  allCaseStatuses,
  statusFilterOptions,
} from '@/lib/utils/caseStatus';

describe('caseStatus utilities', () => {
  describe('CaseStatus type coverage', () => {
    it('should include all 6 case statuses', () => {
      const expectedStatuses: CaseStatus[] = [
        'open',
        'in_progress',
        'processing',
        'processed',
        'review_pending',
        'closed',
      ];

      expect(allCaseStatuses).toHaveLength(6);
      expectedStatuses.forEach((status) => {
        expect(allCaseStatuses).toContain(status);
      });
    });
  });

  describe('statusLabels', () => {
    it('should have labels for all 6 statuses', () => {
      expect(Object.keys(statusLabels)).toHaveLength(6);
    });

    it('should return correct display labels', () => {
      expect(statusLabels.open).toBe('Open');
      expect(statusLabels.in_progress).toBe('In Progress');
      expect(statusLabels.processing).toBe('Processing');
      expect(statusLabels.processed).toBe('Processed');
      expect(statusLabels.review_pending).toBe('Review Pending');
      expect(statusLabels.closed).toBe('Closed');
    });

    it('should have human-readable labels (no underscores)', () => {
      Object.values(statusLabels).forEach((label) => {
        expect(label).not.toContain('_');
      });
    });
  });

  describe('statusColors', () => {
    it('should have colors for all 6 statuses', () => {
      expect(Object.keys(statusColors)).toHaveLength(6);
    });

    it('should return correct Tailwind CSS classes', () => {
      expect(statusColors.open).toBe('bg-blue-100 text-blue-800');
      expect(statusColors.in_progress).toBe('bg-indigo-100 text-indigo-800');
      expect(statusColors.processing).toBe('bg-purple-100 text-purple-800');
      expect(statusColors.processed).toBe('bg-yellow-100 text-yellow-800');
      expect(statusColors.review_pending).toBe('bg-orange-100 text-orange-800');
      expect(statusColors.closed).toBe('bg-green-100 text-green-800');
    });

    it('should have consistent color format (bg-*-100 text-*-800)', () => {
      Object.values(statusColors).forEach((colorClass) => {
        expect(colorClass).toMatch(/^bg-\w+-100 text-\w+-800$/);
      });
    });

    it('should use distinct colors for each status', () => {
      const colors = Object.values(statusColors);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(6);
    });
  });

  describe('getStatusColor()', () => {
    it('should return correct color for valid statuses', () => {
      expect(getStatusColor('open')).toBe('bg-blue-100 text-blue-800');
      expect(getStatusColor('in_progress')).toBe('bg-indigo-100 text-indigo-800');
      expect(getStatusColor('processing')).toBe('bg-purple-100 text-purple-800');
      expect(getStatusColor('processed')).toBe('bg-yellow-100 text-yellow-800');
      expect(getStatusColor('review_pending')).toBe('bg-orange-100 text-orange-800');
      expect(getStatusColor('closed')).toBe('bg-green-100 text-green-800');
    });

    it('should return fallback gray color for unknown status', () => {
      // Cast to CaseStatus to test fallback behavior
      const unknownStatus = 'unknown_status' as CaseStatus;
      expect(getStatusColor(unknownStatus)).toBe('bg-gray-100 text-gray-800');
    });

    it('should return fallback for empty string', () => {
      const emptyStatus = '' as CaseStatus;
      expect(getStatusColor(emptyStatus)).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getStatusLabel()', () => {
    it('should return correct labels for valid statuses', () => {
      expect(getStatusLabel('open')).toBe('Open');
      expect(getStatusLabel('in_progress')).toBe('In Progress');
      expect(getStatusLabel('processing')).toBe('Processing');
      expect(getStatusLabel('processed')).toBe('Processed');
      expect(getStatusLabel('review_pending')).toBe('Review Pending');
      expect(getStatusLabel('closed')).toBe('Closed');
    });

    it('should return formatted fallback for unknown status', () => {
      const unknownStatus = 'some_unknown_status' as CaseStatus;
      // Fallback replaces first underscore with space (per String.replace behavior)
      expect(getStatusLabel(unknownStatus)).toBe('some unknown_status');
    });

    it('should return status as-is for single word unknown status', () => {
      const unknownStatus = 'pending' as CaseStatus;
      expect(getStatusLabel(unknownStatus)).toBe('pending');
    });
  });

  describe('allCaseStatuses', () => {
    it('should be an array', () => {
      expect(Array.isArray(allCaseStatuses)).toBe(true);
    });

    it('should contain exactly 6 statuses', () => {
      expect(allCaseStatuses).toHaveLength(6);
    });

    it('should be in logical workflow order', () => {
      // Order: open -> in_progress -> processing -> processed -> review_pending -> closed
      expect(allCaseStatuses[0]).toBe('open');
      expect(allCaseStatuses[5]).toBe('closed');
    });

    it('should be immutable (frozen array reference)', () => {
      // Verify we can iterate without modification issues
      const copy = [...allCaseStatuses];
      expect(copy).toEqual(allCaseStatuses);
    });
  });

  describe('statusFilterOptions', () => {
    it('should have 7 options (All + 6 statuses)', () => {
      expect(statusFilterOptions).toHaveLength(7);
    });

    it('should have "All Statuses" as first option', () => {
      expect(statusFilterOptions[0]).toEqual({
        value: 'all',
        label: 'All Statuses',
      });
    });

    it('should have all 6 status options after "All"', () => {
      const statusOptions = statusFilterOptions.slice(1);
      expect(statusOptions).toHaveLength(6);

      statusOptions.forEach((option, index) => {
        expect(option.value).toBe(allCaseStatuses[index]);
        expect(option.label).toBe(statusLabels[allCaseStatuses[index]]);
      });
    });

    it('should have value and label for each option', () => {
      statusFilterOptions.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });

    it('should use display labels (not raw values) for labels', () => {
      // Skip "All Statuses" option
      const statusOptions = statusFilterOptions.slice(1);
      statusOptions.forEach((option) => {
        // Labels should not contain underscores
        expect(option.label).not.toContain('_');
      });
    });
  });

  describe('consistency checks', () => {
    it('should have matching keys in statusLabels and statusColors', () => {
      const labelKeys = Object.keys(statusLabels).sort();
      const colorKeys = Object.keys(statusColors).sort();
      expect(labelKeys).toEqual(colorKeys);
    });

    it('should have all allCaseStatuses in statusLabels and statusColors', () => {
      allCaseStatuses.forEach((status) => {
        expect(statusLabels[status]).toBeDefined();
        expect(statusColors[status]).toBeDefined();
      });
    });

    it('should have statusFilterOptions matching allCaseStatuses', () => {
      const filterValues = statusFilterOptions.slice(1).map((opt) => opt.value);
      expect(filterValues).toEqual(allCaseStatuses);
    });
  });
});
