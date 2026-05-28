# Changelog

## UNRELEASED

## 4.0.16

## 4.0.15

## 4.0.14

## 4.0.13

## 4.0.12

## 4.0.11

### Changed

- Package `exports` include explicit `types` for `.`.

## 4.0.10

### Changed

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 4.0.7

### Changed

- Excluding ts source files from published bundle for better compat

## 4.0.5

### Changed

- Bumped `@slimr/react-util` dependency to `^1.0.1` to get the latest `useColorScheme` fix.

## 4.0.3

### Changed

- Hooks and utilities (`mergeRefs`, `Observable`, `useColorScheme`, `useDeepCompareMemo`, `useObservable`, `useReRender`, `useSet`, etc.) extracted to new `@slimr/react-util` package. All exports are unchanged — `@slimr/react` re-exports everything from `@slimr/react-util`.

## 4.0.2

### Changed

- **Breaking:** `useSet2` / `UseSet2` renamed to `useSet` / `UseSet`. I don't normally do this with a patch version, but this is a fast-follow to the 4.0.0 release (same day), so most people will be unaffected.

## 4.0.0

### Added
- `useObservable` hook: returns a mutable handle whose `.value` triggers a re-render when assigned; supports compound assignment and implicit string coercion.

### Removed
- **Breaking:** removed bulk re-export of `react-use`. Individual hooks from `react-use` must now be imported directly from `react-use` if needed. This resolves naming conflicts (e.g. `useObservable`).

