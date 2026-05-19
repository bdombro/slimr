# Changelog

## UNRELEASED

## 0.0.7

### Fixed
- `matchEmpty` only includes non-matching items when the query is blank (not on every search).

### Added
- `indexedCount` and `queueCount` getters for debugging index population.

### Changed
- Refactor

## 0.0.5

### Added
- `{ recency, weight }` and `{ numeric, weight }` extract fields add ranking boosts when an item has a text match.
- `recencyHalfLifeMs` and `numericMax` index options tune boost behavior.
- `limit` index option and `search(query, { limit })` cap how many results are returned.
- `matchEmpty` on the index or `search(query, { matchEmpty: true })` returns all items for blank queries.

## 0.0.4

### Added
- `clear()` on `FuzzIndex` and `FuzzIdIndex` empties indexed and queued items without stopping the index.

## 0.0.3

### Added
- Optional `getId` deduplicates on `add` (defaults to string `item.id`; replaces indexed or queued items with the same id).
- `FuzzIndex.remove(id)` removes by id when `getId` is configured.
- `FuzzIndex.removeWhere(match)` removes items matching a predicate.
- `FuzzIdIndex` stores only ids and searchable text; search returns `{ id, score }` for lower memory use.

## 0.0.2

### Added
- Everything