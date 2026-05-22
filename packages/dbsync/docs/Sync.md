# Sync engine

[Documentation index](./README.md) · [Auth listeners](./Auth.md) · [Adapters](./Adapters.md) · [RestAdapter](./RestAdapter.md)

How `@slimr/dbsync` moves data between IndexedDB and your backend after the app is booted and (when required) logged in.

## Write path

1. App code calls `db.posts.add` / `put` / `patch` / `delete` (or lower-level `db.put`, etc.).
2. The write lands in IndexedDB immediately — the UI never waits on the network.
3. Each mutation is recorded in internal stores:
   - **`dirtyQueue`** — inserts and updates (payload + table + timestamp).
   - **`deletedQueue`** — tombstones for deletes.

On the next successful sync cycle, queued rows are pushed, then removed from those stores.

## Sync cycle

When `db.sync.start()` runs (automatically after boot when logged in, or manually), the engine starts a timer (`db.syncInterval`, default **5000 ms**) and runs **one sync cycle immediately** (same as `db.sync.trigger()`). Each tick:

1. **Skip** if offline, or `!auth.canSync()` (not logged in or `pendingLogout`).
2. Acquire the **`dbsync-leader`** Web Lock (if `navigator.locks` exists) so only one tab syncs at a time.
3. **`syncPull`** — paginated `adapter.pull(cursor)`; cursor is `dbsync-pullSyncedUpTo` in `localStorage`.
4. **`syncPush`** — batch `adapter.push(payload)` from `dirtyQueue` + `deletedQueue`, plus optional schema system records.
5. On success, set `dbsync-lastSuccessAt` and sync state **`idle`**.

On **401**, the engine calls `auth.invalidateSession()` (logout flow) and stops the timer.

Trigger a single pass without waiting for the interval:

```typescript
await db.sync.trigger()
```

## Readiness vs sync

| API | Meaning |
| --- | --- |
| `db.waitForBooted()` | Session replay + internal `sync.start()` scheduled — **not** “server data loaded”. |
| `db.auth.isReady` | IndexedDB open. |
| `db.sync.isStarted` | Sync timer running. |
| `db.sync.isLive` | Last successful sync within ~4× `syncInterval`. |
| `db.auth.phase` / `phase$` | Shell phases: `logged-out` → `booting` → `initial-sync` → `ready` — primary React routing signal. |
| `db.auth.isInitialSyncPending` / `isInitialSyncPending$` | Logged in, no successful sync since login (true during `booting` and `initial-sync`). Optional one loader for both. |
| `db.sync.waitForInitial()` | Promise until first successful sync since login. |
| `db.sync.waitForLive()` | Polls until `isLive` (rejects if sync never started). |
| `db.sync.state$` / `state` | `"idle"` \| `"syncing"` \| `"offline"` \| `"error"`. |

**App rule:** use `db.auth.phase` for the shell; use `useDbQuery` `loading` for per-table data. See [Integration guide](./Offline.md#anti-patterns).

## Pull / push shape

Your adapter receives and returns records in the REST envelope (see [RestAdapter](./RestAdapter.md)):

- `variant` — table name, or `__dbsync_system` for schema version records.
- `content` — JSON string of the row body.
- `isDeleted` — tombstone flag.
- `updatedAt` — ISO timestamp used as the pull cursor.

## Cross-tab data coherence

Local writes notify subscribers via `db.updates$` / `db.posts.subscribe`. The same channel mirrors updates to other tabs via `BroadcastChannel` `dbsync_events`.

Auth uses the same channel (`AUTH_LOGIN` / `AUTH_LOGOUT`) — see [Auth listeners](./Auth.md).

## Leader election

**Web Locks** (`navigator.locks.request("dbsync-leader", ...)`) ensure one tab performs `performSync` per tick.

## Conflict model

Sync is **last-write-wins** at the record level using `updatedAt` ordering on pull.

## See also

- [Integration guide](./Offline.md)
- [API reference](./API.md)
- [Debugging](./Debugging.md)
