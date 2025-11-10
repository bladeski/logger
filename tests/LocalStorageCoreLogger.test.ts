import { LocalStorageCoreLogger } from '../src/core';
import { LogLevel } from '../src/enums';

describe('LocalStorageCoreLogger', () => {
  let logger: LocalStorageCoreLogger;
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((k: string) => store[k] || null),
      setItem: jest.fn((k: string, v: string) => { store[k] = v; }),
      removeItem: jest.fn((k: string) => { delete store[k]; }),
      clear: jest.fn(() => { store = {}; }),
    };
  })();

  beforeEach(() => {
    logger = new LocalStorageCoreLogger('test-logs', 10);
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    jest.clearAllMocks();
  });

  it('saves logs to localStorage', () => {
    logger.log(LogLevel.INFO, 'hello');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-logs', expect.any(String));
  });

  it('trims saved logs to maxStored', () => {
    for (let i = 0; i < 15; i++) {
      logger.log(LogLevel.INFO, `m${i}`);
    }
    const raw = (mockLocalStorage.setItem as jest.Mock).mock.calls.pop()?.[1];
    const arr = raw ? JSON.parse(raw) : [];
    expect(arr.length).toBeLessThanOrEqual(10);
  });
});
