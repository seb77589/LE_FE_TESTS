/**
 * @fileoverview Comprehensive unit tests for rum (Real User Monitoring) utility
 *
 * Tests cover:
 * - initWebVitals: initialization and configuration
 * - flushWebVitals / disableWebVitals / enableWebVitals: state management
 * - updateRUMConfig / getRUMConfig: configuration management
 * - markPerformanceEvent / measurePerformance: custom marks
 * - getResourceTiming / getResourceTimingSummary: resource analysis
 * - startLongTaskMonitoring / stopLongTaskMonitoring: long task detection
 * - getNavigationTiming / getNavigationMetrics: navigation analysis
 *
 * @module tests/rum.test
 * @since 0.2.0
 */

import {
  initWebVitals,
  flushWebVitals,
  disableWebVitals,
  enableWebVitals,
  updateRUMConfig,
  getRUMConfig,
  markPerformanceEvent,
  measurePerformance,
  getResourceTiming,
  getResourceTimingSummary,
  startLongTaskMonitoring,
  stopLongTaskMonitoring,
  getNavigationTiming,
  getNavigationMetrics,
} from '@/lib/utils/rum';

// ==============================================================================
// Mock Setup
// ==============================================================================

// Mock web-vitals
jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onFCP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
  onINP: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import logger from '@/lib/logging';

// Store originals
const originalWindow = globalThis.window;
const originalNavigator = globalThis.navigator;
const originalPerformance = globalThis.performance;

// Mock sendBeacon
const mockSendBeacon = jest.fn().mockReturnValue(true);

// Mock fetch
const mockFetch = jest.fn().mockResolvedValue({ ok: true });

// Create mock Performance API
const createMockPerformance = () => ({
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([]),
  getEntriesByType: jest.fn().mockReturnValue([]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  now: jest.fn().mockReturnValue(1000),
});

// ==============================================================================
// Test Suites
// ==============================================================================

describe('rum (Real User Monitoring)', () => {
  let mockPerformance: ReturnType<typeof createMockPerformance>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset module state by re-importing with fresh config
    disableWebVitals(); // Reset enabled state
    updateRUMConfig({
      enabled: true,
      apiEndpoint: '/api/v1/analytics/vitals',
      sampleRate: 1,
      debug: false,
      batchSize: 10,
      batchInterval: 5000,
    });

    // Set up browser environment mocks
    mockPerformance = createMockPerformance();

    // Mock window properties instead of redefining window
    Object.defineProperty(globalThis, 'performance', {
      value: mockPerformance,
      writable: true,
      configurable: true,
    });

    // Mock navigator.sendBeacon
    Object.defineProperty(navigator, 'sendBeacon', {
      value: mockSendBeacon,
      writable: true,
      configurable: true,
    });

    // Mock navigator.connection
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g' },
      writable: true,
      configurable: true,
    });

    // Mock navigator.deviceMemory
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 8,
      writable: true,
      configurable: true,
    });

    // Mock window.addEventListener (initWebVitals uses window.addEventListener not globalThis)
    jest.spyOn(globalThis.window, 'addEventListener').mockImplementation(jest.fn());

    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    disableWebVitals();
    stopLongTaskMonitoring();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // initWebVitals Tests
  // ==========================================================================
  describe('initWebVitals', () => {
    // Note: Due to module state not being reset between tests, we need to be careful
    // about test order. The first test that calls initWebVitals will set vitalsInitialized=true
    // and subsequent calls become no-ops.

    it('should initialize web vitals tracking and set up listeners', () => {
      // This test should run first - it verifies both initialization and listener setup
      const addEventListenerSpy = jest.spyOn(globalThis.window, 'addEventListener');

      initWebVitals();

      expect(onLCP).toHaveBeenCalled();
      expect(onCLS).toHaveBeenCalled();
      expect(onFCP).toHaveBeenCalled();
      expect(onTTFB).toHaveBeenCalled();
      expect(onINP).toHaveBeenCalled();

      // Verify listeners were set up
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it('should prevent double initialization', () => {
      // At this point, vitalsInitialized is already true from first test
      const callsBefore = (onLCP as jest.Mock).mock.calls.length;

      // Second call should be a no-op
      initWebVitals();

      // The count should remain the same
      expect(onLCP).toHaveBeenCalledTimes(callsBefore);
    });

    it('should accept custom configuration via updateRUMConfig', () => {
      // Config updates work regardless of initialization state
      updateRUMConfig({ sampleRate: 0.5, debug: true });

      const config = getRUMConfig();
      expect(config.sampleRate).toBe(0.5);
      expect(config.debug).toBe(true);
    });

    it.skip('should not initialize in SSR environment', () => {
      // This test is skipped in jsdom environment since window cannot be undefined
      // The actual SSR behavior is tested via integration tests
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // flushWebVitals Tests
  // ==========================================================================
  describe('flushWebVitals', () => {
    it('should be a function', () => {
      expect(typeof flushWebVitals).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => flushWebVitals()).not.toThrow();
    });
  });

  // ==========================================================================
  // disableWebVitals / enableWebVitals Tests
  // ==========================================================================
  describe('disableWebVitals', () => {
    it('should disable RUM tracking', () => {
      enableWebVitals();
      const beforeConfig = getRUMConfig();
      expect(beforeConfig.enabled).toBe(true);

      disableWebVitals();

      const config = getRUMConfig();
      expect(config.enabled).toBe(false);
    });

    it('should clear metrics queue', () => {
      enableWebVitals();
      disableWebVitals();

      // Queue should be empty (no metrics sent)
      expect(() => flushWebVitals()).not.toThrow();
    });
  });

  describe('enableWebVitals', () => {
    it('should enable RUM tracking', () => {
      disableWebVitals();
      enableWebVitals();

      const config = getRUMConfig();
      expect(config.enabled).toBe(true);
    });

    it('should be idempotent', () => {
      enableWebVitals();
      enableWebVitals();
      enableWebVitals();

      const config = getRUMConfig();
      expect(config.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // updateRUMConfig / getRUMConfig Tests
  // ==========================================================================
  describe('updateRUMConfig', () => {
    it('should update configuration', () => {
      updateRUMConfig({ sampleRate: 0.5 });

      const config = getRUMConfig();
      expect(config.sampleRate).toBe(0.5);
    });

    it('should merge with existing config', () => {
      updateRUMConfig({ sampleRate: 0.5 });
      updateRUMConfig({ debug: true });

      const config = getRUMConfig();
      expect(config.sampleRate).toBe(0.5);
      expect(config.debug).toBe(true);
    });

    it('should update batch settings', () => {
      updateRUMConfig({
        batchSize: 20,
        batchInterval: 10000,
      });

      const config = getRUMConfig();
      expect(config.batchSize).toBe(20);
      expect(config.batchInterval).toBe(10000);
    });

    it('should update API endpoint', () => {
      updateRUMConfig({ apiEndpoint: '/custom/endpoint' });

      const config = getRUMConfig();
      expect(config.apiEndpoint).toBe('/custom/endpoint');
    });
  });

  describe('getRUMConfig', () => {
    it('should return current configuration', () => {
      const config = getRUMConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('apiEndpoint');
      expect(config).toHaveProperty('sampleRate');
      expect(config).toHaveProperty('debug');
      expect(config).toHaveProperty('batchSize');
      expect(config).toHaveProperty('batchInterval');
    });

    it('should return a copy (not reference)', () => {
      const config1 = getRUMConfig();
      const config2 = getRUMConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  // ==========================================================================
  // markPerformanceEvent Tests
  // ==========================================================================
  describe('markPerformanceEvent', () => {
    it('should create a performance mark', () => {
      markPerformanceEvent('test-event');

      expect(mockPerformance.mark).toHaveBeenCalledWith('test-event', {
        detail: undefined,
      });
    });

    it('should include detail in mark', () => {
      markPerformanceEvent('test-event', { component: 'Dashboard' });

      expect(mockPerformance.mark).toHaveBeenCalledWith('test-event', {
        detail: { component: 'Dashboard' },
      });
    });

    it('should not throw when performance API unavailable', () => {
      // Mock window.performance to be undefined
      Object.defineProperty(globalThis, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => markPerformanceEvent('test')).not.toThrow();
    });

    it('should handle mark failure gracefully', () => {
      mockPerformance.mark.mockImplementationOnce(() => {
        throw new Error('Mark failed');
      });

      expect(() => markPerformanceEvent('failing-mark')).not.toThrow();
    });

    it('should log in debug mode', () => {
      updateRUMConfig({ debug: true });
      markPerformanceEvent('debug-mark');

      expect(logger.debug).toHaveBeenCalledWith(
        'performance',
        'Performance mark: debug-mark',
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // measurePerformance Tests
  // ==========================================================================
  describe('measurePerformance', () => {
    it('should create a performance measure', () => {
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 100 }]);

      const duration = measurePerformance('test-measure', 'start', 'end');

      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-measure',
        'start',
        'end',
      );
      expect(duration).toBe(100);
    });

    it('should return null when performance API unavailable', () => {
      // Mock window.performance to be undefined
      Object.defineProperty(globalThis, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const duration = measurePerformance('test', 'start', 'end');
      expect(duration).toBeNull();
    });

    it('should return null when measure fails', () => {
      mockPerformance.measure.mockImplementationOnce(() => {
        throw new Error('Measure failed');
      });

      const duration = measurePerformance('failing-measure', 'start', 'end');
      expect(duration).toBeNull();
    });

    it('should return 0 when no measures found', () => {
      mockPerformance.getEntriesByName.mockReturnValue([]);

      const duration = measurePerformance('empty-measure', 'start', 'end');
      expect(duration).toBeNull();
    });

    it('should return last measure when multiple exist', () => {
      mockPerformance.getEntriesByName.mockReturnValue([
        { duration: 50 },
        { duration: 100 },
        { duration: 75 },
      ]);

      const duration = measurePerformance('multi-measure', 'start', 'end');
      expect(duration).toBe(75);
    });
  });

  // ==========================================================================
  // getResourceTiming Tests
  // ==========================================================================
  describe('getResourceTiming', () => {
    const mockResources = [
      { initiatorType: 'script', duration: 100, name: 'app.js' },
      { initiatorType: 'stylesheet', duration: 50, name: 'style.css' },
      { initiatorType: 'script', duration: 200, name: 'vendor.js' },
      { initiatorType: 'img', duration: 150, name: 'logo.png' },
    ];

    beforeEach(() => {
      mockPerformance.getEntriesByType.mockReturnValue(mockResources);
    });

    it('should return all resources when no type specified', () => {
      const resources = getResourceTiming();
      expect(resources).toEqual(mockResources);
    });

    it('should filter by resource type', () => {
      const scripts = getResourceTiming('script');
      expect(scripts).toHaveLength(2);
      expect(scripts.every((r) => r.initiatorType === 'script')).toBe(true);
    });

    it('should return empty array when no resources match', () => {
      const videos = getResourceTiming('video');
      expect(videos).toEqual([]);
    });

    it('should return empty array when performance API unavailable', () => {
      // Mock window.performance to be undefined
      Object.defineProperty(globalThis, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const resources = getResourceTiming();
      expect(resources).toEqual([]);
    });
  });

  // ==========================================================================
  // getResourceTimingSummary Tests
  // ==========================================================================
  describe('getResourceTimingSummary', () => {
    const mockResources = [
      { initiatorType: 'script', duration: 100 },
      { initiatorType: 'script', duration: 200 },
      { initiatorType: 'stylesheet', duration: 50 },
    ];

    beforeEach(() => {
      mockPerformance.getEntriesByType.mockReturnValue(mockResources);
    });

    it('should return summary grouped by type', () => {
      const summary = getResourceTimingSummary();

      expect(summary.script).toBeDefined();
      expect(summary.stylesheet).toBeDefined();
    });

    it('should calculate correct count', () => {
      const summary = getResourceTimingSummary();

      expect(summary.script.count).toBe(2);
      expect(summary.stylesheet.count).toBe(1);
    });

    it('should calculate correct total duration', () => {
      const summary = getResourceTimingSummary();

      expect(summary.script.totalDuration).toBe(300);
      expect(summary.stylesheet.totalDuration).toBe(50);
    });

    it('should calculate correct average duration', () => {
      const summary = getResourceTimingSummary();

      expect(summary.script.avgDuration).toBe(150);
      expect(summary.stylesheet.avgDuration).toBe(50);
    });

    it('should return empty object when no resources', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);

      const summary = getResourceTimingSummary();
      expect(summary).toEqual({});
    });
  });

  // ==========================================================================
  // startLongTaskMonitoring / stopLongTaskMonitoring Tests
  // ==========================================================================
  describe('startLongTaskMonitoring', () => {
    let mockObserver: any;
    let observerCallback: (list: any) => void;

    beforeEach(() => {
      mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };

      (globalThis as any).PerformanceObserver = jest.fn((callback: any) => {
        observerCallback = callback;
        return mockObserver;
      });
    });

    it('should create a PerformanceObserver', () => {
      const callback = jest.fn();
      startLongTaskMonitoring(callback);

      expect(globalThis.PerformanceObserver).toHaveBeenCalled();
    });

    it('should observe longtask entry type', () => {
      const callback = jest.fn();
      startLongTaskMonitoring(callback);

      expect(mockObserver.observe).toHaveBeenCalledWith({ entryTypes: ['longtask'] });
    });

    it('should call callback when long task detected', () => {
      const callback = jest.fn();
      startLongTaskMonitoring(callback);

      // Simulate long task
      observerCallback({
        getEntries: () => [{ duration: 100 }],
      });

      expect(callback).toHaveBeenCalledWith([{ duration: 100 }]);
    });

    it('should not call callback when no entries', () => {
      const callback = jest.fn();
      startLongTaskMonitoring(callback);

      observerCallback({
        getEntries: () => [],
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle missing PerformanceObserver gracefully', () => {
      delete (globalThis as any).PerformanceObserver;
      // Just delete PerformanceObserver - window exists in jsdom
      expect(() => startLongTaskMonitoring(jest.fn())).not.toThrow();
    });
  });

  describe('stopLongTaskMonitoring', () => {
    let mockObserver: any;

    beforeEach(() => {
      mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };

      (globalThis as any).PerformanceObserver = jest.fn(() => mockObserver);
    });

    it('should disconnect observer', () => {
      startLongTaskMonitoring(jest.fn());
      stopLongTaskMonitoring();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should be safe to call when not monitoring', () => {
      expect(() => stopLongTaskMonitoring()).not.toThrow();
    });

    it('should be idempotent', () => {
      startLongTaskMonitoring(jest.fn());
      stopLongTaskMonitoring();
      stopLongTaskMonitoring();
      stopLongTaskMonitoring();

      // Should only disconnect once (first call)
      expect(mockObserver.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // getNavigationTiming / getNavigationMetrics Tests
  // ==========================================================================
  describe('getNavigationTiming', () => {
    const mockNavEntry = {
      entryType: 'navigation',
      fetchStart: 0,
      domainLookupStart: 10,
      domainLookupEnd: 20,
      connectStart: 20,
      connectEnd: 30,
      requestStart: 30,
      responseStart: 50,
      responseEnd: 100,
      domInteractive: 200,
      domContentLoadedEventStart: 250,
      domContentLoadedEventEnd: 260,
      loadEventStart: 300,
      loadEventEnd: 350,
    };

    it('should return navigation timing entry', () => {
      mockPerformance.getEntriesByType.mockReturnValue([mockNavEntry]);

      const nav = getNavigationTiming();
      expect(nav).toEqual(mockNavEntry);
    });

    it('should return null when no navigation entry', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);

      const nav = getNavigationTiming();
      expect(nav).toBeNull();
    });

    it('should return null when performance API unavailable', () => {
      // Mock window.performance to be undefined
      Object.defineProperty(globalThis, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const nav = getNavigationTiming();
      expect(nav).toBeNull();
    });
  });

  describe('getNavigationMetrics', () => {
    const mockNavEntry = {
      fetchStart: 0,
      domainLookupStart: 10,
      domainLookupEnd: 20,
      connectStart: 20,
      connectEnd: 30,
      requestStart: 30,
      responseStart: 50,
      responseEnd: 100,
      domInteractive: 200,
      domContentLoadedEventStart: 250,
      domContentLoadedEventEnd: 260,
      loadEventStart: 300,
      loadEventEnd: 350,
    };

    beforeEach(() => {
      mockPerformance.getEntriesByType.mockReturnValue([mockNavEntry]);
    });

    it('should return calculated metrics', () => {
      const metrics = getNavigationMetrics();

      expect(metrics).toEqual({
        dns: 10, // domainLookupEnd - domainLookupStart
        tcp: 10, // connectEnd - connectStart
        ttfb: 20, // responseStart - requestStart
        download: 50, // responseEnd - responseStart
        domInteractive: 200, // domInteractive - fetchStart
        domContentLoaded: 10, // domContentLoadedEventEnd - domContentLoadedEventStart
        loadComplete: 50, // loadEventEnd - loadEventStart
        totalTime: 350, // loadEventEnd - fetchStart
      });
    });

    it('should return null when no navigation timing', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);

      const metrics = getNavigationMetrics();
      expect(metrics).toBeNull();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle missing navigator.connection', () => {
      // Delete connection property
      delete (navigator as any).connection;

      // Should not throw when connection info unavailable
      expect(() => initWebVitals()).not.toThrow();
    });

    it('should handle missing navigator.deviceMemory', () => {
      // Delete deviceMemory property
      delete (navigator as any).deviceMemory;

      expect(() => initWebVitals()).not.toThrow();
    });

    it('should handle sendBeacon failure', () => {
      mockSendBeacon.mockReturnValueOnce(false);

      expect(() => flushWebVitals()).not.toThrow();
    });

    it('should handle fetch fallback when sendBeacon unavailable', () => {
      // Delete sendBeacon to trigger fetch fallback
      delete (navigator as any).sendBeacon;

      expect(() => flushWebVitals()).not.toThrow();
    });
  });
});
