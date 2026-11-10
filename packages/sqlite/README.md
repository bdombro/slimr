# @slimr/sqlite

Slim async `node:sqlite` wrapper over a shared `worker_threads` worker with prepared statement caching, WAL defaults, and queued transactions.

## Features

- **Non-blocking background worker**: Runs SQLite operations asynchronously in a background worker thread (`worker_threads`), preventing SQLite disk I/O and query execution from blocking the Node.js event loop.
- **Shared or dedicated worker**: Defaults to a process-wide shared worker thread across database instances, with option for dedicated worker per database.
- **Idle hibernation & transparent respawn**: Automatically terminates the worker thread after an idle timeout (`idleTimeoutMs`, default 30s) when no queries or transactions are active and no `:memory:` databases are open, reducing idle RAM usage to 0 MB. Spawns fresh worker and reopens file databases transparently on the next query.
- **Sensible pragmas & WAL defaults**: Automatically configures `PRAGMA busy_timeout = 5000`, `PRAGMA foreign_keys = ON`, `PRAGMA temp_store = MEMORY`, and enables WAL mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`) for disk databases.
- **Statement caching**: Prepares and caches prepared statements across queries with automatic statement cache invalidation on DDL (`exec`) and backups.
- **Clean object normalization**: Automatically converts null-prototype SQLite row objects to standard JavaScript objects (`Object.prototype`) so objects work seamlessly with `structuredClone`, deep equality tests, and standard Object utilities.
- **Safe transaction queuing**: Serializes concurrent transactions on the same database. Non-transaction queries initiated while a transaction is active automatically queue behind the transaction to prevent interleaved statements.
- **Nested savepoint transactions**: Calls to `tx.transaction()` within a transaction automatically use SQLite savepoints (`SAVEPOINT`, `RELEASE`, `ROLLBACK TO`).
- **Atomic and non-atomic batches**: Execute multiple SQL statements in a single worker trip via `db.batch()`, with optional `atomic: true` transaction wrapping.
- **Limited iteration & read-only connections**: Read up to `limit` rows with truncation status via `db.iterateLimited()`, with support for isolated `readOnlyConnection: true` to guarantee read-only query execution.
- **Database backup**: Create online SQLite database backups via `db.backup(destPath)`.
- **Zero dependencies**: Pure Node.js builtins (`node:worker_threads`, `node:sqlite`, `node:fs`, `node:path`).

## Installation

```bash
bun add @slimr/sqlite
# or
npm install @slimr/sqlite
```

## Usage

### Quick Start

```ts
import { openSqlite } from "@slimr/sqlite";

const db = openSqlite("./data/app.db");

// Run DDL
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );
`);

// Insert
const result = await db.run(
  "INSERT INTO users (name, email) VALUES (?, ?);",
  ["Alice", "alice@example.com"]
);
console.log(result.lastInsertRowid); // 1

// Query single row
const user = await db.get<{ id: number; name: string; email: string }>(
  "SELECT * FROM users WHERE id = ?;",
  [1]
);

// Query all rows
const allUsers = await db.all<{ id: number; name: string }>(
  "SELECT id, name FROM users ORDER BY name ASC;"
);

// Close database when done
await db.close();
```

### In-Memory Databases

```ts
const memDb = openSqlite(":memory:");
```

### Migrations on Open

```ts
const db = openSqlite("./data/app.db", {
  userVersion: 2,
  migrateSql: `
    CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, title TEXT);
    ALTER TABLE items ADD COLUMN priority INTEGER DEFAULT 0;
  `,
});
```

When `userVersion` is specified with `migrateSql`, `PRAGMA user_version` is inspected. `migrateSql` and version updates only execute if the current database version is less than `userVersion`.

### Transactions & Savepoints

```ts
// Top-level transaction uses BEGIN IMMEDIATE / COMMIT / ROLLBACK
await db.transaction(async (tx) => {
  await tx.run("UPDATE accounts SET balance = balance - 50 WHERE id = ?;", [1]);
  await tx.run("UPDATE accounts SET balance = balance + 50 WHERE id = ?;", [2]);

  // Nested transactions automatically create and release/rollback SAVEPOINTs
  try {
    await tx.transaction(async (nestedTx) => {
      await nestedTx.run("INSERT INTO audit_log VALUES (?, ?);", [Date.now(), "transfer"]);
      // If an error is thrown here, only the nested savepoint is rolled back
    });
  } catch (err) {
    // Handle savepoint error without aborting outer transaction
  }
});
```

### Batch Operations

```ts
const results = await db.batch(
  [
    { sql: "INSERT INTO items (title) VALUES (?);", params: ["Item 1"], mode: "run" },
    { sql: "INSERT INTO items (title) VALUES (?);", params: ["Item 2"], mode: "run" },
    { sql: "SELECT * FROM items;", mode: "all" },
  ],
  { atomic: true } // wraps in BEGIN IMMEDIATE / COMMIT, rolls back on error
);
```

### Limited Iteration & Read-Only Queries

```ts
const { rows, truncated } = await db.iterateLimited(
  "SELECT * FROM large_table ORDER BY id ASC;",
  [],
  {
    limit: 100,
    readOnlyConnection: true, // Opens separate read-only connection
  }
);
```

### BigInt Support

```ts
// Enable readBigInts for the entire database
const db = openSqlite("./data/app.db", { readBigInts: true });

// Or enable/disable per query
const row = await db.get("SELECT count FROM big_numbers;", [], { readBigInts: true });
```

### Database Backup

```ts
await db.backup("./data/backup.sqlite");
```

## License

ISC
