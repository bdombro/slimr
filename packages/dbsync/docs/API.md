# API reference

[Documentation index](./README.md)

Lookup for public `@slimr/dbsync` surface area. For narratives and examples, use the guides linked in each section. Signatures and IDE hints come from published `.d.ts` files.

## `DbSyncConfig`

| Field | Type | Notes |
| --- | --- | --- |
| `adapter` | `BackendAdapter` | Required — [Adapters](./Adapters.md) |
| `tables` | `Record<string, DbSyncTableConfig>` | Optional inline schema |
| `lifecycle` | `{ manual?: boolean }` | Default automatic boot + `start()` |
| `version` | `number` | Optional explicit schema version (overrides signature) |

`DbSyncTableConfig`: `indexes?`, `defaultSetter?`, `migrations?`.

## `DbSync` — construction

| Member | Description |
| --- | --- |
| `constructor(config)` | Creates instance; schedules automatic boot when not `lifecycle.manual` |
| `config` | Active config object |
| `auth` | `DbSyncAuth` — [Session](./Session.md) |
| `syncInterval` | Sync timer interval in ms (default `5000`) |

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

Throws `DbSyncNotAuthenticatedError` when `requiresAuth` and `!isLoggedIn` — [Errors](./Errors.md).

## `DbSync` — lifecycle & session state

| Member | Type | Meaning |
| --- | --- | --- |
| `isLoggedIn` | `boolean` | Hydrated client session — route on this at module load |
| `isBooted` | `boolean` | Boot pipeline finished |
| `isReady` | `boolean` | IndexedDB open |
| `isBootstrapping` | `boolean` | Session-start or `onAuthenticated` callbacks running |
| `pendingLogout` | `boolean` | Remote logout deferred until online |
| `offline` / `online` | `boolean` | Browser connectivity |
| `waitForBooted()` | `Promise<void>` | Await boot (not server sync) — [Offline](./Offline.md) |
| `boot()` | `Promise<void>` | Only when `lifecycle.manual`; else throws |
| `onSessionChange(cb)` | `{ close() }` | Fires on session/boot flag changes |

## `DbSync` — sync engine

| Member | Type | Meaning |
| --- | --- | --- |
| `isStarted` | `boolean` | Background sync timer active |
| `isLive` | `boolean` | Recent successful sync (~4× `syncInterval`) |
| `start()` | `Promise<void>` | Open IDB (if needed) + start timer |
| `stop()` | `void` | Stop timer |
| `waitForLive()` | `Promise<void>` | Poll until `isLive` (rejects if sync never started) |
| `triggerSync()` | `Promise<void>` | One immediate pull/push cycle |
| `onSyncStateChange(cb)` | `{ close() }` | `"idle"` \| `"syncing"` \| `"offline"` \| `"error"` |

Details: [Sync engine](./Sync.md).

## `DbSync` — events

| Method | Returns | Notes |
| --- | --- | --- |
| `subscribe(cb)` | `{ close() }` | `(tables, changes?)` — local + cross-tab — [React](./React.md) |

`changes` entries: `{ table, change: "insert"|"update"|"delete", id }` or `{ table, change: "clear" }`. Large cross-tab updates may omit `changes` (refetch).

## `DbSync` — cleanup

| Method | Notes |
| --- | --- |
| `dispose()` | Stops sync, tears down listeners and storage handles (tests / teardown) |

## `db.auth` (`DbSyncAuth`)

| Method | Returns | Notes |
| --- | --- | --- |
| `onLogout(listener)` | `() => void` | Unsubscribe; runs before IDB clear on active logout |
| `onAuthenticated(listener)` | `() => void` | Login + cross-tab login only — not refresh boot |
| `sendCode(email)` | `Promise<boolean>` | Network required when `requiresAuth` |
| `login(email, code)` | `Promise<void>` | Sets session; runs `onAuthenticated` |
| `logout()` | `Promise<void>` | Local wipe + deferred remote when offline |
| `revalidate()` | `Promise<boolean>` | `checkAuth`; false → logout flow |

Full matrix: [Session](./Session.md).

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

`add` / `put` / `patch` on `DbTable` run the matching `prepare*` hook before persisting.

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
| `useDbSession(db)` | `isLoggedIn`, `isBooted`, `isReady`, `isBootstrapping`, `offline`, `online` |

See [React](./React.md), [SSR](./SSR.md).

## Package exports

| Export | Kind |
| --- | --- |
| `DbSync`, `DbTable` | Classes |
| `DbSyncConfig`, `Migration` | Types |
| `DbSyncOfflineError`, `DbSyncNotAuthenticatedError`, `DbSyncAuthError` | Errors — [Errors](./Errors.md) |
| `@slimr/dbsync/adapters` | `RestAdapter`, `LocalAdapter`, `BackendAdapter` |

## See also

- [Getting started](./GettingStarted.md) — setup
- [Data access](./DataAccess.md) — queries and transactions
- [Offline-first apps](./Offline.md) — routing and shell
- [Sync engine](./Sync.md) — dirty queue and multi-tab sync
