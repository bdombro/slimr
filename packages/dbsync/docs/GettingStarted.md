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

const db = new AppDb({
    adapter: new RestAdapter({ url: "https://api.myapp.com" }),
    auth: {
        onLogout: () => navigate("/login"),
        onAuthenticated: () => navigate("/app"), // optional
    },
})
```

## Lifecycle (automatic by default)

Adapter choice drives defaults — no `autoStart` / `autoBoot` flags:

- **Session-backed** (`RestAdapter`): requires `auth.onLogout`; automatically schedules boot on a microtask (hydrated session replay + `start()` when logged in).
- **Local-only** (`LocalAdapter`): `auth` optional; opens IndexedDB automatically when `auth` is omitted.

### Headless / scripts

Wait for local startup before touching data (does not wait for backend sync):

```typescript
await db.waitForBooted()

if (db.isLoggedIn) {
    await db.posts.add({
        userId: "u_1",
        content: "Hello world",
    })
}
```

| API | Meaning |
| --- | --- |
| `waitForBooted()` | Boot pipeline finished (`onAuthenticated` when logged in). |
| `isBooted` | Same, sync check. |
| `isReady` | IndexedDB open (usually after boot when logged in). |
| `isLoggedIn` | Hydrated client session. |
| `waitForLive()` | Optional — recent successful sync (advanced). |

### React SPAs

Same `db` instance; route on **`db.isLoggedIn` at module load**. In the shell, use `useDbSession` (`isBooted`, `isReady`, `isBootstrapping`) and `useDbQuery` for data — you usually **do not** call `waitForBooted()` in components. See [React](./React.md) and [Offline-first apps](./Offline.md).

### Advanced

`lifecycle: { manual: true }` — no automatic boot/start; call `await db.boot()` then `await db.start()` when logged in (tests, exotic shells). `boot()` throws when lifecycle is automatic — use `waitForBooted()` instead.

## Developing before the backend

Swap adapters with one env var; **keep the same `auth` config**:

```typescript
const adapter =
    import.meta.env.VITE_LOCAL_BACKEND === "true"
        ? new LocalAdapter()
        : new RestAdapter({ url: import.meta.env.VITE_API_URL })

const db = new AppDb({
    adapter,
    auth: {
        onLogout: () => navigate("/login"),
        onAuthenticated: () => navigate("/app"),
    },
})

await db.waitForBooted()
```

`LocalAdapter` stubs `sendCode` / `login` / `logout` and skips data API login guards — fine for UI work; re-test auth-gated flows after switching to `RestAdapter`. See [Adapters](./Adapters.md).

## Local-only

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"

const db = new AppDb({ adapter: new LocalAdapter() })
// No auth → IndexedDB opens automatically on a microtask
```

With `auth`, session hooks behave like REST (stubbed network). See [LocalAdapter](./LocalAdapter.md).

## Upgrading?

If you used `onLogin` / `onLogout`, `autoStart`, `DbProvider`, or `db.initted`, see [Migrating](./Migrating.md).

## Next steps

- [Data access](./DataAccess.md) — CRUD, queries, streams, transactions
- [Schema evolution](./Schema.md) — migrations and versioning
- [React](./React.md) — `useDbQuery`, `useDbSession`
- [Sync & auth](./Sync.md) — sync loop and `db.auth`
- [Offline-first apps](./Offline.md) — refresh boot, offline logout, service workers
