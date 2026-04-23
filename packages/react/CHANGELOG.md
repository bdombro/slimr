# Changelog

## [Unreleased]

## [4.0.2]

### Changed

- **Breaking:** `useSet2` / `UseSet2` renamed to `useSet` / `UseSet`. I don't normally do this with a patch version, but this is a fast-follow to the 4.0.0 release (same day), so most people will be unaffected.

## [4.0.0]

### Added
- `useObservable` hook: returns a mutable handle whose `.value` triggers a re-render when assigned; supports compound assignment and implicit string coercion.

### Removed
- **Breaking:** removed bulk re-export of `react-use`. Individual hooks from `react-use` must now be imported directly from `react-use` if needed. This resolves naming conflicts (e.g. `useObservable`).

