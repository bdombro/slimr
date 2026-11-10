# Changelog

## UNRELEASED

## 0.2.0

### Added

- **Custom scalar SQLite functions**: Define custom functions via `options.functions` on open or dynamically via `db.registerFunction(name, fn, options)`. Functions support `deterministic`, `varargs`, `directOnly`, and `useBigIntArguments` options, automatically survive idle worker respawns, and are provided to isolated `readOnlyConnection` queries.
- **Named parameters**: Full support for bare object parameters (`{ id: 1 }`), colons (`{ ":id": 1 }`), dollars (`{ "$id": 1 }`), and `@` across `get`, `all`, `run`, `pluck`, `pluckAll`, `iterateLimited`, and `batch`.
- **`columns` metadata on `iterateLimited`**: Returns `{ columns, rows, truncated }` where `columns` contains column names from SQLite statement metadata even when 0 rows match.
- **`setupSql` and query-only enforcement on `iterateLimited`**: Execute preliminary DDL/DML such as temporary views (`CREATE TEMP VIEW ...`) before iterating; automatically applies `PRAGMA query_only = ON` on `readOnlyConnection: true` to prevent data modifications.
- **Transaction modes**: Support for `"IMMEDIATE" | "DEFERRED" | "EXCLUSIVE"` transaction modes via `db.transaction(fn, { mode })`.
- **Single-value pluck helpers**: Fast scalar value retrieval via `db.pluck()`, `db.pluckAll()`, `tx.pluck()`, `tx.pluckAll()`, and batch items with `mode: "pluck"` and `mode: "pluckAll"`.

## 0.1.1

### Fixed

- Use `process.getBuiltinModule` inside the inline worker so `eval: true` workers work inside `"type": "module"` packages where `require` is not defined.

## 0.1.0

### Added

- Initial release of `@slimr/sqlite`: async `node:sqlite` wrapper over a shared `worker_threads` worker with statement caching, WAL defaults, queued transactions, savepoints, batches, and idle worker hibernation.
