import { ICoreLogger } from '.';
import type { ILogEntry } from '.';
import { LogLevel } from '../enums';

export interface IAdvancedLogger extends ICoreLogger {
  getLogs(level?: LogLevel): ILogEntry[];
  clearLogs(): void;
  // add a raw entry (used when restoring from storage)
  addEntry(entry: ILogEntry): void;
}
