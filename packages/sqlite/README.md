# @slimr/sqlite

Fast, non-blocking SQLite for Node.js — built on Node's native `node:sqlite` with zero dependencies and zero native C++ builds.

## Why `@slimr/sqlite`?

Node 22.5+ ships a built-in SQLite module (`node:sqlite`), freeing you from `node-gyp` build failures and native binary mismatches. However, `node:sqlite` only exposes a synchronous API (`DatabaseSync`) that blocks the main event loop on disk I/O and heavy queries, and requires manual setup for production defaults.

`@slimr/sqlite` runs `node:sqlite` inside a managed background `worker_threads` worker and gives you a clean, ergonomic async API with all the batteries included:

- **Event-loop friendly**: Queries, batches, migrations, and backups run off-thread so your HTTP/MCP server or CLI stays responsive.
- **Zero idle footprint**: Multiple databases share a single background worker by default, which automatically hibernates after 30s of inactivity (`0 MB` idle worker RAM) and transparently respawns on the next query.
- **Configurable production defaults**: Automatically enables WAL mode, `busy_timeout = 5000`, `foreign_keys = ON`, `temp_store = MEMORY`, and prepared statement caching (all customizable or disableable via `options.pragmas`), while suppressing Node's noisy experimental SQLite warning.
- **TypeScript-first & clean row objects**: Generic query methods (`get<T>`, `all<T>`, `pluck<T>`, `iterateLimited<T>`) that normalize `node:sqlite`'s null-prototype rows into standard JS objects (`Object.prototype`) so `structuredClone`, deep equality assertions, and standard object helpers work out of the box.
- **Ergonomic developer experience**: Queued async transactions (with nested `SAVEPOINT`s), `PRAGMA user_version` migrations (supporting both incremental arrays and squashed baselines), scalar `pluck` / `pluckAll` helpers, bare named parameters (`{ id: 1 }`), and custom JS functions that survive worker hibernation.

## Installation

```bash
bun add @slimr/sqlite
# or
npm install @slimr/sqlite
```

> Requires **Node.js >= 22.5.0** (uses the built-in `node:sqlite` module).

## Quick Start

```ts
import { openSqlite } from "@slimr/sqlite";

const db = openSqlite("./data/app.db", {
  migrations: [
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );`,
  ],
});

// Insert with positional or named parameters
const { lastInsertRowid } = await db.run(
  "INSERT INTO users (name, email) VALUES (:name, :email);",
  { name: "Alice", email: "alice@example.com" }
);

// Query a single typed row
const user = await db.get<{ id: number; name: string; email: string }>(
  "SELECT * FROM users WHERE id = ?;",
  [lastInsertRowid]
);

// Query multiple rows
const allUsers = await db.all<{ id: number; name: string }>(
  "SELECT id, name FROM users ORDER BY name ASC;"
);

// Pluck scalar values directly (first column of first row / all rows)
const count = await db.pluck<number>("SELECT count(*) FROM users;");
const emails = await db.pluckAll<string>("SELECT email FROM users ORDER BY id ASC;");

await db.close();
```

## Configuration (`SqliteOptions`)

Pass options as the second argument to `openSqlite(path, options)`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `readOnly` | `boolean` | `false` | Opens the database in read-only mode (skips write pragmas and migrations). |
| `pragmas` | `string \| false` | WAL + safe defaults | Custom pragma SQL executed after the defaults (can override any default pragma), or `false` to disable all default pragmas. |
| `migrations` | `Record<number, string> \| readonly string[]` | `undefined` | Schema migrations tracked via `PRAGMA user_version` and run atomically on open. |
| `init` | `(tx: SqliteTx) => Promise<void> \| void` | `undefined` | Async initialization callback executed once inside a transaction before any user queries run. |
| `functions` | `Record<string, SqliteFunctionDef \| SqliteFunctionHandler>` | `undefined` | Custom scalar JS functions registered in SQLite (survive worker hibernation and respawn). |
| `readBigInts` | `boolean` | `false` | Return `INTEGER` columns as `bigint` instead of `number` by default (can also be overridden per query). |
| `dedicated` | `boolean` | `false` | Spawn a dedicated `worker_threads` worker for this database instead of sharing the process-wide worker. |
| `idleTimeoutMs` | `number` | `30000` | Milliseconds of inactivity before the worker thread hibernates (`0` disables idle hibernation). Never hibernates while a `:memory:` DB is open. |

### Default Pragmas

When `readOnly` is `false` and `pragmas !== false`, `@slimr/sqlite` automatically applies:

```sql
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
-- Plus, for file databases (path !== ":memory:"):
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

To override specific pragmas or add more (e.g. `cache_size` or disabling `foreign_keys`), pass a SQL string in `pragmas`. To disable default pragmas completely, pass `pragmas: false`.

## Guides

### Migrations on Open

Pass `migrations` as an ordered array (`version = index + 1`) or a version-keyed record (`Record<number, string>`). `@slimr/sqlite` checks `PRAGMA user_version` and runs any pending migrations (`version > user_version`) inside a `BEGIN IMMEDIATE` transaction:

```ts
// 1. Ordered array (versions 1, 2, ...)
const db = openSqlite("./data/app.db", {
  migrations: [
    `CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT);`,
    `ALTER TABLE items ADD COLUMN priority INTEGER DEFAULT 0;`,
  ],
});

// 2. Version-keyed record (supports squashing/consolidating older migrations into a baseline key)
const squashedDb = openSqlite("./data/app.db", {
  migrations: {
    3: `CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT, priority INTEGER DEFAULT 0, tags TEXT);`,
    4: `CREATE INDEX idx_items_priority ON items(priority);`,
  },
});
```

- **Fresh databases (`user_version = 0`)** run all entries in ascending version order and land on the highest version.
- **Existing databases** run only migrations with `version > user_version`.
- **Stale intermediate database guard**: If an existing database on disk has a non-zero `user_version` older than the lowest key in `migrations` (e.g. `user_version = 1` when `migrations` starts at `3`), opening fails with an explicit error rather than running the squashed baseline over existing tables.

### Transactions & Nested Savepoints

Concurrent calls to `db.transaction()` are serialized on the database queue, and any non-transaction queries issued while a transaction is active automatically queue behind it so statements never interleave:

```ts
// Supports "IMMEDIATE" (default), "DEFERRED", or "EXCLUSIVE"
await db.transaction(async (tx) => {
  await tx.run("UPDATE accounts SET balance = balance - 50 WHERE id = ?;", [1]);
  await tx.run("UPDATE accounts SET balance = balance + 50 WHERE id = ?;", [2]);

  // Nested tx.transaction() calls automatically use SAVEPOINT / RELEASE / ROLLBACK TO
  try {
    await tx.transaction(async (nestedTx) => {
      await nestedTx.run("INSERT INTO audit_log VALUES (?, ?);", [Date.now(), "transfer"]);
    });
  } catch (err) {
    // Only the nested savepoint rolled back; the outer transaction can still commit
  }
}, { mode: "IMMEDIATE" });
```

### Batch Operations

Execute multiple statements in a single worker round-trip with `db.batch()` (or `tx.batch()`). Each item supports `mode: "run" | "get" | "all" | "pluck" | "pluckAll" | "exec"`:

```ts
const [insert1, insert2, items, total] = await db.batch(
  [
    { sql: "INSERT INTO items (title) VALUES (?);", params: ["Item 1"], mode: "run" },
    { sql: "INSERT INTO items (title) VALUES (?);", params: ["Item 2"], mode: "run" },
    { sql: "SELECT * FROM items ORDER BY id;", mode: "all" },
    { sql: "SELECT count(*) FROM items;", mode: "pluck" },
  ],
  { atomic: true } // wraps in BEGIN IMMEDIATE / COMMIT and rolls back on error
);
```

### Custom Scalar SQLite Functions

Register JavaScript functions on open via `options.functions` or dynamically with `db.registerFunction()`. Functions are serialized to the worker thread, survive idle worker hibernation/respawn, and are automatically registered on isolated `readOnlyConnection` queries:

```ts
const db = openSqlite("./data/app.db", {
  functions: {
    add_tax: (amount) => Number(amount) * 1.1,
    greet: {
      fn: (name) => `Hello, ${String(name)}!`,
      deterministic: true,
    },
  },
});

await db.registerFunction("shout", (str) => `${String(str).toUpperCase()}!`);

const total = await db.pluck<number>("SELECT add_tax(100);"); // 110
const msg = await db.pluck<string>("SELECT shout(greet('world'));"); // "HELLO, WORLD!"
```

### Limited Iteration & Safe Read-Only Queries

`db.iterateLimited()` steps a cursor up to `limit` rows without materializing the entire result set in memory, returning `{ columns, rows, truncated }`.

With `readOnlyConnection: true`, it opens a separate read-only connection, optionally executes `setupSql` (e.g. creating `TEMP VIEW`s for agent/user queries), and then locks down `PRAGMA query_only = ON`:

```ts
const { columns, rows, truncated } = await db.iterateLimited(
  "SELECT * FROM active_items ORDER BY id ASC;",
  { active: 1 },
  {
    limit: 100,
    readOnlyConnection: true,
    setupSql: "CREATE TEMP VIEW active_items AS SELECT * FROM items WHERE is_active = :active;",
  }
);
```

### BigInt Support

Enable `readBigInts` globally on the database or per query when reading 64-bit integers that exceed `Number.MAX_SAFE_INTEGER`:

```ts
const db = openSqlite("./data/app.db", { readBigInts: true });

// Or override per query:
const ts = await db.pluck<bigint>(
  "SELECT microsecond_ts FROM events WHERE id = ?;",
  [1],
  { readBigInts: true }
);
```

### Online Database Backup

Back up a live database (including `:memory:`) to disk using SQLite's online backup API:

```ts
await db.backup("./backups/app-2026-11-10.sqlite");
```

## API Summary

- **`openSqlite(path, options?): SqliteDb`** — Opens a database (`":memory:"` or file path; parent directories are created automatically).
- **`db.get<T>(sql, params?, options?): Promise<T | undefined>`** — First matching row or `undefined`.
- **`db.all<T>(sql, params?, options?): Promise<T[]>`** — All matching rows.
- **`db.pluck<T>(sql, params?, options?): Promise<T | undefined>`** — First column of the first row, or `undefined`.
- **`db.pluckAll<T>(sql, params?, options?): Promise<T[]>`** — First column of every matching row.
- **`db.run(sql, params?, options?): Promise<{ changes, lastInsertRowid }>`** — Execute a write statement.
- **`db.exec(sql): Promise<void>`** — Execute raw multi-statement SQL (DDL/DML) and clear cached statements.
- **`db.batch(items, { atomic? }): Promise<unknown[]>`** — Execute multiple statements in a single worker message.
- **`db.transaction<T>(fn, { mode? }): Promise<T>`** — Run an async callback inside a serialized transaction (or nested savepoint).
- **`db.iterateLimited<T>(sql, params?, options?): Promise<{ columns, rows, truncated }>`** — Cursor-stepped query with row limit, column metadata, and optional isolated read-only connection.
- **`db.registerFunction(name, fn, options?): Promise<void>`** — Register a custom scalar SQLite function at runtime.
- **`db.backup(destPath): Promise<void>`** — Online backup to `destPath`.
- **`db.close(): Promise<void>`** — Close the database connection.

## License

ISC
