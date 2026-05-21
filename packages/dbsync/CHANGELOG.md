# Changelog

This app follows [Semantic Versioning](https://semver.org/) and documents all notable changes to this package in this file. For more details on the API and usage, see the [README](./README.md).

While in pre-release, assume that any change is a breaking change until v1.0.0 is released. After that, breaking changes will be clearly marked as such in the changelog.

## UNRELEASED

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


