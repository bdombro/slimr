# Changelog

## UNRELEASED

## 2.1.97

### Fixed

- Fix `my` and `py` shorthand expansion in `expandShorthands` when not followed by a semicolon (e.g. at the end of a block/declaration).


## 2.1.96

### Changed

- Package `exports` include explicit `types` for `.`.
- Library build emits `esm/index.js` at the package root (`rootDir: "src"` in `tsconfig.json`).

## 2.1.95

### Changed

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 2.1.92

### Changed

- Excluding ts source files from published bundle for better compat

