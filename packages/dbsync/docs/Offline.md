# Offline-first apps with dbsync

This guide describes how to run a **React (or plain JS) offline-first app** with `@slimr/dbsync`: persisted login state across refresh, logout while offline, cross-tab session sync, and service-worker-friendly boot flows.

For adapter wiring, see [Adapters](./Adapters.md). For REST endpoint shapes, see [RestAdapter](./RestAdapter.md).

## Mental model

- **IndexedDB is the runtime database.** Reads and writes are local-first; sync runs in the background.
- **`db.isLoggedIn`** reflects whether the app considers the user signed in (persisted in `localStorage`, restored on refresh).
- **`db.onLogin` / `db.onLogout`** are the recommended way to drive your app shell (init DB, show/hide UI) — not manual `if (db.isLoggedIn)` routing.
- **`db.offline`** — `true` when `navigator.onLine` is false.
- **`db.online`** — `!db.offline` (convenience; always the inverse).
- When the adapter **`requiresAuth`** (default for `RestAdapter`), data APIs and `init()` / `start()` **throw** if not logged in.

## Refresh boot: stay logged in, no login/offline flash

After a **full page refresh** on a tab that was logged in, the app should **not**:

- Redirect to the login / logged-out route before dbsync runs.
- Show a global “you’re offline” state just because `navigator.onLine` is false for the first moment, or sync has not run yet.

dbsync supports this when you follow an **optimistic shell** pattern:

| Signal | On refresh (was logged in) |
| --- | --- |
| `db.isLoggedIn` | `true` **immediately** after `new DbSync()` (hydrated from `localStorage`). |
| `onLogout` | Does **not** run on refresh — only on `logout()`, `401`, failed revalidation, or cross-tab `AUTH_LOGOUT`. |
| `onLogin` | Runs once via `db.bootstrapSession()` if hydrated — use for `init()` / `start()`, not for “am I allowed to see the app?”. |
| IndexedDB | Still has data — render from cache after `init()`. |
| `db.offline` | May be `true` briefly; **do not** use it alone to pick login vs app route on first paint. |

**Router rule:** initial route = **`db.isLoggedIn` at module load** (or `useDbSession` initial state from hydration), **not** “wait for network” and **not** “default to login until IndexedDB opens”. Call `db.bootstrapSession()` to replay a hydrated session in the background; only **`onLogout`** should navigate to login.

**Loading rule:** when `isLoggedIn`, show the **app shell** immediately and **in-app loading** (skeletons / `useDbQuery` `loading`) until `db.initted` — not the login page, not a full-screen offline gate.

**Sync rule:** do **not** put `await db.waitForLive()` in default `onLogin` if you want the shell visible immediately — use cached IDB data; sync in the background. Reserve `waitForLive()` for screens that truly need a fresh server pull.

**Offline UI rule:** optional subtle sync/connectivity indicator from `onSyncStateChange` — not a full-screen offline gate on load.

## Boot states (do not confuse these)

| State | Signal | Use for |
| --- | --- | --- |
| **Session / route** | `db.isLoggedIn` (hydrated on construct) | Login vs app **route** on first paint |
| **Session wired** | after `db.bootstrapSession()` | Hydrated tab fired `onLogin` once; hooks active |
| **Storage open** | `db.initted` | Data APIs and `useDbQuery` can read IndexedDB |
| **Bootstrapping** | `onLogin` running (`init` / `start` not finished) | In-app spinner / skeleton (`isBootstrapping` in `DbProvider`) |
| **Connectivity hint** | `db.offline` / `db.online` | Banners, disable `login()` — **not** login routing when already `isLoggedIn` |
| **Sync activity** | `onSyncStateChange` | Background status — **not** logged-out redirect |

`db.bootstrapSession()` is **not** “database ready.” It does not open IndexedDB and is not `await`‑able. For storage readiness, use **`db.initted`** or wait for `onLogin`’s `init()` to finish.

## Boot flow (REST / session-backed apps)

Register session hooks **immediately** after constructing `DbSync`, then call `bootstrapSession()`:

```typescript
import { DbSync } from "@slimr/dbsync"
import { RestAdapter } from "@slimr/dbsync/adapters"

const db = new DbSync({ adapter: new RestAdapter({ url: "https://api.example.com" }) })

// 1. Route immediately from hydration (sync) — render app shell + in-app loading
const initialRoute = db.isLoggedIn ? "/app" : "/login"

db.onLogout(() => {
  navigate("/login") // only on real logout — never on refresh
})

db.onLogin(async () => {
  await db.init()   // db.initted becomes true — useDbQuery can run
  await db.start()
  // Do not block shell on waitForLive() — show cached data, sync in background
})

// 2. Replay hydrated session (sync, not awaitable — does NOT mean db.initted)
db.bootstrapSession()

// Login form only:
await db.login("user@example.com", "123456") // → onLogin
```

### What each step does

| Step | Behavior |
| --- | --- |
| `new DbSync()` | Hydrates `db.isLoggedIn` from `localStorage` (`dbsync-isLoggedIn`). **Use this for first paint / router** so refresh does not flash login. |
| `db.onLogout()` | Subscribes to logout, `401`, and cross-tab `AUTH_LOGOUT`. Callback runs **before** local DB wipe. **Never fired on refresh.** |
| `db.onLogin()` | Subscribes to `login()`, restored session, and cross-tab `AUTH_LOGIN`. Use for `init()` + `start()` only. |
| `db.bootstrapSession()` | After hooks are registered: if hydrated `isLoggedIn`, fires `onLogin` once (refresh / offline reopen). **Sync, not awaitable.** Does **not** call `onLogout` when logged out on disk. |
| `db.initted` | `true` after `init()` completes inside `onLogin` — data layer ready. |
| `db.login()` | **Requires network.** Sets `isLoggedIn`, fires `onLogin`. |
| `db.logout()` | Clears local state immediately; see [Logout while offline](#logout-while-offline). |

Use **`onLogout` / `onLogin`** for navigation and `init`/`start`. Use **`db.isLoggedIn`** (hydrated) for **initial** route. Show **loading inside the app** until `db.initted` (or `isBootstrapping` from `DbProvider`).

### Local-only apps (`LocalAdapter`)

`LocalAdapter` sets `requiresAuth: false`. No login flow; the adapter's `checkAuth()` always returns `true` (used internally only). You may call `init()` / `start()` directly without hooks:

```typescript
const db = new DbSync({ adapter: new LocalAdapter() })
await db.start()
```

See [LocalAdapter](./LocalAdapter.md).

## Connectivity: `db.offline` and `db.online`

```typescript
if (db.offline) {
  // navigator.onLine === false — may be wrong briefly after refresh
}

if (db.online) {
  await db.login(email, code) // same as !db.offline
}

db.onSyncStateChange((state) => {
  // "idle" | "syncing" | "offline" | "error" — background sync, not app routing
})
```

`db.online` is sugar for `!db.offline`. Neither should choose **login vs app** on first paint when `db.isLoggedIn` is already `true`.

- **`login()`** throws `DbSyncOfflineError` when offline.
- When the device comes **back online**, dbsync automatically **revalidates** the session (internal `adapter.checkAuth()`). If the server rejects the cookie, `onLogout` fires (stale hydrated session).
- You do **not** need your own `window.addEventListener("online", …)` for session checks.
- There is **no public `db.checkAuth()`** — use `db.isLoggedIn` for client state; revalidation is automatic. Optional **`db.revalidateSession()`** when you need a manual server probe (e.g. "Retry" button); throws `DbSyncOfflineError` when offline.

## Auth guards

For adapters with `requiresAuth: true` (default):

- **`init()`, `start()`, and all data APIs** (`get`, `put`, `find`, `getTransaction`, table repos, etc.) throw `DbSyncNotAuthenticatedError` when `!db.isLoggedIn` or while a **pending remote logout** is queued.
- **`login`, `logout`, `revalidateSession`, `subscribe`, `onLogin`, `onLogout`, `bootstrapSession`** remain callable when logged out (subject to offline rules for `login` / `revalidateSession`).

This prevents stray async work from reading stale data after `onLogout`.

## Logout while offline

`logout()` always:

1. Stops sync.
2. Sets `isLoggedIn` to false and broadcasts to other tabs.
3. Fires **`onLogout` immediately** (tear down UI before slow work).
4. Clears all local IndexedDB stores and sync cursor keys.
5. Then:
   - **Online:** `POST` adapter logout, clear pending flag.
   - **Offline:** sets `dbsync-pendingLogout` in `localStorage`; **defers** `adapter.logout()` until online.

While `pendingLogout` is set, sync does not pull or push (avoids repopulating the DB from a still-valid server cookie). `login()` is blocked until the remote session is destroyed.

Only the tab that called `logout()` (or the `online` flush) hits the network for `adapter.logout()`. Other tabs receive `AUTH_LOGOUT`, run `onLogout`, and do not re-clear IndexedDB.

## Cross-tab session sync

Auth changes use the same `BroadcastChannel` as data updates (`dbsync_events`), with `AUTH_LOGIN` / `AUTH_LOGOUT` messages, plus `storage` events on `dbsync-isLoggedIn` / `dbsync-pendingLogout` as a fallback.

Passive tabs:

- Update `isLoggedIn` and fire `onLogin` / `onLogout`.
- Stop sync on logout.
- Do **not** call `adapter.logout()` or `clearAllStores()` again.

Data subscribers (`db.subscribe`) still receive `clear` events when the originating tab wipes stores.

## Session revalidation

Session checks run inside dbsync via **`AuthManager.revalidateSession()`** (calls `adapter.checkAuth()`). Apps do not call `checkAuth` on `DbSync` directly.

| Trigger | Action |
| --- | --- |
| Browser `online` + `isLoggedIn` | Internal revalidation; if server says no session → `onLogout` (then redirect to login) |
| Page refresh + hydrated `isLoggedIn` | **No** `onLogout`; **no** login redirect; `bootstrapSession()` → `onLogin` only |
| `db.revalidateSession()` (optional) | Same as above; throws `DbSyncOfflineError` when offline |
| Sync receives `401` | `onLogout`, sync stops |

## Service workers

dbsync does not register a service worker itself. For PWA shells that survive refresh:

- **IndexedDB and `localStorage` persist** under the same origin.
- **`online` / `offline` events** still fire in controlled pages.
- **Cache auth routes with `network-only`** (Workbox or equivalent) for `/api/session`, login, and logout. A cached session response can make a dead session look alive.

Example Workbox intent (app-level):

```javascript
// Session routes must hit the network — never serve stale auth from cache
{ url: /\/api\/session/, handler: "NetworkOnly" }
```

## React

Hooks (`useDbQuery`, `useDbSession`, `DbProvider`) and subscriptions are documented in **[React.md](./React.md)**.

For offline boot specifically:

- Route from hydrated **`isLoggedIn`** — use **`useDbSession`** or `db.isLoggedIn` on first paint so refresh stays on `/app`.
- While **`!isDbReady`**, show in-app loading (or `DbProvider` **`fallback`**) — not login, not a full-screen offline gate.
- **`useDbQuery`** returns `{ loading: true, value: null }` when `!isLoggedIn` or until `init()` completes.

## Errors

| Error | When |
| --- | --- |
| `DbSyncOfflineError` | `login()` or `revalidateSession()` while `db.offline` |
| `DbSyncNotAuthenticatedError` | `init`, `start`, or data APIs while `!isLoggedIn` or `pendingLogout` |

## API quick reference

| API | Notes |
| --- | --- |
| `db.isLoggedIn` | Persisted across refresh; use for **initial** route (no login flash). |
| `db.offline` | `true` when `navigator.onLine` is false. |
| `db.online` | `!db.offline`. |
| `db.onLogin(cb)` | Returns `{ close }`. |
| `db.onLogout(cb)` | Fires early; returns `{ close }`. |
| `db.bootstrapSession()` | After hooks: replay hydrated `onLogin` once. **Not** `await`‑able; **not** `db.initted`. |
| `db.initted` | `true` after `init()` — storage ready for reads/writes. |
| `db.login(email, code)` | Network required. |
| `db.logout()` | Local wipe now; remote logout may defer. |
| `db.revalidateSession()` | Optional manual server probe; network required; invalid session → `onLogout`. |

**Not public:** `db.checkAuth()` — removed from `DbSync`; adapter authors implement `checkAuth()` on `BackendAdapter` only.

## Related docs

- [React](./React.md) — `useDbQuery`, `useDbSession`, `DbProvider`
- [Sync & auth](./Sync.md) — sync loop and session API summary
- [Getting started](./GettingStarted.md) — typed tables and `start()`
- [Adapters overview](./Adapters.md) — `requiresAuth`, adapter contract
- [RestAdapter](./RestAdapter.md) — session endpoints, offline expectations
- [LocalAdapter](./LocalAdapter.md) — no auth required
- [Documentation index](./README.md)
- [Package README](../README.md)
