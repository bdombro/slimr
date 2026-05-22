# @slimr/dbsync documentation

Package overview: [README.md](../README.md).

## Learning paths

| I want to… | Read |
| --- | --- |
| Set up dbsync in a new app | [Getting started](./GettingStarted.md) → [Offline-first apps](./Offline.md) → [React](./React.md) |
| Build login, refresh, offline logout | [Offline-first apps](./Offline.md) → [Auth listeners](./Auth.md) → [RestAdapter](./RestAdapter.md) |
| Understand sync and multi-tab | [Sync engine](./Sync.md) → [Adapters](./Adapters.md) |
| Look up a method or getter | [API reference](./API.md) |
| Trace boot, sync, and auth in dev | [Debugging](./Debugging.md) |
| Avoid common integration mistakes | [Offline-first apps — anti-patterns](./Offline.md#anti-patterns) |
| Develop without a backend | [Getting started — env swap](./GettingStarted.md#developing-before-the-backend) → [Adapters — LocalAdapter](./Adapters.md#localadapter) |
| Upgrade from older APIs | [CHANGELOG UNRELEASED](../CHANGELOG.md) · [Migrating (archived)](./archive/Migrating-pre-0.0.43.md) |

## Build an app

| Doc | Topics |
| --- | --- |
| [Getting started](./GettingStarted.md) | Install, `DbSync` / `DbTable`, module layout, lifecycle |
| [Offline-first apps](./Offline.md) | Routing, phases, anti-patterns, recipes, PWAs |
| [React](./React.md) | `useDbAuth`, `useDbQuery`, `subscribe` |

## Data & schema

| Doc | Topics |
| --- | --- |
| [Data access](./DataAccess.md) | CRUD, queries, streams, transactions |
| [Data modeling](./Modeling.md) | 1:N relations, join tables, denormalization |
| [Schema evolution](./Schema.md) | Migrations, `defaultSetter`, versioning |

## Sync & backend

| Doc | Topics |
| --- | --- |
| [Sync engine](./Sync.md) | Dirty queue, pull/push, leader tab, readiness |
| [Adapters](./Adapters.md) | `BackendAdapter`, `LocalAdapter`, `requiresAuth` |
| [RestAdapter](./RestAdapter.md) | REST + swift-crud endpoints |

## Reference

| Doc | Topics |
| --- | --- |
| [API reference](./API.md) | `DbSync`, `DbTable`, `db.auth`, `db.sync`, `FindOptions` |
| [Auth listeners](./Auth.md) | `onLogout`, `onAuthenticated`, callback matrix |
| [Errors](./Errors.md) | Typed auth and guard errors |

## Production

| Doc | Topics |
| --- | --- |
| [Testing](./Testing.md) | IndexedDB polyfill, mocks, Playwright |
| [Debugging](./Debugging.md) | `onDebug`, sync/auth hooks |
| [SSR & Next.js](./SSR.md) | Hydration and null `db` |

## Archive

| Doc | Topics |
| --- | --- |
| [Migrating (pre-0.0.43)](./archive/Migrating-pre-0.0.43.md) | Historical upgrade from constructor `auth` / `db.session` |
