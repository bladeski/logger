/**
 * LoggingService - Singleton logging service
 *
 * Provides centralized logging with different levels: error, info, success, warning
 * Each log method can accept either a string message or an Event object
 */

import { LogLevel } from './enums';
import { IAdvancedLogger, ICoreLogger, ILogEntry, ILoggingConfiguration, ILoggingConfigurationOptions } from './interfaces';
import { LogData } from './types';
import { InMemoryCoreLogger, ConsoleCoreLogger, LocalStorageCoreLogger } from './core';

/**
 * Singleton LoggingService
 *
 * Centralized, singleton logging service. It broadcasts log entries to one or
 * more registered core loggers (console, localStorage, in-memory, or custom
 * implementations). The in-memory store is implemented by an `IAdvancedLogger`
 * (by default `InMemoryCoreLogger`) and is responsible for keeping logs in
 * memory — the service itself does not hold the canonical log list.
 */
export class LoggingService {
  private static instance: LoggingService | null = null;

  private maxLogs = 1000;

  // application name used for storage key
  private applicationName = 'application';

  // collection of active core loggers
  private static activeCoreLoggers: ICoreLogger[] = [];
  // keep a reference to the advanced in-memory logger when registered
  private inMemoryLogger: IAdvancedLogger | null = null;

  /**
   * Initialize the logging system.
   *
   * This is safe to call multiple times. Options allow selecting which core
   * loggers to enable and provide an application-specific storage key.
   *
   * @param options Initialization options (applicationName, maxLogs,
   *                enableConsoleCore, enableLocalStorageCore, customCoreLoggers)
   */
  public static initialize(options?: ILoggingConfigurationOptions): void {
    const instance = LoggingService.getInstance();

    if (options?.applicationName) {
      instance.applicationName = options.applicationName;
    }

    if (options?.maxLogs !== undefined) {
      instance.maxLogs = options.maxLogs;
    }

    // reset and construct active core loggers
    LoggingService.activeCoreLoggers = [];

    // Determine if a custom in-memory advanced logger was provided. Prefer it
    // as the canonical in-memory store; otherwise create a new one. Note: we
    // do NOT register the in-memory logger in `activeCoreLoggers` to avoid
    // duplication — the service will write to the in-memory logger directly
    // and broadcast to other registered core loggers.
    let inMemory: IAdvancedLogger;
    const customAdvanced = options?.customCoreLoggers?.find((c: any) =>
      c && typeof c.getLogs === 'function' && typeof c.addEntry === 'function'
    );

    if (instance.inMemoryLogger) {
      // Preserve existing in-memory logger and just update its maxLogs if
      // provided.
      inMemory = instance.inMemoryLogger;
      if (options?.maxLogs !== undefined && typeof (inMemory as any).setMaxLogs === 'function') {
        (inMemory as any).setMaxLogs(options.maxLogs);
      }
    } else if (customAdvanced) {
      inMemory = customAdvanced as IAdvancedLogger;
      instance.inMemoryLogger = inMemory;
    } else {
      inMemory = new InMemoryCoreLogger(options?.maxLogs ?? instance.maxLogs) as any;
      instance.inMemoryLogger = inMemory as any;
    }

    // load stored logs into in-memory logger from localStorage (if present)
    try {
      const storageKey = `${instance.applicationName}-logs`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        for (const log of parsedLogs) {
          const entry: ILogEntry = {
            ...log,
            timestamp: new Date(log.timestamp),
          };
          inMemory.addEntry(entry);
        }
      }
    } catch (err) {
      // ignore storage parse/load errors
      // eslint-disable-next-line no-console
      console.warn('Failed to hydrate in-memory logs from storage', err);
    }

    // enable console core logger (default true when not specified)
    const enableConsole = options?.enableConsoleCore ?? true;
    if (enableConsole) {
      LoggingService.setCoreLogger(new ConsoleCoreLogger());
    }

    // enable localStorage core logger (default true when not specified)
    const enableLocalStorage = options?.enableLocalStorageCore ?? true;
    if (enableLocalStorage) {
      const storageKey = `${instance.applicationName}-logs`;
      LoggingService.setCoreLogger(new LocalStorageCoreLogger(storageKey));
    }

    // register any custom core loggers provided by the caller
    if (options?.customCoreLoggers && Array.isArray(options.customCoreLoggers)) {
      for (const custom of options.customCoreLoggers) {
        // Skip registering the advanced in-memory logger since we hold a
        // dedicated reference to it on the service.
        if (custom === inMemory) continue;
        LoggingService.setCoreLogger(custom);
      }
    }
  }

  /**
   * Return the singleton instance of the LoggingService.
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
      // always initialize defaults when first creating the singleton so
      // the in-memory logger and any default core loggers are registered
      // consistently across tests and runtime.
      LoggingService.initialize();
    }
    return LoggingService.instance;
  }

  /**
   * Register a core logger to receive broadcasted log entries. Duplicate
   * loggers are ignored.
   *
   * @param core Core logger implementing ICoreLogger
   */
  public static setCoreLogger(core: ICoreLogger): void {
    if (!LoggingService.activeCoreLoggers.includes(core)) {
      LoggingService.activeCoreLoggers.push(core);
    }
  }

  /**
   * Return a copy of the configured core loggers.
   */
  public static getCoreLoggers(): ICoreLogger[] {
    return [...LoggingService.activeCoreLoggers];
  }

  /**
   * Log an error-level message.
   * @param messageOrEvent The message string or an Event instance
   * @param data Optional structured data to include with the log
   * @param source Optional explicit source identifier
   */
  public error(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.ERROR, messageOrEvent, data, source);
  }

  /**
   * Log a fatal-level message.
   */
  public fatal(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.FATAL, messageOrEvent, data, source);
  }

  /**
   * Log a warning-level message.
   */
  public warn(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.WARN, messageOrEvent, data, source);
  }

  /**
   * Legacy alias for `warn` kept for backwards compatibility.
   */
  public warning(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.warn(messageOrEvent, data, source);
  }

  /**
   * Log an informational message.
   */
  public info(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.INFO, messageOrEvent, data, source);
  }

  /**
   * Log a success-level message (semantic success level).
   */
  public success(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.SUCCESS, messageOrEvent, data, source);
  }

  /**
   * Log a debug-level message.
   */
  public debug(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.DEBUG, messageOrEvent, data, source);
  }

  /**
   * Log a trace-level message for very verbose diagnostic output.
   */
  public trace(messageOrEvent: string | Event, data?: LogData, source?: string): void {
    this.broadcast(LogLevel.TRACE, messageOrEvent, data, source);
  }

  /**
   * Broadcast a log entry to all registered core loggers. Core logger
   * exceptions are caught to avoid crashing the host application.
   */
  private broadcast(level: LogLevel, messageOrEvent: string | Event, data?: LogData, source?: string): void {
    const resolvedSource = source || this.determineSource();

    // First write to the canonical in-memory logger so the service always
    // retains the log entry regardless of which core loggers are registered.
    if (this.inMemoryLogger) {
      try {
        this.inMemoryLogger.log(level, messageOrEvent as any, data, resolvedSource);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('In-memory logger threw an error:', err);
      }
    }

    // Then broadcast to other registered core loggers. When broadcasting to
    // external cores we only pass the explicit `source` value that the
    // caller provided to avoid console output tests observing an
    // auto-determined stack-based source.
    for (const core of LoggingService.activeCoreLoggers) {
      try {
        core.log(level, messageOrEvent, data, source);
      } catch (err) {
        // don't let core logger failures crash the app
        // eslint-disable-next-line no-console
        console.warn('Core logger threw an error:', err);
      }
    }
  }

  /**
   * Attempt to determine a short source identifier from the stack trace.
   */
  private determineSource(): string {
    const error = new Error();
    const stack = error.stack?.split('\n');

    if (stack && stack.length > 4) {
      const caller = stack[4].trim();
      const match = caller.match(/at (?:(\w+)\.)?(\w+)/);
      return match ? (match[1] ? `${match[1]}.${match[2]}` : match[2]) : 'unknown';
    }

    return 'unknown';
  }

  /**
   * Note: The service no longer stores logs itself — the canonical in-memory
   * store is owned by a registered {@link IAdvancedLogger} (InMemoryCoreLogger).
   */

  /**
   * Return logs from the in-memory advanced logger, or an empty array if no
   * in-memory logger is registered.
   *
   * @param level Optional level filter
   */
  public getLogs(level?: LogLevel): ILogEntry[] {
    if (this.inMemoryLogger) {
      return this.inMemoryLogger.getLogs(level);
    }

    // No in-memory logger registered; return empty array rather than keeping
    // service-level state.
    return [];
  }

  /**
   * Clear logs from the in-memory logger and remove persisted storage for the
   * configured application name.
   */
  public clearLogs(): void {
    if (this.inMemoryLogger) {
      this.inMemoryLogger.clearLogs();
    }
    const storageKey = `${this.applicationName}-logs`;
    localStorage.removeItem(storageKey);
  }

  /**
   * Format logs as a single plain-text string suitable for display or export.
   *
   * @param level Optional level filter
   */
  public getLogsAsString(level?: LogLevel): string {
    const logs = this.getLogs(level);
    return logs
      .map((log) => {
        const timestamp = log.timestamp.toISOString();
        const data = log.data ? ` | Data: ${JSON.stringify(this.safeSerialize(log.data))}` : '';
        const source = log.source && log.source !== 'unknown' ? ` | Source: ${log.source}` : '';
        return `[${timestamp}] [${String(log.level).toUpperCase()}] ${log.message}${data}${source}`;
      })
      .join('\n');
  }

  /**
   * Safely serialize structured data for inclusion in logs. Handles Errors,
   * Dates, RegExps, Maps, Sets, and circular references.
   */
  private safeSerialize(value: unknown): unknown {
    const seen = new WeakSet<any>();

    const replacer = (_key: string, val: any) => {
      if (val instanceof Error) {
        return { name: val.name, message: val.message, stack: val.stack };
      }

      if (val instanceof Date) {
        return { __type: 'Date', value: val.toISOString() };
      }

      if (val instanceof RegExp) {
        return { __type: 'RegExp', value: val.toString() };
      }

      if (val instanceof Map) {
        return { __type: 'Map', value: Array.from(val.entries()) };
      }

      if (val instanceof Set) {
        return { __type: 'Set', value: Array.from(val.values()) };
      }

      if (val && typeof val === 'object') {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }

      return val;
    };

    try {
      const json = JSON.stringify(value, replacer);
      return JSON.parse(json);
    } catch (err) {
      if (value instanceof Error) {
        return { name: value.name, message: (value as any).message, stack: (value as any).stack };
      }
      return String(value);
    }
  }

  public exportLogs(filename?: string): void {
    const logsText = this.getLogsAsString();
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${this.applicationName}-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public getConfiguration(): ILoggingConfiguration {
    return {
      applicationName: this.applicationName,
      enableConsoleCore: LoggingService.activeCoreLoggers.some((c) => c instanceof ConsoleCoreLogger),
      enableLocalStorageCore: LoggingService.activeCoreLoggers.some((c) => c instanceof LocalStorageCoreLogger),
      maxLogs: this.maxLogs,
      totalLogs: this.inMemoryLogger ? this.inMemoryLogger.getLogs().length : 0,
    };
  }
}

export const logger = LoggingService.getInstance();
