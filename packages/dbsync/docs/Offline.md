# Offline-first apps

[Documentation index](./README.md) · [Adapters](./Adapters.md) · [RestAdapter](./RestAdapter.md) · [Migrating](./Migrating.md)

Session-backed apps use constructor **`auth`** config — not `db.onLogin()` / `db.onLogout()` after construction.

## Mental model

- **`db.isLoggedIn`** — hydrated from `localStorage` at module load; use for **first-paint routing**.
- **`auth.onLogout`** — runs on `db.auth.logout()`, `401`, failed revalidation, cross-tab `AUTH_LOGOUT`. **Never on refresh.**
- **`auth.onAuthenticated`** — runs on `db.auth.login()`, automatic boot when hydrated, cross-tab `AUTH_LOGIN`. Internal `start()` runs first when lifecycle is automatic.
- **`db.isBooted`** — client startup sequence has finished (pending logout flushed; `onAuthenticated` callbacks done when logged in). Does not mean the server validated the session or that sync pulled new data.
- **`db.waitForBooted()`** — await for isBooted. Note: Use **`waitForLive()`** only when you must block on a fresh sync.
- **`db.isReady`** — IndexedDB open; use for in-app loading gates.

**Router rule:** initial route = **`db.isLoggedIn` at module load** — not “wait for network” and not “default to login until IndexedDB opens”.

**Loading rule:** when `isLoggedIn`, show the **app shell** immediately; use skeletons / `useDbQuery` `loading` until `db.isReady`.

**Sync rule:** do not put `await db.waitForLive()` in default `onAuthenticated` if you want the shell visible immediately — use cached IDB data; sync in the background.

## Setup

```typescript
import { RestAdapter } from "@slimr/dbsync/adapters"

const db = new DbSync({
    adapter: new RestAdapter({ url: "https://api.example.com" }),
    tables: { posts: {} },
    auth: {
        onLogout: () => navigate("/login"),
        onAuthenticated: () => navigate("/app"), // optional
    },
})

const showApp = db.isLoggedIn

// Wait for 
// await db.waitForBooted()

await db.auth.sendCode("user@example.com")
await db.auth.login("user@example.com", "123456")
```

## When callbacks run


| Trigger                          | `auth.onAuthenticated`? | `auth.onLogout`?                      |
| -------------------------------- | ----------------------- | ------------------------------------- |
| Page refresh + logged in on disk | Yes (automatic boot)    | No                                    |
| `db.auth.login()`                | Yes                     | No                                    |
| `db.auth.logout()`               | No                      | Yes                                   |
| Sync `401` / failed revalidation | No                      | Yes                                   |
| Cross-tab `AUTH_LOGOUT`          | No                      | Yes (passive tab; no second IDB wipe) |
| Cross-tab `AUTH_LOGIN`           | Yes (passive tab)       | No                                    |


Automatic lifecycle (default): `new DbSync({ auth })` schedules boot on a microtask. React apps usually skip `await db.waitForBooted()`; headless code should call it before data access.

## State reference


| State                | Meaning                               |
| -------------------- | ------------------------------------- |
| `isLoggedIn`         | Client session flag (hydrated)        |
| `isBooted`           | Boot pipeline finished                |
| `isReady`            | IndexedDB open (`start()` finished)   |
| `isBootstrapping`    | `onAuthenticated` callbacks in flight |
| `pendingLogout`      | Remote logout queued until online     |
| `offline` / `online` | Browser connectivity                  |


`db.isReady` is not the same as `db.waitForLive()` (sync freshness).

## `LocalAdapter`

`requiresAuth: false` — data APIs work without login; with `auth`, session flow matches REST (stubbed). See [LocalAdapter](./LocalAdapter.md) and [Getting started — Developing before the backend](./GettingStarted.md#developing-before-the-backend).

## Offline behavior

- `**db.auth.sendCode()**` / `**login()**` throw `DbSyncOfflineError` when offline and `requiresAuth`.
- When the device comes **back online**, dbsync revalidates via `adapter.checkAuth()`. Invalid session → `auth.onLogout`.
- `**db.auth.revalidate()`** — optional manual probe (e.g. Retry button); throws when offline.

There is no public `db.checkAuth()` — use `db.isLoggedIn` for client state.

## Logout

1. `**auth.onLogout`** fires immediately (tear down UI before slow work).
2. Local IndexedDB cleared; sync cursors cleared.
3. Remote `adapter.logout()` when online, or `**pendingLogout**` when offline (flushed on next `online`).

Only the tab that called `db.auth.logout()` (or the online flush) hits the network for `adapter.logout()`. Other tabs run `auth.onLogout` only.

## Cross-tab auth

`BroadcastChannel` (+ `storage` event fallback) propagates `AUTH_LOGIN` / `AUTH_LOGOUT`. Passive tabs update `isLoggedIn` and run the matching `auth` callback; they do not re-clear IndexedDB on passive logout.

## Service workers

Do **not** cache session routes. Use **network-only** (or equivalent) for:

- `GET /api/session`
- `POST /api/session/login`
- `POST /api/session/logout`
- `POST /api/session/send-code`

Otherwise offline PWAs may serve stale auth responses from the cache and fight hydrated `db.isLoggedIn`. Data sync routes can use your normal caching strategy separately.

## Errors


| Error                         | When                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `DbSyncNotAuthenticatedError` | Data APIs / `getTransaction()` when not logged in (`requiresAuth`)                           |
| `DbSyncOfflineError`          | `db.auth.sendCode` / `login` / `revalidate` while offline (`requiresAuth`)                   |
| `DbSyncAuthError`             | REST auth failure (`code: "server"`); login while `pendingLogout` (`code: "pending_logout"`) |


`login`, `logout`, `subscribe`, and `waitForBooted()` remain callable when logged out (subject to offline rules for login).

## React

```tsx
const { isLoggedIn, isBooted, isReady, isBootstrapping, offline } = useDbSession(db)

if (!isLoggedIn) return <Login />
if (!isReady) return <AppSkeleton active={isBootstrapping} />
return <App />
```

Pass the module-scoped `db` instance — no context provider. See [React.md](./React.md).

## Advanced

`lifecycle: { manual: true }` — skip automatic boot/start; call `await db.boot()` then `await db.start()` when logged in (tests, exotic shells).

## See also

- [Migrating](./Migrating.md) — old API mapping
- [React](./React.md) — `useDbQuery`, `useDbSession`
- [Sync](./Sync.md) — sync loop summary
- [RestAdapter](./RestAdapter.md) — endpoints

