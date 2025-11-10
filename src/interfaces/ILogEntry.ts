import { LogLevel } from '../enums';
import type { LogData } from '../types';

export interface ILogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: LogData;
  source?: string;
}
