# Changelog

## [4.0.0]

### Added
- `useObservable` hook: returns a mutable handle whose `.value` triggers a re-render when assigned; supports compound assignment and implicit string coercion.

### Removed
- **Breaking:** removed bulk re-export of `react-use`. Individual hooks from `react-use` must now be imported directly from `react-use` if needed. This resolves naming conflicts (e.g. `useObservable`).

