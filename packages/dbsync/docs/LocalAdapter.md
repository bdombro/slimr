# LocalAdapter

[Documentation index](./README.md) · [Getting started](./GettingStarted.md)

Use it when your app is local-only, when you disable sync in certain environments, or when you **swap adapters in one app** while the backend is not ready — see [Getting started — Developing before the backend](./GettingStarted.md#developing-before-the-backend).

## `requiresAuth: false`

- **Data guards off** — data APIs work without `db.isLoggedIn`.
- **Session APIs on** — with `db.auth.onLogout` / `onAuthenticated`, behavior matches REST (stubbed network).
- **`useDbQuery`** does not block on `!isLoggedIn`.

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"

const db = new DbSync({ adapter: new LocalAdapter(), tables: { posts: {} } })
db.auth.onLogout(() => navigate("/login"))

// Or log in explicitly (works offline); login runs internal start():
await db.auth.login("dev@local", "000")

// Imperative reads/writes after construction — await boot once:
await db.waitForBooted()
await db.posts.add({ userId: "1", content: "Hello" })
```

Without session listeners, IndexedDB still opens automatically on construction (`requiresAuth: false`). React apps can skip `waitForBooted()` in components — [React](./React.md).

For production session-backed sync, use [RestAdapter](./RestAdapter.md) and [Offline.md](./Offline.md).
