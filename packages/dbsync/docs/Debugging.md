# Debugging

[Documentation index](./README.md) · [API reference](./API.md)

`@slimr/dbsync` stays silent in production by default. For structured tracing, pass **`onDebug`** on `DbSyncConfig` (or call `db.emitDebug` from app code).

## Wire `onDebug` in development

```typescript
import type { DbSyncDebugEvent } from "@slimr/dbsync"

export const db = new AppDb({
  adapter,
  onDebug: import.meta.env.DEV
    ? (event: DbSyncDebugEvent) => console.debug("[dbsync]", event)
    : undefined,
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
| `query:error` | `useDbQuery` / `createUseDbQuery` query failure |

## Without `onDebug`

Subscribe to existing hooks:

```typescript
db.onSyncStateChange((state) => console.debug("[dbsync sync]", state))
db.auth.onSessionChange(() =>
  console.debug("[dbsync session]", {
    isLoggedIn: db.auth.isLoggedIn,
    isBooted: db.isBooted,
    isReady: db.isReady,
    pendingLogout: db.auth.pendingLogout,
  }),
)
```

## See also

- [API reference](./API.md) — `onDebug`, `emitDebug`
- [Sync engine](./Sync.md)
- [Session](./Session.md)
