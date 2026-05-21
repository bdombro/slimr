# LocalAdapter

`LocalAdapter` is the no-op backend adapter shipped with `@slimr/dbsync`.

Use it when your app is local-only, when you disable sync in certain environments, or when you **swap adapters in one app** while the backend is not ready — see [Getting started — Developing before the backend](./GettingStarted.md#developing-before-the-backend).

## `requiresAuth: false`

- **Data guards off** — data APIs work without `db.isLoggedIn`.
- **Session APIs on** — with `auth` config, hooks and `db.auth.*` behave like REST (stubbed network).
- **`useDbQuery`** does not block on `!isLoggedIn`.

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"

const db = new DbSync({
    adapter: new LocalAdapter(),
    tables: { posts: {} },
    auth: {
        onLogout: () => navigate("/login"),
    },
})

// Or log in explicitly (works offline):
await db.auth.login("dev@local", "000")
```

Without `auth`, IndexedDB opens automatically on construction.

For production session-backed sync, use [RestAdapter](./RestAdapter.md) and [Offline.md](./Offline.md).
