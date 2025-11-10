import { ICoreLogger } from '../interfaces';
import { IAdvancedLogger } from '../interfaces';
import { LogLevel } from '../enums';
import type { LogData } from '../types';
import type { ILogEntry } from '../interfaces';

/**
 * InMemoryCoreLogger - stores logs in memory and exposes advanced operations
 * (get, clear, addEntry). This is the canonical in-memory store when used
 * by LoggingService.
 */
export class InMemoryCoreLogger implements ICoreLogger, IAdvancedLogger {
  private logs: ILogEntry[] = [];
  private maxLogs: number;

  constructor(maxLogs = 1000) {
    this.maxLogs = maxLogs;
  }

  /**
   * Update the maximum number of logs to retain for future entries.
   * Does not trim existing logs immediately; trimming happens when new
   * entries are added to mimic previous service behavior.
   */
  public setMaxLogs(max: number): void {
    this.maxLogs = max;
  }

  public log(level: LogLevel, messageOrEvent: string | Event, data?: LogData, source?: string): void {
    // Build entry, extracting useful information from Events similar to the
    // original LoggingService behavior.
    const msg = this.extractMessage(messageOrEvent);
    const eventData = this.extractEventData(messageOrEvent, data);

    const entry: ILogEntry = {
      timestamp: new Date(),
      level,
      message: msg,
      data: eventData,
      source,
    };

    try {
      this.addEntry(entry);
    } catch (err) {
      // Swallow errors from handler to avoid breaking logging pipeline
      // eslint-disable-next-line no-console
      console.warn('InMemoryCoreLogger error while adding entry:', err);
    }
  }

  public addEntry(entry: ILogEntry): void {
    // Ensure stored data is safely serialized to a JSON-friendly shape so
    // consumers/tests see predictable structures (Dates, RegExps, Maps, Sets,
    // Errors, circular refs handled).
    const serializedData = entry.data ? this.safeSerialize(entry.data) : undefined;
    const stored = { ...entry, data: serializedData } as ILogEntry;

    this.logs.push(stored);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  public getLogs(level?: LogLevel): ILogEntry[] {
    if (level) {
      return this.logs.filter((l) => l.level === level).map((l) => ({ ...l }));
    }
    return this.logs.map((l) => ({ ...l }));
  }

  public clearLogs(): void {
    this.logs = [];
  }

  private safeSerialize(value: unknown): unknown {
    // Advanced serializer to preserve Date/RegExp/Map/Set/Error shapes
    const seen = new WeakSet<any>();

    const serializer = (val: any): any => {
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
        return { __type: 'Map', value: Array.from(val.entries()).map(([k, v]) => [k, serializer(v)]) };
      }
      if (val instanceof Set) {
        return { __type: 'Set', value: Array.from(val.values()).map((v) => serializer(v)) };
      }
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
        const out: any = Array.isArray(val) ? [] : {};
        for (const key of Object.keys(val)) {
          out[key] = serializer((val as any)[key]);
        }
        return out;
      }
      return val;
    };

    try {
      return serializer(value);
    } catch (err) {
      return String(value);
    }
  }

  private extractMessage(messageOrEvent: string | Event): string {
    if (typeof messageOrEvent === 'string') {
      return messageOrEvent;
    }

    if (messageOrEvent instanceof ErrorEvent) {
      return `${messageOrEvent.message} (${messageOrEvent.filename}:${messageOrEvent.lineno})`;
    }

    if (messageOrEvent instanceof Event) {
      return `${messageOrEvent.type} event on ${messageOrEvent.target?.constructor.name || 'unknown target'}`;
    }

    return 'Unknown event';
  }

  private extractEventData(messageOrEvent: string | Event, additionalData?: LogData): LogData | undefined {
    let eventData: Record<string, unknown> = {};

    if (messageOrEvent instanceof ErrorEvent) {
      eventData = {
        filename: messageOrEvent.filename,
        lineno: messageOrEvent.lineno,
        colno: messageOrEvent.colno,
        error: messageOrEvent.error?.stack || messageOrEvent.error,
      };
    } else if (messageOrEvent instanceof Event) {
      eventData = {
        type: messageOrEvent.type,
        target: messageOrEvent.target?.constructor.name,
        timeStamp: messageOrEvent.timeStamp,
      };

      // Only check for Request if the global Request exists in the environment
      // Accept both real Request instances and plain objects that look like
      // requests (tests often use simple objects cast to Request).
      const possibleReq = (messageOrEvent as any)?.request;
      if (possibleReq && (possibleReq.url !== undefined || possibleReq.method !== undefined)) {
        eventData.url = possibleReq.url;
        eventData.method = possibleReq.method;
      }
    }

    if (additionalData !== undefined) {
      if (typeof additionalData === 'object' && additionalData !== null) {
        eventData = { ...eventData, ...additionalData };
      } else {
        (eventData as any).additionalData = additionalData;
      }
    }

    return Object.keys(eventData).length > 0 ? (eventData as LogData) : undefined;
  }
}
