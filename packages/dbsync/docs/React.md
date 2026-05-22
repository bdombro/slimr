# React

[Documentation index](./README.md) · [Getting started](./GettingStarted.md) · [Integration guide](./Offline.md)

Use `**@slimr/dbsync/react**`: subclass `**DbSyncR**`, call `**.use()**` on `db.auth.*$` / `db.sync.*$` / `db.updates$`, and load tables with `**useDbQuery**`.

Setup (`db.ts`, typed tables, listeners): [Getting started](./GettingStarted.md). App shell phases and routing: [Integration guide](./Offline.md).

## `DbSyncR`

Use `**DbSyncR**` (not plain `DbSync`) in React apps so observables on `db` expose `**.use()**` — a component-only hook (via `useSyncExternalStore`). Define `db` in `db.ts`; call `**.use()**` inside components, not at module top level.

```typescript
// db.ts — no .use() here
import { DbSyncR } from "@slimr/dbsync/react"

class AppDb extends DbSyncR {
  posts = new PostTable(this)
}

export const db = new AppDb({ adapter })
```

```tsx
// Inside a component (or custom hook)
function SyncBadge() {
  const syncing = db.sync.state$.use() === "syncing"
  return syncing ? <Spinner /> : null
}
```

Outside React (scripts, listeners in `db.ts`): read `**observable.val**` or `**observable.subscribe(...)**` — [Data access — reacting to changes](./DataAccess.md#reacting-to-changes).

### `.use()` options

Pass options from `@slimr/observable/react` (re-exported as `**UseObservableOptions**`):

```tsx
const phase = db.auth.phase$.use({
  getServerSnapshot: () => "logged-out" as const, // SSR
})

const tables = db.updates$.use({ select: (p) => p.tables })
```

Prefer **granular** observables (`phase$`, `canQuery$`, …) when each drives its own UI. Use `**select`** when subscribing to a larger payload (e.g. `updates$`) and you only need part of it — see [@slimr/observable/react](../../observable/README.md).

## App shell

Drive the shell with `**db.auth.phase$.use()**` and handle all four phases. Mount routed content only on `"ready"`.

```tsx
export function AppShell() {
  const phase = db.auth.phase$.use()
  switch (phase) {
    case "logged-out":
      return <Login />
    case "booting":
      return <BootSkeleton />
    case "initial-sync":
      return (
        <InitialSyncLoader
          syncState={db.sync.state}
          offline={db.auth.offline}
        />
      )
    case "ready":
      return <Outlet />
  }
}
```

Phase semantics, anti-patterns, and the optional **one-loader** pattern (`isInitialSyncPending$`): [Offline](./Offline.md).

SSR: [SSR & Next.js](./SSR.md).

## `useDbQuery`

```tsx
import { useDbQuery } from "@slimr/dbsync/react"
import { db } from "./db"

function PostList() {
  const { value: posts, loading } = useDbQuery(db, "posts", () => db.posts.find())

  if (loading) return <PostListSkeleton />

  return (
    <ul>
      {posts?.map((p) => (
        <li key={p.id}>{p.content}</li>
      ))}
    </ul>
  )
}
```

Subscribes to `**canQuery$**` and `**updates$**` only — not `phase$` or `sync.state$` — so connectivity/sync noise does not re-query IndexedDB.

When the adapter `**requiresAuth**` and the user is not logged in, `canQuery$` is false: the hook skips `queryFn` and returns `{ loading: true, value: null }`.

### Multiple tables

```tsx
const { value, loading } = useDbQuery(
  db,
  ["posts", "users"],
  () => loadFeed(),
  [filter],
)
```

### `shouldRefetchFilter`

Skip refetches when row-level changes are irrelevant (memoize with `useCallback` if defined inline):

```tsx
const { value: posts, loading } = useDbQuery(
  db,
  "posts",
  () => db.posts.find({ index: "userId", equals: userId }),
  [userId],
  {
    shouldRefetchFilter: (changes) =>
      changes.every((c) => "id" in c && c.id !== highlightedPostId),
  },
)
```

When the hook receives a table update but the filter returns `false`, it does not re-run `queryFn`. Omitted `changes` (some cross-tab updates) still trigger a refetch.

### Errors

Query failures emit `query:error` on `config.onDebug` when set — see [Debugging](./Debugging.md). The hook leaves the last successful `value` and sets `loading: false`.

## Exports


| Export                                                             | Role                                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `DbSyncR`                                                          | Base class for React apps (`extends DbSyncR`, then `new AppDb(config)`) |
| `useDbQuery`                                                       | Reactive IndexedDB queries                                              |
| `DbSyncRInstance`, `DbSyncAuthR`, `DbSyncSyncR`, `ObservableReact` | Types                                                                   |
| `UseObservableOptions`                                             | SSR / `select` for `.use()` (from `@slimr/observable/react`)            |


## See also

- [@slimr/observable/react](../../observable/README.md) — `useObservable`, `select`, app-owned observables
- [Data access](./DataAccess.md) — CRUD, `db.posts.subscribe`, `db.updates$.subscribe`
- [Integration guide](./Offline.md) — routing, phases, recipes
- [Auth listeners](./Auth.md) — callback matrix

