import type { ICoreLogger } from '.';

export interface ILoggingConfigurationOptions {
  applicationName?: string;
  // If true, enable the ConsoleCoreLogger
  enableConsoleCore?: boolean;
  // If true, enable the LocalStorageCoreLogger
  enableLocalStorageCore?: boolean;
  // Provide custom core loggers to register
  customCoreLoggers?: ICoreLogger[];
  maxLogs?: number;
}
