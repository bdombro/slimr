# Getting started

[Documentation index](./README.md) · [Package README](../README.md)

Install, typed `DbSync` / `DbTable`, session listeners, and lifecycle. For offline routing and React shells, see [Offline-first apps](./Offline.md).

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

class AppDb extends DbSync {
    posts = new PostTable(this)
}

export const db = new AppDb({
    adapter: new RestAdapter({ url: "https://api.myapp.com" }),
})

db.auth.onLogout(() => navigate("/login"))
db.auth.onAuthenticated(() => navigate("/app")) // optional; login + cross-tab only
```

Register listeners in the same module immediately after `new DbSync`, before any `await`. Do not call `waitForBooted()` at module top level in SPAs — use the headless pattern below or React hooks.

## Recommended module layout

```text
src/
  db.ts          # AppDb subclass, adapter, listeners — export `db`
  dbHooks.ts     # createUseDbQuery(db), thin useDbAuth wrapper if needed
  AppShell.tsx   # switch (useDbAuth(db).phase)
```

```typescript
// db.ts
export const db = new AppDb({ adapter: new RestAdapter({ url: import.meta.env.VITE_API_URL }) })
db.auth.onLogout(() => navigate("/login"))

// dbHooks.ts
import { createUseDbQuery, useDbAuth as useDbAuthRaw } from "@slimr/dbsync/react"
import { db } from "./db"

export const useDbQuery = createUseDbQuery(db)
export const useDbAuth = () => useDbAuthRaw(db)
```

## State at a glance

| API | Meaning |
| --- | --- |
| `db.auth.isLoggedIn` | Hydrated session — route on this at module load |
| `db.auth.phase` | App shell: `logged-out` \| `booting` \| `initial-sync` \| `ready` |
| `waitForBooted()` | Boot finished (internal `sync.start()` when logged in) |
| `db.auth.isReady` | IndexedDB open |
| `db.sync.waitForLive()` | Optional — recent successful sync ([Sync](./Sync.md)) |

Full callback matrix and logout flow: [Auth](./Auth.md) · [Offline](./Offline.md).

## Lifecycle (automatic by default)

- **Session-backed** (`RestAdapter`): microtask boot — hydrated session replay + internal `start()` when logged in.
- **Local-only** (`LocalAdapter`): opens IndexedDB automatically when not manual.

### Headless / scripts

```typescript
await db.waitForBooted()

if (db.auth.isLoggedIn) {
    await db.posts.add({
        userId: "u_1",
        content: "Hello world",
    })
}
```

### React SPAs

Route on **`db.auth.isLoggedIn` at module load**. Use `useDbAuth` (`phase`) and `useDbQuery` — usually no `waitForBooted()` in components. See [React](./React.md) and [Offline-first apps](./Offline.md).

### Advanced

`lifecycle: { manual: true }` — call `await db.boot()` then `await db.sync.start()` when logged in. `boot()` throws when lifecycle is automatic.

## Developing before the backend

```typescript
const adapter =
    import.meta.env.VITE_LOCAL_BACKEND === "true"
        ? new LocalAdapter()
        : new RestAdapter({ url: import.meta.env.VITE_API_URL })

export const db = new AppDb({ adapter })
db.auth.onLogout(() => navigate("/login"))

await db.waitForBooted()
```

## Local-only

See [Adapters — LocalAdapter](./Adapters.md#localadapter).

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"

export const db = new AppDb({ adapter: new LocalAdapter() })
// Optional: db.auth.onLogout(...) for session UI with stubbed login

// Scripts / first imperative write:
await db.waitForBooted()
```

## Next steps

| Goal | Doc |
| --- | --- |
| Offline routing, logout, PWAs | [Offline-first apps](./Offline.md) |
| Sync loop, dirty queue, multi-tab | [Sync engine](./Sync.md) |
| CRUD, queries, transactions | [Data access](./DataAccess.md) |
| 1:N relations, join tables, denormalization | [Data modeling](./Modeling.md) |
| Migrations and versioning | [Schema evolution](./Schema.md) |
| React hooks | [React](./React.md) |
| SSR and hydration | [SSR & Next.js](./SSR.md) |
| Mocking IndexedDB, component tests | [Testing](./Testing.md) |
| Auth listeners | [Auth](./Auth.md) |
| All public methods | [API reference](./API.md) |
| Typed errors | [Errors](./Errors.md) |
| Upgrade from older APIs | [CHANGELOG](../CHANGELOG.md) · [Migrating (archived)](./archive/Migrating-pre-0.0.43.md) |
