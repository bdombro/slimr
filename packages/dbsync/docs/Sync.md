# Sync & auth

[Documentation index](./README.md) · [Offline-first apps](./Offline.md)

## Golden path

```typescript
const db = new DbSync({
    adapter: new RestAdapter({ url: API_URL }),
    tables: { posts: {} },
    auth: {
        onLogout: () => navigate("/login"),
        onAuthenticated: () => navigate("/app"), // optional
    },
})

await db.auth.sendCode(email)
await db.auth.login(email, code)
await db.auth.logout()
```

Automatic lifecycle (default): hydrated session replay + `start()` on construction. Headless apps: `await db.waitForBooted()` before data access.

## API summary

| API | Role |
| --- | --- |
| `db.auth.sendCode` | Network required when `requiresAuth` |
| `db.auth.login` / `logout` / `revalidate` | Session actions |
| `db.waitForBooted()` | Waits for local startup (`onAuthenticated` when logged in) |
| `db.isBooted` | Boot pipeline finished (sync) |
| `db.boot()` | `lifecycle.manual` only — kicks startup |
| `db.isReady` | IndexedDB open |
| `db.start()` / `stop()` | Manual sync control (`lifecycle.manual` or advanced) |
| `lifecycle.manual` | Opt out of automatic boot/start |

## See also

- [Adapters](./Adapters.md) · [RestAdapter](./RestAdapter.md) · [Offline.md](./Offline.md)
