# Changelog

## UNRELEASED

## 3.2.80

### Changed

- Package `exports` include explicit `types` for `.` and `./code-highlight`.

### Fixed

- Library build emits `esm/index.js` at the package root (`rootDir: "src"` in `tsconfig.json`).

## 3.2.79

### Changed

- CommonJS build artifacts now ship with .cjs extensions so ESM-first consumers resolve the package correctly.

## 3.2.76

### Changed

- Excluding ts source files from published bundle for better compat

