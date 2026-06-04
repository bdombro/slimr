# Changelog

This app follows [Semantic Versioning](https://semver.org/) and documents all notable changes to this package in this file. For more details on the API and usage, see the [README](./README.md).

While in pre-release, assume that any change is a breaking change until v1.0.0 is released. After that, breaking changes will be clearly marked as such in the changelog.

## UNRELEASED

## 0.0.68

### Added

- Introduced `RestBearerAdapter` which uses `Authorization: Bearer <token>` HTTP headers and persists the session token in `localStorage`.

### Changed

- **Breaking:** Renamed `RestAdapter` to `RestCookieAdapter` for cookie-based REST authentication.
- **Fix:** `RestBearerAdapter.login()` now throws when the server returns a successful `200` response but omits the `token` field, rather than silently succeeding with no token stored.

## 0.0.67

### Changed

- **Breaking:** Changed the type of `error` in `DbSyncDebugEvent` (for `boot:failed`, `sync:error`, and `query:error` events) from `unknown` to `DbSyncError`. All caught errors (including generic network/fetch failures) are normalized to this interface, guaranteeing a `.severity` property (0 for transient network errors, 1 or 2 for other errors) and making it easy to filter out network noise.

## 0.0.66

### Changed

- **Breaking:** Removed `onDebug` configuration property and replaced it with `events`, which supports both a catch-all listener callback `(event: DbSyncDebugEvent) => void` and a mapped, type-safe listener object `DbSyncDebugListeners` for cleaner event handling (e.g. `events: { "sync:error": ({ error }) => { ... } }`).

## 0.0.65

## 0.0.64

## 0.0.63

## 0.0.62

## 0.0.61

### Added

- Persistent email tracking via `db.auth.email$` observable. Upon successful `login()`, the email is saved to `localStorage` under `dbsync-email`.
- Persistent user ID tracking via `db.auth.userId$` observable. Upon successful `login()`, the `userId` returned by the backend is saved to `localStorage` under `dbsync-userId`.
- Seamless hydration of `db.auth.email$` and `db.auth.userId$` from `localStorage` on page refresh or boot.
- Auto-clear of the stored email and user ID on `logout()`, `invalidateSession()`, or cross-tab logout events.
- Synchronization of the email and user ID across tabs on cross-tab passive login and logout.

## 0.0.60

## 0.0.59

### Fixed

- `runSessionStartCallbacks()` no longer fires `notifySessionChange()` before executing the session start callbacks. Previously, it called `notifySessionChange()` immediately after setting `isBootstrappingValue = true`, which triggered `SessionManager.publish()` and emitted `isLoggedIn$` before `storage.init()` (which runs inside the callbacks) had completed. This caused any `isLoggedIn$` subscriber querying the database to crash with `TypeError: undefined is not an object (evaluating 'this.getDb().transaction')` on Safari, and a silent unhandled rejection on Chrome/Firefox. The `finally` block already handles notification after callbacks complete.

## 0.0.58

### Fixed

- `runBoot()` no longer sets `isBooted = true` when `fireSessionStart()` (and thus `storage.init()`) fails. The `isBootedValue = true` assignment now lives inside the `try` block, so it only runs on success. A `boot:failed` debug event is emitted on failure.

### Added

- `StorageManager.init()` retries IndexedDB open up to 3 times with linear backoff (200ms per attempt) before giving up, handling transient WebKit contention and brief IDB unavailability. Added private `doInit()` helper to separate the open logic from the retry loop.

## 0.0.57

### Fixed

- `login()` and `handlePassiveLogin()` now set `isLoggedInValue` before `fireSessionStart()` but defer `notifySessionChange()` (which fires the `isLoggedIn$` observable) until after storage initialization completes. Previously, `login()` called `setLoggedIn(true)` first, which synchronously triggered `isLoggedIn$` subscribers via `SessionManager.publish()` — but `storage.db` was still `undefined` because `storage.init()` only runs inside `fireSessionStart()`. Any subscriber reacting to `isLoggedIn$` by querying the database would crash with `TypeError: undefined is not an object (evaluating 'this.getDb().transaction')`.

## 0.0.56

### Added

- Error codes (`DbSyncErrorCode`) and severity levels (`ErrorSeverity`) on all dbsync errors. `DbSyncOfflineError` now exposes `code: "offline"` (severity 0), `DbSyncNotAuthenticatedError` exposes `code: "not_authenticated"` (severity 2), and `DbSyncHttpError` derives sub-codes from HTTP status (e.g. `"unauthorized"`, `"forbidden"`, `"server_error"`) with appropriate severity. The `DbSyncErrorCode` and `ErrorSeverity` types are exported from the package.

## 0.0.55

### Changed

- **Breaking:** Renamed `DbSyncAuthError` → `DbSyncHttpError`. Added `status?: number` and `serverCode?: string` fields. `RestAdapter.pull` and `RestAdapter.push` now throw structured `DbSyncHttpError` (instead of raw `{ status }`) consistent with `sendCode`/`login`. The `SyncEngine` 401-detection uses `instanceof DbSyncHttpError` + `.status`. Consumers importing `DbSyncAuthError` must update to `DbSyncHttpError`.

## 0.0.54

### Fixed

- `db.<table>.subscribe` and `useDbQuery` include `txId` in their `updates$` select slice so consecutive writes that produce the same `RowChange` shape (e.g. two patches to one row) still notify subscribers. Previously the slice omitted `txId` and `@slimr/observable` deduped the second notification.

## 0.0.51

### Changed

- Sync pull/push post envelope `updatedAt` uses **Unix epoch milliseconds** (numbers), not ISO-8601 strings.
- Pull cursor (`dbsync-pullSyncedUpTo`) stores ms; legacy ISO cursors are converted on read.
- Stops pull pagination when the cursor would not advance (guards against stuck `hasMore` loops).

## 0.0.50

### Fixed

- Sync pull skips rows that are still in `dirtyQueue` or `deletedQueue` so pending local edits are not overwritten by echoed server data.

## 0.0.49

### Fixed

- Sync pull no longer enqueues pulled rows on `dirtyQueue` / `deletedQueue` (avoids echoing server data on the next push in the same cycle).

## 0.0.48

### Changed

- Renamed `db.auth.initialSyncPending$` → `isInitialSyncPending$` (matches `isInitialSyncPending` and other `is*` observables).

## 0.0.47

### Changed

- Fix types

## 0.0.46

## 0.0.45

### Added

- **`@slimr/observable`** dependency; observable session/sync/update streams (`db.auth.*$`, `db.sync.state$` / `isStarted$` / `isLive$`, `db.updates$` with `txId`).
- **`@slimr/dbsync/react`** — `DbSyncR` (`.use()` on observables), `useDbQuery`, React types. Main package exports `DbUpdatesPayload`, `RowChange`.

### Breaking

- **Removed:** `db.subscribe`, `db.auth.onChange`, `db.sync.onStateChange`, `db.sync.isInitialSyncPending`, `db.auth.syncState`, `useDbAuth`, `createUseDbQuery`, `DbAuthState`.
- **React:** `class AppDb extends DbSyncR`; shell via `db.auth.phase$.use()` (four phases); data via `useDbQuery(db, …)`. Imperative code: `.subscribe` / `.val` on `$` observables.
- **`isInitialSyncPending` / `initialSyncPending$`:** true while logged in until first successful sync (includes `booting`, not only `phase === "initial-sync"`).

### Changed

- `DbSync.auth` / `sync` are getters; `DbSyncR` wraps them for `.use()` without casting `export const db`.
- `useDbQuery` and `db.<table>.subscribe` refetch only on `canQuery$` + relevant `updates$` slices (`select` ignores `txId`-only republishes).
- Docs: [Getting started](./docs/GettingStarted.md) → [Integration guide](./docs/Offline.md) → [React](./docs/React.md) — see [docs/README.md](./docs/README.md).
- **`DbSyncLikeType`** — `DbTable` / `DbRepository` and `getTransaction()` accept `DbSync` and `DbSyncR` subclasses (`new PostTable(this)` type-checks; `TransactionOf<AppDb>` includes table repos).

## 0.0.44

### Breaking

- **Removed `db.session`** — session state lives on **`db.auth`** shallow getters (`phase`, `isLoggedIn`, `isReady`, `offline`, `syncState`, `isInitialSyncPending`, …) and **`db.auth.onChange()`**.
- **`db.sync`** — `start`, `stop`, `trigger`, `waitForLive`, `waitForInitial`, `onStateChange`, `state`, `isLive`, `isStarted`, `isInitialSyncPending` moved off root `db`.
- **Removed from root `db`:** `isReady`, `isBooted`, `offline`, `online`, `isLive`, `isStarted`, `isInitialSyncPending`, `start`, `stop`, `triggerSync`, `waitForLive`, `onSyncStateChange`.
- **`useDbAuth`** — flat `DbAuthState` from `db.auth` getters (replaces `useDbSession`).
- **`db.auth.onLogout` / `onAuthenticated` / `onChange`** return `{ close() }` (not `() => void`).
- **Removed exports:** `useDbSession`, `DbSessionPhase`, `DbSessionSnapshot`, `DbSessionState`.
- **Exported types:** `DbAuthPhase`, `DbAuthState`, `SyncState`.

### Changed

- `db.sync.start()` runs an immediate sync cycle when the timer starts (login, refresh boot, cross-tab login).
- **Docs:** restructured [docs/README.md](./docs/README.md) by intent; [Offline.md](./docs/Offline.md) is the canonical integration guide (phase diagram, anti-patterns, recipes); [Auth.md](./docs/Auth.md) replaces [Session.md](./docs/Session.md) (stub redirect retained); [LocalAdapter](./docs/Adapters.md#localadapter) merged into [Adapters.md](./docs/Adapters.md) (stub redirect retained); [Migrating.md](./docs/Migrating.md) archived under [docs/archive/](./docs/archive/Migrating-pre-0.0.43.md) (stub redirect retained); [React.md](./docs/React.md) documents advanced `useDbQuery`; [Testing](./docs/Testing.md) / [Debugging](./docs/Debugging.md) cover Playwright and `setPerformSyncHook`.

## 0.0.42

### Breaking

- Session state on `db.auth`: `isLoggedIn`, `pendingLogout`, `isBootstrapping`, `onSessionChange` — removed from root `db`. `isBooted`, `waitForBooted()`, and `boot()` remain on `db`.

## 0.0.41

### Added

- `DbSyncConfig.onDebug` and `db.emitDebug()` — structured boot, session, sync, schema, and `query:error` events (no default logging).

### Changed

- `useDbQuery` query failures emit `query:error` via `onDebug` instead of `console.error`.
- Docs: [Debugging.md](./docs/Debugging.md); `waitForBooted()` in imperative snippets (README quick start, Data access, Modeling, LocalAdapter); omitted from module-setup and React examples.

## 0.0.40

### Breaking

- **Session listeners:** `db.auth.onLogout(fn)` and `db.auth.onAuthenticated(fn)` return unsubscribe `() => void` — removed `DbSyncConfig.auth` / `DbAuthConfig`. Listeners run via `Promise.allSettled`; rejections propagate after teardown (logout) or after the pipeline step completes. **`onAuthenticated` runs on login and cross-tab login only — not on refresh boot.**
- **Auth namespace:** `db.auth.sendCode`, `login`, `logout`, `revalidate` — removed top-level `db.sendCode`, `login`, `logout`, `revalidateSession`.
- **Readiness:** `db.isReady` (IndexedDB open), `db.isBooted`, `db.waitForBooted()` — removed `db.initted`, `db.ready()`, `DbReadyResult`, `db.whenReady()`, `db.whenBooted()`, `db.bootstrapSession()`. Public `db.boot()` only when `lifecycle.manual`.
- **Lifecycle:** adapter-inferred automatic boot + `start()`; optional `lifecycle: { manual: true }` only — removed `autoStart`, `autoBoot`, `db.autoStart`, `db.autoBoot`.
- **Removed:** `DbProvider`, `useDb`, public `db.init()`, `startSyncInterval()` / `stopSyncInterval()`.
- **`useDbSession`:** `isDbReady` renamed to `isReady`.

### Added

- `DbSyncAuthError` (`code`: `offline` | `pending_logout` | `server`) for REST auth failures and blocked login during pending logout.

### Changed

- `RestAdapter` `sendCode` / `login` throw `DbSyncAuthError` with `serverMessage` from swift-crud `{ message }`.
- `storage` is private on `DbSync`; `SyncEngine` reads `syncInterval` live via getter.
- Docs: restructured guides — [Sync.md](./docs/Sync.md) (engine), [Session.md](./docs/Session.md), [Errors.md](./docs/Errors.md), [API.md](./docs/API.md), learning paths in [docs/README.md](./docs/README.md); `db.auth` subscribers; [Migrating.md](./docs/Migrating.md).
- `useDbSession` exposes `isBooted`.

## 0.0.39

### Added

- `DbSyncConfig.autoStart` (default `true`) — internal `onLogin` handler calls `start()` after `login()` / `boot()`. Set `autoStart: false` for manual `init()` / `start()`.
- `DbSyncConfig.autoBoot` (default `true`) — schedules `boot()` when the first `onLogin` / `onLogout` hook is registered.
- `db.autoStart`, `db.autoBoot`, and `db.whenReady()` (alias `whenBooted()` deprecated).

### Changed

- `db.whenBooted()` renamed to `db.whenReady()` (deprecated alias kept).
- Docs: typical apps register `onLogout` only — no explicit `db.boot()` required when `autoBoot` is true.
- `DbProvider` `onLogin` prop is optional when `autoStart` handles startup; no longer calls `boot()` directly (`autoBoot` handles it).

## 0.0.38

### Added

- `db.boot()` — replays a hydrated session (`onLogin` once on refresh); replaces `bootstrapSession()` in docs.

### Changed

- `db.boot()` is **awaitable** — resolves after all `onLogin` subscribers finish; concurrent `boot()` calls share one run; `login()` during boot waits for in-flight `onLogin`.
- `boot()` awaits `flushPendingRemoteLogout()` before `onLogin`.
- Docs: `onLogin` examples use `await db.start()` only — `start()` already calls `init()` when needed.
- `db.bootstrapSession()` is deprecated; calls `db.boot()`.

## 0.0.37

### Added

- `BackendAdapter.sendCode(email)` — `RestAdapter` posts to `/api/session/send-code`; `LocalAdapter` resolves `true`.
- `db.sendCode(email)` — delegates to the adapter; throws `DbSyncOfflineError` when offline and `requiresAuth` is true.
- `RestAdapter` `sendCode` / `login` — on error, throws the swift-crud `{ message }` from the response body when present.

## 0.0.36

### Changed

- `requiresAuth: false` (`LocalAdapter`) now only skips **data API** guards; `bootstrapSession`, `login`, `logout`, and cross-tab session handlers still run using the adapter's stubbed `checkAuth` / `login` / `logout`. `login` / `revalidateSession` do not require network when `requiresAuth` is false.

## 0.0.35

## 0.0.34

## 0.0.33

## 0.0.32

### Changed

- `npm run typecheck` runs `tsc -b tsconfig.test.json` (source, unit tests, `test-support`, and Playwright); main `tsconfig.json` matches other packages and excludes tests from publish builds.

## 0.0.31

### Added

- `db.isLoggedIn` (persisted across tab refresh via `localStorage`).
- `db.offline` and `db.online` getters (`online` is `!offline`); sync `"offline"` state when the browser is offline or sync cannot reach the network.
- Documented refresh boot: hydrated `isLoggedIn` keeps app shell and route without login redirect or initial offline gate.
- `db.onLogin`, `db.onLogout`, and `db.bootstrapSession()` for session-driven app boot (see [docs/Offline.md](./docs/Offline.md)).
- `useDbSession` exposes `isBootstrapping` and `isDbReady` (`db.initted`) for in-app loading during boot.
- `db.revalidateSession()` for optional manual session probes.
- `DbSyncOfflineError` when `login()` or `revalidateSession()` is called offline.
- `DbSyncNotAuthenticatedError` when guarded APIs run without a session.
- `BackendAdapter.requiresAuth` — `LocalAdapter` sets `false`; REST adapters default `true`.
- `useDbSession` and optional `DbProvider` in `@slimr/dbsync/react` (`DbProvider.fallback` shown while `!isDbReady` when provided).
- [docs/Offline.md](./docs/Offline.md) — offline-first session, cross-tab auth, React, and service worker notes.
- Vitest coverage for auth/session (`AuthManager`, `DbSync.Auth`, `useDbSession`, `EventBus` auth messages).
- Playwright e2e for offline logout, refresh hydration, and cross-tab `AUTH_LOGIN` / `AUTH_LOGOUT` (`playwright/auth-*.spec.ts`).

### Fixed

- Playwright fixture server no longer binds to Vite’s default port 5173 or hangs `just test` when that port is taken; uses ephemeral `server.port: 0` and `reuseExistingServer: false`.

### Changed

- Split package [README](./README.md) into focused guides under [docs/](./docs/README.md) (getting started, data access, schema, React, sync).
- **Renamed `isAuth` → `isLoggedIn`** (breaking).
- `DbSync.logout()` clears all local IndexedDB stores and sync cursor markers; remote `adapter.logout()` may defer when offline (`dbsync-pendingLogout`).
- Offline logout: local wipe and `onLogout` run immediately; server session destroyed when back online.
- Cross-tab `AUTH_LOGIN` / `AUTH_LOGOUT` via `BroadcastChannel` (+ `storage` fallback); passive tabs run `onLogout` early without re-clearing IDB.
- Online revalidation: when connectivity returns, internal session check runs; invalid session or sync `401` fires `onLogout`.
- `init`, `start`, and data APIs throw when not logged in (`requiresAuth` adapters).
- `useDbQuery` returns `{ loading: true, value: null }` and skips `queryFn` when not logged in (`requiresAuth` adapters).
- `tsconfig.test.json` is a composite project referenced from the repo root so `just check` (`tsc -b`) typechecks unit tests, `test-support`, and Playwright sources; declaration emit for project references goes to gitignored `.tsbuild` / `.tsbuild-test`.
- Playwright e2e (≥1.60) uses `webServer.wait` to bind an ephemeral `127.0.0.1` port from Vite stdout; removed `ensure-port.mjs` and `.pw-fixture-port`.

### Removed

- `DbSync.reset()` — use `logout()` instead.
- `DbSync.isAuth` — use `isLoggedIn`.
- `DbSync.checkAuth()` — session revalidation is automatic; use `revalidateSession()` only if you need an explicit probe.

## 0.0.30

### Added

- `find` and `stream` accept `select` and `omit` to return partial records; when either is set, `find` reads via cursor instead of `getAll`. Projected return types are inferred from options (`Pick` / `Omit` of the row type).

### Removed

- Package entry no longer exports `RowChange`, `DbSyncTableConfig`, `DbTableConstructor`, `SubscribeCallback`, `SyncState`, `TableSubscribeOptions`, `TransactionOf`, `FindOptions`, or `@slimr/dbsync/react`'s `UseDbQueryOptions`. Use subscribe/`useDbQuery` parameter inference, `ReturnType`, or inline shapes instead.

## 0.0.29

### Added

- `getTransaction()` return type is inferred from your `DbSync` subclass, so table properties (e.g. `todos`) get matching `tx.todos` write facades without manual casts.

## 0.0.28

### Changed

- Record primary keys and row-change `id` fields are typed as `string` only (no `number`).

## 0.0.27

### Changed

- Public types are exported from the package entry (`index.ts`) instead of re-exported through `DbSync`; removed `TableSubscribeCallback` and internal `DbSyncResolvedTable` from the public surface.

## 0.0.26

### Added

- `DbRepository.subscribe` (e.g. `db.posts.subscribe`) for table-scoped row change notifications, with optional `ids` filtering.

## 0.0.25

### Added

- `subscribe` callbacks now receive an optional second argument, `changes`, with per-row `{ table, change, id }` events (or `{ table, change: "clear" }` for whole-table writes); existing table-only subscribers are unchanged.
- `useDbQuery` accepts an optional fifth argument, `options.shouldRefetchFilter`, to skip refetches when row-level changes are not relevant to the query.

## 0.0.24

- query options now reject incompatible combinations instead of silently prioritizing one branch, so `equalsAny` and `startsWith` must be used on a declared index and cannot be mixed with conflicting range filters.
- refactoring

## 0.0.23

- added `equalsAny` to `FindOptions` for exact membership queries over an indexed field, returning the union of all matching records.
- added `startsWith` to `FindOptions` for prefix queries over string indexes; normalize fields yourself if you need case-insensitive matching.
- newly declared indexes are now created for existing IndexedDB stores during schema upgrades instead of only for freshly created stores.

## 0.0.22

- renamed several public `storeName` parameters and repository properties to `tableName` to match the table-centric API exposed by `DbTable`.
- removed the `getAll()`, `findAll()`, and `streamAll()` convenience methods from the public API so `get()`, `getBy()`, `find()` and `stream()` are the only read entry points.
- `find()` now handles the full-store case when no options are provided, and descending queries with a limit use a cursor so they can stop early instead of loading everything first.
- `stream()` now handles the full-store case when no options are provided, so the generator can iterate an entire store without a separate helper.
- queries that name an undeclared index now throw instead of silently falling back.

## 0.0.21

- useDbQuery does equality checks on query results and only triggers updates when the result actually changes, preventing unnecessary re-renders in React apps.

## 0.0.20

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 0.0.19

- removed `DbRepository` from the package root export so the public API stays focused on `DbTable` and `DbSync`; internal code still uses it as the implementation layer.

## 0.0.18

- added `DbTable` as the preferred schema-class API, with runtime table registration, typed transaction table facades, and table-level `prepareCreate` / `preparePut` / `preparePatch` hooks.
- introduced direct table-property repositories on `DbSync` (for example `db.posts`) and updated the README to make that the primary API; this is a breaking change from the previous manual `DbRepository`-first guidance.
- replaced `findAll()` with a clearer query surface: `getAll()` for full-store reads, `find()` for filtered/ranged queries, `getBy()` for exact index lookups, and `stream()` / `streamAll()` for generator-based iteration.
- updated the Playwright fixture and README to use the typed schema-class pattern as the preferred consumer example, while keeping `DbSync` CRUD helpers available as lower-level escape hatches.
- removed `DbTxRepository` from the package root export and trimmed it from consumer-facing docs, keeping transaction-scoped typed access as an internal implementation detail for now.

## 0.0.7

- renamed DbSync.enable/disable to start/stop for better clarity and semantics.

## 0.0.3

Initial release


