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
db.sync.onStateChange((state) => console.debug("[dbsync sync]", state))
db.auth.onChange(() =>
  console.debug("[dbsync auth]", {
    phase: db.auth.phase,
    isLoggedIn: db.auth.isLoggedIn,
    syncState: db.auth.syncState,
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

- [API reference](./API.md) — `onDebug`, `emitDebug`
- [Sync engine](./Sync.md)
- [Auth listeners](./Auth.md)
- [Testing](./Testing.md)
