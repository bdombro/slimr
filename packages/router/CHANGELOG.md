# Changelog

## [UNRELEASED]

## [2.1.96]

### Changed

- Router class's `pushStateRaw` and `replaceStateRaw` are now pony-filled to avoid issues in environments where `history` is not available at module initialization (e.g. SSR). They are still available as static properties on the Router class.
