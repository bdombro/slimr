# Changelog

## UNRELEASED

## 0.0.3

### Added
- Optional `getId` deduplicates on `add` (defaults to string `item.id`; replaces indexed or queued items with the same id).
- `FuzzIndex.remove(id)` removes by id when `getId` is configured.
- `FuzzIndex.removeWhere(match)` removes items matching a predicate.
- `FuzzIdIndex` stores only ids and searchable text; search returns `{ id, score }` for lower memory use.

## 0.0.2

### Added
- Everything