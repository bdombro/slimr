# Getting started

[Documentation index](./README.md) · [Package README](../README.md)

This guide walks through the recommended way to set up `@slimr/dbsync`: a typed `DbSync` subclass, `DbTable` repositories, and a `RestAdapter` (or [LocalAdapter](./LocalAdapter.md) for local-only apps).

## Install

```bash
npm install @slimr/dbsync
```

## Typed tables and `DbSync`

Bring your own TypeScript interfaces (hand-written or generated from your backend). Declare one `DbSync` subclass with `DbTable` instances up front; keep table-specific normalization on the table class via `prepareCreate`, `preparePut`, and `preparePatch`.

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
```

## `init()` and `start()`

- **`init()`** — opens or upgrades IndexedDB, creates stores from registered tables, runs table migrations.
- **`start()`** — calls `init()` if needed, then starts the pull/push loop and sync leadership (Web Locks).

```typescript
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

## REST apps with auth

For session-backed APIs, do **not** call `start()` at module load without wiring auth first. Use `onLogin` / `onLogout` and `bootstrapSession()` — see [Offline.md](./Offline.md) and [Sync.md](./Sync.md).

```typescript
db.onLogout(() => navigate("/login"))
db.onLogin(async () => {
    await db.init()
    await db.start()
})
db.bootstrapSession()
```

## Local-only

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"

const db = new AppDb({ adapter: new LocalAdapter() })
await db.start()
```

Data APIs need no login; session APIs still work with stubbed auth — see [LocalAdapter](./LocalAdapter.md).

## Next steps

- [Data access](./DataAccess.md) — CRUD, queries, streams, transactions
- [Schema evolution](./Schema.md) — migrations and versioning
- [React](./React.md) — `useDbQuery`, subscriptions
- [Sync & auth](./Sync.md) — sync loop and session hooks
- [Offline-first apps](./Offline.md) — refresh boot, offline logout, service workers
