# @slimr/dbsync documentation

Package overview: [README.md](../README.md).

## Learning paths

| I want to… | Read |
| --- | --- |
| Set up dbsync in a new app | [Getting started](./GettingStarted.md) → [Data access](./DataAccess.md) → [React](./React.md) |
| Build login, refresh, offline logout | [Offline-first apps](./Offline.md) → [Session](./Session.md) → [RestAdapter](./RestAdapter.md) |
| Understand sync and multi-tab | [Sync engine](./Sync.md) → [Adapters](./Adapters.md) |
| Look up a method or getter | [API reference](./API.md) |
| Upgrade from pre-0.0.40 APIs | [Migrating](./Migrating.md) → [CHANGELOG](../CHANGELOG.md) |
| Develop without a backend | [Getting started — env swap](./GettingStarted.md#developing-before-the-backend) → [LocalAdapter](./LocalAdapter.md) |

## Start here

| Doc | Topics |
| --- | --- |
| [Getting started](./GettingStarted.md) | Install, `DbSync` / `DbTable`, listeners, lifecycle |
| [Offline-first apps](./Offline.md) | Routing, shell, logout, service workers |
| [Migrating](./Migrating.md) | Upgrade from hook-based / constructor `auth` |

## Reference

| Doc | Topics |
| --- | --- |
| [API reference](./API.md) | `DbSync`, `DbTable`, `db.auth`, `FindOptions` |

## Guides

| Doc | Topics |
| --- | --- |
| [Sync engine](./Sync.md) | Dirty queue, pull/push, leader tab, `waitForLive` |
| [Session](./Session.md) | `db.auth` API and callback matrix |
| [Data access](./DataAccess.md) | CRUD, queries, streams, transactions |
| [Data modeling](./Modeling.md) | 1:N relations, join tables, denormalization |
| [Schema evolution](./Schema.md) | Migrations, `defaultSetter`, versioning |
| [React](./React.md) | `subscribe`, `useDbQuery`, `useDbSession` |
| [SSR & Next.js](./SSR.md) | Server-side rendering caveats and hydration |
| [Testing](./Testing.md) | Mocking IndexedDB, component tests |
| [Errors](./Errors.md) | `DbSyncOfflineError`, `DbSyncNotAuthenticatedError`, `DbSyncAuthError` |

## Adapters

| Doc | Topics |
| --- | --- |
| [Adapters overview](./Adapters.md) | `BackendAdapter`, `requiresAuth` |
| [RestAdapter](./RestAdapter.md) | REST + swift-crud endpoints |
| [LocalAdapter](./LocalAdapter.md) | Local-only, env-swap for pre-backend dev |
