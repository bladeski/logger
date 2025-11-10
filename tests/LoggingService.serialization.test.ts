/**
 * Unit tests for LoggingService Serialization
 * 
 * Tests the safe serialization functionality for different data types
 */

import { LoggingService } from '../src/LoggingService';

describe('LoggingService - Safe Serialization', () => {
  let loggingService: LoggingService;

  beforeEach(() => {
    // Reset singleton
    (LoggingService as any).instance = undefined;
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
      writable: true
    });

  loggingService = LoggingService.getInstance();
  LoggingService.initialize({ enableConsoleCore: false, enableLocalStorageCore: false });
  });

  afterEach(() => {
    loggingService.clearLogs();
  });

  test('should serialize Error objects correctly', () => {
    const error = new Error('Test error message');
    error.stack = 'Error: Test error message\n    at Object.<anonymous>';
    
    loggingService.error('Error test', { error });
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.error).toMatchObject({
      name: 'Error',
      message: 'Test error message',
      stack: expect.stringContaining('Test error message')
    });
  });

  test('should serialize Date objects with type information', () => {
    const testDate = new Date('2023-12-25T10:30:00Z');
    
    loggingService.info('Date test', { timestamp: testDate });
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.timestamp).toMatchObject({
      __type: 'Date',
      value: '2023-12-25T10:30:00.000Z'
    });
  });

  test('should serialize RegExp objects with type information', () => {
    const pattern = /test\d+/gi;
    
    loggingService.info('Regex test', { pattern });
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.pattern).toMatchObject({
      __type: 'RegExp',
      value: '/test\\d+/gi'
    });
  });

  test('should serialize Map objects correctly', () => {
    const map = new Map<any, any>([
      ['key1', 'value1'],
      ['key2', { nested: 'object' }],
      [42, 'number key']
    ] as any);
    
    loggingService.info('Map test', { data: map });
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.data).toMatchObject({
      __type: 'Map',
      value: [
        ['key1', 'value1'],
        ['key2', { nested: 'object' }],
        [42, 'number key']
      ]
    });
  });

  test('should serialize Set objects correctly', () => {
    const set = new Set(['value1', 'value2', { nested: 'object' }]);
    
    loggingService.info('Set test', { data: set });
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.data).toMatchObject({
      __type: 'Set',
      value: ['value1', 'value2', { nested: 'object' }]
    });
  });

  test('should handle circular references safely', () => {
    const circular: any = { name: 'parent' };
    circular.self = circular;
    circular.child = { parent: circular };
    
    expect(() => {
      loggingService.warning('Circular reference test', { circular });
    }).not.toThrow();
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].data).toBeDefined();
  });

  test('should serialize nested complex objects', () => {
    const complexData = {
      error: new Error('Nested error'),
      timestamp: new Date('2023-01-01T00:00:00Z'),
      patterns: [/test/g, /another/i],
  metadata: new Map<string, any>([['version', '1.0'], ['debug', true]] as any),
      tags: new Set(['urgent', 'api', 'error'])
    };
    
    loggingService.error('Complex data test', complexData);
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.error).toMatchObject({
      name: 'Error',
      message: 'Nested error'
    });
    
    expect(logData.timestamp).toMatchObject({
      __type: 'Date',
      value: '2023-01-01T00:00:00.000Z'
    });
    
    expect(Array.isArray(logData.patterns)).toBe(true);
    expect(logData.metadata).toMatchObject({
      __type: 'Map'
    });
    
    expect(logData.tags).toMatchObject({
      __type: 'Set'
    });
  });

  test('should handle primitive values without modification', () => {
    const primitiveData = {
      string: 'hello',
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined
    };
    
    loggingService.info('Primitive test', primitiveData);
    
    const logs = loggingService.getLogs();
    const logData = logs[0].data as any;
    
    expect(logData.string).toBe('hello');
    expect(logData.number).toBe(42);
    expect(logData.boolean).toBe(true);
    expect(logData.null).toBe(null);
    expect(logData.undefined).toBeUndefined();
  });

  test('should handle functions by converting to string', () => {
    const dataWithFunction = {
      fn: function testFunction() { return 'test'; },
      arrow: () => 'arrow function'
    };
    
    expect(() => {
      loggingService.info('Function test', dataWithFunction);
    }).not.toThrow();
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(1);
  });

  test('should handle very deep object nesting', () => {
    const deep: any = { level: 1 };
    let current = deep;
    
    // Create a deep nested structure
    for (let i = 2; i <= 10; i++) {
      current.next = { level: i };
      current = current.next;
    }
    
    expect(() => {
      loggingService.info('Deep nesting test', { deep });
    }).not.toThrow();
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].data).toBeDefined();
  });

  test('should handle serialization fallback for problematic objects', () => {
    // Create an object that will cause JSON.stringify to throw
    const problematicObject = {
      get circular() {
        return this;
      }
    };
    
    // Force a serialization error by making the object non-serializable
    Object.defineProperty(problematicObject, 'toString', {
      value: function() {
        throw new Error('Cannot convert to string');
      }
    });
    
    expect(() => {
      loggingService.warning('Problematic object test', { obj: problematicObject });
    }).not.toThrow();
    
    const logs = loggingService.getLogs();
    expect(logs).toHaveLength(1);
  });
});