import { ConsoleCoreLogger } from '../src/core';
import { LogLevel } from '../src/enums';

describe('ConsoleCoreLogger', () => {
  let logger: ConsoleCoreLogger;
  const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as any;

  beforeEach(() => {
    logger = new ConsoleCoreLogger();
    Object.defineProperty(console, 'log', { value: mockConsole.log });
    Object.defineProperty(console, 'error', { value: mockConsole.error });
    Object.defineProperty(console, 'warn', { value: mockConsole.warn });
    Object.defineProperty(console, 'info', { value: mockConsole.info });
    Object.defineProperty(console, 'debug', { value: mockConsole.debug });
    Object.defineProperty(console, 'trace', { value: mockConsole.trace });
    jest.clearAllMocks();
  });

  it('logs info using console.info', () => {
    logger.log(LogLevel.INFO, 'Info test');
    expect(mockConsole.info).toHaveBeenCalled();
  });

  it('logs error using console.error', () => {
    logger.log(LogLevel.ERROR, 'Error test');
    expect(mockConsole.error).toHaveBeenCalled();
  });

  it('logs success with styling via console.log', () => {
    logger.log(LogLevel.SUCCESS, 'Success test');
    expect(mockConsole.log).toHaveBeenCalled();
  });
});
