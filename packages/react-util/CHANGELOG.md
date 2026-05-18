# Changelog

## 1.0.2

### Changed

- Excluding ts source files from published bundle for better compat

## 1.0.1

### Added

- `useColorScheme` now tolerates running in non-browser environments

## 1.0.0

### Added

- Initial release. Extracted from `@slimr/react`.
- `mergeRefs`: merge multiple React refs onto a single element.
- `Observable`: class with pub/sub and React hook integration.
- `useColorScheme`: hook that returns `{ dark, light, scheme }` tracking the OS color scheme.
- `useDeepCompareMemo` / `useShallowCompareMemo`: like `useMemo` but with deep/shallow comparison.
- `useObservable`: hook returning a mutable handle whose `.value` triggers a re-render when assigned.
- `useReRender`: hook returning a stable function that triggers a re-render when called.
- `useSet`: hook returning a reactive `Set` with `toggle` and `reset` methods.
