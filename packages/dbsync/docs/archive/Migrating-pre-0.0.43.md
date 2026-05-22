# Migrating (archived)

> **Archived** — documents upgrades from pre-0.0.43 APIs. Current breaking changes are in [CHANGELOG UNRELEASED](../../CHANGELOG.md). New apps should start with [Getting started](../GettingStarted.md) and [Offline-first apps](../Offline.md).

[Documentation index](../README.md) · [CHANGELOG](../../CHANGELOG.md)

## Session listeners (replaces constructor `auth`)

**Before:**

```typescript
const db = new DbSync({
  adapter,
  tables: { posts: {} },
  auth: {
    onLogout: () => navigate("/login"),
    onAuthenticated: () => navigate("/app"),
  },
})
```

**After:**

```typescript
const db = new DbSync({ adapter, tables: { posts: {} } })

const offLogout = db.auth.onLogout(() => navigate("/login"))
const offAuth = db.auth.onAuthenticated(() => navigate("/app")) // optional

// later: offLogout.close(); offAuth.close();
```

Register listeners in the same module immediately after `new DbSync`, before any `await`.

`onAuthenticated` runs on **login and cross-tab login only** — not refresh boot. Route refresh on `db.auth.isLoggedIn`.

## Session on `db.auth` and sync on `db.sync`

| Removed | Replacement |
| --- | --- |
| `db.session` (`get` / `subscribe`) | `db.auth` getters + `db.auth.onChange()` |
| `db.auth.onSessionChange` | `db.auth.onChange()` |
| Root `db.isReady` / `isBooted` / `offline` | `db.auth.isReady` / `isBooted` / `offline` |
| `db.start()` / `stop()` / `triggerSync()` | `db.sync.start()` / `stop()` / `trigger()` |
| Root `db.isLive` / `isStarted` / `isInitialSyncPending` | `db.sync.*` or `db.auth.phase` / `isInitialSyncPending` |
| `db.onSyncStateChange` | `db.sync.onStateChange` |
| `db.waitForLive()` | `db.sync.waitForLive()` |
| Nested `useDbSession` snapshot | `useDbAuth` — flat `DbAuthState`; `useDbSession` deprecated |
| `onLogout` / `onAuthenticated` return `() => void` | `{ close() }` |

`db.waitForBooted()` and `db.boot()` stay on the root `db` instance.

## Auth actions → `db.auth`

| Removed | Replacement |
| --- | --- |
| `db.sendCode(email)` | `db.auth.sendCode(email)` |
| `db.login(email, code)` | `db.auth.login(email, code)` |
| `db.logout()` | `db.auth.logout()` |
| `db.revalidateSession()` | `db.auth.revalidate()` |

## Readiness

| Removed | Replacement |
| --- | --- |
| `db.initted` | `db.auth.isReady` |
| `db.whenReady()` / `db.ready()` / `db.boot()` (automatic) | `await db.waitForBooted()` |
| `db.bootstrapSession()` | Automatic microtask boot |

## Lifecycle flags

| Removed | Replacement |
| --- | --- |
| `autoStart` / `autoBoot` | Omitted — automatic when not `lifecycle.manual` |
| Manual control | `lifecycle: { manual: true }` then `await db.boot()` / `await db.sync.start()` |

## React

| Removed | Replacement |
| --- | --- |
| `DbProvider` / `useDb` | Module-scoped `db` + `useDbAuth(db)` |
| `useDbSession` nested snapshot | `useDbAuth` — flat `DbAuthState` from `db.auth` getters |

## See also

- [Getting started](../GettingStarted.md)
- [Auth listeners](../Auth.md)
- [Offline-first apps](../Offline.md)
