# Changelog

## UNRELEASED

## 0.1.1

### Fixed

- Use `process.getBuiltinModule` inside the inline worker so `eval: true` workers work inside `"type": "module"` packages where `require` is not defined.

## 0.1.0

### Added

- Initial release of `@slimr/sqlite`: async `node:sqlite` wrapper over a shared `worker_threads` worker with statement caching, WAL defaults, queued transactions, savepoints, batches, and idle worker hibernation.
