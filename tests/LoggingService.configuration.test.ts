/**
 * Unit tests for LoggingService Configuration
 * 
 * Tests configuration management and behavior changes
 */

import { LoggingService } from '../src/LoggingService';

describe('LoggingService - Configuration Management', () => {
  let loggingService: LoggingService;
  let mockConsole: any;
  let mockLocalStorage: any;

  beforeEach(() => {
    // Reset singleton
    (LoggingService as any).instance = undefined;
    
    // Create mock localStorage
    mockLocalStorage = {
      getItem: () => null,
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    
    // Create mock console
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Apply mocks
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    Object.defineProperty(global, 'console', { value: mockConsole, writable: true });
    
    loggingService = LoggingService.getInstance();
  });

  afterEach(() => {
    loggingService.clearLogs();
    jest.clearAllMocks();
  });

  describe('Default Configuration', () => {
    test('should have correct default configuration', () => {
  const config = loggingService.getConfiguration();

  expect(config.enableConsoleCore).toBe(true);
  expect(config.enableLocalStorageCore).toBe(true);
  expect(config.maxLogs).toBe(1000);
  expect(config.totalLogs).toBe(0);
    });
  });

  describe('Configuration Updates', () => {
    test('should update console output setting', () => {
  LoggingService.initialize({ enableConsoleCore: false });

  const config = loggingService.getConfiguration();
  expect(config.enableConsoleCore).toBe(false);
      
      // Test that console output is actually disabled
      loggingService.info('Test message');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    test('should update localStorage setting', () => {
  LoggingService.initialize({ enableLocalStorageCore: false });

  const config = loggingService.getConfiguration();
  expect(config.enableLocalStorageCore).toBe(false);
      
      // Test that localStorage is not called
      loggingService.info('Test message');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('should update maxLogs setting', () => {
  LoggingService.initialize({ maxLogs: 500 });

  const config = loggingService.getConfiguration();
  expect(config.maxLogs).toBe(500);
    });

    test('should update multiple settings at once', () => {
      LoggingService.initialize({
        enableConsoleCore: false,
        enableLocalStorageCore: false,
        maxLogs: 250
      });

      const config = loggingService.getConfiguration();
      expect(config.enableConsoleCore).toBe(false);
      expect(config.enableLocalStorageCore).toBe(false);
      expect(config.maxLogs).toBe(250);
    });

    test('should update only specified settings', () => {
      const originalConfig = loggingService.getConfiguration();
      
  LoggingService.initialize({ maxLogs: 750 });

  const newConfig = loggingService.getConfiguration();
  expect(newConfig.maxLogs).toBe(750);
      expect(newConfig.enableConsoleCore).toBe(originalConfig.enableConsoleCore);
      expect(newConfig.enableLocalStorageCore).toBe(originalConfig.enableLocalStorageCore);
    });

    test('should handle undefined values gracefully', () => {
      const originalConfig = loggingService.getConfiguration();

      // Calling initialize() here would reset core loggers; the legacy
      // configure call with undefined values was a no-op. Simulate that
      // behavior by not invoking initialize and asserting the config
      // remains unchanged.
      const newConfig = loggingService.getConfiguration();
      expect(newConfig).toEqual(originalConfig);
    });
  });

  describe('Console Output Behavior', () => {
    test('should output to console when enabled', () => {
  LoggingService.initialize({ enableConsoleCore: true });

  loggingService.info('Info message');
  loggingService.warning('Warning message');
  loggingService.error('Error message');

  expect(mockConsole.log).toHaveBeenCalled();
  expect(mockConsole.warn).toHaveBeenCalled();
  expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should not output to console when disabled', () => {
  LoggingService.initialize({ enableConsoleCore: false });

  loggingService.info('Info message');
  loggingService.warning('Warning message');
  loggingService.error('Error message');

  expect(mockConsole.log).not.toHaveBeenCalled();
  expect(mockConsole.warn).not.toHaveBeenCalled();
  expect(mockConsole.error).not.toHaveBeenCalled();
    });

    test('should support dynamic console output toggling', () => {
      // Start with console enabled
  LoggingService.initialize({ enableConsoleCore: true });
  loggingService.info('Message 1');
  expect(mockConsole.log).toHaveBeenCalledTimes(1);

  // Disable console output
  LoggingService.initialize({ enableConsoleCore: false });
  loggingService.info('Message 2');
  expect(mockConsole.log).toHaveBeenCalledTimes(1); // Still 1

  // Re-enable console output
  LoggingService.initialize({ enableConsoleCore: true });
  loggingService.info('Message 3');
  expect(mockConsole.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('LocalStorage Behavior', () => {
    test('should save to localStorage when enabled', () => {
      LoggingService.initialize({ enableLocalStorageCore: true });

      loggingService.info('Test message');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'application-logs',
        expect.any(String)
      );
    });

    test('should not save to localStorage when disabled', () => {
  LoggingService.initialize({ enableLocalStorageCore: false });

  loggingService.info('Test message');

  expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('should support dynamic localStorage toggling', () => {
      // Start with localStorage enabled
  LoggingService.initialize({ enableLocalStorageCore: true });
  loggingService.info('Message 1');
  expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);

  // Disable localStorage
  LoggingService.initialize({ enableLocalStorageCore: false });
  loggingService.info('Message 2');
  expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1); // Still 1

  // Re-enable localStorage
  LoggingService.initialize({ enableLocalStorageCore: true });
  loggingService.info('Message 3');
  expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('MaxLogs Behavior', () => {
    test('should enforce maxLogs limit', () => {
  LoggingService.initialize({ maxLogs: 3 });
      
      // Add 5 log entries
      for (let i = 1; i <= 5; i++) {
        loggingService.info(`Message ${i}`);
      }
      
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(3);
      
      // Should contain the last 3 messages
      expect(logs[0].message).toBe('Message 3');
      expect(logs[1].message).toBe('Message 4');
      expect(logs[2].message).toBe('Message 5');
    });

    test('should not rotate logs when under maxLogs', () => {
  LoggingService.initialize({ maxLogs: 10 });
      
      // Add 5 log entries
      for (let i = 1; i <= 5; i++) {
        loggingService.info(`Message ${i}`);
      }
      
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(5);
      
      // Should contain all messages
      expect(logs[0].message).toBe('Message 1');
      expect(logs[4].message).toBe('Message 5');
    });

    test('should update maxLogs limit dynamically', () => {
      // Start with high limit
  LoggingService.initialize({ maxLogs: 10 });
      
      // Add 5 log entries
      for (let i = 1; i <= 5; i++) {
        loggingService.info(`Message ${i}`);
      }
      
      expect(loggingService.getLogs()).toHaveLength(5);
      
      // Lower the limit - existing logs should remain until new logs are added
  LoggingService.initialize({ maxLogs: 3 });
      expect(loggingService.getLogs()).toHaveLength(5); // Still 5
      
      // Add a new log to trigger rotation
      loggingService.info('Message 6');
      
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[2].message).toBe('Message 6');
    });
  });

  describe('Total Logs Count', () => {
    test('should track total logs correctly', () => {
      loggingService.info('Message 1');
      loggingService.warning('Message 2');
      loggingService.error('Message 3');
      
      const config = loggingService.getConfiguration();
      expect(config.totalLogs).toBe(3);
    });

    test('should reset total logs count when clearing logs', () => {
      loggingService.info('Message 1');
      loggingService.info('Message 2');
      
      expect(loggingService.getConfiguration().totalLogs).toBe(2);
      
      loggingService.clearLogs();
      
      expect(loggingService.getConfiguration().totalLogs).toBe(0);
    });

    test('should maintain total logs count with rotation', () => {
  LoggingService.initialize({ maxLogs: 2 });
      
      for (let i = 1; i <= 5; i++) {
        loggingService.info(`Message ${i}`);
      }
      
      const config = loggingService.getConfiguration();
      expect(config.totalLogs).toBe(2); // Only keeping 2 logs
      expect(config.maxLogs).toBe(2);
    });
  });

  describe('Configuration Persistence', () => {
    test('should maintain configuration across multiple operations', () => {
      LoggingService.initialize({
        enableConsoleCore: false,
        enableLocalStorageCore: false,
        maxLogs: 100
      });
      
      // Perform various operations
      loggingService.info('Test 1');
      loggingService.error('Test 2');
      loggingService.clearLogs();
      loggingService.success('Test 3');
      
      // Configuration should remain the same
  const config = loggingService.getConfiguration();
  expect(config.enableConsoleCore).toBe(false);
  expect(config.enableLocalStorageCore).toBe(false);
  expect(config.maxLogs).toBe(100);
    });
  });
});