# Offline-first apps

[Documentation index](./README.md) · [Session](./Session.md) · [Sync engine](./Sync.md) · [Migrating](./Migrating.md)

How to build SPAs and PWAs where IndexedDB is the runtime database and the network is asynchronous.

## Mental model

- **`db.auth.isLoggedIn`** — hydrated from `localStorage` at module load; use for **first-paint routing**.
- **`db.auth.onLogout(fn)`** — subscribe before any `await`; runs in parallel, awaited before IDB clear on active-tab logout. **Never on refresh.**
- **`db.auth.onAuthenticated(fn)`** — optional; runs on **`login()`** and cross-tab **`AUTH_LOGIN` only** — **not** refresh boot.
- **Boot (automatic)** — internal `start()` when hydrated; does **not** call `onAuthenticated`.
- **`db.isBooted`** / **`db.waitForBooted()`** — boot pipeline finished. Not server validation or a completed pull — see [Sync](./Sync.md).

**Router rule:** initial route = **`db.auth.isLoggedIn` at module load**.

**Loading rule:** when `isLoggedIn`, show the app shell immediately; use skeletons / `useDbQuery` `loading` until `db.isReady`.

**Data rule (imperative code):** `await db.waitForBooted()` before the first `db.posts.*` / `db.put` in scripts, tests, or event handlers. React components usually skip it — `useDbQuery` waits for `isReady`.

**Sync rule:** do not put `await db.waitForLive()` in `onAuthenticated` if you want the shell visible immediately.

Canonical setup (typed tables, env swap): [Getting started](./GettingStarted.md). Auth API tables: [Session](./Session.md).

## State reference

| State | Meaning |
| --- | --- |
| `isLoggedIn` | Client session flag (hydrated) |
| `isBooted` | Boot pipeline finished |
| `isReady` | IndexedDB open |
| `isBootstrapping` | Session-start or `onAuthenticated` callbacks in flight |
| `pendingLogout` | Remote logout queued until online |
| `offline` / `online` | Browser connectivity |
| `isStarted` / `isLive` | Sync timer / recent successful sync — [Sync](./Sync.md) |

## Offline auth behavior

- **`db.auth.sendCode()`** / **`login()`** throw `DbSyncOfflineError` when offline and `requiresAuth` — see [Errors](./Errors.md).
- When back **online**, dbsync revalidates; invalid session → `onLogout` listeners.
- **`db.auth.revalidate()`** — optional manual probe.

## Logout pipeline

1. Sync stops; `isLoggedIn` set false.
2. **`onLogout` listeners** run in parallel (`Promise.allSettled`).
3. IndexedDB cleared (active tab); sync cursor keys cleared.
4. Rejections propagate **after** step 3.
5. Remote `adapter.logout()` when online, or **`pendingLogout`** when offline.

Passive tabs: `AUTH_LOGOUT` over `BroadcastChannel` — listeners only, no IDB wipe, no `adapter.logout()`.

## React shell

```tsx
const { isLoggedIn, isBooted, isReady, isBootstrapping, offline } = useDbSession(db)

if (!isLoggedIn) return <Login />
if (!isReady) return <AppSkeleton active={isBootstrapping} />
return <App />
```

Module-scoped `db`; pass it to hooks explicitly. Details: [React](./React.md).

## Service workers (PWAs)

Session routes must not be served from cache while offline — stale `GET /api/session` makes the client think it is still logged in.

- Use **`network-only`** (or equivalent) for `/api/session`, send-code, login, and logout.
- Do not precache auth responses in the app shell.
- Data pull/push can use your normal API caching policy; session probes should always hit the network when online.

Rest endpoint list: [RestAdapter](./RestAdapter.md).

## Advanced

`lifecycle: { manual: true }` — `await db.boot()` then `await db.start()` when logged in.

## See also

- [Getting started](./GettingStarted.md)
- [Session](./Session.md)
- [Sync engine](./Sync.md)
- [React](./React.md)
- [SSR & Next.js](./SSR.md)
- [RestAdapter](./RestAdapter.md)
