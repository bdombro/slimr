# Data access

[Documentation index](./README.md)

Reads and writes go through **typed table repositories** (`db.posts`, `db.users`, …). Lower-level `db.get` / `db.put` helpers exist for edge cases. Writes enqueue for sync — see [Sync engine](./Sync.md).

## Before data access

**Scripts, tests, and imperative handlers** — await boot so IndexedDB is open (and `start()` has run when logged in):

```typescript
await db.waitForBooted()
```

With `RestAdapter` (default `requiresAuth`), also ensure `db.auth.isLoggedIn` before reads/writes, or data APIs throw `DbSyncNotAuthenticatedError`.

**React components** — usually omit `waitForBooted()`; `useDbQuery` waits for `db.auth.isReady`. See [React](./React.md).

## CRUD on repositories

Examples below assume boot has finished (see above).

```typescript
await db.posts.add({ userId, content: "Hello" })
await db.posts.put({ id, userId, content: "Hello", updatedAt: Date.now() })
await db.posts.patch({ id, content: "Edited" })
await db.posts.delete(id)

const one = await db.posts.get(id)
const many = await db.posts.find()
```

`DbTable` is where defaults and validation live: `prepareCreate`, `preparePut`, `preparePatch`.

## Query options

`find`, `getBy`, and `stream` use IndexedDB cursors when needed for filters, sort, and projection.

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

- **`equalsAny`** — exact membership on an indexed field.
- **`startsWith`** — prefix match on string indexes (normalize to lowercase at write time for case-insensitive search).

### Partial records

```typescript
const titles = await db.posts.find({ select: ["id", "title"] })

for await (const row of db.posts.stream({ omit: ["description"] })) {
    renderIncrementally(row)
}
```

`find` uses a cursor when `select` or `omit` is set (small performance cost). Prefer `stream` for large tables; reserve unbounded `find()` for cases that truly need everything in memory.

## Lower-level IndexedDB helpers

For migrations, imports, or experiments:

```typescript
await db.put("posts", { id, userId, content: "Hello", updatedAt: Date.now() })
await db.patch("posts", { id, content: "Edited" })
await db.delete("posts", id)
await db.clear("posts")
```

## Transactions

Buffered write scopes: queue writes, then `commit()` once. Avoids native IDB transaction lifetime quirks.

```typescript
const tx = db.getTransaction()
tx.posts.put({ id: "1", content: "Draft", userId: "u1", updatedAt: Date.now() })
tx.posts.patch({ id: "1", content: "Published" })
tx.users.delete("stale-user")
await tx.commit()
```

Use when several writes must land together, or when you want to stage work and `commit()` or `cancel()` later.

## Auth guards

With `requiresAuth` adapters (default for `RestAdapter`), data APIs and `getTransaction()` throw `DbSyncNotAuthenticatedError` when `!db.auth.isLoggedIn`. See [Offline.md](./Offline.md) and [Errors](./Errors.md).

## Reacting to changes

`db.updates$` emits after local writes and cross-tab sync (`DbUpdatesPayload`: `tables`, optional `changes`, `txId`). Use imperative **`subscribe`** in non-React code; in React prefer **`db.updates$.use()`** on a `DbSyncR` instance ([React](./React.md)).

### `db.updates$.subscribe`

```typescript
const unsub = db.updates$.subscribe(({ tables, changes }) => {
  if (!tables.includes("posts")) return
  if (changes?.some((c) => c.table === "posts" && c.change === "clear")) {
    refreshAllPosts()
    return
  }
  const touchedIds = changes?.filter((c) => "id" in c).map((c) => c.id)
  refreshPosts(touchedIds)
})
unsub()
```

With `@slimr/observable`, pass a **`select`** projector so the callback runs only when the slice changes (deep equality):

```typescript
db.updates$.subscribe(
  (tables) => {
    if (tables.includes("posts")) refreshPosts()
  },
  (p) => p.tables,
)
```

Change types on `changes`: `"insert"` | `"update"` | `"delete"` | `"clear"`. Payload shape: [API — `DbUpdatesPayload`](./API.md#dbupdatespayload).

### Table-scoped `subscribe`

Repositories filter `updates$` to one table (and optional row ids):

```typescript
const unsub = db.posts.subscribe((changes) => {
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

db.posts.subscribe(handler, { ids: [postId] })

unsub()
```

`undefined` `changes` means the table changed but row detail was omitted (e.g. large cross-tab broadcast).

Table `subscribe` includes `txId` in its internal `select` slice so each committed transaction invokes your callback, including consecutive updates to the same row id (the `RowChange` list alone cannot distinguish two writes from a duplicate notify).

## See also

- [Data modeling](./Modeling.md) — 1:N and M:N relationships
- [Schema evolution](./Schema.md)
- [React](./React.md) — reactive reads
- [Documentation index](./README.md)
