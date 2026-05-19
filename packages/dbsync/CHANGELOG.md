# Changelog

This app follows [Semantic Versioning](https://semver.org/) and documents all notable changes to this package in this file. For more details on the API and usage, see the [README](./README.md).

While in pre-release, assume that any change is a breaking change until v1.0.0 is released. After that, breaking changes will be clearly marked as such in the changelog.

## UNRELEASED

## 0.0.28

### Changed

- Record primary keys and row-change `id` fields are typed as `string` only (no `number`).

## 0.0.27

### Changed

- Public types are exported from the package entry (`index.ts`) instead of re-exported through `DbSync`; removed `TableSubscribeCallback` and internal `DbSyncResolvedTable` from the public surface.

## 0.0.26

### Added

- `DbRepository.subscribe` (e.g. `db.posts.subscribe`) for table-scoped row change notifications, with optional `ids` filtering.

## 0.0.25

### Added

- `subscribe` callbacks now receive an optional second argument, `changes`, with per-row `{ table, change, id }` events (or `{ table, change: "clear" }` for whole-table writes); existing table-only subscribers are unchanged.
- `useDbQuery` accepts an optional fifth argument, `options.shouldRefetchFilter`, to skip refetches when row-level changes are not relevant to the query.

## 0.0.24

- query options now reject incompatible combinations instead of silently prioritizing one branch, so `equalsAny` and `startsWith` must be used on a declared index and cannot be mixed with conflicting range filters.
- refactoring

## 0.0.23

- added `equalsAny` to `FindOptions` for exact membership queries over an indexed field, returning the union of all matching records.
- added `startsWith` to `FindOptions` for prefix queries over string indexes; normalize fields yourself if you need case-insensitive matching.
- newly declared indexes are now created for existing IndexedDB stores during schema upgrades instead of only for freshly created stores.

## 0.0.22

- renamed several public `storeName` parameters and repository properties to `tableName` to match the table-centric API exposed by `DbTable`.
- removed the `getAll()`, `findAll()`, and `streamAll()` convenience methods from the public API so `get()`, `getBy()`, `find()` and `stream()` are the only read entry points.
- `find()` now handles the full-store case when no options are provided, and descending queries with a limit use a cursor so they can stop early instead of loading everything first.
- `stream()` now handles the full-store case when no options are provided, so the generator can iterate an entire store without a separate helper.
- queries that name an undeclared index now throw instead of silently falling back.

## 0.0.21

- useDbQuery does equality checks on query results and only triggers updates when the result actually changes, preventing unnecessary re-renders in React apps.

## 0.0.20

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 0.0.19

- removed `DbRepository` from the package root export so the public API stays focused on `DbTable` and `DbSync`; internal code still uses it as the implementation layer.

## 0.0.18

- added `DbTable` as the preferred schema-class API, with runtime table registration, typed transaction table facades, and table-level `prepareCreate` / `preparePut` / `preparePatch` hooks.
- introduced direct table-property repositories on `DbSync` (for example `db.posts`) and updated the README to make that the primary API; this is a breaking change from the previous manual `DbRepository`-first guidance.
- replaced `findAll()` with a clearer query surface: `getAll()` for full-store reads, `find()` for filtered/ranged queries, `getBy()` for exact index lookups, and `stream()` / `streamAll()` for generator-based iteration.
- updated the Playwright fixture and README to use the typed schema-class pattern as the preferred consumer example, while keeping `DbSync` CRUD helpers available as lower-level escape hatches.
- removed `DbTxRepository` from the package root export and trimmed it from consumer-facing docs, keeping transaction-scoped typed access as an internal implementation detail for now.

## 0.0.7

- renamed DbSync.enable/disable to start/stop for better clarity and semantics.

## 0.0.3

Initial release


