# Changelog

## UNRELEASED

## 2.1.100

### Changed

- Package `exports` include explicit `types` for `.`.

## 2.1.99

### Changed

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 2.1.96

### Changed

- Excluding ts source files from published bundle for better compat

## 2.1.96

### Changed

- Router class's `pushStateRaw` and `replaceStateRaw` are now pony-filled to avoid issues in environments where `history` is not available at module initialization (e.g. SSR). They are still available as static properties on the Router class.
