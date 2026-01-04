/**
 * Storage Utilities Unit Tests
 *
 * Tests for:
 * - LocalStorage utilities
 * - SessionStorage utilities
 * - Cookie utilities
 * - Storage error handling
 * - Storage synchronization
 */

import {
  setClientCookie,
  getClientCookie,
  removeClientCookie,
  waitForCookie,
  cookieSyncManager,
} from '@/lib/cookies';

// ==============================================================================
// Module-level mock factories (extracted to reduce nesting depth - fixes S2004)
// ==============================================================================

// Storage mock factory - creates localStorage or sessionStorage mock
// Uses a wrapper object to maintain reference consistency across closures
interface StorageMock {
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
  key: jest.Mock<string | null, [number]>;
  readonly length: number;
}

// Wrapper to hold store reference (fixes closure issue with store = {})
interface StoreWrapper {
  data: Record<string, string>;
}

// Storage operation functions (use wrapper for consistent reference)
function storageGetItem(wrapper: StoreWrapper, key: string): string | null {
  return wrapper.data[key] || null;
}

function storageSetItem(wrapper: StoreWrapper, key: string, value: string): void {
  wrapper.data[key] = value.toString();
}

function storageRemoveItem(wrapper: StoreWrapper, key: string): void {
  delete wrapper.data[key];
}

function storageClear(wrapper: StoreWrapper): void {
  wrapper.data = {};
}

function storageKey(wrapper: StoreWrapper, index: number): string | null {
  return Object.keys(wrapper.data)[index] || null;
}

function storageLength(wrapper: StoreWrapper): number {
  return Object.keys(wrapper.data).length;
}

function createStorageMock(): StorageMock {
  const wrapper: StoreWrapper = { data: {} };

  return {
    getItem: jest.fn((key: string) => storageGetItem(wrapper, key)),
    setItem: jest.fn((key: string, value: string) =>
      storageSetItem(wrapper, key, value),
    ),
    removeItem: jest.fn((key: string) => storageRemoveItem(wrapper, key)),
    clear: jest.fn(() => storageClear(wrapper)),
    key: jest.fn((index: number) => storageKey(wrapper, index)),
    get length(): number {
      return storageLength(wrapper);
    },
  };
}

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Storage Utilities Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all storage
    if (globalThis.window !== undefined) {
      localStorage.clear();
      sessionStorage.clear();
      for (const cookie of document.cookie.split(';')) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    }
  });

  describe('LocalStorage Utilities', () => {
    beforeEach(() => {
      // Mock localStorage using module-level factory
      const localStorageMock = createStorageMock();

      Object.defineProperty(globalThis.window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });

    it('should set and get localStorage values', () => {
      const key = 'test-key';
      const value = 'test-value';

      localStorage.setItem(key, value);
      expect(localStorage.getItem(key)).toBe(value);
    });

    it('should remove localStorage values', () => {
      const key = 'test-key';
      const value = 'test-value';

      localStorage.setItem(key, value);
      expect(localStorage.getItem(key)).toBe(value);

      localStorage.removeItem(key);
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should clear all localStorage values', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');

      expect(localStorage.length).toBe(2);

      localStorage.clear();
      expect(localStorage.length).toBe(0);
    });

    it('should handle localStorage quota exceeded errors', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => {
        localStorage.setItem('large-key', 'x'.repeat(10 * 1024 * 1024));
      }).toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage when disabled', () => {
      const originalLocalStorage = globalThis.window.localStorage;
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      // Should handle gracefully
      expect(() => {
        if (globalThis.window.localStorage) {
          globalThis.window.localStorage.setItem('test', 'value');
        }
      }).not.toThrow();

      Object.defineProperty(globalThis.window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should serialize objects to JSON in localStorage', () => {
      const key = 'object-key';
      const value = { name: 'Test', id: 1 };

      localStorage.setItem(key, JSON.stringify(value));
      const retrieved = JSON.parse(localStorage.getItem(key)!);

      expect(retrieved).toEqual(value);
    });

    it('should handle null values in localStorage', () => {
      const key = 'null-key';
      localStorage.setItem(key, JSON.stringify(null));

      const retrieved = JSON.parse(localStorage.getItem(key)!);
      expect(retrieved).toBeNull();
    });
  });

  describe('SessionStorage Utilities', () => {
    beforeEach(() => {
      // Mock sessionStorage using module-level factory
      const sessionStorageMock = createStorageMock();

      Object.defineProperty(globalThis.window, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });
    });

    it('should set and get sessionStorage values', () => {
      const key = 'session-key';
      const value = 'session-value';

      sessionStorage.setItem(key, value);
      expect(sessionStorage.getItem(key)).toBe(value);
    });

    it('should remove sessionStorage values', () => {
      const key = 'session-key';
      const value = 'session-value';

      sessionStorage.setItem(key, value);
      sessionStorage.removeItem(key);

      expect(sessionStorage.getItem(key)).toBeNull();
    });

    it('should clear all sessionStorage values', () => {
      sessionStorage.setItem('key1', 'value1');
      sessionStorage.setItem('key2', 'value2');

      sessionStorage.clear();
      expect(sessionStorage.length).toBe(0);
    });

    it('should persist only for session duration', () => {
      const key = 'session-key';
      const value = 'session-value';

      sessionStorage.setItem(key, value);
      expect(sessionStorage.getItem(key)).toBe(value);

      // SessionStorage persists until tab is closed
      // In tests, we verify it's set correctly
      expect(sessionStorage.getItem(key)).toBe(value);
    });

    it('should handle sessionStorage quota exceeded errors', () => {
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = jest.fn(() => {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => {
        sessionStorage.setItem('large-key', 'x'.repeat(10 * 1024 * 1024));
      }).toThrow();

      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('Cookie Utilities', () => {
    beforeEach(() => {
      // Mock document.cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
    });

    it('should set client cookie', () => {
      setClientCookie('test-cookie', 'test-value');

      expect(document.cookie).toContain('test-cookie=test-value');
    });

    it('should get client cookie', () => {
      document.cookie = 'test-cookie=test-value; path=/';

      const value = getClientCookie('test-cookie');
      expect(value).toBe('test-value');
    });

    it('should remove client cookie', () => {
      document.cookie = 'test-cookie=test-value; path=/';
      removeClientCookie('test-cookie');

      const value = getClientCookie('test-cookie');
      expect(value).toBeNull();
    });

    it('should set cookie with options', () => {
      setClientCookie('test-cookie', 'test-value', {
        maxAge: 3600,
        path: '/',
        secure: true,
        sameSite: 'strict',
      });

      const cookie = document.cookie;
      expect(cookie).toContain('test-cookie=test-value');
      expect(cookie).toContain('path=/');
      expect(cookie).toContain('secure');
      expect(cookie).toContain('samesite=strict');
    });

    it('should handle cookie with special characters', () => {
      const value = 'value with spaces & special chars!';
      setClientCookie('test-cookie', encodeURIComponent(value));

      const retrieved = getClientCookie('test-cookie');
      expect(decodeURIComponent(retrieved!)).toBe(value);
    });

    it('should handle non-existent cookie', () => {
      const value = getClientCookie('non-existent');
      expect(value).toBeNull();
    });
  });

  describe('Cookie Synchronization', () => {
    beforeEach(() => {
      cookieSyncManager.clearPendingWaits();
      document.cookie = '';
    });

    it('should wait for cookie to become available', async () => {
      // Set cookie after a delay
      setTimeout(() => {
        document.cookie = 'test-cookie=test-value; path=/';
      }, 50);

      const value = await waitForCookie('test-cookie', {
        timeout: 1000,
        pollInterval: 10,
      });

      expect(value).toBe('test-value');
    });

    it('should timeout when cookie does not become available', async () => {
      const onTimeout = jest.fn();

      const value = await waitForCookie('non-existent-cookie', {
        timeout: 100,
        pollInterval: 10,
        onTimeout,
      });

      expect(value).toBeNull();
      expect(onTimeout).toHaveBeenCalled();
    });

    it('should call success callback when cookie becomes available', async () => {
      const onSuccess = jest.fn();

      setTimeout(() => {
        document.cookie = 'test-cookie=test-value; path=/';
      }, 50);

      await waitForCookie('test-cookie', {
        timeout: 1000,
        pollInterval: 10,
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledWith('test-value', expect.any(Number));
    });

    it('should handle immediate cookie availability', async () => {
      document.cookie = 'test-cookie=test-value; path=/';

      const value = await waitForCookie('test-cookie', {
        timeout: 1000,
        pollInterval: 10,
      });

      expect(value).toBe('test-value');
    });

    it('should deduplicate concurrent cookie waits', async () => {
      setTimeout(() => {
        document.cookie = 'test-cookie=test-value; path=/';
      }, 50);

      const [value1, value2] = await Promise.all([
        waitForCookie('test-cookie', { timeout: 1000, pollInterval: 10 }),
        waitForCookie('test-cookie', { timeout: 1000, pollInterval: 10 }),
      ]);

      expect(value1).toBe('test-value');
      expect(value2).toBe('test-value');
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      try {
        localStorage.setItem('test', 'value');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      localStorage.setItem = originalSetItem;
    });

    it('should handle sessionStorage errors gracefully', () => {
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      try {
        sessionStorage.setItem('test', 'value');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('Storage Type Conversion', () => {
    it('should store and retrieve numbers from localStorage', () => {
      const key = 'number-key';
      const value = 123;

      localStorage.setItem(key, String(value));
      const retrieved = Number(localStorage.getItem(key));

      expect(retrieved).toBe(value);
    });

    it('should store and retrieve booleans from localStorage', () => {
      const key = 'boolean-key';
      const value = true;

      localStorage.setItem(key, String(value));
      const retrieved = localStorage.getItem(key) === 'true';

      expect(retrieved).toBe(value);
    });

    it('should store and retrieve arrays from localStorage', () => {
      const key = 'array-key';
      const value = [1, 2, 3];

      localStorage.setItem(key, JSON.stringify(value));
      const retrieved = JSON.parse(localStorage.getItem(key)!);

      expect(retrieved).toEqual(value);
    });

    it('should store and retrieve objects from localStorage', () => {
      const key = 'object-key';
      const value = { name: 'Test', nested: { value: 123 } };

      localStorage.setItem(key, JSON.stringify(value));
      const retrieved = JSON.parse(localStorage.getItem(key)!);

      expect(retrieved).toEqual(value);
    });
  });

  describe('Storage Key Management', () => {
    it('should list all localStorage keys', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.setItem('key3', 'value3');

      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }

      expect(keys.length).toBe(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should check if localStorage key exists', () => {
      localStorage.setItem('existing-key', 'value');

      const exists = localStorage.getItem('existing-key') !== null;
      const notExists = localStorage.getItem('non-existing-key') !== null;

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });
});
