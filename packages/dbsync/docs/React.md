# React

[Documentation index](./README.md) · [Offline-first apps](./Offline.md)

`dbsync` exposes change notifications for local writes, cross-tab updates, and sync. Use **`subscribe`** directly or the hooks in `@slimr/dbsync/react`.

Session routing and the app shell: [Offline-first apps](./Offline.md). React apps usually rely on automatic boot; call `await db.waitForBooted()` only when you need strict ordering in scripts.

## `db.subscribe`

```typescript
const sub = db.subscribe((updatedTables, changes?) => {
    if (!updatedTables.includes("posts")) return
    if (changes?.some((c) => c.table === "posts" && c.change === "clear")) {
        refreshAllPosts()
        return
    }
    const touchedIds = changes?.map((c) => c.id)
    refreshPosts(touchedIds)
})
sub.close()
```

Change types: `"insert"` | `"update"` | `"delete"` | `"clear"`.

## Table-scoped subscribe

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

db.posts.subscribe(handler, { ids: [postId] }) // optional id filter

sub.close()
```

## `useDbQuery`

Bind a query to table(s); refetches on relevant local/sync changes and session updates.

```tsx
import { createUseDbQuery } from "@slimr/dbsync/react"
export const useDbQuery = createUseDbQuery(db)
```

```tsx
function PostList() {
    const { value: posts, loading } = useDbQuery("posts", () => db.posts.find())

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

When the adapter **`requiresAuth`** and `db.auth.isLoggedIn` is false, the hook skips `queryFn` and returns `{ loading: true, value: null }`. After automatic boot, it refetches when `db.auth.isReady` is true.

## `useDbAuth`

Flat session state from `db.auth` getters, kept in sync via `db.auth.onChange`:

```tsx
import { useDbAuth } from "@slimr/dbsync/react"

function AppShell() {
  const { phase, offline, syncState, isBootstrapping } = useDbAuth(db)

  switch (phase) {
    case "logged-out":
      return <Navigate to="/login" replace />
    case "initial-sync":
      return (
        <InitialSyncScreen
          offline={offline}
          error={syncState === "error"}
        />
      )
    case "booting":
      return <BootSkeleton active={isBootstrapping} />
    case "ready":
      return (
        <AppLayout showOfflineBanner={offline}>
          <Outlet />
        </AppLayout>
      )
  }
}
```

`useDbSession` is a deprecated alias of `useDbAuth`.

Use a module-scoped `db` instance — pass it explicitly to hooks (no context provider required).

## Advanced `useDbQuery`

### Multiple tables

Pass an array when the query reads more than one store:

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

## See also

- [Offline-first apps](./Offline.md) — routing, anti-patterns, recipes
- [Auth listeners](./Auth.md) — callback matrix
- [SSR & Next.js](./SSR.md) — hydration caveats
