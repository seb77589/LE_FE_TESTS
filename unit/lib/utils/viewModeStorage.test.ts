/**
 * Tests for View Mode Storage Utilities
 *
 * @description Tests for SSR-safe localStorage utilities for persisting
 * view mode preferences across page navigations and sessions.
 *
 * @since v0.2.0
 * @see frontend/src/lib/utils/viewModeStorage.ts
 */

import {
  ViewMode,
  VIEW_MODE_KEYS,
  DEFAULT_VIEW_MODE,
  isLocalStorageAvailable,
  getViewMode,
  setViewMode,
  removeViewMode,
  toggleViewMode,
  isValidViewMode,
} from '@/lib/utils/viewModeStorage';

describe('viewModeStorage utilities', () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = window.localStorage;

    // Create mock storage
    mockLocalStorage = {};

    // Mock localStorage on window
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
        key: jest.fn((index: number) => Object.keys(mockLocalStorage)[index] || null),
        get length() {
          return Object.keys(mockLocalStorage).length;
        },
      },
      writable: true,
      configurable: true,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('VIEW_MODE_KEYS', () => {
    it('should have keys for cases, templates, and documents', () => {
      expect(VIEW_MODE_KEYS.cases).toBe('cases-view-mode');
      expect(VIEW_MODE_KEYS.templates).toBe('templates-view-mode');
      expect(VIEW_MODE_KEYS.documents).toBe('documents-view-mode');
    });

    it('should have unique values for each key', () => {
      const values = Object.values(VIEW_MODE_KEYS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('DEFAULT_VIEW_MODE', () => {
    it('should be "list"', () => {
      expect(DEFAULT_VIEW_MODE).toBe('list');
    });
  });

  describe('isLocalStorageAvailable()', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws on setItem', () => {
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage disabled');
      });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('should return false when localStorage throws on removeItem', () => {
      (window.localStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage disabled');
      });

      expect(isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('getViewMode()', () => {
    it('should return "list" when stored value is "list"', () => {
      mockLocalStorage['cases-view-mode'] = 'list';

      const result = getViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe('list');
    });

    it('should return "grid" when stored value is "grid"', () => {
      mockLocalStorage['cases-view-mode'] = 'grid';

      const result = getViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe('grid');
    });

    it('should return default when stored value is null', () => {
      // mockLocalStorage is empty, getItem returns null

      const result = getViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe(DEFAULT_VIEW_MODE);
    });

    it('should return default when stored value is invalid', () => {
      mockLocalStorage['cases-view-mode'] = 'invalid';

      const result = getViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe(DEFAULT_VIEW_MODE);
    });

    it('should return default when localStorage throws', () => {
      (window.localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = getViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe(DEFAULT_VIEW_MODE);
    });

    it('should work with different keys', () => {
      mockLocalStorage['cases-view-mode'] = 'grid';
      mockLocalStorage['templates-view-mode'] = 'list';
      mockLocalStorage['documents-view-mode'] = 'grid';

      expect(getViewMode(VIEW_MODE_KEYS.cases)).toBe('grid');
      expect(getViewMode(VIEW_MODE_KEYS.templates)).toBe('list');
      expect(getViewMode(VIEW_MODE_KEYS.documents)).toBe('grid');
    });
  });

  describe('setViewMode()', () => {
    it('should save "list" to localStorage', () => {
      const result = setViewMode(VIEW_MODE_KEYS.cases, 'list');

      expect(result).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cases-view-mode',
        'list',
      );
    });

    it('should save "grid" to localStorage', () => {
      const result = setViewMode(VIEW_MODE_KEYS.cases, 'grid');

      expect(result).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cases-view-mode',
        'grid',
      );
    });

    it('should return false when localStorage throws', () => {
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = setViewMode(VIEW_MODE_KEYS.cases, 'grid');
      expect(result).toBe(false);
    });

    it('should work with different keys', () => {
      setViewMode(VIEW_MODE_KEYS.cases, 'grid');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cases-view-mode',
        'grid',
      );

      setViewMode(VIEW_MODE_KEYS.templates, 'list');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'templates-view-mode',
        'list',
      );

      setViewMode(VIEW_MODE_KEYS.documents, 'grid');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'documents-view-mode',
        'grid',
      );
    });
  });

  describe('removeViewMode()', () => {
    it('should remove key from localStorage', () => {
      const result = removeViewMode(VIEW_MODE_KEYS.cases);

      expect(result).toBe(true);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('cases-view-mode');
    });

    it('should return false when localStorage throws', () => {
      (window.localStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = removeViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe(false);
    });
  });

  describe('toggleViewMode()', () => {
    it('should return "grid" when current is "list"', () => {
      expect(toggleViewMode('list')).toBe('grid');
    });

    it('should return "list" when current is "grid"', () => {
      expect(toggleViewMode('grid')).toBe('list');
    });

    it('should be idempotent - toggling twice returns original', () => {
      const original: ViewMode = 'list';
      const toggled = toggleViewMode(original);
      const toggledBack = toggleViewMode(toggled);

      expect(toggledBack).toBe(original);
    });
  });

  describe('isValidViewMode()', () => {
    it('should return true for "list"', () => {
      expect(isValidViewMode('list')).toBe(true);
    });

    it('should return true for "grid"', () => {
      expect(isValidViewMode('grid')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidViewMode('invalid')).toBe(false);
      expect(isValidViewMode('LIST')).toBe(false);
      expect(isValidViewMode('GRID')).toBe(false);
      expect(isValidViewMode('table')).toBe(false);
      expect(isValidViewMode('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidViewMode(null)).toBe(false);
      expect(isValidViewMode(undefined)).toBe(false);
      expect(isValidViewMode(123)).toBe(false);
      expect(isValidViewMode(true)).toBe(false);
      expect(isValidViewMode({})).toBe(false);
      expect(isValidViewMode([])).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should persist and retrieve view mode correctly', () => {
      // Set view mode
      const setResult = setViewMode(VIEW_MODE_KEYS.cases, 'grid');
      expect(setResult).toBe(true);

      // Get view mode - since setItem updates mockLocalStorage
      const getResult = getViewMode(VIEW_MODE_KEYS.cases);
      expect(getResult).toBe('grid');
    });

    it('should handle multiple pages with different view modes', () => {
      // Set different view modes for different pages
      setViewMode(VIEW_MODE_KEYS.cases, 'grid');
      setViewMode(VIEW_MODE_KEYS.templates, 'list');
      setViewMode(VIEW_MODE_KEYS.documents, 'grid');

      // Verify each was called with correct key
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cases-view-mode',
        'grid',
      );
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'templates-view-mode',
        'list',
      );
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'documents-view-mode',
        'grid',
      );

      // Verify retrieval
      expect(getViewMode(VIEW_MODE_KEYS.cases)).toBe('grid');
      expect(getViewMode(VIEW_MODE_KEYS.templates)).toBe('list');
      expect(getViewMode(VIEW_MODE_KEYS.documents)).toBe('grid');
    });

    it('should handle toggle and save workflow', () => {
      const currentMode: ViewMode = 'list';
      const newMode = toggleViewMode(currentMode);

      expect(newMode).toBe('grid');

      const saved = setViewMode(VIEW_MODE_KEYS.cases, newMode);
      expect(saved).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cases-view-mode',
        'grid',
      );
    });

    it('should handle remove and get workflow', () => {
      // Set a value first
      setViewMode(VIEW_MODE_KEYS.cases, 'grid');
      expect(getViewMode(VIEW_MODE_KEYS.cases)).toBe('grid');

      // Remove the preference
      removeViewMode(VIEW_MODE_KEYS.cases);

      // Get should return default
      const result = getViewMode(VIEW_MODE_KEYS.cases);
      expect(result).toBe(DEFAULT_VIEW_MODE);
    });
  });
});
