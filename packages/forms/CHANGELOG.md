# Changelog

## UNRELEASED

## 5.0.54

### Added

- `useSFormContext` now exposes `errors` — a record of field errors keyed by field name, populated when a `SFormError` is thrown during submit. Cleared on re-submit, accept, and reset.

## 5.0.53

### Changed

- Package `exports` include explicit `types` for `.`.

## 5.0.52

### Changed

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 5.0.49

### Changed

- Excluding ts source files from published bundle for better compat

