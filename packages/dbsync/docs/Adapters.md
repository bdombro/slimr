# Backend Adapters

`@slimr/dbsync` relies on a modular `BackendAdapter` architecture to handle remote synchronization. By default, it expects you to use one of the built-in REST adapters (`RestCookieAdapter` or `RestBearerAdapter`), but the interface is designed to let you plug your local IndexedDB database into any backend (like Firebase, GraphQL, or websockets).

For offline-first session flows, see [Offline.md](./Offline.md). Package docs: [docs/README.md](./README.md).

## The `BackendAdapter` Interface

When writing a custom adapter, implement the following TypeScript interface:

```typescript
export interface SyncPullResult {
    items: any[]
    hasMore: boolean
}

export interface BackendAdapter {
    /** When false, DbSync skips auth guards (e.g. LocalAdapter). Default true if omitted. */
    readonly requiresAuth?: boolean

    checkAuth(): Promise<boolean>
    login(email: string, code: string): Promise<boolean>
    logout(): Promise<void>
    sendCode(email: string): Promise<boolean>
    pull(cursor: string): Promise<SyncPullResult>
    push(payload: any[]): Promise<void>
}
```

### `requiresAuth`

| Value | Meaning |
| --- | --- |
| `true` (default) | Data APIs require `db.auth.isLoggedIn`. Subscribe `db.auth.onLogout` for session teardown. |
| `false` | Data guards skipped (`LocalAdapter`); optional `db.auth.onLogout` / `onAuthenticated` for session UI. |

Pre-backend development: env-swap `LocalAdapter` with the same listeners — [Getting started](./GettingStarted.md#developing-before-the-backend).

### Authentication Contract

- **`checkAuth()`**: Resolves to `true` if the user has an active session, otherwise `false`. **Adapter contract only** — `DbSync` calls this internally on `online`. Apps use `db.auth.isLoggedIn` and `db.auth.onLogout`; optional `db.auth.revalidate()` for a manual probe.
- **`sendCode(email)`**: Requests a one-time login code for the given email. Requires network on REST backends.
- **`login(email, code)`**: Validates credentials and establishes a session. Requires network.
- **`logout()`**: Destroys the remote session on the server.

**How `DbSync` uses logout:**

1. On `db.auth.logout()`, dbsync sets `isLoggedIn` false, runs **`db.auth.onLogout` listeners** (parallel, awaited), then clears IndexedDB.
2. Then it calls **`adapter.logout()`** if online.
3. If **offline**, it sets `dbsync-pendingLogout` and calls `adapter.logout()` on the next `online` event (only from the originating tab / flush path — not from passive tabs).

Passive tabs never invoke `adapter.logout()`; they receive `AUTH_LOGOUT` over `BroadcastChannel` and run `onLogout` listeners only.

### Synchronization Contract

The sync engine handles pushing queued modifications and pulling new global data — see [Sync engine](./Sync.md). Your adapter brokers the JSON envelope.

- **`pull(cursor: string)`**: Fetches records updated after the cursor (typically an ISO timestamp). Returns `items` and `hasMore` for pagination.
- **`push(payload)`**: Applies queued local mutations on the backend.

Sync is skipped while `dbsync-pendingLogout` is set (prevents repopulating local data before the server session ends).

### Schema Versioning Records

Because `@slimr/dbsync` handles local schema migrations automatically via signature diffing, it must occasionally send a "System Record" in the `push()` payload to alert other tabs and devices of the schema change.

These records arrive in `push(payload)` formatted roughly like this:

```json
{
    "id": "version",
    "variant": "__dbsync_system",
    "content": "{\"signature\":\"[[schema hash]]\"}",
    "isDeleted": false,
    "updatedAt": "2026-05-17T12:00:00.000Z"
}
```

**Your custom backend adapter must save these records securely alongside the rest of your user data,** as they must be returned in future `pull()` queries so other clients remain fully in sync.

## LocalAdapter

[Documentation index](./README.md) · [Getting started](./GettingStarted.md#developing-before-the-backend)

Use when the app is local-only, when sync is disabled per environment, or when you **swap adapters in one app** while the backend is not ready.

### `requiresAuth: false`

- **Data guards off** — data APIs work without `db.auth.isLoggedIn`.
- **Session APIs on** — with `db.auth.onLogout` / `onAuthenticated`, behavior matches REST (stubbed network).
- **`useDbQuery`** does not block on `!isLoggedIn`.

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"

const db = new DbSync({ adapter: new LocalAdapter(), tables: { posts: {} } })
db.auth.onLogout(() => navigate("/login"))

await db.auth.login("dev@local", "000") // optional; works offline

await db.waitForBooted()
await db.posts.add({ userId: "1", content: "Hello" })
```

Without session listeners, IndexedDB still opens automatically on construction. React apps can skip `waitForBooted()` in components — [React](./React.md).

For production session-backed sync, use [RestCookieAdapter](./RestCookieAdapter.md) or [RestBearerAdapter](./RestBearerAdapter.md) and [Integration guide](./Offline.md).

## REST Adapters

- [RestCookieAdapter](./RestCookieAdapter.md) — `requiresAuth: true` (default); session cookie based.
- [RestBearerAdapter](./RestBearerAdapter.md) — `requiresAuth: true` (default); Bearer token based (stored in localStorage); pairs with modern REST backends (e.g. `swift-crud`).
