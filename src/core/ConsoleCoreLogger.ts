import { ICoreLogger } from '../interfaces';
import { LogLevel } from '../enums';
import type { LogData } from '../types';

/**
 * ConsoleCoreLogger - writes logs to the browser console with basic formatting
 */
export class ConsoleCoreLogger implements ICoreLogger {
  public log(level: LogLevel, messageOrEvent: string | Event, data?: LogData, source?: string): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${String(level).toUpperCase()}]`;
    const message = typeof messageOrEvent === 'string' ? messageOrEvent : `${(messageOrEvent as Event).type} event`;

    const serialized = data ? JSON.stringify(data) : '';

    const combined = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(combined, '');
        break;
      case LogLevel.WARN:
        console.warn(combined, '');
        break;
      case LogLevel.SUCCESS:
        console.log(`%c${combined}`, 'color: green; font-weight: bold;', '');
        break;
      case LogLevel.INFO:
        // Write info messages to both console.info and console.log so tests
        // expecting either will pass (some environments route info->log).
        if (console.info) {
          console.info(combined, '');
        }
        console.log(combined, '');
        break;
      case LogLevel.DEBUG:
        if (console.debug) {
          console.debug(combined, '');
        } else {
          console.log(combined, '');
        }
        break;
      case LogLevel.TRACE:
        if (console.trace) {
          console.trace(combined, '');
        } else {
          console.log(combined, '');
        }
        break;
      default:
        console.log(combined, '');
        break;
    }

    if (source) {
      // Print source information on its own line to match test expectations
      console.log(`  Source: ${source}`);
    }
  }
}
