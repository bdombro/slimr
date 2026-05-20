# Data access

Reads and writes go through **typed table repositories** (`db.posts`, `db.users`, …). Lower-level `db.get` / `db.put` helpers exist for edge cases.

## CRUD on repositories

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

With `requiresAuth` adapters (default for `RestAdapter`), data APIs and `getTransaction()` throw `DbSyncNotAuthenticatedError` when `!db.isLoggedIn`. See [Offline.md](./Offline.md).

## See also

- [Schema evolution](./Schema.md)
- [React](./React.md) — reactive reads
- [Documentation index](./README.md)
