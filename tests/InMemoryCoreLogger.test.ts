import { InMemoryCoreLogger } from '../src/core';
import { LogLevel } from '../src/enums';

describe('InMemoryCoreLogger', () => {
  let logger: InMemoryCoreLogger;

  beforeEach(() => {
    logger = new InMemoryCoreLogger(5);
  });

  it('stores logs in memory and returns them via getLogs', () => {
    logger.log(LogLevel.INFO, 'one');
    logger.log(LogLevel.ERROR, 'two');
    const all = logger.getLogs();
    expect(all).toHaveLength(2);
    expect(all[0].message).toBe('one');
  });

  it('respects maxLogs limit and rotates', () => {
    for (let i = 0; i < 7; i++) {
      logger.log(LogLevel.INFO, `m${i}`);
    }
    const logs = logger.getLogs();
    expect(logs.length).toBe(5);
    expect(logs[0].message).toBe('m2');
  });

  it('can clear logs', () => {
    logger.log(LogLevel.INFO, 'x');
    expect(logger.getLogs()).toHaveLength(1);
    logger.clearLogs();
    expect(logger.getLogs()).toHaveLength(0);
  });
});
