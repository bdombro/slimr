# Errors

[Documentation index](./README.md) · [Session](./Session.md) · [Offline-first apps](./Offline.md)

Typed errors exported from `@slimr/dbsync`:

```typescript
import {
  DbSyncOfflineError,
  DbSyncNotAuthenticatedError,
  DbSyncAuthError,
} from "@slimr/dbsync"
```

## `DbSyncOfflineError`

Thrown when a network-backed auth action runs while offline and the adapter has `requiresAuth: true` (default for `RestAdapter`):

- `db.auth.sendCode()`
- `db.auth.login()`
- `db.auth.revalidate()`

Not thrown for `db.auth.logout()` — local teardown proceeds and remote logout may defer.

## `DbSyncNotAuthenticatedError`

Thrown when guarded data APIs run without a session:

- `db.get` / `put` / `patch` / `delete` / `clear`
- `db.getTransaction()`
- Table repositories on adapters with `requiresAuth: true`

Call `await db.waitForBooted()` before the first data access in scripts/tests, then ensure `db.isLoggedIn` when `requiresAuth` is true.

## `DbSyncAuthError`

Auth adapter failures and blocked login. `code` is one of:

| Code | Typical cause |
| --- | --- |
| `offline` | Adapter reported offline (REST helpers) |
| `pending_logout` | `login()` while `pendingLogout` is set |
| `server` | `sendCode` / `login` HTTP failure |

`RestAdapter` sets `serverMessage` from swift-crud `{ message }` JSON when present.

## See also

- [Session](./Session.md) — auth API
- [RestAdapter](./RestAdapter.md) — endpoint errors
