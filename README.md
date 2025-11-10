# Blades Logger

A small, pluggable TypeScript logging utility intended for browser and test environments. It provides a singleton `LoggingService` with multiple log levels, pluggable core loggers (console, localStorage, in-memory), and an easy way to add custom core loggers.

This README documents the public API, initialization options, migration notes (legacy `configure()`), and developer commands used in this repository.

## Highlights

- Log levels: TRACE, DEBUG, INFO, SUCCESS, WARN, ERROR, FATAL
- Singleton `LoggingService` with helper methods: `trace`, `debug`, `info`, `success`, `warn`/`warning`, `error`, `fatal`
- Pluggable core loggers:
  - `ConsoleCoreLogger` — formats logs for the console
  - `LocalStorageCoreLogger` — persists logs to `localStorage` under `{applicationName}-logs`
  - `InMemoryCoreLogger` — canonical in-memory store exposing `getLogs()`, `clearLogs()`, `addEntry()`
- Safe serialization for structured data (Error, Date, RegExp, Map, Set, and circular refs)
- Comprehensive unit tests (Jest + ts-jest)

---

## Install & run tests

Clone and install dev dependencies:

```powershell
git clone <repo-url>
cd blades-logger
npm install
```

Run the test suite:

```powershell
npm test
```

Build (TypeScript compile):

```powershell
npm run build
```

---

## Usage

Import the singleton or use the `LoggingService` directly:

```ts
import { logger, LoggingService } from './src/LoggingService';

// Simple logs
logger.info('App initialized');
logger.success('User created', { userId: 123 });
logger.error('Something broke', new Error('oops'));

// Use instance API
const svc = LoggingService.getInstance();
svc.warn('This is a warning');

// Read logs from the canonical in-memory store
const allLogs = svc.getLogs();
```

### Initialization and options

Configure core loggers and behavior via `LoggingService.initialize()`:

```ts
LoggingService.initialize({
  applicationName: 'my-app',   // used for localStorage key: 'my-app-logs'
  maxLogs: 2000,               // max logs retained in in-memory store (affects rotation)
  enableConsoleCore: true,     // whether ConsoleCoreLogger is registered
  enableLocalStorageCore: true,// whether LocalStorageCoreLogger is registered
  customCoreLoggers: [/* ICoreLogger instances */]
});
```

Notes:
- The canonical in-memory store is provided by an `IAdvancedLogger` (default: `InMemoryCoreLogger`). `LoggingService.getLogs()` and `clearLogs()` delegate to that logger.
- `initialize()` is idempotent and safe to call multiple times. If an existing in-memory logger is present it will preserve existing logs and only update the `maxLogs` value.

---

## API (short)

- LoggingService.getInstance(): LoggingService — return the singleton instance
- LoggingService.initialize(options): void — configure core loggers and behavior
- LoggingService.getCoreLoggers(): ICoreLogger[] — list currently registered core loggers
- logger (singleton): convenience methods: `trace/debug/info/success/warn/warning/error/fatal`
- logger.getLogs(level?): ILogEntry[] — retrieve logs from the in-memory store
- logger.clearLogs(): void — clear in-memory logs and remove persisted storage
- logger.exportLogs(filename?): void — export logs as a downloadable file

Core loggers implement `ICoreLogger` and may be registered via `initialize()` or programmatically via `LoggingService.setCoreLogger()`.

Types of interest:

- `ILogEntry` { timestamp: Date; level: LogLevel; message: string; data?: any; source?: string }
- `IAdvancedLogger` extends `ICoreLogger` with `getLogs()`, `clearLogs()`, `addEntry()`

---

## Migration notes — legacy `configure()` behavior

Older code or tests may call a `configure()` method with options named `enableConsoleOutput` and `enableLocalStorage`. A temporary compatibility shim exists inside `LoggingService` to map these legacy fields to the newer `initialize()` options (`enableConsoleCore`, `enableLocalStorageCore`). The shim is intended to ease migration and will be removed in a future major release. Please update code to call `initialize()` directly.

---

## Testing & Development

- Run tests:

```powershell
npm test
```

- Run tests in watch mode while developing:

```powershell
npm test -- --watch
```

- The project uses `ts-jest`. If you see warnings about `ts-jest` configuration in Jest, they are informational only and do not affect test results.

---

## Contributing

Contributions are welcome. Please run the test-suite locally before opening a PR. New features should include unit tests.

---

## License

MIT
