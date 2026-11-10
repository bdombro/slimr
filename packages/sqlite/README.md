# @slimr/sqlite

Slim async `node:sqlite` wrapper over a shared `worker_threads` worker with prepared statement caching, WAL defaults, and queued transactions.

## Features

- **Non-blocking background worker**: Runs SQLite operations asynchronously in a background worker thread (`worker_threads`), preventing SQLite disk I/O and query execution from blocking the Node.js event loop.
- **Shared or dedicated worker**: Defaults to a process-wide shared worker thread across database instances, with option for dedicated worker per database.
- **Idle hibernation & transparent respawn**: Automatically terminates the worker thread after an idle timeout (`idleTimeoutMs`, default 30s) when no queries or transactions are active and no `:memory:` databases are open, reducing idle RAM usage to 0 MB. Spawns fresh worker and reopens file databases transparently on the next query.
- **Sensible pragmas & WAL defaults**: Automatically configures `PRAGMA busy_timeout = 5000`, `PRAGMA foreign_keys = ON`, `PRAGMA temp_store = MEMORY`, and enables WAL mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`) for disk databases.
- **Custom scalar functions**: Define user functions on open via `options.functions` or dynamically with `db.registerFunction()`. Functions survive worker hibernation and transparent respawn, and are automatically made available to `readOnlyConnection` queries.
- **Named parameters**: Accepts named parameter objects (`{ id: 1 }`, `{ ":id": 1 }`, `{ "$id": 1 }`, `{ "@id": 1 }`) as well as positional arrays across all query methods and batch operations.
- **Pluck scalar helpers**: Directly query scalar values with `db.pluck()` and `db.pluckAll()`.
- **Statement caching**: Prepares and caches prepared statements across queries with automatic statement cache invalidation on DDL (`exec`) and backups.
- **Clean object normalization**: Automatically converts null-prototype SQLite row objects to standard JavaScript objects (`Object.prototype`) so objects work seamlessly with `structuredClone`, deep equality tests, and standard Object utilities.
- **Safe transaction queuing & configurable modes**: Serializes concurrent transactions on the same database with configurable transaction modes (`"IMMEDIATE" | "DEFERRED" | "EXCLUSIVE"`). Non-transaction queries initiated while a transaction is active automatically queue behind the transaction to prevent interleaved statements.
- **Nested savepoint transactions**: Calls to `tx.transaction()` within a transaction automatically use SQLite savepoints (`SAVEPOINT`, `RELEASE`, `ROLLBACK TO`).
- **Atomic and non-atomic batches**: Execute multiple SQL statements in a single worker trip via `db.batch()`, with optional `atomic: true` transaction wrapping and support for `"pluck"` / `"pluckAll"` modes.
- **Limited iteration, column metadata & setup SQL**: Read up to `limit` rows with column names and truncation status via `db.iterateLimited()`. Supports `setupSql` for creating temporary views before querying and isolated `readOnlyConnection: true` with automatic `PRAGMA query_only = ON`.
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

// Pluck scalar values
const userCount = await db.pluck<number>("SELECT count(*) FROM users;");
const allNames = await db.pluckAll<string>("SELECT name FROM users ORDER BY id ASC;");

// Named parameters (bare, colon, dollar, or at prefixes)
const alice = await db.get(
  "SELECT * FROM users WHERE name = :name AND id = :id;",
  { name: "Alice", id: 1 }
);

// Close database when done
await db.close();
```

### In-Memory Databases

```ts
const memDb = openSqlite(":memory:");
```

### Custom Scalar SQLite Functions

Define custom functions at creation time or dynamically at runtime:

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

// Register functions dynamically
await db.registerFunction("shout", (str) => String(str).toUpperCase() + "!");

const total = await db.pluck<number>("SELECT add_tax(100);"); // 110
const greeting = await db.pluck<string>("SELECT shout(greet('world'));"); // "HELLO, WORLD!"
```

Registered functions survive worker hibernation and transparent respawn, and are automatically made available to `readOnlyConnection` queries in `iterateLimited`.

### Migrations on Open

Pass `migrations` as an ordered array (`version = index + 1`) or a version-keyed record (`Record<number, string>`). `@slimr/sqlite` checks `PRAGMA user_version` and runs any pending migrations (`version > user_version`) inside a transaction:

```ts
// Ordered array (versions 1, 2, ...)
const db = openSqlite("./data/app.db", {
  migrations: [
    `CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT);`,
    `ALTER TABLE items ADD COLUMN priority INTEGER DEFAULT 0;`,
  ],
});

// Version-keyed record (supports squashing/consolidating older migrations into a baseline key)
const squashedDb = openSqlite("./data/app.db", {
  migrations: {
    3: `CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT, priority INTEGER DEFAULT 0, tags TEXT);`,
    4: `CREATE INDEX idx_items_priority ON items(priority);`,
  },
});
```

If an existing database on disk has a non-zero `user_version` older than the lowest key in `migrations` (e.g. `user_version = 1` when migrations start at `3`), opening fails with an explicit error rather than running the baseline over existing tables.

### Transactions & Savepoints

```ts
// Top-level transaction supports "IMMEDIATE" (default), "DEFERRED", or "EXCLUSIVE"
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
}, { mode: "IMMEDIATE" });
```

### Batch Operations

```ts
const results = await db.batch(
  [
    { sql: "INSERT INTO items (title) VALUES (?);", params: ["Item 1"], mode: "run" },
    { sql: "INSERT INTO items (title) VALUES (?);", params: ["Item 2"], mode: "run" },
    { sql: "SELECT * FROM items;", mode: "all" },
    { sql: "SELECT count(*) FROM items;", mode: "pluck" },
  ],
  { atomic: true } // wraps in BEGIN IMMEDIATE / COMMIT, rolls back on error
);
```

### Limited Iteration & Read-Only Queries

```ts
const { columns, rows, truncated } = await db.iterateLimited(
  "SELECT * FROM active_items ORDER BY id ASC;",
  { active: 1 },
  {
    limit: 100,
    readOnlyConnection: true, // Opens separate read-only connection
    setupSql: "CREATE TEMP VIEW active_items AS SELECT * FROM items WHERE is_active = :active;",
  }
);
console.log(columns); // ["id", "title", "is_active", ...]
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
