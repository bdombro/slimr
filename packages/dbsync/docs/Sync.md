# Sync engine

[Documentation index](./README.md) · [Session](./Session.md) · [Adapters](./Adapters.md) · [RestAdapter](./RestAdapter.md)

How `@slimr/dbsync` moves data between IndexedDB and your backend after the app is booted and (when required) logged in.

## Write path

1. App code calls `db.posts.add` / `put` / `patch` / `delete` (or lower-level `db.put`, etc.).
2. The write lands in IndexedDB immediately — the UI never waits on the network.
3. Each mutation is recorded in internal stores:
   - **`dirtyQueue`** — inserts and updates (payload + table + timestamp).
   - **`deletedQueue`** — tombstones for deletes.

On the next successful sync cycle, queued rows are pushed, then removed from those stores.

## Sync cycle

When `db.start()` runs (automatically after boot when logged in, or manually), the engine starts a timer (`db.syncInterval`, default **5000 ms**) and runs **one sync cycle immediately** (same as `triggerSync()`). Each tick:

1. **Skip** if offline, or `!auth.canSync()` (not logged in or `pendingLogout`).
2. Acquire the **`dbsync-leader`** Web Lock (if `navigator.locks` exists) so only one tab syncs at a time.
3. **`syncPull`** — paginated `adapter.pull(cursor)`; cursor is `dbsync-pullSyncedUpTo` in `localStorage` (last `updatedAt` from the previous page).
4. **`syncPush`** — batch `adapter.push(payload)` from `dirtyQueue` + `deletedQueue`, plus optional schema system records.
5. On success, set `dbsync-lastSuccessAt` and sync state **`idle`**.

On **401**, the engine calls `auth.invalidateSession()` (logout flow) and stops the timer.

Trigger a single pass without waiting for the interval:

```typescript
await db.triggerSync()
```

## Pull / push shape

Your adapter receives and returns records in the REST envelope (see [RestAdapter](./RestAdapter.md)):

- `variant` — table name, or `__dbsync_system` for schema version records.
- `content` — JSON string of the row body.
- `isDeleted` — tombstone flag.
- `updatedAt` — ISO timestamp used as the pull cursor.

Inbound pulls apply to local stores; deletes remove rows. System `version` records can trigger a local schema upgrade and page reload.

## Cross-tab data coherence

Local writes notify subscribers via `db.subscribe` / `db.posts.subscribe`. The same channel mirrors updates to other tabs:

- **`BroadcastChannel` `dbsync_events`** — `DATA_UPDATED` with affected store names and row changes (capped at 100 changes per message; larger updates omit row detail and subscribers refetch).
- Passive tabs apply the message without re-broadcasting.

Auth uses the same channel (`AUTH_LOGIN` / `AUTH_LOGOUT`) — see [Session](./Session.md) and [Offline-first apps](./Offline.md).

## Leader election

Multiple open tabs would otherwise each run pull/push on the same interval. **Web Locks** (`navigator.locks.request("dbsync-leader", ...)`) ensure one tab performs `performSync` per tick. Environments without Web Locks fall back to unsynchronized timers (acceptable for tests and rare browsers).

## Readiness vs sync

| API | Meaning |
| --- | --- |
| `waitForBooted()` / `isBooted` | Session replay + internal `start()` scheduled — **not** “server data loaded”. |
| `isReady` | IndexedDB open. |
| `isStarted` | Sync timer running. |
| `isLive` | Last successful sync within ~4× `syncInterval`. |
| `isInitialSyncPending` | Logged in but no successful sync since login (persists across refresh until logout; use for a post-login loading screen — not the same as `!isLive`). |
| `waitForLive()` | Polls until `isLive` (rejects if sync never started). |
| `onSyncStateChange` | `"idle"` \| `"syncing"` \| `"offline"` \| `"error"`. |

**App rule:** show the shell on `isLoggedIn` + `isReady`; use skeletons / `useDbQuery` `loading` for data. For a full-page loader until the first pull after login (including refresh before that pull finishes), use `isInitialSyncPending` / `useDbSession` → `isInitialSyncPending`. Do not block the shell on `waitForLive()` unless you explicitly need server-fresh data.

## Conflict model

Sync is **last-write-wins** at the record level using `updatedAt` ordering on pull. There is no operational transform or server-side merge in the client. Fits offline-first CRUD; not a fit when every write must be server-authoritative before the UI updates.

## Custom adapters

Implement `pull` / `push` on `BackendAdapter` — see [Adapters](./Adapters.md). Persist `__dbsync_system` version records in your backend so long-offline devices upgrade consistently.

## See also

- [Session](./Session.md) — `db.auth.*` and lifecycle
- [Offline-first apps](./Offline.md) — routing and logout
- [Data access](./DataAccess.md) — CRUD and queries
- [Schema evolution](./Schema.md) — migrations and signatures
