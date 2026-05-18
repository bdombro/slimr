# Changelog

This app follows [Semantic Versioning](https://semver.org/) and documents all notable changes to this package in this file. For more details on the API and usage, see the [README](./README.md).

While in pre-release, assume that any change is a breaking change until v1.0.0 is released. After that, breaking changes will be clearly marked as such in the changelog.

## UNRELEASED

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


