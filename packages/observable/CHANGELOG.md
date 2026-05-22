# Changelog

## UNRELEASED

## 0.0.2

### Added

- `ObservableR` — React subclass of `Observable` with `use()` delegating to `useObservable` (optional sugar for app-owned instances).
- `Observable.subscribe(cb, select)` — optional projector; callback runs only when the selected slice changes (deep equality).
- `useObservable` / `UseObservableOptions` — optional `select` for slice-only subscriptions and React re-renders.

### Changed

- README — clearer structure, API cheat sheet, and `select` / SSR documentation.
- Package `exports` include explicit `types` for `.` and `./react` (modern resolution; no root `react.d.ts` shim).
- **Breaking:** `@slimr/observable/react` — `useObservable(source)` subscribes to any `Observable` via `useSyncExternalStore`; optional `getServerSnapshot` for SSR.
- **Breaking:** Renamed local-state hook to `useLocalObservable(initial)` (was `useObservable(initial)`).
- **Breaking:** React entry no longer re-exports `Observable` under the same name; use `Observable` from `@slimr/observable` or `ObservableR` from `/react`.

## 0.0.1

### Added

- Initial release: framework-agnostic `Observable` (`@slimr/observable`).
- React entry (`@slimr/observable/react`): `Observable` with `.use()`, `useObservable`, `UseObservableObserver`.
