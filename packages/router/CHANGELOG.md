# Changelog

## UNRELEASED

## 3.0.7

## 3.0.6

- Add support for tauri and capacitor apps

## 3.0.5

## 3.0.4

## 3.0.3

## 3.0.2

## 3.0.1

### Changed

- **Breaking:** Removed `use()` method. Use `router.route$.use()` instead (returns `RouteMatch`, backed by `useSyncExternalStore`).
- **Breaking:** Removed `subscribe()` and `unsubscribe()` methods. Use `router.route$.subscribe(cb)` instead (returns an unsubscribe function).
- **Breaking:** `<Switch>` no longer passes `route` or `url` props to rendered components. Components get route data via `router.route$.use()` or `new URL(location.href)`.
- **Breaking:** `goto()` and `replace()` now return `Promise<void>` (was `void`). No code awaits these today, so impact is minimal.
- **Breaking:** Subscriber notification is now async (microtask) instead of synchronous. React consumers are unaffected due to batching. Vanilla JS subscribers that need to react synchronously should use the `locationchange` CustomEvent on `window`.
- **Breaking:** RouteMatch objects from `route$.use()` and `route$.subscribe()` are shallow-frozen (`Object.freeze`). Direct mutation of route properties will silently fail in sloppy mode or throw in strict mode.
- Added `@slimr/observable` as a dependency.
- Added `route$` observable (`ObservableR<RouteMatch>`) — all route-level reactivity goes through this. Use `.use()` for React hooks, `.subscribe()` for imperative subscriptions, `.val` for the current value.
- Added `searchParams$` observable (`ObservableR<URLSearchParams>`) — fires on every URL change (not just route changes). Use `.use()` for React hooks, `.subscribe()` for imperative subscriptions, `.val` for the current value.
- Re-exported `useObservable` and `UseObservableOptions` from `@slimr/observable/react`.

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
