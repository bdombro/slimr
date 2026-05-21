# React

`dbsync` exposes change notifications for local writes, cross-tab updates, and sync. Use **`subscribe`** directly or the hooks in `@slimr/dbsync/react`.

Session boot (`auth` config, `waitForBooted()`, `useDbSession`) is covered in [Offline.md](./Offline.md). React apps usually rely on automatic boot; call `await db.waitForBooted()` only when you need strict ordering.

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

Bind a query to table(s); refetches on relevant local/sync changes.

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

When the adapter **`requiresAuth`** and `!db.isLoggedIn`, the hook skips `queryFn` and returns `{ loading: true, value: null }`. After automatic boot (or `await db.waitForBooted()`), it refetches when `db.isReady` is true.

## `useDbSession`

Session and boot state without polling:

```typescript
import { useDbSession } from "@slimr/dbsync/react"

function AppShell() {
  const { isLoggedIn, isBooted, isBootstrapping, isReady, offline, online } = useDbSession(db)

  if (!isLoggedIn) return <Navigate to="/login" replace />

  return (
    <AppLayout showOfflineBanner={offline}>
      {!isReady ? (
        <DbBootLoading active={isBootstrapping} />
      ) : (
        <Outlet />
      )}
    </AppLayout>
  )
}
```

Use a module-scoped `db` instance — pass it explicitly to hooks (no context provider required).

See [Offline.md](./Offline.md) for the full `!isReady` pattern and refresh behavior.

## See also

- [Offline-first apps](./Offline.md) — refresh boot and session routing
- [Data access](./DataAccess.md)
- [Documentation index](./README.md)
