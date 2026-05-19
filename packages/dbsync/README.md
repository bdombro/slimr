# 🪶 @slimr/dbsync [![npm package](https://img.shields.io/npm/v/@slimr/dbsync.svg?style=flat-square)](https://npmjs.org/package/@slimr/dbsync)

**An offline-first IndexedDB ORM and sync engine. Zero runtime dependencies. One unified API.**

Your code writes to IndexedDB. `dbsync` handles the rest: durable mutation queues, leader-elected background sync, cross-tab coherence, schema drift across devices, and auth-aware resets. The UI never blocks on the network, online and offline are the same code path, and tabs stay consistent without a separate cache layer.

If you've ever tried to bolt offline support onto a normal REST app, you know the failure modes — lost writes, stale tabs, schema mismatches between a phone that's been offline for two weeks and a fresh device, migrations that wipe user data, queues that double-fire after a reload. `dbsync` exists because those problems are tedious, correctness-sensitive, and not what you want to be writing yourself.

## What you actually get

| Problem | What `dbsync` does |
| --- | --- |
| UI blocks on network requests | IndexedDB is the runtime DB; reads and writes are local-first and synchronous-feeling. |
| Writes lost when offline or on flaky connections | `put`/`add`/`patch`/`delete` enqueue into a durable dirty queue; replayed when reachable. |
| Tabs drift out of sync | Local + remote mutations broadcast over `BroadcastChannel`; every tab sees the same stream. |
| Multiple tabs hammering the server | One tab wins a Web Lock and becomes the sole sync leader; the rest stay passive. |
| Schema changes break offline clients | Tables produce a deterministic schema signature; IndexedDB upgrades and cross-device announcements are automatic. |
| Old records on long-offline devices have stale shapes | Per-table `migrations` run on read/upgrade so old records move forward instead of getting tossed. |
| Auth expiry leaves stale local data | Auth failures stop sync; `reset()` wipes the local DB cleanly when the session ends. |
| Lock-in to a specific backend | Swap the `BackendAdapter`. Bring REST, GraphQL, Firebase, websockets, whatever — the runtime doesn't change. |

Built entirely on standard web APIs: IndexedDB, `BroadcastChannel`, Web Locks, `fetch`. No dependencies at runtime.

## Install

```bash
npm install @slimr/dbsync
```

## Recommended setup

```typescript
import { DbSync, DbTable } from "@slimr/dbsync"
import { RestAdapter } from "@slimr/dbsync/adapters"

interface Post {
    id: string
    userId: string
    content: string
    updatedAt: number
}

type PostCreateInput = Omit<Post, "id" | "updatedAt"> & {
    id?: string
    updatedAt?: number
}

interface User {
    id: string
    email: string
}

type UserCreateInput = Omit<User, "id"> & {
    id?: string
}

class PostTable extends DbTable<Post, PostCreateInput> {
    static tableName = "posts"
    static indexes = ["userId", "updatedAt"]

    prepareCreate(input: PostCreateInput) {
        return {
            ...super.prepareCreate(input),
            updatedAt: input.updatedAt ?? Date.now(),
        }
    }
}

class UserTable extends DbTable<User, UserCreateInput> {
    static tableName = "users"
    static indexes = ["email"]
}

class AppDb extends DbSync {
    posts = new PostTable(this)
    users = new UserTable(this)
}

const db = new AppDb({
    adapter: new RestAdapter({ url: "https://api.myapp.com" }),
})

await db.start()

await db.posts.add({
    userId: "u_1",
    content: "Hello world",
})

const recentPosts = await db.posts.find({
    index: "updatedAt",
    order: "desc",
    limit: 20,
})
```

`init()` opens or upgrades IndexedDB, creates stores from the registered table classes, and runs table migrations. `start()` does that and also starts the pull/push loop plus sync leadership. No backend? Swap `RestAdapter` for `LocalAdapter` — same API, just no network handshake.

Bring your own TypeScript interfaces, whether you hand-write them or generate them from your backend schema. `dbsync` works best when your app has one typed `DbSync` subclass that declares `DbTable` instances up front and keeps table-specific normalization on the table class itself.

## Day-to-day usage

### Read and write through typed tables

```typescript
await db.posts.add({ userId, content: "Hello" })
await db.posts.put({ id, userId, content: "Hello", updatedAt: Date.now() })
await db.posts.patch({ id, content: "Edited" })
await db.posts.delete(id)

const one = await db.posts.get(id)
const many = await db.posts.find()
```

Use `db.posts`, `db.users`, and the rest of your declared typed tables as the primary API. The lower-level `db.get`, `db.put`, `db.patch`, `db.delete`, and `db.clear` helpers still exist for direct indexeddb access when you need them. `DbTable` is where you put table-specific defaults, validation, and normalization via `prepareCreate`, `preparePut`, and `preparePatch`.

Use `equalsAny` for exact membership checks on an indexed field, and `startsWith` for prefix matches on string indexes. If you need case-insensitive prefix search, normalize the indexed field to lowercase when you write it.

### Query and stream without loading the whole table into memory

`find()` is the blunt instrument. `find`, `getBy`, and `stream` use IndexedDB cursors for iteration and filtering when needed.

```typescript
const recent = await db.posts.find({
    index: "updatedAt",
    lowerBound: Date.now() - 3600000,
    order: "desc",
    limit: 50,
})

const firstForUser = await db.posts.getBy("userId", "u1")

for await (const post of db.posts.stream({ index: "updatedAt", order: "desc" })) {
    renderIncrementally(post)
}
```

If you truly need everything in memory, `find()` with no options is still there. The point is to make it the exception rather than the default.

### Lower-level helpers when you need direct indexeddb access

The table repositories are the preferred interface, but `DbSync` still exposes the underlying indexeddb helpers for migrations, experiments, and edge cases that benefit from working one layer closer to IndexedDB.

```typescript
await db.put("posts", { id, userId, content: "Hello", updatedAt: Date.now() })
await db.patch("posts", { id, content: "Edited" })
await db.delete("posts", id)
await db.clear("posts")
```

## Transactions

`dbsync` transactions are buffered write scopes. Queue multiple writes, then hit IndexedDB once on `commit()`. That avoids the awkward lifetime rules of native IndexedDB transactions while still giving you a single batched unit of work.

```typescript
const tx = db.getTransaction()
tx.posts.put({ id: "1", content: "Draft", userId: "u1", updatedAt: Date.now() })
tx.posts.patch({ id: "1", content: "Published" })
tx.users.delete("stale-user")
await tx.commit()
```

Use transactions when several writes should land together, or when you want to stage a batch and either `commit()` or `cancel()` it later.

## Reactivity

`dbsync` already knows when data changes — locally, from another tab, or from the sync engine. Subscribe directly, or use the React hook.

```typescript
import type { RowChange } from "@slimr/dbsync"

const sub = db.subscribe((updatedTables, changes?) => {
    if (!updatedTables.includes("posts")) return
    if (changes?.some((c) => c.table === "posts" && c.change === "clear")) {
        refreshAllPosts()
        return
    }
    const touchedIds = changes
        ?.filter((c): c is Extract<RowChange, { id: string | number }> => c.change !== "clear")
        .map((c) => c.id)
    refreshPosts(touchedIds)
})
sub.close()
```

Each `RowChange` is either `{ table, change: "insert" | "update" | "delete", id }` or `{ table, change: "clear" }` for whole-table invalidation. The second argument is optional for backward compatibility; cross-tab broadcasts omit row details when a batch exceeds 100 changes.

Table repositories expose the same notifications without repeating the table name:

```typescript
const sub = db.posts.subscribe((changes) => {
    if (!changes) {
        refreshAllPosts()
        return
    }
    if (changes.some((c) => c.change === "clear")) {
        refreshAllPosts()
        return
    }
    refreshPosts(changes.filter((c) => "id" in c).map((c) => c.id))
})

// Optional: only hear about specific ids (or a table clear)
db.posts.subscribe((changes) => { /* ... */ }, { ids: [postId] })

sub.close()
```

```tsx
// In a useDbQuery.ts file
import { createUseDbQuery } from "@slimr/dbsync/react"
export const useDbQuery = createUseDbQuery(db)

// In a component file
import { useDbQuery } from "./useDbQuery"

function PostList() {
    const { value: posts, loading } = useDbQuery("posts", () => db.find("posts"))
    
    if (loading) return <p>Loading…</p>
    
    return (
        <ul>
            {posts?.map((p) => (
                <li key={p.id}>{p.content}</li>
            ))}
        </ul>
    )
}

function PostDetail({ postId }: { postId: string }) {
    const { value: post, loading } = useDbQuery(
        "posts",
        () => db.get("posts", postId),
        [postId],
        {
            shouldRefetchFilter: (changes) =>
                changes.some((c) => c.change === "clear" || ("id" in c && String(c.id) === postId)),
        },
    )

    if (loading) return <p>Loading…</p>
    return <p>{post?.content}</p>
}
```

If you prefer to thread `db` through every component, you can use the generic `useDbQuery` exported from "@slimr/dbsync/react".

## Schema evolution without wiping user data

Two mechanisms, used together:

**`defaultSetter`** — normalize records on write (`add`/`put`). Useful for filling defaults and stamping `updatedAt`. Call it manually with `db.applyDefaults(tableName, partial)` when you want the normalized shape without persisting.

**`migrations`** — upgrade records already on device. Runs during init so long-offline data moves forward with your model. Each migration is a `{ version, note, upgrade(record) }` triple.

```typescript
import { type Migration } from "@slimr/dbsync"

const userMigrations: Migration[] = [
  {
    version: 2,
    note: "Merge firstName + lastName into fullName",
    upgrade: async (r) => {
      r.fullName = `${r.firstName} ${r.lastName}`.trim()
      delete r.firstName
      delete r.lastName
    },
  },
  {
    version: 3,
    note: "Split fullName into displayName",
    upgrade: async (r) => {
      r.displayName = r.fullName
    },
  },
]
```

Use `db.upgradeRecord("users", imported)` to run the same chain on inbound data (e.g. JSON imports) without writing it back.

### Automatic schema versioning

By default `dbsync` derives a deterministic signature from your table + index definitions. When the signature changes, the local IndexedDB version bumps and the new schema state is broadcast through sync so other devices know to upgrade. Newly declared indexes are created on existing stores during that upgrade path, so adding an index does not require wiping local data. Prefer manual control? Pass an explicit `version: number` and that becomes authoritative.

## Sync lifecycle and auth

```typescript
await db.init()                    // open IndexedDB, run migrations, pull initial data
await db.start()                   // calls `init()` and starts the sync loop and leadership election
await db.waitForLive()             // resolves once initial pull is settled

db.onSyncStateChange((s) => console.log("sync:", s))

await db.triggerSync()             // force an immediate push/pull pass
await db.stop()

await db.login("user@example.com", "123456")
await db.logout()                  // drops session; local data stays for re-login
await db.reset()                   // logout + nuke local IndexedDB
```

`login` / `logout` / `reset` are thin wrappers around the adapter's auth contract so local state and remote session stay aligned.

## Adapters

`dbsync` doesn't care what your backend looks like — implement the [adapter contract] and the runtime is identical.

- [Adapters overview](./docs/Adapters.md) — the `BackendAdapter` interface (`checkAuth`, `login`,
  `logout`, `pull`, `push`) and how schema-versioning system records flow through it.
- [RestAdapter](./docs/RestAdapter.md) — pairs with `@slimr/swift-crud`.
- [LocalAdapter](./docs/LocalAdapter.md) — no-op adapter for local-only apps and tests.

[adapter contract]: ./docs/Adapters.md

## When this is (and isn't) the right tool

**Fits well** when users expect the app to stay usable through bad connectivity, when you want tabs to stay coherent without inventing a cache layer, and when you want typed repositories + schema evolution in a package small enough to actually read.

**Probably not the right fit** when you need strong server-authoritative consistency on every write (last-write-wins is the default reconciliation), when you need rich relational queries inside the client (this is an object store, not SQLite), or when you'd prefer a heavier framework that owns your data layer end to end (Replicache, RxDB, PowerSync, etc.).

## Context

`@slimr` is a set of slim React-oriented libraries. Explore the monorepo on [GitHub](https://github.com/bdombro/slimr).
