/**
 * Logger Tests
 *
 * Tests for simplified logging system with environment-based filtering.
 */

// Mock console before importing logger
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

globalThis.console = mockConsole as any;

// Now import logger
import logger, { Logger } from '@/lib/logging';

describe('Logger', () => {
  let loggerInstance: Logger;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a new logger instance for each test
    loggerInstance = new Logger();

    // Clear any existing log entries
    loggerInstance.clear();
  });

  describe('Initialization', () => {
    it('should create logger instance', () => {
      expect(loggerInstance).toBeInstanceOf(Logger);
    });

    it('should have correct default config for test environment', () => {
      const config = loggerInstance.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.minLevel).toBe('error');
    });

    it('should initialize with empty log entries', () => {
      const entries = loggerInstance.getLogEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
      });

      const config = loggerInstance.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.minLevel).toBe('debug');
    });

    it('should clear log entries when disabled', () => {
      // Enable logging first
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
      });
      loggerInstance.info('general', 'Test message');

      expect(loggerInstance.getLogEntries().length).toBeGreaterThan(0);

      // Disable logging
      loggerInstance.updateConfig({
        enabled: false,
      });

      expect(loggerInstance.getLogEntries().length).toBe(0);
    });
  });

  describe('Log Level Filtering', () => {
    beforeEach(() => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'info',
        enableConsoleOutput: false,
      });
    });

    it('should log info level messages', () => {
      loggerInstance.info('general', 'Info message');
      const entries = loggerInstance.getLogEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('info');
    });

    it('should log warn level messages', () => {
      loggerInstance.warn('general', 'Warning message');
      const entries = loggerInstance.getLogEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('warn');
    });

    it('should log error level messages', () => {
      loggerInstance.error('general', 'Error message');
      const entries = loggerInstance.getLogEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('error');
    });

    it('should not log debug messages when minLevel is info', () => {
      loggerInstance.debug('general', 'Debug message');
      const entries = loggerInstance.getLogEntries();
      expect(entries.length).toBe(0);
    });

    it('should log debug messages when minLevel is debug', () => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: false,
      });
      loggerInstance.debug('general', 'Debug message');
      const entries = loggerInstance.getLogEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].level).toBe('debug');
    });
  });

  describe('Log Categories', () => {
    beforeEach(() => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: false,
      });
    });

    it('should log with auth category', () => {
      loggerInstance.info('auth', 'Auth message');
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].category).toBe('auth');
    });

    it('should log with api category', () => {
      loggerInstance.info('api', 'API message');
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].category).toBe('api');
    });

    it('should log with session category', () => {
      loggerInstance.info('session', 'Session message');
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].category).toBe('session');
    });

    it('should log with activity category', () => {
      loggerInstance.info('activity', 'Activity message');
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].category).toBe('activity');
    });

    it('should log with general category', () => {
      loggerInstance.info('general', 'General message');
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].category).toBe('general');
    });
  });

  describe('Console Output', () => {
    beforeEach(() => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: true,
      });
    });

    it('should output to console when enabled', () => {
      loggerInstance.info('general', 'Test message');
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should not output to console when disabled', () => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: false,
      });
      loggerInstance.info('general', 'Test message');
      expect(mockConsole.info).not.toHaveBeenCalled();
    });
  });

  describe('Log Entry Management', () => {
    beforeEach(() => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: false,
      });
    });

    it('should store log entries', () => {
      loggerInstance.info('general', 'Message 1');
      loggerInstance.warn('general', 'Message 2');
      const entries = loggerInstance.getLogEntries();
      expect(entries.length).toBe(2);
    });

    it('should include context in log entries', () => {
      const context = { userId: 123, action: 'login' };
      loggerInstance.info('auth', 'User logged in', context);
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].context).toEqual(context);
    });

    it('should include error stack in log entries', () => {
      const error = new Error('Test error');
      loggerInstance.error('general', 'Error occurred', undefined, error);
      const entries = loggerInstance.getLogEntries();
      expect(entries[0].stack).toBeDefined();
    });

    it('should clear log entries', () => {
      loggerInstance.info('general', 'Message 1');
      loggerInstance.info('general', 'Message 2');
      expect(loggerInstance.getLogEntries().length).toBe(2);
      loggerInstance.clear();
      expect(loggerInstance.getLogEntries().length).toBe(0);
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      loggerInstance.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: false,
      });
    });

    it('should export logAuth convenience method', () => {
      const { logAuth } = require('@/lib/logging');
      // Enable logger for this test (it's disabled by default in test mode)
      logger.updateConfig({ enabled: true, minLevel: 'info' });
      // Clear singleton logger entries before test
      logger.clear();
      logAuth('User logged in', { userId: 123 });
      const entries = logger.getLogEntries();
      expect(entries.length).toBeGreaterThan(0);
      // Reset logger config
      logger.updateConfig({ enabled: false });
    });

    it('should export logApi convenience method', () => {
      const { logApi } = require('@/lib/logging');
      // Enable logger for this test (it's disabled by default in test mode)
      logger.updateConfig({ enabled: true, minLevel: 'info' });
      // Clear singleton logger entries before test
      logger.clear();
      logApi('API call made', { endpoint: '/api/users' });
      const entries = logger.getLogEntries();
      expect(entries.length).toBeGreaterThan(0);
      // Reset logger config
      logger.updateConfig({ enabled: false });
    });
  });

  describe('Default Logger Instance', () => {
    it('should export default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should use default logger instance', () => {
      logger.updateConfig({
        enabled: true,
        minLevel: 'debug',
        enableConsoleOutput: false,
      });
      logger.info('general', 'Test message');
      const entries = logger.getLogEntries();
      expect(entries.length).toBe(1);
    });
  });
});
