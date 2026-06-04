# RestCookieAdapter

[Documentation index](./README.md) · [Sync engine](./Sync.md) · [Auth listeners](./Auth.md)

The `RestCookieAdapter` is a cookie-backed REST implementation of the backend adapter contract.

You can instantiate `RestCookieAdapter` by providing your API's base URL:

```typescript
import { RestCookieAdapter } from "@slimr/dbsync/adapters";

const adapter = new RestCookieAdapter({ url: "https://api.myapp.com" });
```

---

## API Expectations

Your server must implement the following endpoints and JSON shapes for `RestCookieAdapter` to function without throwing errors.

### 1. Data Pull: `GET /api/posts`

Used to fetch remote changes and sync them to the local IndexedDB.

**Query Parameters:**
- `after`: Pull cursor — **Unix epoch milliseconds** (string of ms, e.g. `1715904000000`) from the previous page’s last item `updatedAt`.
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
      "updatedAt": 1715904000000
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
- **Send Code:** `POST /api/session/send-code` (Expects JSON body `{ "email": "..." }` and emails a one-time login code). On failure, returns `{ "message": "..." }`; `RestCookieAdapter` throws `DbSyncHttpError` with `serverMessage`, `status`, and `serverCode`.
- **Login:** `POST /api/session/login` (Expects JSON body `{ "email": "...", "code": "..." }` and should set the auth cookie here). On failure, same `{ "message" }` error shape.
- **Logout:** `POST /api/session/logout` (Destroys the session cookie)

`RestCookieAdapter` uses the default **`requiresAuth: true`**. Subscribe `db.auth.onLogout` after construction; automatic boot opens IndexedDB when logged in. See [Offline.md](./Offline.md).

### Session endpoints and offline behavior

| Client call | Offline behavior |
| --- | --- |
| `db.auth.sendCode()` | Throws `DbSyncOfflineError` when offline — needs the network. |
| `db.auth.login()` | Throws `DbSyncOfflineError` — login needs the network. |
| `db.auth.revalidate()` (optional) | Throws `DbSyncOfflineError` when offline. Automatic revalidation on `online`. |
| `db.auth.logout()` | Clears local IndexedDB immediately; **defers** `POST /api/session/logout` until online (`dbsync-pendingLogout`). |
| Browser `online` + logged in | dbsync calls `GET /api/session`; if 4xx, runs `onLogout` listeners. Also flushes pending logout. |
