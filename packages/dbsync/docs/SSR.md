# SSR and Next.js / Remix

[Documentation index](./README.md) · [React](./React.md)

`@slimr/dbsync` is fundamentally an **offline-first, client-side** tool. It relies on `indexedDB`, `BroadcastChannel`, Web Locks, and `localStorage` to durably queue writes and sync data. 

Because these APIs do not exist on the server, you must take care when using `dbsync` in Server-Side Rendered (SSR) environments like Next.js, Remix, or Astro.

## 1. Do not initialize `DbSync` on the server

If your `db.ts` file is imported on the server, `new DbSync(...)` will throw or fail because it attempts to access browser APIs.

Ensure that your instance is only created on the client:

```typescript
// db.ts
import { DbSyncR } from "@slimr/dbsync/react"
import { RestAdapter } from "@slimr/dbsync/adapters"

class AppDb extends DbSyncR {
  posts = new PostTable(this)
}

export let db: AppDb | null = null

if (typeof window !== "undefined") {
    db = new AppDb({ adapter: new RestAdapter({ url: "/api" }) })
    db.auth.onLogout(() => (window.location.href = "/login"))
}
```

## 2. React hooks in SSR

`useDbQuery` and **`.use()`** on observables are safe to render on the server when `db` is null or gates pass **`getServerSnapshot`**.

During the initial server render (and the first hydration pass on the client), IndexedDB is not yet open. Your components must return a fallback (like a skeleton).

```tsx
import { useDbQuery } from "@slimr/dbsync/react"
import { db } from "./db"

export function AppShell() {
  if (!db) return <AppSkeleton />
  const phase = db.auth.phase$.use({
    getServerSnapshot: () => "logged-out" as const,
  })
  switch (phase) {
    case "logged-out": return <Login />
    case "booting":
    case "initial-sync":
      return <AppSkeleton />
    case "ready": return <Outlet />
  }
}

export function PostList() {
  if (!db) return <PostListSkeleton />
  const { value: posts, loading } = useDbQuery(db, "posts", () => db.posts.find())
  if (loading) return <PostListSkeleton />
  return <ul>{posts?.map((p) => <li key={p.id}>{p.content}</li>)}</ul>
}
```

## 3. Hydration mismatches

Because `db.auth.isLoggedIn` reads from `localStorage` synchronously on the client, it might evaluate to `true` on the client's first render, while the server evaluated it as `false`.

To avoid React hydration errors (e.g. "Text content did not match. Server: 'Login', Client: 'App'"), wait until the component has mounted before branching on `isLoggedIn` if your app uses SSR.

```tsx
function Root() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !db) {
        return null // or a generic spinner that matches the server
    }

    if (!db.auth.isLoggedIn) {
        return <LoginScreen />
    }

    return <AppShell />
}
```

## Alternatives for SSR apps

If your app requires fast SEO or server-rendering of actual data, `dbsync` might not be the best fit for those specific pages. `dbsync` is designed for offline-first, highly-interactive SPA shells where the UI loads instantly from local storage rather than waiting for the server.
