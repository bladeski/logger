import { LogLevel } from '../enums';
import type { LogData } from '../types';

export interface ICoreLogger {
  log(level: LogLevel, messageOrEvent: string | Event, data?: LogData, source?: string): void;
}