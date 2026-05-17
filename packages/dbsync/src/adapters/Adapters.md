# Backend Adapters

`@slimr/dbsync` relies on a modular `BackendAdapter` architecture to handle remote synchronization. By default, it expects you to use `RestAdapter`, but the interface is designed to let you plug your local IndexedDB database into any backend (like Firebase, GraphQL, or websockets).

## The `BackendAdapter` Interface

When writing a custom adapter, you simply need to implement the following TypeScript interface:

```typescript
export interface SyncPullResult {
    items: any[]
    hasMore: boolean
}

export interface BackendAdapter {
    checkAuth(): Promise<boolean>
    login(email: string, code: string): Promise<boolean>
    logout(): Promise<void>
    pull(cursor: string): Promise<SyncPullResult>
    push(payload: any[]): Promise<void>
}
```

### Authentication Contract

- **`checkAuth()`**: Resolves to `true` if the user has an active session, otherwise `false`.
- **`login(email, code)`**: Validates the login against your backend and resolves to `true` on success.
- **`logout()`**: Destroys the remote session. (Note: `DbSync` will automatically handle clearing the local IndexedDB database when logout occurs).

### Synchronization Contract

The sync engine handles pushing queued modifications and pulling new global data independently of your adapter. Your adapter's job is simply to broker the JSON.

- **`pull(cursor: string)`**: Responsible for fetching newly updated records from your backend. It receives a `cursor` (typically an ISO timestamp) indicating the newest record the client already has. It must return a `SyncPullResult` containing the rows, and a `hasMore` boolean to let the SyncEngine loop handle pagination.
- **`push(payload)`**: Responsible for taking an array of mutated records and executing their writes to the backend database.

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

---

### Officially Supported Adapters

- [LocalAdapter (`@slimr/dbsync/adapters`)](./LocalAdapter.ts) — A no-op adapter if you just want to use the IndexedDB ORM features without any backend syncing.
- [RestAdapter (`@slimr/dbsync/adapters`)](./RestAdapter.md) — The default REST adapter built to pair seamlessly with `swift-crud`.
