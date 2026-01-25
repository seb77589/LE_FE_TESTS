/**
 * @jest-environment node
 */

/**
 * Tests for proxyLogger module
 *
 * Tests covering:
 * - proxyLog function output formatting
 * - proxyError function with Error objects
 * - proxyError function with non-Error values
 * - stderr write fallback
 * - Timestamp inclusion
 */

import { proxyLog, proxyError } from '@/lib/proxyLogger';

describe('proxyLogger', () => {
  // Store original console.log and process.stdout.write
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;
  let stderrWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  describe('proxyLog', () => {
    it('logs message with timestamp via console.log', () => {
      proxyLog('Test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('[PROXY-LOG]');
      expect(loggedOutput).toContain('Test message');
    });

    it('includes timestamp in log entry', () => {
      proxyLog('Test message');

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-LOG] ', ''));

      expect(parsed.timestamp).toBeDefined();
      // Timestamp should be ISO format
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });

    it('includes data when provided', () => {
      const testData = { url: '/api/test', method: 'GET' };
      proxyLog('Request received', testData);

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-LOG] ', ''));

      expect(parsed.message).toBe('Request received');
      expect(parsed.data).toEqual(testData);
    });

    it('excludes data field when not provided', () => {
      proxyLog('Simple message');

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-LOG] ', ''));

      expect(parsed.message).toBe('Simple message');
      expect(parsed.data).toBeUndefined();
    });

    it('writes to stdout as fallback', () => {
      proxyLog('Test message');

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const stdoutOutput = stdoutWriteSpy.mock.calls[0][0];
      expect(stdoutOutput).toContain('[PROXY-LOG]');
      expect(stdoutOutput).toContain('Test message');
      expect(stdoutOutput).toMatch(/\n$/);
    });

    it('handles complex data objects', () => {
      const complexData = {
        nested: { key: 'value' },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
      };
      proxyLog('Complex data', complexData);

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-LOG] ', ''));

      expect(parsed.data).toEqual(complexData);
    });

    it('handles null data', () => {
      proxyLog('Null data', null);

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-LOG] ', ''));

      // null is falsy, so data should be undefined
      expect(parsed.data).toBeUndefined();
    });

    it('handles undefined data explicitly', () => {
      proxyLog('Undefined data');

      const loggedOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-LOG] ', ''));

      expect(parsed.data).toBeUndefined();
    });
  });

  describe('proxyError', () => {
    it('logs error message with ERROR level', () => {
      proxyError('Error occurred', new Error('Test error'));

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('[PROXY-ERROR]');
    });

    it('includes level ERROR in log entry', () => {
      proxyError('Error occurred', new Error('Test error'));

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.level).toBe('ERROR');
    });

    it('extracts Error name, message, and stack', () => {
      const testError = new Error('Test error message');
      testError.name = 'CustomError';

      proxyError('Something went wrong', testError);

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.error.name).toBe('CustomError');
      expect(parsed.error.message).toBe('Test error message');
      expect(parsed.error.stack).toBeDefined();
    });

    it('converts non-Error values to string', () => {
      proxyError('Non-error value', 'simple string error');

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.error).toBe('simple string error');
    });

    it('handles number error values', () => {
      proxyError('Number error', 404);

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.error).toBe('404');
    });

    it('handles object error values', () => {
      proxyError('Object error', { code: 500, reason: 'Internal' });

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.error).toBe('[object Object]');
    });

    it('writes to stderr as fallback', () => {
      proxyError('Error message', new Error('Test'));

      expect(stderrWriteSpy).toHaveBeenCalled();
      const stderrOutput = stderrWriteSpy.mock.calls[0][0];
      expect(stderrOutput).toContain('[PROXY-ERROR]');
      expect(stderrOutput).toMatch(/\n$/);
    });

    it('includes timestamp in error log', () => {
      proxyError('Error', new Error('Test'));

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('includes message in error log', () => {
      proxyError('Specific error message', new Error('Details'));

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.message).toBe('Specific error message');
    });

    it('handles null error value', () => {
      proxyError('Null error', null);

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.error).toBe('null');
    });

    it('handles undefined error value', () => {
      proxyError('Undefined error', void 0); // undefined without redundant literal

      const loggedOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedOutput.replace('[PROXY-ERROR] ', ''));

      expect(parsed.error).toBe('undefined');
    });
  });

  describe('stderr write error handling', () => {
    it('suppresses errors when stderr.write fails', () => {
      stderrWriteSpy.mockImplementation(() => {
        throw new Error('Write failed');
      });

      // Should not throw
      expect(() => proxyLog('Test message')).not.toThrow();
      expect(() => proxyError('Error', new Error('Test'))).not.toThrow();
    });
  });
});
