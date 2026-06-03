# Debugging

[Documentation index](./README.md) · [API reference](./API.md)

`@slimr/dbsync` stays silent in production by default. For structured tracing and event handling, pass **`events`** on `DbSyncConfig` (or call `db.emitDebug` from app code).

## Wire `events` in development

```typescript
import type { DbSyncDebugEvent } from "@slimr/dbsync"

export const db = new AppDb({
  adapter,
  events: import.meta.env.DEV
    ? (event: DbSyncDebugEvent) => console.debug("[dbsync]", event)
    : undefined,
})
```

Or target specific events with type-safety and leverage `DbSyncError` severity to handle errors cleanly:

```typescript
import { toast } from "~/foundation/toasts" // App code example

export const db = new AppDb({
  adapter,
  events: {
    "sync:error": ({ error }) => {
      // Quietly ignore transient offline/network errors (severity 0)
      if (error.severity === 0) return

      toast({
        message: error.message || "Sync failed",
        variant: "error",
      })
    },
    "boot:done": ({ isLoggedIn }) => {
      console.log("DbSync booted. Logged in:", isLoggedIn)
    }
  }
})
```

See [Errors](./Errors.md) for details on the error severity scale.

## Event types

| `type` | Payload / Context | When |
| --- | --- | --- |
| `boot:start` | | Automatic or manual boot pipeline |
| `boot:done` | `isLoggedIn: boolean`, `isReady: boolean` | Boot pipeline finished successfully |
| `boot:failed` | `error: DbSyncError` | Boot pipeline failed |
| `session:start` | | Internal `start()` callbacks (session replay / login) |
| `session:authenticated` | | `onAuthenticated` listener phase |
| `session:logout` | `phase: "listeners" \| "cleared" \| "remote"` | Logout teardown steps |
| `sync:cycle` | `phase: "start" \| "pull" \| "push" \| "done" \| "skipped"`, `reason?`, `pullCount?`, `pushCount?` | Pull/push cycle progress |
| `sync:state` | `state: DbSyncDebugSyncState` | Sync timer state change (`idle`, `syncing`, `offline`, `error`) |
| `sync:pull` | | Skipping or stuck cursor logs |
| `sync:error` | `error: DbSyncError` | Pull/push failure (non-401) |
| `auth:invalidate` | `reason: "401" \| "revalidate"` | Session invalidation trigger |
| `schema:reload` | | Local schema upgrade triggered page reload |
| `query:error` | `tables: string[]`, `error: DbSyncError` | `useDbQuery` query failure |

## Alternative: Subscribing to Observables

Subscribe to existing hooks:

```typescript
db.sync.state$.subscribe((state) => console.debug("[dbsync sync]", state))
db.auth.phase$.subscribe((phase) =>
  console.debug("[dbsync auth]", {
    phase,
    isLoggedIn: db.auth.isLoggedIn,
    syncState: db.sync.state,
  }),
)
```

## E2E / Playwright

The package ships browser fixtures under `playwright/fixtures/`. To stub sync without a real backend, use `db.sync.setPerformSyncHook` (test-only) so cycles complete deterministically:

```typescript
await page.evaluate(() => {
  window.db.sync.setPerformSyncHook(async () => {
    /* mark records synced, advance state, etc. */
  })
})
```

See [Testing](./Testing.md#playwright-e2e).

## See also

- [API reference](./API.md) — `events`, `emitDebug`
- [Sync engine](./Sync.md)
- [Auth listeners](./Auth.md)
- [Testing](./Testing.md)
