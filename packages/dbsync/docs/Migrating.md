# Migrating to the new session API

[Documentation index](./README.md) · [CHANGELOG](../CHANGELOG.md)

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

// later: offLogout(); offAuth();
```

Register listeners in the same module immediately after `new DbSync`, before any `await`.

`onAuthenticated` runs on **login and cross-tab login only** — not refresh boot. Route refresh on `db.auth.isLoggedIn`.

## Session state → `db.auth`

| Removed (root `db`) | Replacement |
| --- | --- |
| `db.isLoggedIn` | `db.auth.isLoggedIn` |
| `db.pendingLogout` | `db.auth.pendingLogout` |
| `db.isBootstrapping` | `db.auth.isBootstrapping` |
| `db.onSessionChange` | `db.auth.onSessionChange` |

`db.isBooted`, `db.waitForBooted()`, and `db.boot()` stay on the root `db` instance.

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
| `db.whenReady()` / `db.ready()` / `db.boot()` (automatic) | `await db.waitForBooted()` |
| `db.bootstrapSession()` | Automatic microtask boot |

## Lifecycle flags

| Removed | Replacement |
| --- | --- |
| `autoStart` / `autoBoot` | Omitted — automatic when not `lifecycle.manual` |
| Manual control | `lifecycle: { manual: true }` then `await db.boot()` / `await db.start()` |

## React

| Removed | Replacement |
| --- | --- |
| `DbProvider` / `useDb` | Module-scoped `db` + `useDbSession(db)` |
| `useDbSession` → `isDbReady` | `isReady` |

## See also

- [Getting started](./GettingStarted.md)
- [Session](./Session.md)
- [Offline-first apps](./Offline.md)
