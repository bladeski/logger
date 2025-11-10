/**
 * Test suite for LoggingService
 * 
 * Tests all functionality of the LoggingService including:
 * - Singleton pattern
 * - Log methods (error, info, success, warning)
 * - Event handling
 * - Console output
 * - Local storage
 * - Configuration
 * - Log management
 */

import { LoggingService } from '../src/LoggingService';
import { LogLevel } from '../src/enums';
import { InMemoryCoreLogger } from '../src/core';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

// Mock DOM methods for file export
const mockCreateElement = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

describe('LoggingService', () => {
  let loggingService: LoggingService;
  let configureService: (opts?: any) => LoggingService;
  let legacyConfigure: (opts: any) => void;

  beforeEach(() => {
    // Reset singleton instance
    (LoggingService as any).instance = undefined;
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage
    });

    // Mock console
    Object.defineProperty(console, 'log', { value: mockConsole.log });
    Object.defineProperty(console, 'warn', { value: mockConsole.warn });
    Object.defineProperty(console, 'error', { value: mockConsole.error });

    // Mock DOM APIs
    Object.defineProperty(document, 'createElement', { value: mockCreateElement });
    Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

    // Clear all mocks
    jest.clearAllMocks();
    mockLocalStorage.clear();

    // Initialize the service with a default in-memory logger for tests
    configureService = (opts: any = {}) => {
      const defaults = {
        applicationName: 'application',
        maxLogs: 1000,
        enableConsoleCore: false,
        enableLocalStorageCore: false,
        customCoreLoggers: [new InMemoryCoreLogger(opts.maxLogs ?? 1000)],
      };

      (LoggingService as any).instance = undefined;
      LoggingService.initialize({ ...defaults, ...opts });
      return LoggingService.getInstance();
    };

    legacyConfigure = (opts: any) => {
      const mapped: any = {};
      if (opts.enableConsoleOutput !== undefined) mapped.enableConsoleCore = opts.enableConsoleOutput;
      if (opts.enableLocalStorage !== undefined) mapped.enableLocalStorageCore = opts.enableLocalStorage;
      if (opts.maxLogs !== undefined) mapped.maxLogs = opts.maxLogs;
      loggingService = configureService(mapped);
    };

    loggingService = configureService();
  });

  afterEach(() => {
    // Clear logs after each test
    loggingService.clearLogs();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = LoggingService.getInstance();
      const instance2 = LoggingService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(loggingService);
    });

    it('should maintain state across multiple getInstance calls', () => {
      const instance1 = LoggingService.getInstance();
      instance1.info('Test message');
      
      const instance2 = LoggingService.getInstance();
      const logs = instance2.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
    });
  });

  describe('Log Methods', () => {
    describe('error()', () => {
      it('should log error message with correct level', () => {
        loggingService.error('Test error message');
        
        const logs = loggingService.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe(LogLevel.ERROR);
        expect(logs[0].message).toBe('Test error message');
        expect(logs[0].timestamp).toBeInstanceOf(Date);
      });

      it('should log error with additional data', () => {
        const errorData = { errorCode: 500, details: 'Server error' };
        loggingService.error('Server error occurred', errorData);
        
        const logs = loggingService.getLogs();
        expect(logs[0].data).toEqual(errorData);
      });

      it('should log error with custom source', () => {
        loggingService.error('Test error', undefined, 'TestService.method');
        
        const logs = loggingService.getLogs();
        expect(logs[0].source).toBe('TestService.method');
      });
    });

    describe('info()', () => {
      it('should log info message with correct level', () => {
        loggingService.info('Test info message');
        
        const logs = loggingService.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe(LogLevel.INFO);
        expect(logs[0].message).toBe('Test info message');
      });
    });

    describe('success()', () => {
      it('should log success message with correct level', () => {
        loggingService.success('Operation completed successfully');
        
        const logs = loggingService.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe(LogLevel.SUCCESS);
        expect(logs[0].message).toBe('Operation completed successfully');
      });
    });

    describe('warning()', () => {
      it('should log warning message with correct level', () => {
        loggingService.warning('This is a warning');
        
        const logs = loggingService.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe(LogLevel.WARN);
        expect(logs[0].message).toBe('This is a warning');
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle ErrorEvent objects', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Script error',
        filename: 'script.js',
        lineno: 42,
        colno: 10,
        error: new Error('Test error')
      });

      loggingService.error(errorEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe('Script error (script.js:42)');
      expect(logs[0].data).toMatchObject({
        filename: 'script.js',
        lineno: 42,
        colno: 10
      });
    });

    it('should handle generic Event objects', () => {
      const clickEvent = new Event('click');
      
      loggingService.info(clickEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toContain('click event');
      expect(logs[0].data).toMatchObject({
        type: 'click'
      });
    });

    it('should extract data from fetch events', () => {
      // Create a mock fetch event
      const mockRequest = { url: 'https://api.example.com', method: 'GET' } as Request;
      const fetchEvent = new Event('fetch') as any;
      fetchEvent.request = mockRequest;

      loggingService.info(fetchEvent);
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        url: 'https://api.example.com',
        method: 'GET'
      });
    });
  });

  describe('Console Output', () => {
    beforeEach(() => {
      // Ensure console output is enabled via legacy configure mapping
      legacyConfigure({ enableConsoleOutput: true });
    });

    it('should output error logs to console.error', () => {
      loggingService.error('Test error');
      
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Test error'),
        ''
      );
    });

    it('should output warning logs to console.warn', () => {
      loggingService.warning('Test warning');
      
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Test warning'),
        ''
      );
    });

    it('should output info logs to console.log', () => {
      loggingService.info('Test info');
      
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test info'),
        ''
      );
    });

    it('should output success logs with green styling', () => {
      loggingService.success('Test success');
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[SUCCESS] Test success'),
        'color: green; font-weight: bold;',
        ''
      );
    });

    it('should not output to console when disabled', () => {
  legacyConfigure({ enableConsoleOutput: false });
      loggingService.error('Test error');
      
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should include source information in console output', () => {
      loggingService.error('Test error', undefined, 'TestClass.method');
      
      expect(mockConsole.log).toHaveBeenCalledWith('  Source: TestClass.method');
    });
  });

  describe('Local Storage', () => {
    beforeEach(() => {
      // Ensure local storage is enabled
      legacyConfigure({ enableLocalStorage: true });
    });

    it('should save logs to localStorage', () => {
      loggingService.info('Test message');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'application-logs',
        expect.any(String)
      );
    });

    it('should load logs from localStorage on initialization', () => {
      // Pre-populate localStorage with logs
      const existingLogs = [
        {
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          message: 'Existing log',
          source: 'test'
        }
      ];
      mockLocalStorage.setItem('application-logs', JSON.stringify(existingLogs));

      // Create new instance to trigger loading
      (LoggingService as any).instance = undefined;
      const newService = LoggingService.getInstance();
      
      const logs = newService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Existing log');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        loggingService.info('Test message');
      }).not.toThrow();
    });

    it('should not save to localStorage when disabled', () => {
  legacyConfigure({ enableLocalStorage: false });
      loggingService.info('Test message');
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Log Management', () => {
    it('should retrieve all logs', () => {
      loggingService.info('Info message');
      loggingService.error('Error message');
      loggingService.success('Success message');
      
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(3);
    });

    it('should filter logs by level', () => {
      loggingService.info('Info message');
      loggingService.error('Error message');
      loggingService.success('Success message');
      
      const errorLogs = loggingService.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);
    });

    it('should clear all logs', () => {
      loggingService.info('Test message');
      expect(loggingService.getLogs()).toHaveLength(1);
      
      loggingService.clearLogs();
      expect(loggingService.getLogs()).toHaveLength(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('application-logs');
    });

    it('should rotate logs when maximum is exceeded', () => {
  legacyConfigure({ maxLogs: 2 });
      
      loggingService.info('Message 1');
      loggingService.info('Message 2');
      loggingService.info('Message 3');
      
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Message 2');
      expect(logs[1].message).toBe('Message 3');
    });
  });

  describe('Log Formatting', () => {
    it('should format logs as string', () => {
      loggingService.info('Test message', { key: 'value' });
      
      const logString = loggingService.getLogsAsString();
      expect(logString).toContain('[INFO] Test message');
      expect(logString).toContain('Data: {"key":"value"}');
    });

    it('should format filtered logs as string', () => {
      loggingService.info('Info message');
      loggingService.error('Error message');
      
      const errorString = loggingService.getLogsAsString(LogLevel.ERROR);
      expect(errorString).toContain('[ERROR] Error message');
      expect(errorString).not.toContain('[INFO] Info message');
    });
  });

  describe('Safe Serialization', () => {
    it('should safely serialize Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      loggingService.error('Error occurred', { error });
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        error: {
          name: 'Error',
          message: 'Test error',
          stack: 'Error stack trace'
        }
      });
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => {
        loggingService.info('Circular test', circular);
      }).not.toThrow();
    });

    it('should serialize Date objects', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      
      loggingService.info('Date test', { date });
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        date: {
          __type: 'Date',
          value: '2023-01-01T00:00:00.000Z'
        }
      });
    });

    it('should serialize RegExp objects', () => {
      const regex = /test/gi;
      
      loggingService.info('Regex test', { regex });
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        regex: {
          __type: 'RegExp',
          value: '/test/gi'
        }
      });
    });

    it('should serialize Map objects', () => {
      const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
      
      loggingService.info('Map test', { map });
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        map: {
          __type: 'Map',
          value: [['key1', 'value1'], ['key2', 'value2']]
        }
      });
    });

    it('should serialize Set objects', () => {
      const set = new Set(['value1', 'value2']);
      
      loggingService.info('Set test', { set });
      
      const logs = loggingService.getLogs();
      expect(logs[0].data).toMatchObject({
        set: {
          __type: 'Set',
          value: ['value1', 'value2']
        }
      });
    });
  });

  describe('Configuration', () => {
    it('should update configuration options', () => {
      legacyConfigure({
        enableConsoleOutput: false,
        enableLocalStorage: false,
        maxLogs: 500
      });
      
  const config = loggingService.getConfiguration();
  expect(config.enableConsoleCore).toBe(false);
  expect(config.enableLocalStorageCore).toBe(false);
  expect(config.maxLogs).toBe(500);
    });

    it('should return current configuration', () => {
      loggingService.info('Test message');
      
      const config = loggingService.getConfiguration();
      expect(config).toMatchObject({
        enableConsoleCore: expect.any(Boolean),
        enableLocalStorageCore: expect.any(Boolean),
        maxLogs: expect.any(Number),
        totalLogs: 1
      });
    });

    it('should partially update configuration', () => {
      const originalConfig = loggingService.getConfiguration();
      
  legacyConfigure({ maxLogs: 2000 });
      
      const newConfig = loggingService.getConfiguration();
  expect(newConfig.maxLogs).toBe(2000);
  expect(newConfig.enableConsoleCore).toBe(originalConfig.enableConsoleCore);
  expect(newConfig.enableLocalStorageCore).toBe(originalConfig.enableLocalStorageCore);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      // Mock DOM elements and methods
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      mockCreateElement.mockReturnValue(mockAnchor);
      mockCreateObjectURL.mockReturnValue('blob:url');
      
      Object.defineProperty(document.body, 'appendChild', { 
        value: jest.fn() 
      });
      Object.defineProperty(document.body, 'removeChild', { 
        value: jest.fn() 
      });
    });

    it('should export logs as downloadable file', () => {
      loggingService.info('Test message 1');
      loggingService.error('Test message 2');
      
      loggingService.exportLogs('test-logs.txt');
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
    });

    it('should use default filename when none provided', () => {
      loggingService.info('Test message');
      
      loggingService.exportLogs();
      
      const mockAnchor = mockCreateElement.mock.results[0].value;
      expect(mockAnchor.download).toMatch(/application-logs-\d{4}-\d{2}-\d{2}\.txt/);
    });
  });

  describe('Source Determination', () => {
    it('should determine source from stack trace', () => {
      loggingService.info('Test message');
      
      const logs = loggingService.getLogs();
      expect(logs[0].source).toBeDefined();
      expect(typeof logs[0].source).toBe('string');
    });

    it('should use provided source over determined source', () => {
      loggingService.info('Test message', undefined, 'CustomSource.method');
      
      const logs = loggingService.getLogs();
      expect(logs[0].source).toBe('CustomSource.method');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined and null data', () => {
      expect(() => {
        loggingService.info('Test with null', null);
        loggingService.info('Test with undefined', undefined);
      }).not.toThrow();
    });

    it('should handle empty strings', () => {
      loggingService.info('');
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      
      expect(() => {
        loggingService.info(longMessage);
      }).not.toThrow();
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = '!@#$%^&*()_+{}|:"<>?[];\'\\,./`~';
      
      loggingService.info(specialMessage);
      
      const logs = loggingService.getLogs();
      expect(logs[0].message).toBe(specialMessage);
    });
  });
});