import { ICoreLogger } from '../interfaces';
import { LogLevel } from '../enums';
import type { LogData } from '../types';
import type { ILogEntry } from '../interfaces';

/**
 * LocalStorageCoreLogger - appends logs to localStorage under a configurable key
 */
export class LocalStorageCoreLogger implements ICoreLogger {
  private storageKey: string;
  private maxStored: number;

  constructor(storageKey = 'application-logs', maxStored = 500) {
    this.storageKey = storageKey;
    this.maxStored = maxStored;
  }

  public log(level: LogLevel, messageOrEvent: string | Event, data?: LogData, source?: string): void {
    try {
      const entry: ILogEntry = {
        timestamp: new Date(),
        level,
        message: typeof messageOrEvent === 'string' ? messageOrEvent : `${(messageOrEvent as Event).type} event`,
        data,
        source,
      };

      const raw = localStorage.getItem(this.storageKey);
      const arr: any[] = raw ? JSON.parse(raw) : [];

      arr.push({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        data: data ? this.safeSerialize(data) : undefined,
      });

      // Keep only the last maxStored entries
      const trimmed = arr.slice(-this.maxStored);
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('LocalStorageCoreLogger failed to write log:', err);
    }
  }

  private safeSerialize(value: unknown): unknown {
    const seen = new WeakSet<any>();

    const serializer = (val: any): any => {
      if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
      if (val instanceof Date) return { __type: 'Date', value: val.toISOString() };
      if (val instanceof RegExp) return { __type: 'RegExp', value: val.toString() };
      if (val instanceof Map) return { __type: 'Map', value: Array.from(val.entries()).map(([k, v]) => [k, serializer(v)]) };
      if (val instanceof Set) return { __type: 'Set', value: Array.from(val.values()).map((v) => serializer(v)) };
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
        const out: any = Array.isArray(val) ? [] : {};
        for (const key of Object.keys(val)) out[key] = serializer((val as any)[key]);
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
}
