# Changelog

## UNRELEASED

## 0.0.5

### Added
- `{ recency, weight }` and `{ numeric, weight }` extract fields add ranking boosts when an item has a text match.
- `recencyHalfLifeMs` and `numericMax` index options tune boost behavior.
- `limit` index option and `search(query, { limit })` cap how many results are returned.

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