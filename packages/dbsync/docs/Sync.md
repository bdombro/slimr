# Sync and auth

Background sync pulls remote changes and pushes the durable dirty queue. One tab per origin wins a **Web Lock** and acts as sync leader; others stay passive.

For offline-first **session boot**, refresh behavior, and React wiring, see [Offline.md](./Offline.md).

## Sync controls

```typescript
await db.start()          // calls init() if needed, then starts pull/push loop

db.onSyncStateChange((s) => {
  // "idle" | "syncing" | "offline" | "error"
})

await db.waitForLive()    // optional: block until recent successful sync
await db.triggerSync()    // one immediate cycle
await db.stop()
```

`waitForLive()` is for screens that need a fresh server pull — not for default app shell on refresh (use cached IndexedDB; see [Offline.md](./Offline.md)).

## Session hooks (REST)

```typescript
const initialRoute = db.isLoggedIn ? "/app" : "/login"

db.onLogout(() => navigate("/login"))
// autoBoot + autoStart: refresh replays session without explicit boot()

await db.sendCode("user@example.com")
await db.login("user@example.com", "123456")
await db.logout()
```

| API | Notes |
| --- | --- |
| `db.isLoggedIn` | Persisted; use for **initial route** |
| `db.offline` / `db.online` | Connectivity hint — not login routing on first paint |
| `db.boot()` / `whenReady()` | Awaits hydrated session → all `onLogin` callbacks; optional when `autoBoot` is true |
| `autoStart` | Default `true` — internal `onLogin` → `start()` |
| `autoBoot` | Default `true` — `boot()` after first session hook |
| `db.sendCode` | Network required when `requiresAuth` |
| `db.login` | Network required |
| `db.logout` | Local wipe now; remote logout may defer when offline |
| `db.revalidateSession()` | Optional manual server check |

Adapters: [Adapters.md](./Adapters.md) · REST endpoints: [RestAdapter.md](./RestAdapter.md)

## See also

- [Offline-first apps](./Offline.md)
- [React](./React.md)
- [Documentation index](./README.md)
