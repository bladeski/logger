/**
 * Unit tests for LoggingService Event Handling
 * 
 * Tests the specific functionality around handling different event types
 */

import { LoggingService } from '../src/LoggingService';
import { LogLevel } from '../src/enums';

describe('LoggingService - Event Handling', () => {
  let loggingService: LoggingService;

  beforeEach(() => {
    // Reset singleton instance
    (LoggingService as any).instance = undefined;
    
    // Mock localStorage to avoid actual storage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      },
      writable: true
    });

    loggingService = LoggingService.getInstance();
    LoggingService.initialize({
      enableConsoleCore: false,
      enableLocalStorageCore: false
    });
  });

  afterEach(() => {
    loggingService.clearLogs();
  });

  describe('String Messages', () => {
    test('should log simple string messages correctly', () => {
      loggingService.info('Simple test message');
      
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Simple test message');
      expect(logs[0].level).toBe(LogLevel.INFO);
    });

    test('should log messages with special characters', () => {
      const specialMessage = 'Message with émojis 🚀 and symbols !@#$%';
      loggingService.warning(specialMessage);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe(specialMessage);
    });

    test('should handle empty string messages', () => {
      loggingService.error('');
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe('');
    });
  });

  describe('ErrorEvent Handling', () => {
    test('should extract message from ErrorEvent', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'JavaScript error occurred',
        filename: 'app.js',
        lineno: 123,
        colno: 45
      });

      loggingService.error(errorEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe('JavaScript error occurred (app.js:123)');
      expect(logs[0].level).toBe(LogLevel.ERROR);
    });

    test('should extract data from ErrorEvent', () => {
      const testError = new Error('Test error with stack');
      testError.stack = 'Error: Test error\n  at test.js:10:5';
      
      const errorEvent = new ErrorEvent('error', {
        message: 'Script error',
        filename: 'script.js', 
        lineno: 42,
        colno: 10,
        error: testError
      });

      loggingService.error(errorEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        filename: 'script.js',
        lineno: 42,
        colno: 10,
        error: testError.stack
      });
    });

    test('should handle ErrorEvent without stack trace', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Simple error',
        filename: 'test.js',
        lineno: 1,
        error: new Error('Simple error')
      });

      loggingService.error(errorEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe('Simple error (test.js:1)');
    });
  });

  describe('Generic Event Handling', () => {
    test('should handle click events', () => {
      const clickEvent = new Event('click');
      
      loggingService.info(clickEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toContain('click event');
      expect(logs[0].data).toMatchObject({
        type: 'click'
      });
    });

    test('should handle events with target information', () => {
      // Create a mock element with constructor name
      const mockElement = {
        constructor: { name: 'HTMLButtonElement' }
      };
      
      const event = new Event('click');
      Object.defineProperty(event, 'target', {
        value: mockElement,
        writable: true
      });

      loggingService.info(event);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toContain('click event on HTMLButtonElement');
      expect(logs[0].data).toMatchObject({
        type: 'click',
        target: 'HTMLButtonElement'
      });
    });

    test('should handle events without target', () => {
      const event = new Event('load');
      Object.defineProperty(event, 'target', {
        value: null,
        writable: true
      });

      loggingService.info(event);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toContain('load event on unknown target');
    });
  });

  describe('Custom Event Data', () => {
    test('should merge event data with additional data', () => {
      const event = new Event('custom');
      const additionalData = { userId: 123, action: 'submit' };

      loggingService.info(event, additionalData);
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        type: 'custom',
        userId: 123,
        action: 'submit'
      });
    });

    test('should handle additional data as primitive types', () => {
      const event = new Event('test');
      
      loggingService.info(event, 'simple string data');
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        type: 'test',
        additionalData: 'simple string data'
      });
    });

    test('should handle null and undefined additional data', () => {
      const event = new Event('test');
      
      loggingService.info(event, null);
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        type: 'test',
        additionalData: null
      });
    });
  });

  describe('Fetch Event Simulation', () => {
    test('should extract request data from fetch events', () => {
      // Simulate a fetch event with request object
      const mockRequest = {
        url: 'https://api.example.com/users',
        method: 'POST'
      } as Request;
      
      const fetchEvent = new Event('fetch') as any;
      fetchEvent.request = mockRequest;

      loggingService.info(fetchEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        type: 'fetch',
        url: 'https://api.example.com/users',
        method: 'POST'
      });
    });

    test('should handle fetch events without request object', () => {
      const fetchEvent = new Event('fetch');

      loggingService.info(fetchEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        type: 'fetch'
      });
      expect(logs[0].data).not.toHaveProperty('url');
      expect(logs[0].data).not.toHaveProperty('method');
    });
  });

  describe('Source Information', () => {
    test('should include custom source when provided', () => {
      loggingService.error('Test error', undefined, 'CustomService.handleError');
      
      const logs = loggingService.getLogs();
      expect(logs[0].source).toBe('CustomService.handleError');
    });

    test('should determine source automatically when not provided', () => {
      loggingService.warning('Auto source test');
      
      const logs = loggingService.getLogs();
      expect(logs[0].source).toBeDefined();
      expect(typeof logs[0].source).toBe('string');
    });

    test('should handle complex source names', () => {
      const complexSource = 'Module.Namespace.Class.method';
      loggingService.success('Success message', { key: 'value' }, complexSource);
      
      const logs = loggingService.getLogs();
      expect(logs[0].source).toBe(complexSource);
    });
  });
});