# LocalAdapter

`LocalAdapter` is the no-op backend adapter shipped with `@slimr/dbsync`.

It exists for consumer apps that want the full IndexedDB ORM, reactive updates, repositories, and transactions without any remote sync backend. It satisfies the `BackendAdapter` contract but intentionally never talks to a server.

Use it when your app is local-only or when you want to disable sync in certain environments (tests, demos, prototypes).

## `requiresAuth: false`

`LocalAdapter` sets `requiresAuth` to `false`:

- Adapter **`checkAuth()`** always returns `true` (internal use only; no public `db.checkAuth()`).
- **`login()` / `logout()`** are no-ops on the network.
- **`init()`, `start()`, and data APIs** do not require `db.isLoggedIn` or a prior `login()` call.
- You can `await db.start()` immediately without `onLogin` / `bootstrapSession()` — though you may still use those hooks for a uniform app structure.

```typescript
import { LocalAdapter } from "@slimr/dbsync/adapters"
import { DbSync } from "@slimr/dbsync"

const db = new DbSync({ adapter: new LocalAdapter() })
await db.start()
```

For session-backed production apps, use [RestAdapter](./RestAdapter.md) and [Offline.md](./Offline.md).
