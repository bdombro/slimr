# Changelog

## UNRELEASED

## 2.1.101

### Added

- Added Vitest (31 unit tests) and Playwright (10 e2e tests) test suites covering `isMatch`, `find`, `toPath`, `goto`, `replace`, `subscribe`/`unsubscribe`, history tracking, stack routing, anchor click interception, browser back/forward, `#replace`/`#back`/`#clear` hash handling, and external URL bypass.

### Fixed

- `use()` hook now properly cleans up the subscription on unmount, fixing a memory leak.
- `historyBySeq` map is now pruned to 50 entries max, preventing unbounded growth in long-lived SPAs.
- `#clear` navigation now preserves the previous page's scroll position for back-navigation.
- `replaceState` now catches failures and avoids notifying subscribers when the URL commit fails.
- `Router.isMatch` now properly escapes regex metacharacters in path masks, fixing matching for paths with characters like `.`, `*`, `+`.
- `Router.isMatch` is now case-sensitive (removed case-insensitive flag), matching URL path expectations.

### Changed

- **`toPath` now always encodes path params with `encodeURIComponent`**. Callers should pass raw (unencoded) strings. Previously params were returned as-is. This is a breaking change for any caller that was pre-encoding params before passing them.

- Same-URL `pushState` calls no longer silently drop the history entry; the browser history stack now gets the entry while the router skips redundant route updates.

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
