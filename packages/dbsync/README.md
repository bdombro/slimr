# 🪶 @slimr/dbsync [![npm package](https://img.shields.io/npm/v/@slimr/dbsync.svg?style=flat-square)](https://npmjs.org/package/@slimr/dbsync)

**A powerfully slim, offline-first IndexedDB ORM and sync engine.**

Building offline-first web applications is notoriously difficult. `@slimr/dbsync` is designed for browser apps that need instant, local-first UX without giving up a real backend—and without forcing you to adopt a massive, complex data framework.

You simply write against a clean, Promise-based IndexedDB API. Under the hood, `dbsync` handles the intricate edge cases that usually make offline-first architecture painful: durable local mutation queues, background replay, cross-tab coordination, schema drift, auth-aware resets, and robust remote synchronization.

If your web app needs to feel native, instant, and reliable on weak or flaky networks, `dbsync` lets you keep the user experience completely local-first while seamlessly syncing to a remote source of truth.

## Why it's awesome

- ⚡️ **Reads and writes stay fast:** IndexedDB is the primary runtime data layer, meaning your UI is *never* blocked waiting on a network request.
- 🔄 **Offline is not a separate mode:** The exact same CRUD API works flawlessly whether the browser is online, offline, or moving in and out of cellular dead zones.
- 🌐 **You keep your backend:** Bring your own REST backend, or use the pre-made `@slimr/swift-crud` backend.
- 📣 **Your app stays perfectly coherent:** Local mutations and remote synced changes are broadcast through the same unified Pub/Sub model. Any tab is always up-to-date.
- 🧠 **The surface area stays small:** You get full-featured offline-first behavior with incredibly low cognitive overhead. No GraphQL, no massive stores.
- 🌱 **Zero runtime dependencies:** Built 100% on standard web APIs like IndexedDB, `BroadcastChannel`, Web Locks, and `fetch`.

## The hard problems it solves for you

- **Durable offline writes:** `put`, `add`, `patch`, and `delete` happen locally first, then flow into internal dirty and deleted queues for later push.
- **Cross-tab coordination:** `BroadcastChannel` fans out updates so other tabs can react without manual cache invalidation.
- **Leader election for sync:** when Web Locks are available, only one tab polls and pushes at a time.
- **Schema drift across devices:** table definitions are converted into a deterministic schema signature, or you can provide an explicit version number.
- **Safe data evolution:** migrations help normalize old and new records as your model changes.
- **Auth-aware local state:** auth failures stop syncing, and `reset()` can wipe local IndexedDB state when the session ends.

## Installation

```bash
npm install @slimr/dbsync
```

## Quick Start

Create a `DbSync` instance with an [adapter](./docs/Adapters.md) and your table definitions, then call `start()`. That initializes IndexedDB if needed and starts background sync.

```typescript
import { DbSync } from '@slimr/dbsync';
import { LocalAdapter, RestAdapter } from '@slimr/dbsync/adapters';

const adapter = new RestAdapter({ url: 'https://api.myapp.com' });
// For local-only apps or tests:
// const adapter = new LocalAdapter();

const db = new DbSync({
    adapter,
    tables: {
        posts: {
            indexes: ['userId', 'updatedAt'],
            defaultSetter: (post) => ({
                category: 0,
                updatedAt: Date.now(),
                ...post,
            }),
        },
        users: {
            indexes: ['email'],
        },
    },
});

await db.start();
```

### What `start()` actually does

- Opens and upgrades your IndexedDB stores.
- Runs configured record migrations.
- Starts the background pull/push loop.
- Lets one tab become the sync leader while the rest stay passive.

> If you want all the local ORM and reactivity features without any remote system, use `LocalAdapter`. Your app keeps the same API, just without a real backend handshake.

## The local-first API

Once started, `dbsync` behaves like a small object-store ORM for your browser app. The important difference is that writes also participate in background synchronization.

### Basic CRUD

```typescript
const newPost = await db.put('posts', {
    id: db.genUuid(),
    userId: 'user_123',
    content: 'Hello world',
});

const myPost = await db.get('posts', newPost.id);
const allPosts = await db.findAll('posts');

await db.patch('posts', { id: newPost.id, content: 'Edited content' });
await db.delete('posts', newPost.id);
```

### Typed repositories with less repetition

If you do not want to keep passing store names around, wrap a table in `DbRepository` and let TypeScript carry the type information for you.

```typescript
import { DbRepository } from '@slimr/dbsync';

interface Post {
    id: string;
    userId: string;
    content: string;
    updatedAt?: number;
}

const postsRepo = new DbRepository<Post>(db, 'posts');

await postsRepo.put({ id: '1', userId: 'u1', content: 'Cleaner code' });
const post = await postsRepo.findById('1');
const posts = await postsRepo.findAll();
```

### Atomic local transactions

`DbSync` transactions are buffered in memory and only hit IndexedDB when you call `commit()`. That keeps batched writes ergonomic and avoids IndexedDB's awkward async transaction timing.

```typescript
const tx = db.getTransaction();

tx.put('posts', { id: '1', content: 'Atomic write 1' });
tx.put('posts', { id: '2', content: 'Atomic write 2' });
tx.patch('posts', { id: '2', content: 'Atomic write 2b' });
tx.delete('users', 'bad_user');

await tx.commit();
```

If you want the same typed experience inside transactions, use `DbTxRepository`.

```typescript
import { DbTxRepository } from '@slimr/dbsync';

interface User {
    id: string;
    email: string;
}

class Tx {
    private tx = db.getTransaction();

    posts = new DbTxRepository<Post>(this.tx, 'posts');
    users = new DbTxRepository<User>(this.tx, 'users');

    commit = this.tx.commit.bind(this.tx);
}
```

## Reactivity built in

`dbsync` already knows when data changes locally, from another tab, or from the sync engine. Consumers can subscribe directly or use the React hook.

### Pub/sub for any UI layer

```typescript
const sub = db.subscribe((updatedStores) => {
    if (updatedStores.includes('posts')) {
        console.log('Posts changed');
    }
});

sub.close();
```

### React hook: `useDbQuery`

```tsx
import { useDbQuery } from '@slimr/dbsync/react';

function PostList({ db }) {
    const { value: posts, loading } = useDbQuery(db, 'posts', () => db.findAll('posts'));

    if (loading) return <p>Loading...</p>;
    if (!posts) return <p>No posts found.</p>;

    return <ul>{posts.map((post) => <li key={post.id}>{post.content}</li>)}</ul>;
}
```

If you prefer not to thread the `db` instance through every component, `@slimr/dbsync/react` also exports `createUseDbQuery`.

```tsx
import { createUseDbQuery } from '@slimr/dbsync/react';

const useDbQuery = createUseDbQuery(db);

function TodoList() {
    const { value: todos, loading } = useDbQuery('todos', () => db.findAll('todos'));

    if (loading) return <p>Loading...</p>;
    if (!todos) return <p>No todos found.</p>;

    return <ul>{todos.map((todo) => <li key={todo.id}>{todo.title}</li>)}</ul>;
}
```

## Schema evolution without wiping user data

Offline-first apps get painful once your record shapes start changing. `dbsync` gives you two ways to handle that cleanly.

### `defaultSetter`: normalize data before it is written

Use `defaultSetter` to fill in missing values or add dynamic fields before `add()` and `put()` are persisted.

```typescript
const db = new DbSync({
    adapter,
    tables: {
        posts: {
            defaultSetter: (post) => ({
                updatedAt: Date.now(),
                ...post,
            }),
        },
    },
});
```

You can also call the same logic directly without writing anything:

```typescript
const normalizedPost = db.applyDefaults('posts', { title: 'Draft' });

const postsRepo = new DbRepository<Post>(db, 'posts');
const normalizedViaRepo = postsRepo.applyDefaults({ title: 'Draft' });
```

### `migrations`: upgrade records already stored on device

Migrations run during initialization so long-lived offline data can move forward with your model instead of being discarded.

```typescript
import { DbSync, type Migration } from '@slimr/dbsync';

const userMigrations: Migration[] = [
    {
        version: 2,
        note: 'Merge firstName and lastName into fullName',
        upgrade: async (record) => {
            record.fullName = `${record.firstName} ${record.lastName}`.trim();
            delete record.firstName;
            delete record.lastName;
        },
    },
];

const db = new DbSync({
    adapter,
    tables: {
        users: {
            migrations: userMigrations,
        },
    },
});
```

If you need to upgrade imported JSON before storing it, `upgradeRecord()` applies the same migrations on demand without writing anything back to IndexedDB.

```typescript
const upgradedUser = await db.upgradeRecord('users', importedUser);
```

### Automatic schema versioning

By default, `dbsync` computes a deterministic schema signature from your tables and indexes. When that signature changes, the local IndexedDB version bumps automatically and the new schema state is announced through sync so other devices can react safely.

If you prefer stricter control, provide `version: number` and `dbsync` will enforce that exact version instead.

## Sync lifecycle and session helpers

The consumer-facing API stays small even though the runtime work is not.

```typescript
await db.start();
await db.waitForLive();

db.onSyncStateChange((state) => {
    console.log('sync state:', state);
});

await db.triggerSync();
await db.stop();
```

`DbSync` also wraps the basic auth lifecycle so local data and remote sync stay aligned with the user session.

```typescript
await db.login('user@email.com', '123456');
await db.logout();

// Wipes local IndexedDB and logs out
await db.reset();
```

## Adapters

- [Adapters overview](./docs/Adapters.md)
- [RestAdapter](./docs/RestAdapter.md) for `swift-crud`
- [LocalAdapter](./docs/LocalAdapter.md) for local-only usage

If you already have a backend, you can implement the adapter contract yourself and keep the rest of the `dbsync` runtime exactly the same.

## When `dbsync` is a strong fit

- Your users expect the app to remain usable with poor or intermittent connectivity.
- You want local-first UX without writing your own queueing and replay system.
- You need browser tabs to stay consistent without inventing another cache invalidation layer.
- You want a small API that still supports schema evolution, typed repositories, and background synchronization.

## Context

`@slimr` is a set of slim React-oriented libraries. Explore the monorepo on [GitHub](https://github.com/bdombro/slimr).
