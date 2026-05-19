# 🪶 @slimr/fuzz [![npm package](https://img.shields.io/npm/v/@slimr/fuzz.svg?style=flat-square)](https://npmjs.org/package/@slimr/fuzz)

A tiny fuzzy text search library with zero dependencies and a low memory footprint. It specializes in fast, high-performance substring search with weighted fields. 

## Features

- **Slim:** Zero dependencies. No typo-tolerance or heavy Levenshtein algorithms.
- **Asynchronous Indexing:** Builds the search index in chunks without blocking the main thread.
- **Weighted Search:** Assign different importance scores to different fields (e.g., Title is more important than Description).
- **Type-safe:** Generic class allows you to pass your own object shapes.

## Usage

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `extract` | `(item: T) => FuzzExtractResult[]` | *(required)* | Returns the searchable strings and their weights for each item. |
| `chunkSize` | `number` | `500` | How many queued items to process per indexing pass before yielding to the browser. |

### `add(items: T | T[])`

Appends one or more items to the indexing queue. Pass a single item or an array. Items are normalized and moved into the searchable index during the next background indexing pass (or when `search()` flushes the queue).

Does not block. Newly added items are not visible to `searchSync()` until they have been indexed.


### `search(query: string): Promise<FuzzResult<T>[]>`

Searches the full index. Awaits any in-progress indexing and processes any remaining queued items before returning results (via `index()`).

Use this when you need complete, up-to-date results (e.g. on submit or when the user stops typing).

### `searchSync(query: string): FuzzResult<T>[]`

Searches only items that have already been indexed. Does not wait for the queue.

Use this for responsive UI filtering while typing, when showing partial results is acceptable.

Returns an empty array for blank or whitespace-only queries.

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

### `destroy()`

Stops background indexing, clears the index and queue, and releases resources. Call when the index is no longer needed (e.g. on component unmount).

## Types

### `FuzzExtractResult`

```typescript
interface FuzzExtractResult {
  value: string  // Text to search against (normalized to lowercase at index time)
  weight: number // Multiplier applied to match scores for this field
}
```

### `FuzzResult<T>`

```typescript
interface FuzzResult<T> {
  item: T      // The original item passed to add()
  score: number // Highest weighted match score across all extracted fields
}
```

## Scoring

Each extracted field is scored independently; the highest weighted score wins for that item. Results are sorted by score descending.

| Match type | Base score | Example (`query: "cool"`) |
|------------|------------|---------------------------|
| Exact | 100 | `"cool"` |
| Prefix | 75 | `"cool runnings"` |
| Word boundary | 50 | `"a cool movie"` |
| Substring | 25 | `"acool"` |

Final score = base score × field weight.

