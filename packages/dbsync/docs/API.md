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
| `auth` | Session getters, observables, login/logout, listeners — [Auth](./Auth.md) · [Offline](./Offline.md) |
| `sync` | Background sync engine — [Sync](./Sync.md) |
| `updates$` | `Observable<DbUpdatesPayload>` — table change stream; [subscribe / table helpers](./DataAccess.md#reacting-to-changes) |
| `syncInterval` | Sync timer interval in ms (default `5000`) |

## `db.sync`

| Observable | Getter | Meaning |
| --- | --- | --- |
| `state$` | `state` | `"idle"` \| `"syncing"` \| `"offline"` \| `"error"` |
| `isStarted$` | `isStarted` | Background sync timer active |
| `isLive$` | `isLive` | Recent successful sync (~4× `syncInterval`) |

| Method | Returns | Notes |
| --- | --- | --- |
| `start()` | `Promise<void>` | Open IDB (if needed) + start timer + immediate cycle |
| `stop()` | `void` | Stop timer |
| `trigger()` | `Promise<void>` | One immediate pull/push cycle |
| `waitForLive()` | `Promise<void>` | Poll until `isLive` (rejects if sync never started) |
| `waitForInitial()` | `Promise<void>` | Until first successful sync since login |

## `db.auth` (`DbSyncAuth`)

| Observable | Getter | Notes |
| --- | --- | --- |
| `phase$` | `phase` | `"logged-out"` \| `"booting"` \| `"initial-sync"` \| `"ready"` |
| `isInitialSyncPending$` | `isInitialSyncPending` | Logged in, no successful sync since login (true during `booting` and `initial-sync`). Optional: one loader for both; primary shell uses `phase$` ([Integration guide](./Offline.md)) |
| `canQuery$` | `canQuery` | `isReady` && auth gate — used by `useDbQuery` |
| `isLoggedIn$` | `isLoggedIn` | Hydrated client session |
| `isReady$` | `isReady` | IndexedDB open |
| `isBooted$` | `isBooted` | Boot pipeline finished |
| `isBootstrapping$` | `isBootstrapping` | Session-start callbacks in flight |
| `pendingLogout$` | `pendingLogout` | Remote logout queued until online |
| `offline$` / `online$` | `offline` / `online` | Browser connectivity |

| Method | Returns | Notes |
| --- | --- | --- |
| `onLogout(listener)` | `{ close() }` | Before IDB clear on active logout — [Auth](./Auth.md) |
| `onAuthenticated(listener)` | `{ close() }` | Login + cross-tab login only — not refresh boot |
| `sendCode(email)` | `Promise<boolean>` | Network required when `requiresAuth` |
| `login(email, code)` | `Promise<void>` | Sets session; runs `onAuthenticated` |
| `logout()` | `Promise<void>` | Local wipe + deferred remote when offline |
| `revalidate()` | `Promise<boolean>` | `checkAuth`; false → logout flow |

**React:** `db.auth.<field>$.use()` on a **`DbSyncR`** from `@slimr/dbsync/react`. **Sync state:** `db.sync.state$` (not on `db.auth`).

## `DbUpdatesPayload`

```typescript
type DbUpdatesPayload = {
  tables: string[]
  changes?: RowChange[]
  txId: number // monotonic; ensures every publish fires
}
```

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

Same as low-level data methods, scoped to the table: `get`, `find`, `getBy`, `stream`, `add`, `put`, `patch`, `delete`, `clear`, `applyDefaults`, `subscribe(cb, { ids? })` — `subscribe` filters `db.updates$`.

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
| `DbSyncR` | Base class for React apps; overrides `auth` / `sync` / `updates$` so observables expose `.use()` |
| `useDbQuery(db, tables, queryFn, deps?, options?)` | Reactive IDB queries (`db` is `DbSyncR` / subclass instance) |
| `UseDbQueryOptions` | `shouldRefetchFilter` typing |
| `DbSyncRInstance`, `DbSyncAuthR`, `DbSyncSyncR`, `ObservableReact` | Types |
| `UseObservableOptions` | SSR options for `.use()` |

Session UI: **`db.auth.<field>$.use()`** — see [React](./React.md).

Types exported from `@slimr/dbsync`: `DbAuthPhase`, `SyncState`, `DbUpdatesPayload`, `RowChange`.

API migrations and breaking changes: [CHANGELOG UNRELEASED](../CHANGELOG.md) · [Migrating (archived)](./archive/Migrating-pre-0.0.43.md).

## Package exports

| Export | Kind |
| --- | --- |
| `DbSync`, `DbTable`, `DbSyncAuth`, `DbSyncSync` | Classes |
| `DbSyncConfig`, `DbSyncDebugEvent`, `DbSyncDebugListener`, `Migration` | Types |
| `DbAuthPhase`, `SyncState`, `DbUpdatesPayload`, `RowChange` | Types |
| `DbSyncOfflineError`, `DbSyncNotAuthenticatedError`, `DbSyncHttpError` | Errors — [Errors](./Errors.md) |
| `@slimr/dbsync/adapters` | `RestAdapter`, `LocalAdapter`, `BackendAdapter` |

## See also

- [Getting started](./GettingStarted.md) — setup
- [Data access](./DataAccess.md) — queries and transactions
- [Integration guide](./Offline.md) — routing and shell
- [Sync engine](./Sync.md) — dirty queue and multi-tab sync
