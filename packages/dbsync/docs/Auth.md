# Auth listeners

[Documentation index](./README.md) · [Integration guide](./Offline.md) · [API reference](./API.md)

Listener and action reference for `db.auth`. For app shell routing, phase rules, and getters, see [Integration guide](./Offline.md). For full method tables, see [API reference](./API.md).

## Subscribe (register before any `await`)

```typescript
const offLogout = db.auth.onLogout(() => navigate("/login"))
const offAuth = db.auth.onAuthenticated(() => navigate("/app")) // optional
// Session UI: db.auth.phase$.use() etc. — see [React](./React.md)

// later: offLogout.close(); offAuth.close();
```

| Listener | Runs on |
| --- | --- |
| `onLogout` | `db.auth.logout()`, 401 / failed revalidation, cross-tab `AUTH_LOGOUT` — **not** refresh |
| `onAuthenticated` | `db.auth.login()`, cross-tab `AUTH_LOGIN` — **not** refresh boot |
| `db.auth.*$` + `.use()` on `DbSyncR` | Granular session/sync UI — [React](./React.md) |

Listeners return `{ close() }` to unsubscribe. Logout listeners run in parallel (`Promise.allSettled`); rejections throw after teardown completes.

## Actions

| API | Role |
| --- | --- |
| `db.auth.sendCode(email)` | Request login code (network required when `requiresAuth`) |
| `db.auth.login(email, code)` | Establish session; runs `onAuthenticated` |
| `db.auth.logout()` | Clear local data; remote logout when online |
| `db.auth.revalidate()` | Manual `checkAuth` probe |

## Boot (`db`)

| API | Role |
| --- | --- |
| `db.waitForBooted()` | Boot pipeline finished (internal `sync.start()` when logged in) |
| `db.boot()` | Only when `lifecycle: { manual: true }` |
| `lifecycle.manual` | Opt out of automatic boot / `sync.start()` |

## Callback matrix

| Trigger | `onAuthenticated`? | `onLogout`? |
| --- | --- | --- |
| Page refresh + logged in on disk | No | No |
| `db.auth.login()` | Yes | No |
| `db.auth.logout()` | No | Yes |
| Sync `401` / failed revalidation | No | Yes |
| Cross-tab `AUTH_LOGIN` | Yes | No |
| Cross-tab `AUTH_LOGOUT` | No | Yes (passive tab — no IDB wipe) |

## See also

- [Integration guide](./Offline.md) — routing, phases, anti-patterns
- [API reference](./API.md) — `db.auth` getters
