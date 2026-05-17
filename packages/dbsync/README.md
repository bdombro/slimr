# 🪶 @slimr/dbsync [![npm package](https://img.shields.io/npm/v/@slimr/dbsync.svg?style=flat-square)](https://npmjs.org/package/@slimr/dbsync)

A powerfully slim, offline-first IndexedDB ORM and sync engine.

`@slimr/dbsync` provides a simple, Promise-based NoSQL API for browser data while automatically turning your app into a robust offline-first experience. It quietly queues changes made offline and perfectly synchronizes a local IndexedDB with a remote `@slimr/swift-crud` backed SQL database via background polling and Web Locks.

## Context

`@slimr` is a set of slim React (hence '@slimr') libs. Check them all out on [github](https://github.com/bdombro/slimr)!

## Why use `dbsync`?

- 🚀 **Zero-Config Schemas:** Define your tables and indexes in JS. `dbsync` automatically calculates schema signatures and handles IndexedDB `onupgradeneeded` version bumping and cross-device schema sync seamlessly.
- ⚡️ **Offline-First Resilience:** Read and write instantly, network or no network. Mutations are automatically written to a background queue and flushed to the backend as soon as connectivity is restored.
- 🔄 **Cross-Tab Reactivity:** Utilizing an internal Pub/Sub system and `BroadcastChannel`, any data changes (either local or synced from the server) instantly trigger subscribers, ensuring UI hooks eagerly re-render across all open tabs.
- 🔐 **First-Class Identity:** Deeply integrated with backend authentication, managing `isAuth` state, logins, and securely wiping local databases on logout.
- 🌱 **Zero Dependencies:** Built entirely on standard Web APIs (IndexedDB, BroadcastChannel, Web Locks, `fetch`). Fits the `@slimr` ethos perfectly.

## Installation

```bash
npm install @slimr/dbsync
```

## Quick Start
You instantiate `dbsync` by supplying your backend [adapter](./docs/Adapters.md) and your table/index definitions. Afterwards, you must call `.init()` to safely generate the database.

```typescript
import { DbSync } from '@slimr/dbsync';
import { LocalAdapter, RestAdapter } from '@slimr/dbsync/adapters';

const dbAdapter = process.env.TEST ? new LocalAdapter() : new RestAdapter({ url: 'https://api.myapp.com' });

const db = new DbSync({
    adapter: dbAdapter,
    tables: {
        posts: { indexes: ['userId', 'updatedAt'] },
        users: { indexes: ['email'] }
    }
});

// Init the db and boot up the background sync engine!
await db.start();
```

> **Local-Only No-Sync Database:** If you want all the IndexedDB ORM and reactive features, but completely lack a remote database to sync to, simply import `LocalAdapter` from `@slimr/dbsync/adapters` and pass that into the constructor instead. It acts as an empty black box so your operations succeed cleanly entirely on the client.

## Schema Versioning

`@slimr/dbsync` automatically manages your IndexedDB database versioning to prevent schema mismatches and corruption across tabs and devices.

By default, you don't even need to provide a `version`. The library calculates a **deterministic schema signature** based on the tables and indexes you define in `tables`. If you modify your schema, the signature changes, the local IndexedDB version is automatically incremented, and this schema change is announced to the backend. Other tabs and devices syncing from the server will detect the new signature and safely reload to adapt to the new schema without mutating data out-of-bounds.

If you prefer explicit control, you can provide an exact `version: number` in the config. `@slimr/dbsync` will strictly enforce that exact version across the network instead.

## The ORM API
Once initialized, `dbsync` acts as a fast NoSQL document store. To support offline-first behavior, you should generate IDs locally using `db.uuid()`.

### Basic CRUD
```typescript
// Create
const newPost = await db.put('posts', { 
    id: db.genUuid(), 
    content: 'Hello World!', 
    userId: 'user_123' 
});

// Read
const myPost = await db.get('posts', newPost.id);
const allPosts = await db.findAll('posts');

// Delete
await db.delete('posts', newPost.id);
```


### Typed Repositories (`DbRepository`)
For a cleaner developer experience, you can wrap a table in a `DbRepository`. This automatically binds the table name and TypeScript generic to the CRUD methods so you don't have to repeat them everywhere.

```typescript
import { DbRepository } from '@slimr/dbsync';

interface Post { id: string; content: string; }
const postsRepo = new DbRepository<Post>(db, 'posts');

// Types act natively without passing the table name again
await postsRepo.put({ id: '1', content: 'Cleaner code!' });
const post = await postsRepo.findById('1');
```

### Atomic Transactions
Need to update multiple records or cross-table data safely? Buffer them in memory and commit them all at once. In contrast to the transaction API of IndexedDB, `DbSync` transactions are purely in-memory and only hit the database when you call `commit()`. This means you can batch as many operations as you want without worrying about transaction timeouts, locks,
or the indexeddb quirk where it automatically commits after a certain number of operations.

```typescript
const tx = db.getTransaction();

tx.put('posts', { id: '1', content: 'Atomic write 1' });
tx.put('posts', { id: '2', content: 'Atomic write 2' });
tx.patch('posts', { id: '2', content: 'Atomic write 2b' });
tx.delete('users', 'bad_user');

// Writes hit the database together
await tx.commit();
```

Alternatively, you can create a `DbTxRepository`, similar to `DbRepository`, to encapsulate the raw table name semantics and enforce typescript hinting across your consumer app via a singleton:

```typescript
import { DbTxRepository } from '@slimr/dbsync';

class Tx {
    private tx = db.getTransaction();

    // Wrap your tables for strict typings & intellisense
    posts = new DbTxRepository<Post>(this.tx, 'posts');
    users = new DbTxRepository<User>(this.tx, 'users');

    commit = () => this.tx.commit();
}

const tx = new Tx();
tx.posts.put({ id: '1', content: 'Atomic write 1' });
tx.posts.put({ id: '2', content: 'Atomic write 2' });
tx.posts.patch({ id: '2', content: 'Atomic write 2b' });
tx.users.delete('bad_user');

// Writes hit the database together
await tx.commit();
```

### UI Reactivity (Pub/Sub)
Whenever a table is modified—whether by you manually, or by a background Sync Engine pull—`dbsync` announces the change.

```typescript
const sub = db.subscribe((updatedStores) => {
    if (updatedStores.includes('posts')) {
        console.log('The posts table was just updated!');
        // Trigger your React state re-render here
    }
});

// Clean up on component unmount
sub.close();
```

### React Hook (`useDbQuery`)
For React users, `@slimr/dbsync` exports a built-in `useDbQuery` hook that makes binding components to your data effortless. It executes your query natively and instantly re-renders the component whenever the underlying table changes locally or remotely!

```tsx
import { useDbQuery } from '@slimr/dbsync/react';

function PostList({ db }) {
    // Re-renders automatically whenever the 'posts' table changes!
    const posts = useDbQuery(db, 'posts', () => db.findAll('posts'));

    if (!posts) return <Spinner />;
    return <ul>{posts.map(p => <li key={p.id}>{p.content}</li>)}</ul>;
}
```

## The Offline Sync Engine
By routing your `put` and `delete` operations exclusively through the `DbSync` class, updates are silently logged into highly scalable native `dirtyQueue` and `deletedQueue` tables under-the-hood.

To boot up the network synchronizer to clear those queues and fetch server updates:

```typescript
// Start polling the swift-crud backend every 5 seconds
await db.start();

// Stop polling
await db.stop();
```

Only one tab on a user's device will act as the "Leader" and poll the network at any time using **Web Locks**. All other tabs remain completely idle and rely on `BroadcastChannel` messages from the Leader tab to reactively update their UI when fresh data drops.


## Session Management
Because offline data is fundamentally tied to an authenticated session, `DbSync` wraps the core identity commands to ensure background syncing strictly follows network permissions.

```typescript
// Authenticate and unlock syncing
await db.login('user@email.com', '123456');

// Wipe the IndexedDB totally clean + log out immediately
await db.reset();
```
