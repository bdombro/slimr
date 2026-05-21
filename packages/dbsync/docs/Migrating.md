# Migrating to the new session API

[Documentation index](./README.md) · [CHANGELOG](../CHANGELOG.md)

This guide maps removed public APIs to the current golden path. See **UNRELEASED** in [CHANGELOG](../CHANGELOG.md) for the full breaking list.

## Constructor `auth` (replaces hook registration)

**Before:**

```typescript
const db = new DbSync({ adapter, tables: { posts: {} } })

db.onLogout(() => navigate("/login"))
db.onLogin(async () => {
  await db.start()
})
```

**After:**

```typescript
const db = new DbSync({
  adapter,
  tables: { posts: {} },
  auth: {
    onLogout: () => navigate("/login"),
    onAuthenticated: () => navigate("/app"), // optional; start() is automatic
  },
})
```

Session adapters (`RestAdapter`) **require** `auth.onLogout`. You no longer call `db.onLogin()` / `db.onLogout()`.

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
| `db.initted` | `db.isReady` |
| `db.whenReady()` / `db.whenBooted()` / `db.ready()` / `db.boot()` (automatic) | `await db.waitForBooted()` — use `db.isLoggedIn` / `db.isBooted` |
| `db.bootstrapSession()` | Automatic microtask boot, or `await db.waitForBooted()` |

## Lifecycle flags

| Removed | Replacement |
| --- | --- |
| `autoStart` / `autoBoot` config | Omitted — adapter + `auth` infer automatic boot and `start()` |
| Manual control | `lifecycle: { manual: true }` then `await db.boot()` / `await db.start()` |

## React

| Removed | Replacement |
| --- | --- |
| `DbProvider` / `useDb` | Module-scoped `db` + `useDbSession(db)` |
| `useDbSession` → `isDbReady` | `isReady` |

## Storage / init

| Removed | Replacement |
| --- | --- |
| `db.init()` | `await db.start()` (opens IndexedDB; called automatically when logged in) |
| `db.startSyncInterval()` / `stopSyncInterval()` | `db.start()` / `db.stop()` |

## Errors

`RestAdapter` auth failures now throw `DbSyncAuthError` (`code: "server"`) instead of a plain `Error` string. Pending logout during login throws `DbSyncAuthError` (`code: "pending_logout"`).

## See also

- [Getting started](./GettingStarted.md)
- [Offline-first apps](./Offline.md)
