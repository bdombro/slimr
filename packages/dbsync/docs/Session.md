# Session API

[Documentation index](./README.md) · [Offline-first apps](./Offline.md) · [Sync engine](./Sync.md)

Quick reference for authentication and boot. Full `DbSync` surface: [API reference](./API.md). For routing, refresh behavior, and React patterns, see [Offline-first apps](./Offline.md). Setup lives in [Getting started](./GettingStarted.md).

## Subscribe (register before any `await`)

```typescript
const offLogout = db.auth.onLogout(() => navigate("/login"))
const offAuth = db.auth.onAuthenticated(() => navigate("/app")) // optional

// later: offLogout(); offAuth();
```

| Listener | Runs on |
| --- | --- |
| `onLogout` | `db.auth.logout()`, 401 / failed revalidation, cross-tab `AUTH_LOGOUT` — **not** refresh |
| `onAuthenticated` | `db.auth.login()`, cross-tab `AUTH_LOGIN` — **not** refresh boot |

Listeners return `() => void` to unsubscribe. Logout listeners run in parallel (`Promise.allSettled`); rejections throw after teardown completes.

## Actions

| API | Role |
| --- | --- |
| `db.auth.sendCode(email)` | Request login code (network required when `requiresAuth`) |
| `db.auth.login(email, code)` | Establish session; runs `onAuthenticated` |
| `db.auth.logout()` | Clear local data; remote logout when online |
| `db.auth.revalidate()` | Manual `checkAuth` probe |

## Session state (`db.auth`)

| API | Role |
| --- | --- |
| `db.auth.isLoggedIn` | Hydrated client session (use for first paint) |
| `db.auth.pendingLogout` | Remote logout queued until online |
| `db.auth.isBootstrapping` | Session-start or `onAuthenticated` callbacks in flight |
| `db.auth.onSessionChange(cb)` | Fires on session flag changes |

## Boot and lifecycle (`db`)

| API | Role |
| --- | --- |
| `db.waitForBooted()` | Boot pipeline finished (internal `start()` when logged in) |
| `db.isBooted` | Same, sync check |
| `db.isReady` | IndexedDB open |
| `db.boot()` | Only when `lifecycle: { manual: true }` |
| `lifecycle.manual` | Opt out of automatic boot / `start()` |

Automatic lifecycle: microtask boot on construction when not manual. Headless scripts: `await db.waitForBooted()` before data access.

## Callback matrix

| Trigger | `onAuthenticated`? | `onLogout`? |
| --- | --- | --- |
| Page refresh + logged in on disk | No | No |
| `db.auth.login()` | Yes | No |
| `db.auth.logout()` | No | Yes |
| Sync `401` / failed revalidation | No | Yes |
| Cross-tab `AUTH_LOGOUT` | No | Yes (passive; no IDB wipe) |
| Cross-tab `AUTH_LOGIN` | Yes | No |

## See also

- [Errors](./Errors.md) — `DbSyncOfflineError`, `DbSyncNotAuthenticatedError`, `DbSyncAuthError`
- [RestAdapter](./RestAdapter.md) — session HTTP endpoints
- [Migrating](./Migrating.md) — upgrade from constructor `auth`
