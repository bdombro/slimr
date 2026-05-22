# API reference

[Documentation index](./README.md)

Lookup for public `@slimr/dbsync` surface area. For narratives and examples, use the guides linked in each section. Signatures and IDE hints come from published `.d.ts` files.

## `DbSyncConfig`

| Field | Type | Notes |
| --- | --- | --- |
| `adapter` | `BackendAdapter` | Required — [Adapters](./Adapters.md) |
| `tables` | `Record<string, DbSyncTableConfig>` | Optional inline schema |
| `lifecycle` | `{ manual?: boolean }` | Default automatic boot + `sync.start()` |
| `version` | `number` | Optional explicit schema version (overrides signature) |
| `onDebug` | `(event: DbSyncDebugEvent) => void` | Optional structured tracing — [Debugging](./Debugging.md) |

`DbSyncTableConfig`: `indexes?`, `defaultSetter?`, `migrations?`.

## `DbSync` — construction

| Member | Description |
| --- | --- |
| `constructor(config)` | Creates instance; schedules automatic boot when not `lifecycle.manual` |
| `config` | Active config object |
| `auth` | Session getters, login/logout, listeners — [Auth](./Auth.md) · [Offline](./Offline.md) |
| `sync` | Background sync engine — [Sync](./Sync.md) |
| `syncInterval` | Sync timer interval in ms (default `5000`) |

## `db.sync`

| Member | Type | Meaning |
| --- | --- | --- |
| `state` | `SyncState` | `"idle"` \| `"syncing"` \| `"offline"` \| `"error"` |
| `isStarted` | `boolean` | Background sync timer active |
| `isLive` | `boolean` | Recent successful sync (~4× `syncInterval`) |
| `isInitialSyncPending` | `boolean` | Logged in, no successful sync since login |
| `start()` | `Promise<void>` | Open IDB (if needed) + start timer + immediate cycle |
| `stop()` | `void` | Stop timer |
| `trigger()` | `Promise<void>` | One immediate pull/push cycle |
| `waitForLive()` | `Promise<void>` | Poll until `isLive` (rejects if sync never started) |
| `waitForInitial()` | `Promise<void>` | Until first successful sync since login |
| `onStateChange(cb)` | `{ close() }` | Sync state transitions |

## `db.auth` (`DbSyncAuth`)

| Member | Type | Notes |
| --- | --- | --- |
| `phase` | `DbAuthPhase` | `"logged-out"` \| `"booting"` \| `"initial-sync"` \| `"ready"` — app shell |
| `isLoggedIn` | `boolean` | Hydrated client session — first-paint routing |
| `isBooted` | `boolean` | Boot pipeline finished |
| `isReady` | `boolean` | IndexedDB open |
| `isBootstrapping` | `boolean` | Session-start / `onAuthenticated` callbacks in flight |
| `pendingLogout` | `boolean` | Remote logout queued until online |
| `offline` / `online` | `boolean` | Browser connectivity |
| `syncState` | `SyncState` | `"idle"` \| `"syncing"` \| `"offline"` \| `"error"` |
| `isInitialSyncPending` | `boolean` | Logged in, no successful sync since login |
| `onChange(listener)` | `{ close() }` | Phase, flags, or sync state changed |
| `onLogout(listener)` | `{ close() }` | Before IDB clear on active logout — [Auth](./Auth.md) |
| `onAuthenticated(listener)` | `{ close() }` | Login + cross-tab login only — not refresh boot |
| `sendCode(email)` | `Promise<boolean>` | Network required when `requiresAuth` |
| `login(email, code)` | `Promise<void>` | Sets session; runs `onAuthenticated` |
| `logout()` | `Promise<void>` | Local wipe + deferred remote when offline |
| `revalidate()` | `Promise<boolean>` | `checkAuth`; false → logout flow |

**App shell:** `switch (db.auth.phase)` — see [React](./React.md) and [Offline](./Offline.md).

## `DbSync` — data (low-level)

String `tableName` APIs. Prefer typed `db.posts.*` when using `DbTable`. Requires session when adapter `requiresAuth` (default). In imperative code, `await db.waitForBooted()` before first use — see [Data access](./DataAccess.md).

| Method | Returns | Notes |
| --- | --- | --- |
| `get(table, id)` | `T \| undefined` | Primary key read |
| `find(table, options?)` | `T[]` (or projected) | Query — `FindOptions` below |
| `getBy(table, index, value)` | `T \| undefined` | First match on index |
| `stream(table, options?)` | `AsyncGenerator<T>` | Cursor iteration |
| `add(table, value, key?)` | `T` | Insert; runs table `prepareCreate` if registered |
| `put(table, value, key?)` | `T` | Upsert; runs `preparePut` |
| `patch(table, value, key?)` | `T` | Partial update; runs `preparePatch` |
| `delete(table, key)` | `void` | Delete by id |
| `clear(table)` | `void` | Wipe store |
| `getTransaction()` | buffered tx | `tx.posts.put(...)` then `commit()` / `cancel()` |
| `applyDefaults(table, partial)` | `T` | Shape only, no persist |
| `upgradeRecord(table, record)` | `T` | Run migration chain, no persist — [Schema](./Schema.md) |
| `genUuid()` | `string` | New id helper |

Throws `DbSyncNotAuthenticatedError` when `requiresAuth` and `!db.auth.isLoggedIn` — [Errors](./Errors.md).

## `DbSync` — lifecycle

| Member | Type | Meaning |
| --- | --- | --- |
| `waitForBooted()` | `Promise<void>` | Boot pipeline finished (not server sync) |
| `boot()` | `Promise<void>` | Only when `lifecycle.manual`; else throws |

## `DbSync` — events

| Method | Returns | Notes |
| --- | --- | --- |
| `subscribe(cb)` | `{ close() }` | `(tables, changes?)` — local + cross-tab — [React](./React.md) |

`changes` entries: `{ table, change: "insert"|"update"|"delete", id }` or `{ table, change: "clear" }`. Large cross-tab updates may omit `changes` (refetch).

## `DbSync` — debug & cleanup

| Method | Notes |
| --- | --- |
| `emitDebug(event)` | Forwards to `config.onDebug` when set |
| `dispose()` | Stops sync, tears down listeners and storage (tests / teardown) |

## `DbTable` / `db.posts` (repository)

Subclass `DbTable<Row, CreateInput>` and attach on `DbSync` (e.g. `posts = new PostTable(this)`). Registers schema from static metadata.

### Static (on subclass)

| Field | Purpose |
| --- | --- |
| `tableName` | Required store name |
| `indexes` | IndexedDB index fields |
| `migrations` | Per-record upgrades — [Schema](./Schema.md) |

### Overrides (instance)

| Method | Role |
| --- | --- |
| `prepareCreate(input)` | Normalize before `add` (default: assign `id` via `genUuid`) |
| `preparePut(row)` | Normalize before `put` |
| `preparePatch(partial)` | Normalize before `patch` |

### Inherited repository API

Same as low-level data methods, scoped to the table: `get`, `find`, `getBy`, `stream`, `add`, `put`, `patch`, `delete`, `clear`, `applyDefaults`, `subscribe(cb, { ids? })`.

## `FindOptions`

Used by `find` / `stream` (on `db` or repository).

| Option | Purpose |
| --- | --- |
| `index` | Indexed field (required for `equalsAny` / `startsWith`) |
| `equals` | Exact match |
| `equalsAny` | Membership in list |
| `startsWith` | String prefix on index |
| `lowerBound` / `upperBound` | Range on index |
| `limit` | Max rows |
| `order` | `"asc"` \| `"desc"` |
| `select` / `omit` | Project fields (cursor path; prefer `stream` at scale) |

## `@slimr/dbsync/react`

| Export | Role |
| --- | --- |
| `createUseDbQuery(db)` | Factory for app-bound `useDbQuery` |
| `useDbQuery` | Generic hook (prefer factory) |
| `useDbAuth(db)` | Flat `DbAuthState` from `db.auth` getters |
| `useDbSession(db)` | Deprecated alias of `useDbAuth` |

Types: `DbAuthPhase`, `DbAuthState`, `SyncState` (`DbSessionPhase` / `DbSessionSnapshot` deprecated).

See [React](./React.md), [SSR](./SSR.md).

## Package exports

| Export | Kind |
| --- | --- |
| `DbSync`, `DbTable`, `DbSyncAuth`, `DbSyncSync` | Classes |
| `DbSyncConfig`, `DbSyncDebugEvent`, `DbSyncDebugListener`, `Migration` | Types |
| `DbAuthPhase`, `DbAuthState`, `SyncState` | Types |
| `DbSyncOfflineError`, `DbSyncNotAuthenticatedError`, `DbSyncAuthError` | Errors — [Errors](./Errors.md) |
| `@slimr/dbsync/adapters` | `RestAdapter`, `LocalAdapter`, `BackendAdapter` |

## See also

- [Getting started](./GettingStarted.md) — setup
- [Data access](./DataAccess.md) — queries and transactions
- [Offline-first apps](./Offline.md) — routing and shell
- [Sync engine](./Sync.md) — dirty queue and multi-tab sync
