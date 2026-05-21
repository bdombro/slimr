# LocalAdapter

`LocalAdapter` is the no-op backend adapter shipped with `@slimr/dbsync`.

It exists for consumer apps that want the full IndexedDB ORM, reactive updates, repositories, and transactions without any remote sync backend. It satisfies the `BackendAdapter` contract but intentionally never talks to a server.

Use it when your app is local-only, when you disable sync in certain environments, or when you **swap adapters in one app** (e.g. demo) and want the same `onLogin` / `boot` / `login` / `logout` flow as `RestAdapter`.

## `requiresAuth: false`

`LocalAdapter` sets `requiresAuth` to `false`:

- **Data guards off** — `init()`, `start()`, and data APIs do **not** require `db.isLoggedIn` (you can read/write before login).
- **Session APIs on** — `boot()`, `login()`, `logout()`, `onLogin` / `onLogout`, and cross-tab auth behave like a REST app; the adapter **stubs** `checkAuth()` / `sendCode()` / `login()` / `logout()` / sync.
- **`useDbQuery`** does not block on `!isLoggedIn` (same as other `requiresAuth: false` adapters).

Typical boot (same shape as [Offline.md](./Offline.md)):

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"
import { DbSync } from "@slimr/dbsync"

const db = new DbSync({ adapter: new LocalAdapter() })

db.onLogout(() => {
  /* navigate to login */
})
// autoBoot + autoStart (defaults) replay a hydrated session

// Or log in explicitly (works offline; adapter stubs succeed):
await db.login("dev@local", "000")
```

You may still call `await db.start()` without hooks if you do not need session UI.

For production session-backed sync, use [RestAdapter](./RestAdapter.md) and [Offline.md](./Offline.md).
