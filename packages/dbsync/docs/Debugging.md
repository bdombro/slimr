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

Or target specific events with type-safety:

```typescript
export const db = new AppDb({
  adapter,
  events: {
    "sync:error": ({ error }) => {
      console.error("Sync failed:", error)
    },
    "boot:done": ({ isLoggedIn }) => {
      console.log("DbSync booted. Logged in:", isLoggedIn)
    }
  }
})
```

## Event types

| `type` | When |
| --- | --- |
| `boot:start` / `boot:done` | Automatic or manual boot pipeline |
| `session:start` | Internal `start()` callbacks (session replay / login) |
| `session:authenticated` | `onAuthenticated` listener phase |
| `session:logout` | `phase`: `listeners` → `cleared` → `remote` |
| `sync:cycle` | `phase`: `start`, `pull`, `push`, `done`, or `skipped` (`reason`: `offline` \| `auth`) |
| `sync:state` | Sync timer state (`idle`, `syncing`, `offline`, `error`) |
| `sync:error` | Pull/push failure (non-401) |
| `auth:invalidate` | `reason`: `401` \| `revalidate` |
| `schema:reload` | Local schema upgrade triggered page reload |
| `query:error` | `useDbQuery` query failure |

## Without `onDebug`

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
