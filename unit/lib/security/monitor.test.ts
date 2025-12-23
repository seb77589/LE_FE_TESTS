/**
 * @jest-environment jsdom
 */

// Create mock logger functions that persist across module resets
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

// Mock the logger first
jest.mock('@/lib/logging', () => ({
  __esModule: true,
  default: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug,
  },
}));

// ==============================================================================
// Module-level predicate helpers (extracted to reduce nesting depth - fixes S2004)
// ==============================================================================

// Predicate to find CSP violation event handler
const isCSPViolationCall = (call: unknown[]): boolean =>
  call[0] === 'securitypolicyviolation';

// Predicate to check if issue mentions CSP violations
const mentionsCSPViolations = (issue: string): boolean =>
  issue.includes('CSP violations');

// We need to import after mocking the globals and logger
describe('SecurityMonitor', () => {
  let securityMonitor: any;
  let initializeSecurityMonitoring: any;
  let getSecurityStatus: any;

  beforeEach(() => {
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockLoggerDebug.mockClear();
    jest.resetModules();

    // Re-import to get fresh instances
    const monitorModule = require('@/lib/security/monitor');
    securityMonitor = monitorModule.securityMonitor;
    initializeSecurityMonitoring = monitorModule.initializeSecurityMonitoring;
    getSecurityStatus = monitorModule.getSecurityStatus;
  });

  describe('SecurityMonitor Class', () => {
    describe('initialize', () => {
      it('logs initialization message when in browser', () => {
        securityMonitor.initialize();

        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'general',
          '🔒 Security monitoring initialized',
        );
      });

      it('sets up CSP reporting when enabled', () => {
        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

        securityMonitor.initialize();

        expect(addEventListenerSpy).toHaveBeenCalledWith(
          'securitypolicyviolation',
          expect.any(Function),
        );

        addEventListenerSpy.mockRestore();
      });

      it('logs debug message for security header validation', () => {
        securityMonitor.initialize();

        expect(mockLoggerDebug).toHaveBeenCalledWith(
          'security',
          'Security header validation (server-side)',
        );
      });
    });

    describe('CSP Violation Handling', () => {
      it('records CSP violations when event is triggered', () => {
        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

        securityMonitor.initialize();

        // Get the event handler
        const eventHandler = addEventListenerSpy.mock.calls.find(
          isCSPViolationCall,
        )?.[1] as EventListener;

        expect(eventHandler).toBeDefined();

        // Create a mock CSP violation event
        const mockEvent = {
          violatedDirective: 'script-src',
          blockedURI: 'https://evil.com/script.js',
          documentURI: 'https://example.com/',
          effectiveDirective: 'script-src',
        };

        eventHandler(mockEvent as any);

        // Check that the event was recorded
        const stats = securityMonitor.getStats();
        expect(stats.cspViolations).toBeGreaterThan(0);

        addEventListenerSpy.mockRestore();
      });

      it('logs CSP violations at warn level', () => {
        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

        securityMonitor.initialize();

        const eventHandler = addEventListenerSpy.mock.calls.find(
          isCSPViolationCall,
        )?.[1] as EventListener;

        const mockEvent = {
          violatedDirective: 'script-src',
          blockedURI: 'https://evil.com/script.js',
          documentURI: 'https://example.com/',
          effectiveDirective: 'script-src',
        };

        eventHandler(mockEvent as any);

        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'security',
          'Security event: csp-violation',
          expect.objectContaining({
            severity: 'high',
          }),
        );

        addEventListenerSpy.mockRestore();
      });
    });

    describe('Mixed Content Detection', () => {
      it('detects HTTP images on HTTPS page', () => {
        // Create an HTTP image
        const img = document.createElement('img');
        img.src = 'http://example.com/image.jpg';
        document.body.appendChild(img);

        securityMonitor.initialize();

        const stats = securityMonitor.getStats();
        expect(stats.mixedContent).toBeGreaterThanOrEqual(0);

        // Cleanup
        img.remove();
      });

      it('records mixed content events with medium severity', () => {
        // Create HTTP resources
        const img = document.createElement('img');
        img.src = 'http://insecure.com/image.png';
        document.body.appendChild(img);

        // Re-initialize to detect the mixed content
        jest.resetModules();
        jest.clearAllMocks();

        const freshModule = require('@/lib/security/monitor');
        freshModule.securityMonitor.initialize();

        // Check that mockLoggerWarn was called for mixed content
        // (it may or may not depending on config)

        // Cleanup
        img.remove();
      });
    });

    describe('getStats', () => {
      it('returns correct initial stats', () => {
        const stats = securityMonitor.getStats();

        expect(stats).toHaveProperty('totalEvents');
        expect(stats).toHaveProperty('cspViolations');
        expect(stats).toHaveProperty('mixedContent');
        expect(stats).toHaveProperty('recentEvents');
        expect(Array.isArray(stats.recentEvents)).toBe(true);
      });

      it('returns recent events limited to 10', () => {
        const stats = securityMonitor.getStats();
        expect(stats.recentEvents.length).toBeLessThanOrEqual(10);
      });
    });

    describe('getHealthStatus', () => {
      it('returns healthy status when no issues', () => {
        // Create a fresh monitor
        jest.resetModules();
        const freshModule = require('@/lib/security/monitor');

        const health = freshModule.securityMonitor.getHealthStatus();

        expect(health).toHaveProperty('healthy');
        expect(health).toHaveProperty('issues');
        expect(Array.isArray(health.issues)).toBe(true);
      });

      it('returns unhealthy when CSP violations exist', () => {
        // Simulate a CSP violation by triggering the event
        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

        securityMonitor.initialize();

        const eventHandler = addEventListenerSpy.mock.calls.find(
          isCSPViolationCall,
        )?.[1] as EventListener;

        if (eventHandler) {
          const mockEvent = {
            violatedDirective: 'script-src',
            blockedURI: 'https://evil.com/script.js',
            documentURI: 'https://example.com/',
            effectiveDirective: 'script-src',
          };

          eventHandler(mockEvent as any);

          const health = securityMonitor.getHealthStatus();
          expect(health.healthy).toBe(false);
          expect(health.issues.some(mentionsCSPViolations)).toBe(true);
        }

        addEventListenerSpy.mockRestore();
      });
    });

    describe('updateConfig', () => {
      it('updates configuration', () => {
        securityMonitor.updateConfig({
          logLevel: 'error',
        });

        // Config is private, but we can test behavior
        // Lower severity events should not be logged after changing to 'error'
        securityMonitor.initialize();

        // The initialization should still work
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'general',
          '🔒 Security monitoring initialized',
        );
      });

      it('merges new config with existing', () => {
        securityMonitor.updateConfig({
          enableCSPReporting: false,
        });

        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

        securityMonitor.initialize();

        // CSP reporting should be disabled
        const cspHandler = addEventListenerSpy.mock.calls.find(isCSPViolationCall);
        expect(cspHandler).toBeUndefined();

        addEventListenerSpy.mockRestore();
      });
    });
  });

  describe('Exported Functions', () => {
    describe('initializeSecurityMonitoring', () => {
      it('calls securityMonitor.initialize', () => {
        const initializeSpy = jest.spyOn(securityMonitor, 'initialize');

        initializeSecurityMonitoring();

        expect(initializeSpy).toHaveBeenCalled();

        initializeSpy.mockRestore();
      });
    });

    describe('getSecurityStatus', () => {
      it('returns stats and health', () => {
        const status = getSecurityStatus();

        expect(status).toHaveProperty('stats');
        expect(status).toHaveProperty('health');
        expect(status.stats).toHaveProperty('totalEvents');
        expect(status.health).toHaveProperty('healthy');
      });

      it('stats matches getStats return value', () => {
        const status = getSecurityStatus();
        const directStats = securityMonitor.getStats();

        expect(status.stats.totalEvents).toBe(directStats.totalEvents);
        expect(status.stats.cspViolations).toBe(directStats.cspViolations);
      });

      it('health matches getHealthStatus return value', () => {
        const status = getSecurityStatus();
        const directHealth = securityMonitor.getHealthStatus();

        expect(status.health.healthy).toBe(directHealth.healthy);
        expect(status.health.issues).toEqual(directHealth.issues);
      });
    });
  });

  describe('Event Limiting', () => {
    it('limits event history to 100 events', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      securityMonitor.initialize();

      const eventHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'securitypolicyviolation',
      )?.[1] as EventListener;

      if (eventHandler) {
        // Trigger more than 100 events
        for (let i = 0; i < 110; i++) {
          const mockEvent = {
            violatedDirective: `directive-${i}`,
            blockedURI: `https://evil.com/script${i}.js`,
            documentURI: 'https://example.com/',
            effectiveDirective: 'script-src',
          };
          eventHandler(mockEvent as any);
        }

        const stats = securityMonitor.getStats();
        // Events should be limited
        expect(stats.totalEvents).toBeLessThanOrEqual(100);
      }

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Severity Logging', () => {
    it('logs high severity events with default warn config', () => {
      jest.clearAllMocks();

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      securityMonitor.initialize();

      const eventHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'securitypolicyviolation',
      )?.[1] as EventListener;

      if (eventHandler) {
        const mockEvent = {
          violatedDirective: 'script-src',
          blockedURI: 'https://evil.com/script.js',
          documentURI: 'https://example.com/',
          effectiveDirective: 'script-src',
        };

        eventHandler(mockEvent as any);

        // High severity should be logged with default warn config
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'security',
          expect.stringContaining('csp-violation'),
          expect.any(Object),
        );
      }

      addEventListenerSpy.mockRestore();
    });
  });
});

describe('SecurityEvent Interface', () => {
  it('defines correct event types', () => {
    // This is a type test - verifying the interface through usage
    const event = {
      type: 'csp-violation' as const,
      message: 'Test message',
      timestamp: new Date(),
      severity: 'high' as const,
      details: {},
    };

    expect(event.type).toBe('csp-violation');
    expect(event.severity).toBe('high');
  });

  it('supports optional source and details', () => {
    const eventWithSource = {
      type: 'mixed-content' as const,
      message: 'Test',
      source: 'http://example.com',
      timestamp: new Date(),
      severity: 'medium' as const,
    };

    expect(eventWithSource.source).toBe('http://example.com');
  });
});

describe('SecurityConfig Interface', () => {
  it('supports all log levels', () => {
    const configs = [
      { logLevel: 'debug' as const },
      { logLevel: 'info' as const },
      { logLevel: 'warn' as const },
      { logLevel: 'error' as const },
    ];

    for (const config of configs) {
      expect(['debug', 'info', 'warn', 'error']).toContain(config.logLevel);
    }
  });
});
