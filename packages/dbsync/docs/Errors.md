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

Thrown when a network-backed auth action runs while offline and the adapter has `requiresAuth: true` (default for `RestCookieAdapter` / `RestBearerAdapter`):

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

`RestCookieAdapter` and `RestBearerAdapter` set `serverMessage` from swift-crud `{ message }` JSON when present, and `status` / `serverCode` from the response.

## `DbSyncError` Interface

For unified error handling (such as in debug event listeners), `@slimr/dbsync` defines the `DbSyncError` interface. All errors thrown or emitted by `@slimr/dbsync` satisfy this interface:

```typescript
import type { DbSyncError, ErrorSeverity, DbSyncErrorCode } from "@slimr/dbsync"

export interface DbSyncError extends Error {
  readonly severity: ErrorSeverity // 0 | 1 | 2
  readonly code?: DbSyncErrorCode
}
```

Any unknown runtime or network errors caught internally are normalized to this shape via an internal helper, ensuring they always have a `severity` property (defaulting to `1` for unrecognized errors).

### Severity Levels (`ErrorSeverity`)

The `severity` field classifies errors to simplify handling and filter noise (such as transient network drops vs. authentication failures):

| Severity | Meaning | Example Errors / Codes | Typical Action |
| --- | --- | --- | --- |
| `0` | **Transient / Expected** | `DbSyncOfflineError` (offline), network fetch drops (`server` code) | Ignore, or show a subtle offline indicator |
| `1` | **Unexpected but Non-critical** | `server_error`, `not_found`, `conflict`, generic runtime errors | Log to telemetry / console, optionally toast |
| `2` | **Action Required** | `DbSyncNotAuthenticatedError` (not_authenticated), auth invalidation (`unauthorized`, `forbidden`) | Prompt user to log in again / redirect to login page |

## See also

- [Auth listeners](./Auth.md) — callbacks
- [RestCookieAdapter](./RestCookieAdapter.md) / [RestBearerAdapter](./RestBearerAdapter.md) — endpoint errors

