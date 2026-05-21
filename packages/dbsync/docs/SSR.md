# SSR and Next.js / Remix

[Documentation index](./README.md) · [React](./React.md)

`@slimr/dbsync` is fundamentally an **offline-first, client-side** tool. It relies on `indexedDB`, `BroadcastChannel`, Web Locks, and `localStorage` to durably queue writes and sync data. 

Because these APIs do not exist on the server, you must take care when using `dbsync` in Server-Side Rendered (SSR) environments like Next.js, Remix, or Astro.

## 1. Do not initialize `DbSync` on the server

If your `db.ts` file is imported on the server, `new DbSync(...)` will throw or fail because it attempts to access browser APIs.

Ensure that your instance is only created on the client:

```typescript
// db.ts
import { DbSync } from "@slimr/dbsync"
import { RestAdapter } from "@slimr/dbsync/adapters"

export let db: AppDb | null = null

if (typeof window !== "undefined") {
    db = new AppDb({
        adapter: new RestAdapter({ url: "/api" }),
    })
    db.auth.onLogout(() => window.location.href = "/login")
}
```

## 2. React Hooks in SSR

The hooks provided by `@slimr/dbsync/react` (`useDbQuery`, `useDbSession`) are safe to render on the server, provided you handle the `null` db instance gracefully.

During the initial server render (and the first hydration pass on the client), IndexedDB is not yet open. Your components must return a fallback (like a skeleton).

```tsx
import { createUseDbQuery, useDbSession as useDbSessionRaw } from "@slimr/dbsync/react"
import { db } from "./db"

// Create safe wrappers that handle the null db during SSR
export function useDbSession() {
    if (!db) return { isLoggedIn: false, isReady: false, isBootstrapping: false }
    return useDbSessionRaw(db)
}

export const useDbQuery = createUseDbQuery(db as any) // Type cast for SSR
```

In your React tree:

```tsx
function AppShell() {
    const { isReady, isLoggedIn } = useDbSession()

    // During SSR, isReady is ALWAYS false. The server renders this skeleton.
    // On the client, it hydrates as the skeleton, then updates once IDB opens.
    if (!isReady) {
        return <AppSkeleton />
    }

    return <MainContent />
}
```

## 3. Hydration Mismatches

Because `db.isLoggedIn` reads from `localStorage` synchronously on the client, it might evaluate to `true` on the client's first render, while the server evaluated it as `false`.

To avoid React hydration errors (e.g. "Text content did not match. Server: 'Login', Client: 'App'"), you should wait until the component has mounted before branching based on `isLoggedIn` if your app uses SSR.

```tsx
function Root() {
    const [mounted, setMounted] = useState(false)
    const { isLoggedIn } = useDbSession()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null // or a generic spinner that matches the server
    }

    if (!isLoggedIn) {
        return <LoginScreen />
    }

    return <AppShell />
}
```

## Alternatives for SSR Apps

If your app requires fast SEO or server-rendering of actual data, `dbsync` might not be the best fit for those specific pages. `dbsync` is designed for offline-first, highly-interactive SPA shells where the UI loads instantly from local storage rather than waiting for the server.