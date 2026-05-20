# RestAdapter

The `RestAdapter` is the default backend adapter shipped with `@slimr/dbsync`.

It maps the offline-first IndexedDB synchronizer to a very specific set of REST JSON endpoints. The easiest way to satisfy these expectations on your server is to use the officially supported backend, [swift-crud](https://github.com/bdombro/swift-crud) — a ready-made Go + SQLite API built specifically for this architecture.

You can instantiate `RestAdapter` by providing your API's base URL:

```typescript
import { RestAdapter } from "@slimr/dbsync/adapters";

const adapter = new RestAdapter({ url: "https://api.myapp.com" });
```

---

## API Expectations

If you are building your own backend instead of using `swift-crud`, your server must implement the following endpoints and JSON shapes for `RestAdapter` to function without throwing errors.

### 1. Data Pull: `GET /api/posts`

Used to fetch remote changes and sync them to the local IndexedDB.

**Query Parameters:**
- `after`: A cursor (an ISO 8601 timestamp string) representing the `updatedAt` of the last synced record on the client.
- `limit`: The maximum number of records to return per page.

**Response Shape:**
```json
{
  "items": [
    {
      "id": "uuid-string",
      "variant": "tableName",
      "content": "{\"field\": \"value\"}",
      "isDeleted": false,
      "updatedAt": "2026-05-17T12:00:00.000Z"
    }
  ],
  "hasMore": false
}
```

### 2. Data Push: `POST /api/posts/upsert-many`

Used to push queued local changes (both inserts/updates and deletes) to the backend.

**Request Body:**
An array of mutated records stringified exactly like the Pull response:
```json
[
  {
    "id": "uuid-string",
    "variant": "tableName",
    "content": "{\"field\": \"value\"}",
    "isDeleted": false,
    "updatedAt": "2026-05-17T12:00:00.000Z"
  }
]
```

### 3. Session Endpoints

The session endpoints expect basic HTTP Cookie-based authentication mechanisms.

- **Check Auth:** `GET /api/session` (Returns 200 OK if the browser cookie is an authenticated session, 4xx otherwise)
- **Login:** `POST /api/session/login` (Expects JSON body `{ "email": "...", "code": "..." }` and should set the auth cookie here)
- **Logout:** `POST /api/session/logout` (Destroys the session cookie)

`RestAdapter` uses the default **`requiresAuth: true`**. Apps must be logged in before `init()` / `start()` and data APIs. See [Offline.md](./Offline.md) for boot flow with `onLogin` / `onLogout`.

### Session endpoints and offline behavior

| Client call | Offline behavior |
| --- | --- |
| `db.login()` | Throws `DbSyncOfflineError` — login needs the network. |
| `db.revalidateSession()` (optional) | Throws `DbSyncOfflineError` when offline. Automatic revalidation on `online` — no public `db.checkAuth()`. Use `db.isLoggedIn` until then. |
| `db.logout()` | Clears local IndexedDB immediately; **defers** `POST /api/session/logout` until online (`dbsync-pendingLogout`). |
| Browser `online` + logged in | dbsync calls `GET /api/session`; if 4xx, fires `onLogout`. Also flushes pending logout. |

**Service workers:** Do not cache session routes. Use `network-only` for `/api/session`, login, and logout so offline PWAs do not read stale auth from the cache. See [Offline.md](./Offline.md).
