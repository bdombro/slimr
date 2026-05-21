# React

`dbsync` exposes change notifications for local writes, cross-tab updates, and sync. Use **`subscribe`** directly or the hooks in `@slimr/dbsync/react`.

Session boot (`onLogin`, `boot`, `useDbSession`) is covered in [Offline.md](./Offline.md).

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
// useDbQuery.ts
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

function PostDetail({ postId }: { postId: string }) {
    const { value: post, loading } = useDbQuery(
        "posts",
        () => db.get("posts", postId),
        [postId],
        {
            shouldRefetchFilter: (changes) =>
                changes.some(
                    (c) => c.change === "clear" || ("id" in c && String(c.id) === postId),
                ),
        },
    )

    if (loading) return <p>Loading…</p>
    return <p>{post?.content}</p>
}
```

When the adapter **`requiresAuth`** and `!db.isLoggedIn`, the hook skips `queryFn` and returns `{ loading: true, value: null }`. After `onLogin` + `init()`, it refetches.

## `useDbSession`

Session and boot state without polling:

```typescript
import { useDbSession } from "@slimr/dbsync/react"

function AppShell() {
  const { isLoggedIn, isBootstrapping, isDbReady, offline, online } = useDbSession(db)

  if (!isLoggedIn) return <Navigate to="/login" replace />

  return (
    <AppLayout showOfflineBanner={offline}>
      {!isDbReady ? (
        <DbBootLoading active={isBootstrapping} />
      ) : (
        <Outlet />
      )}
    </AppLayout>
  )
}
```

See [Offline.md](./Offline.md) for the full `!isDbReady` pattern and refresh behavior.

## `DbProvider` (optional)

Registers `onLogout`, calls `boot()`, provides `db` via context. `onLogin` is optional — default `autoStart` calls `start()` for you.

```tsx
import { DbProvider } from "@slimr/dbsync/react"

<DbProvider
  db={db}
  fallback={<DbBootLoading />}
  onLogout={() => navigate("/login")}
>
  <AppRoutes />
</DbProvider>
```

| `fallback` | When `isLoggedIn && !isDbReady` |
| --- | --- |
| **Set** | Shows `fallback` instead of `children` |
| **Omitted** | Always renders `children` (gate in `AppShell`) |

Manual wiring in `main.tsx` without `DbProvider` is fine.

## See also

- [Offline-first apps](./Offline.md) — refresh boot and session routing
- [Data access](./DataAccess.md)
- [Documentation index](./README.md)
