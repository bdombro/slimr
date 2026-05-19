# 🪶 @slimr/fuzz [npm package](https://npmjs.org/package/@slimr/fuzz)

A tiny fuzzy text search library with zero dependencies and a low memory footprint. It specializes in fast, high-performance substring search with weighted fields. 

Unlike others, @slimr/fuzz:

- Is actually tiny, < 5kb zipped
- Still has the most common features you would need

## Features

- **Slim:** One tiny dependency. No typo-tolerance or heavy Levenshtein algorithms.
- **Asynchronous Indexing:** Builds the search index in chunks without blocking the main thread.
- **Weighted Search:** Assign different importance scores to different fields (e.g., Title is more important than Description).
- **Type-safe:** Generic class allows you to pass your own object shapes.

## Usage

This lib provides two search Classes, `FuzzIndex` and `FuzzIdIndex`. `FuzzIndex` is more full-featured by storing and returning the entire index object, while `FuzzIdIndex` stores only the indexing and returns only the id and score of the results. Scroll down for more info on `FuzzIdIndex`.

```typescript
import { FuzzIndex } from "@slimr/fuzz"

interface Movie {
  id: string;
  title: string;
  description: string;
}

// 1. Initialize the index with your extraction and weighting rules
const searchIndex = new FuzzIndex<Movie>({
  extract: (movie) => [
    { value: movie.title, weight: 2.0 },       // Title is highly relevant
    { value: movie.description, weight: 1.0 }, // Description is baseline
  ]
})

// 2. Add your items (processed asynchronously in chunks)
searchIndex.add([
  {
    id: "m1",
    title: "The Matrix",
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality."
  },
  {
    id: "m2",
    title: "Inception",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his plan is complicated by a matrix of heavily armed sub-conscious projections."
  }
])

// 3. Search! (awaits pending indexing to complete if necessary)
const results = await searchIndex.search("matrix")

// Or use searchSync if you want to skip awaiting the queue
// const quickResults = searchIndex.searchSync("matrix")

console.log(results)
/*
[
  {
    item: { id: "m1", title: "The Matrix", ... },
    score: 100 // Word boundary match in highly-weighted Title field (50 * 2.0)
  },
  {
    item: { id: "m2", title: "Inception", ... },
    score: 25 // Substring match in baseline-weighted Description field (25 * 1.0)
  }
]
*/

// 4. Cleanup when done
searchIndex.destroy()
```

## API

### `new FuzzIndex<T>(options)`

Creates a search index. Background indexing starts immediately on a 2-second interval.


| Option              | Type                               | Default                   | Description                                                                             |
| ------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `chunkSize`         | `number`                           | `500`                     | How many queued items to process per indexing pass before yielding to the browser.      |
| `extract`           | `(item: T) => FuzzExtractResult[]` | *(required)*              | Returns the searchable strings and their weights for each item.                         |
| `getId`             | `(item: T) => string`              | `item.id` (when a string) | Stable id for deduplication on `add` and id-based `remove`. Override for non-`id` keys. |
| `limit`             | `number`                           | —                         | Default max results from `search` / `searchSync`. No cap when omitted.                  |
| `matchEmpty`        | `boolean`                          | `false`                   | When true, blank queries return all indexed items (sorted by boost fields).             |
| `numericMax`        | `number`                           | —                         | Upper bound used to normalize `{ numeric }` values to 0–1.                              |
| `recencyHalfLifeMs` | `number`                           | 7 days                    | Half-life for `{ recency }` extract fields.                                             |


### `add(items: T | T[])`

Appends one or more items to the indexing queue. Pass a single item or an array. Items are normalized and moved into the searchable index during the next background indexing pass (or when `search()` flushes the queue).

Does not block. Newly added items are not visible to `searchSync()` until they have been indexed (unless `getId` updates an already-indexed item — see below).

When an item id can be resolved (`getId`, or a string `item.id` by default), adding an item whose id already exists **replaces** the previous entry instead of duplicating it. If the prior item was already indexed, the index is updated immediately and any queued copy with that id is dropped. Items without a resolvable id are always appended.

### `remove(id: string | string[])`

Removes items by id from the searchable index and the indexing queue. Pass a single id or an array. Uses `getId` or `item.id` by default. Does not block.

```typescript
searchIndex.remove("m1")
searchIndex.remove(["m1", "m2"])
```

### `removeWhere(match: (item: T) => boolean)`

Removes items when the predicate returns true.

```typescript
searchIndex.removeWhere((movie) => movie.title === "Movie title")
```

### `search(query: string, options?: FuzzSearchOptions): Promise<FuzzResult<T>[]>`

Searches the full index. Awaits any in-progress indexing and processes any remaining queued items before returning results (via `index()`).

Use this when you need complete, up-to-date results (e.g. on submit or when the user stops typing).

```typescript
await searchIndex.search("matrix", { limit: 20 })
await searchIndex.search("", { matchEmpty: true }) // default list, e.g. sorted by recency
```

### `searchSync(query: string, options?: FuzzSearchOptions): FuzzResult<T>[]`

Searches only items that have already been indexed. Does not wait for the queue.

Use this for responsive UI filtering while typing, when showing partial results is acceptable.

Returns an empty array for blank or whitespace-only queries unless `matchEmpty: true` (on the search call or index default). With `matchEmpty`, every indexed item is returned and ranked by `{ recency }` / `{ numeric }` boosts only. Result count is capped by `options.limit`, or the index `limit` default when set.

### `index(): Promise<void>`

Processes all items currently in the queue and moves them into the searchable index. Runs automatically on a 2-second interval; call manually when you want to flush the queue without searching.

- Returns immediately if the queue is empty.
- If indexing is already in progress, returns the same promise (concurrent calls are coalesced).
- Processes items in chunks of `chunkSize`, yielding to the browser between chunks via `requestIdleCallback`.

```typescript
searchIndex.add(largeBatch)
await searchIndex.index() // ensure everything is indexed before using searchSync
const results = searchIndex.searchSync("matrix")
```

### `pause(): Promise<void>`

Stops indexing. Signals to any ongoing indexing to stop after next queue item. Returns when indexing is completely stopped.

### `resume(): Promise<void>`

Restarts the background indexing interval and returns when indexing is completed.

### `clear()`

Empties all indexed and queued items. Background indexing keeps running so you can `add` again immediately.

### `destroy()`

Stops background indexing, clears the index and queue, and releases resources. Call when the index is no longer needed (e.g. on component unmount).

## Types

### `FuzzExtractResult`

Each item can contribute text fields (substring match), recency boosts, and numeric boosts:

```typescript
type FuzzExtractResult =
  | { value: string; weight: number }   // searchable text
  | { recency: number; weight: number } // ms timestamp; boosts when text matches
  | { numeric: number; weight: number } // e.g. priority; boosts when text matches
```

Example — todos ranked by title match, then recency:

```typescript
const todoTitleSearchIndex = new FuzzIndex<{
  id: string
  lastEditedAt: number
  title: string
}>({
  extract: (todo) => [
    { value: todo.title, weight: 2 },
    { recency: todo.lastEditedAt, weight: 1 },
  ],
})
```

### `FuzzResult<T>`

```typescript
interface FuzzResult<T> {
  item: T      // The original item passed to add()
  score: number // Highest weighted match score across all extracted fields
}
```

## Scoring

Results are sorted by score descending.

**Text fields** — each `{ value, weight }` is scored independently; the highest weighted text score is used:


| Match type    | Base score | Example (`query: "cool"`) |
| ------------- | ---------- | ------------------------- |
| Exact         | 100        | `"cool"`                  |
| Prefix        | 75         | `"cool runnings"`         |
| Word boundary | 50         | `"a cool movie"`          |
| Substring     | 25         | `"acool"`                 |


Text contribution = base score × field weight.

**Recency and numeric boosts** — only apply when the item already has a text match. They are **added** to the text score:

- `{ recency: ms, weight }` — exponential decay from `ms`; newer timestamps score higher. Half-life defaults to 7 days (`recencyHalfLifeMs`).
- `{ numeric: n, weight }` — scales with `n`; when `numericMax` is set, `n` is clamped to `[0, numericMax]` and normalized to 0–1 first.

Final score = text score + recency boost + numeric boost.

---

## FuzzIdIndex (memory-efficient)

Use `**FuzzIdIndex`** when items are large (many fields, blobs, URLs) and you only need **ids back from search** — you resolve full records elsewhere (e.g. from a store or cache by id).

Same scoring and indexing behavior as `FuzzIndex`, but:

- On `add`, searchable text is extracted immediately; the **original item is not kept**.
- `search` / `searchSync` return `{ id, score }`, not `{ item, score }`.
- Every item must have a resolvable id (`item.id` or `getId`).
- Supports `add`, `remove`, `search`, `searchSync`, `index`, `pause`, `resume`, `clear`, and `destroy` — no `removeWhere` (there is no full item to match against).

```typescript
import { FuzzIdIndex } from "@slimr/fuzz"

interface Movie {
  id: string
  title: string
  description: string
  posterUrl: string // not stored in the index
}

const index = new FuzzIdIndex<Movie>({
  extract: (movie) => [
    { value: movie.title, weight: 2.0 },
    { value: movie.description, weight: 1.0 },
  ],
})

index.add(largeMovieList)

const hits = await index.search("matrix")
// [{ id: "m1", score: 100 }, ...]

// Hydrate full records from your data layer
const movies = await Promise.all(hits.map((h) => loadMovie(h.id)))

index.destroy()
```


|                  | `FuzzIndex`           | `FuzzIdIndex`              |
| ---------------- | --------------------- | -------------------------- |
| Stores full item | Yes                   | No (id + searchables only) |
| Search result    | `{ item, score }`     | `{ id, score }`            |
| `removeWhere`    | Yes                   | No                         |
| Item id required | No (for dedup/remove) | Yes                        |


