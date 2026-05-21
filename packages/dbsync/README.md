# 🪶 @slimr/dbsync [![npm package](https://img.shields.io/npm/v/@slimr/dbsync.svg?style=flat-square)](https://npmjs.org/package/@slimr/dbsync)

**An offline-first IndexedDB ORM and sync engine. Zero runtime dependencies. One unified API.**

Your code writes to IndexedDB. `dbsync` handles the rest: durable mutation queues, leader-elected background sync, cross-tab coherence, schema drift across devices, and auth-aware logout. The UI never blocks on the network; online and offline share the same code path.

If you've ever tried to bolt offline support onto a normal REST app, you know the failure modes — lost writes, stale tabs, schema mismatches between a phone that's been offline for two weeks and a fresh device, migrations that wipe user data, queues that double-fire after a reload. `dbsync` exists because those problems are tedious, correctness-sensitive, and not what you want to be writing yourself.

## What you actually get

| Problem | What `dbsync` does |
| --- | --- |
| UI blocks on network requests | IndexedDB is the runtime DB; reads and writes are local-first. |
| Writes lost when offline or on flaky connections | `put`/`add`/`patch`/`delete` enqueue into a durable dirty queue; replayed when reachable. |
| Tabs drift out of sync | Mutations broadcast over `BroadcastChannel`. |
| Multiple tabs hammering the server | One tab wins a Web Lock as sync leader. |
| Schema changes break offline clients | Deterministic schema signature; automatic IndexedDB upgrades. |
| Old records on long-offline devices have stale shapes | Per-table `migrations` when IndexedDB opens. |
| Auth expiry leaves stale local data | `db.auth.logout()` wipes local data; deferred remote logout when offline. |
| Tab refresh loses login UI state | `isLoggedIn` hydrates synchronously; optimistic app shell — [Offline.md](./docs/Offline.md). |
| Lock-in to a specific backend | Swap the `BackendAdapter` (REST, GraphQL, etc.). |

Built on IndexedDB, `BroadcastChannel`, Web Locks, and `fetch`. No runtime dependencies.

## Install

```bash
npm install @slimr/dbsync
```

## Quick start

```typescript
import { DbSync, DbTable } from "@slimr/dbsync"
import { RestAdapter } from "@slimr/dbsync/adapters"

class AppDb extends DbSync {
    posts = new PostTable(this) // DbTable subclass — see Getting started
}

const db = new AppDb({
    adapter: new RestAdapter({ url: "https://api.myapp.com" }),
    auth: { onLogout: () => {/* route to login */} },
})

await db.posts.add({ userId: "u_1", content: "Hello" }) // after automatic boot when logged in
const posts = await db.posts.find({ index: "updatedAt", order: "desc", limit: 20 })
```

Full setup (typed tables, indexes, `prepareCreate`): **[Getting started](./docs/GettingStarted.md)**.

REST apps with login: pass `auth` in the constructor — automatic boot handles refresh — **[Sync & auth](./docs/Sync.md)** · **[Offline-first apps](./docs/Offline.md)**.

## Documentation

| Guide | Description |
| --- | --- |
| [docs/README.md](./docs/README.md) | Full doc index |
| [Getting started](./docs/GettingStarted.md) | Tables, `auth`, lifecycle, adapters |
| [Migrating](./docs/Migrating.md) | Upgrade from pre-0.0.40 session APIs |
| [Data access](./docs/DataAccess.md) | CRUD, queries, streams, transactions |
| [Schema evolution](./docs/Schema.md) | Migrations and versioning |
| [React](./docs/React.md) | `useDbQuery`, `subscribe`, `useDbSession` |
| [Sync & auth](./docs/Sync.md) | Sync loop and session API |
| [Offline-first apps](./docs/Offline.md) | Refresh boot, offline logout, service workers |
| [Adapters](./docs/Adapters.md) | `BackendAdapter` contract |
| [RestAdapter](./docs/RestAdapter.md) | REST / [swift-crud](https://github.com/bdombro/swift-crud) |
| [LocalAdapter](./docs/LocalAdapter.md) | Local-only |

## When this is (and isn't) the right tool

**Fits well** when users expect the app to stay usable through bad connectivity, when you want tabs to stay coherent without inventing a cache layer, and when you want typed repositories + schema evolution in a package small enough to actually read.

**Probably not the right fit** when you need strong server-authoritative consistency on every write (last-write-wins is the default), rich relational queries in the client (object stores, not SQL), or a heavier data-layer framework (Replicache, RxDB, PowerSync, etc.).

## Context

`@slimr` is a set of slim React-oriented libraries. Explore the monorepo on [GitHub](https://github.com/bdombro/slimr).
