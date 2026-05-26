# Errors

[Documentation index](./README.md) · [Auth listeners](./Auth.md) · [Integration guide](./Offline.md)

Typed errors exported from `@slimr/dbsync`:

```typescript
import {
  DbSyncOfflineError,
  DbSyncNotAuthenticatedError,
  DbSyncHttpError,
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

Call `await db.waitForBooted()` before the first data access in scripts/tests, then ensure `db.auth.isLoggedIn` when `requiresAuth` is true.

## `DbSyncHttpError`

HTTP adapter failures and blocked login. Properties:

| Field | Type | Description |
| --- | --- | --- |
| `code` | `"offline" \| "pending_logout" \| "server"` | Error category |
| `status` | `number \| undefined` | HTTP response status code |
| `serverCode` | `string \| undefined` | Application-level error code from the server body (`{ code }`) |
| `serverMessage` | `string \| undefined` | Human-readable message from the server body (`{ message }`) |

`code` values:

| Code | Typical cause |
| --- | --- |
| `offline` | Adapter reported offline (REST helpers) |
| `pending_logout` | `login()` while `pendingLogout` is set |
| `server` | `sendCode` / `login` / `pull` / `push` HTTP failure |

`RestAdapter` sets `serverMessage` from swift-crud `{ message }` JSON when present, and `status` / `serverCode` from the response.

## See also

- [Auth listeners](./Auth.md) — callbacks
- [RestAdapter](./RestAdapter.md) — endpoint errors
