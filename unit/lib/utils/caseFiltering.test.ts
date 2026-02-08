/**
 * Tests for Case Filtering Utilities
 *
 * @description Tests for pure filtering functions used in the Cases page
 * for search and status filtering functionality.
 *
 * @since v0.2.0
 * @see frontend/src/lib/utils/caseFiltering.ts
 */

import {
  FilterableCase,
  CaseFilterOptions,
  filterCasesBySearch,
  filterCasesByStatus,
  filterCases,
  hasActiveFilters,
} from '@/lib/utils/caseFiltering';
import { CaseStatus } from '@/lib/utils/caseStatus';

// Test data factory
const createCase = (
  overrides: Partial<FilterableCase> = {},
): FilterableCase => ({
  id: 1,
  title: 'Default Case',
  description: 'Default description',
  status: 'open',
  ...overrides,
});

// Sample test data covering all statuses
const sampleCases: FilterableCase[] = [
  createCase({ id: 1, title: 'Contract Review', description: 'Review of employment contract', status: 'open' }),
  createCase({ id: 2, title: 'Patent Filing', description: 'Patent application for new technology', status: 'in_progress' }),
  createCase({ id: 3, title: 'Merger Due Diligence', description: 'Due diligence for company merger', status: 'processing' }),
  createCase({ id: 4, title: 'Trademark Registration', description: 'Register new trademark', status: 'processed' }),
  createCase({ id: 5, title: 'Compliance Audit', description: 'Annual compliance review pending', status: 'review_pending' }),
  createCase({ id: 6, title: 'Settlement Agreement', description: 'Final settlement documentation', status: 'closed' }),
  createCase({ id: 7, title: 'Employment Contract', description: null, status: 'open' }),
];

describe('caseFiltering utilities', () => {
  describe('filterCasesBySearch()', () => {
    it('should return all cases when search query is empty', () => {
      const result = filterCasesBySearch(sampleCases, '');
      expect(result).toHaveLength(sampleCases.length);
      expect(result).toEqual(sampleCases);
    });

    it('should return all cases when search query is only whitespace', () => {
      const result = filterCasesBySearch(sampleCases, '   ');
      expect(result).toHaveLength(sampleCases.length);
    });

    it('should filter by title (case-insensitive)', () => {
      const result = filterCasesBySearch(sampleCases, 'contract');
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual([1, 7]);
    });

    it('should filter by title with uppercase query', () => {
      const result = filterCasesBySearch(sampleCases, 'CONTRACT');
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual([1, 7]);
    });

    it('should filter by description', () => {
      const result = filterCasesBySearch(sampleCases, 'patent');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('should filter by partial match in description', () => {
      const result = filterCasesBySearch(sampleCases, 'review');
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual([1, 5]);
    });

    it('should handle cases with null description', () => {
      const result = filterCasesBySearch(sampleCases, 'employment');
      // Should match case 1 (description) and case 7 (title)
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual([1, 7]);
    });

    it('should return empty array when no matches found', () => {
      const result = filterCasesBySearch(sampleCases, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from query', () => {
      const result = filterCasesBySearch(sampleCases, '  contract  ');
      expect(result).toHaveLength(2);
    });

    it('should handle empty cases array', () => {
      const result = filterCasesBySearch([], 'test');
      expect(result).toHaveLength(0);
    });

    it('should preserve original case object properties', () => {
      const result = filterCasesBySearch(sampleCases, 'patent');
      expect(result[0]).toEqual(sampleCases[1]);
    });
  });

  describe('filterCasesByStatus()', () => {
    it('should return all cases when status filter is "all"', () => {
      const result = filterCasesByStatus(sampleCases, 'all');
      expect(result).toHaveLength(sampleCases.length);
      expect(result).toEqual(sampleCases);
    });

    it('should filter by "open" status', () => {
      const result = filterCasesByStatus(sampleCases, 'open');
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.status === 'open')).toBe(true);
    });

    it('should filter by "in_progress" status', () => {
      const result = filterCasesByStatus(sampleCases, 'in_progress');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('in_progress');
    });

    it('should filter by "processing" status', () => {
      const result = filterCasesByStatus(sampleCases, 'processing');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('processing');
    });

    it('should filter by "processed" status', () => {
      const result = filterCasesByStatus(sampleCases, 'processed');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('processed');
    });

    it('should filter by "review_pending" status', () => {
      const result = filterCasesByStatus(sampleCases, 'review_pending');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('review_pending');
    });

    it('should filter by "closed" status', () => {
      const result = filterCasesByStatus(sampleCases, 'closed');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('closed');
    });

    it('should return empty array when no cases match status', () => {
      const openCases = sampleCases.filter((c) => c.status === 'open');
      const result = filterCasesByStatus(openCases, 'closed');
      expect(result).toHaveLength(0);
    });

    it('should handle empty cases array', () => {
      const result = filterCasesByStatus([], 'open');
      expect(result).toHaveLength(0);
    });

    it('should preserve original case object properties', () => {
      const result = filterCasesByStatus(sampleCases, 'in_progress');
      expect(result[0]).toEqual(sampleCases[1]);
    });
  });

  describe('filterCases()', () => {
    it('should return all cases when no filters provided', () => {
      const result = filterCases(sampleCases, {});
      expect(result).toHaveLength(sampleCases.length);
    });

    it('should return all cases when filters are empty/all', () => {
      const result = filterCases(sampleCases, {
        searchQuery: '',
        statusFilter: 'all',
      });
      expect(result).toHaveLength(sampleCases.length);
    });

    it('should filter by search query only', () => {
      const result = filterCases(sampleCases, {
        searchQuery: 'contract',
      });
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual([1, 7]);
    });

    it('should filter by status only', () => {
      const result = filterCases(sampleCases, {
        statusFilter: 'closed',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(6);
    });

    it('should combine search and status filters with AND logic', () => {
      const result = filterCases(sampleCases, {
        searchQuery: 'contract',
        statusFilter: 'open',
      });
      // Both cases with "contract" are open
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual([1, 7]);
    });

    it('should return empty when search matches but status does not', () => {
      const result = filterCases(sampleCases, {
        searchQuery: 'patent',
        statusFilter: 'closed',
      });
      expect(result).toHaveLength(0);
    });

    it('should return empty when status matches but search does not', () => {
      const result = filterCases(sampleCases, {
        searchQuery: 'nonexistent',
        statusFilter: 'open',
      });
      expect(result).toHaveLength(0);
    });

    it('should handle all statuses with search filter', () => {
      const statuses: CaseStatus[] = [
        'open',
        'in_progress',
        'processing',
        'processed',
        'review_pending',
        'closed',
      ];

      // Each status should be testable
      statuses.forEach((status) => {
        const result = filterCases(sampleCases, {
          searchQuery: '',
          statusFilter: status,
        });
        result.forEach((c) => {
          expect(c.status).toBe(status);
        });
      });
    });

    it('should handle empty cases array', () => {
      const result = filterCases([], {
        searchQuery: 'test',
        statusFilter: 'open',
      });
      expect(result).toHaveLength(0);
    });

    it('should be case-insensitive for search', () => {
      const result1 = filterCases(sampleCases, { searchQuery: 'CONTRACT' });
      const result2 = filterCases(sampleCases, { searchQuery: 'contract' });
      const result3 = filterCases(sampleCases, { searchQuery: 'Contract' });
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('hasActiveFilters()', () => {
    it('should return false when no filters are active', () => {
      expect(hasActiveFilters({})).toBe(false);
      expect(hasActiveFilters({ searchQuery: '', statusFilter: 'all' })).toBe(false);
    });

    it('should return false when search is only whitespace', () => {
      expect(hasActiveFilters({ searchQuery: '   ' })).toBe(false);
    });

    it('should return true when search query is active', () => {
      expect(hasActiveFilters({ searchQuery: 'test' })).toBe(true);
    });

    it('should return true when status filter is not "all"', () => {
      expect(hasActiveFilters({ statusFilter: 'open' })).toBe(true);
      expect(hasActiveFilters({ statusFilter: 'closed' })).toBe(true);
    });

    it('should return true when both filters are active', () => {
      expect(
        hasActiveFilters({
          searchQuery: 'test',
          statusFilter: 'open',
        }),
      ).toBe(true);
    });

    it('should handle all status values correctly', () => {
      const statuses: CaseStatus[] = [
        'open',
        'in_progress',
        'processing',
        'processed',
        'review_pending',
        'closed',
      ];

      statuses.forEach((status) => {
        expect(hasActiveFilters({ statusFilter: status })).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in search query', () => {
      const casesWithSpecialChars = [
        createCase({ id: 1, title: 'Case (2025)', description: 'Test case' }),
        createCase({ id: 2, title: 'Case #123', description: 'Hash case' }),
        createCase({ id: 3, title: 'Case - Review', description: 'Dash case' }),
      ];

      expect(filterCasesBySearch(casesWithSpecialChars, '(2025)')).toHaveLength(1);
      expect(filterCasesBySearch(casesWithSpecialChars, '#123')).toHaveLength(1);
      expect(filterCasesBySearch(casesWithSpecialChars, '-')).toHaveLength(1);
    });

    it('should handle unicode characters in search', () => {
      const casesWithUnicode = [
        createCase({ id: 1, title: 'Société Générale Case', description: 'French company' }),
        createCase({ id: 2, title: 'München Agreement', description: 'German city' }),
      ];

      expect(filterCasesBySearch(casesWithUnicode, 'Société')).toHaveLength(1);
      expect(filterCasesBySearch(casesWithUnicode, 'München')).toHaveLength(1);
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const result = filterCasesBySearch(sampleCases, longQuery);
      expect(result).toHaveLength(0);
    });

    it('should maintain order of original array', () => {
      const result = filterCases(sampleCases, { searchQuery: '', statusFilter: 'all' });
      sampleCases.forEach((originalCase, index) => {
        expect(result[index]).toEqual(originalCase);
      });
    });

    it('should not mutate original array', () => {
      const originalLength = sampleCases.length;
      const originalFirst = sampleCases[0];

      filterCases(sampleCases, { searchQuery: 'contract', statusFilter: 'open' });

      expect(sampleCases).toHaveLength(originalLength);
      expect(sampleCases[0]).toEqual(originalFirst);
    });
  });
});
