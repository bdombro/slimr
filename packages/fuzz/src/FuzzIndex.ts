import { BaseFuzzIndex } from "./internal/BaseFuzzIndex.js"
import {
	type FuzzBoosts,
	type FuzzExtractResult,
	type FuzzRemoveId,
	type FuzzScoreOptions,
	normalizeRemoveIds,
	parseExtract,
	resolveItemId,
} from "./internal/fuzzCore.js"

export type {
	FuzzExtractNumericResult,
	FuzzExtractRecencyResult,
	FuzzExtractResult,
	FuzzExtractTextResult,
	FuzzSearchOptions,
} from "./internal/fuzzCore.js"

/**
 * Options for configuring the FuzzIndex.
 */
export interface FuzzOptions<T> {
	/** Maximum number of items to process in a single synchronous chunk to avoid blocking */
	chunkSize?: number
	/** Function to extract the string(s) to search against from an item */
	extract: (item: T) => FuzzExtractResult[]
	/**
	 * Returns a stable id for an item. Defaults to `item.id` when it is a string.
	 * When an id can be resolved, `add` replaces existing items with the same id
	 * (indexed or queued), and `remove` can target ids directly.
	 */
	getId?: (item: T) => string
	/** Half-life (ms) for `{ recency }` extract fields. Default: 7 days. */
	recencyHalfLifeMs?: number
	/** Upper bound for `{ numeric }` extract fields when normalizing to 0–1. */
	numericMax?: number
	/** Clock for recency decay. Defaults to `Date.now()` at search time. */
	now?: number
	/** Default max results returned from `search` / `searchSync`. No cap when omitted. */
	limit?: number
	/** When true, blank queries return all indexed items by default. */
	matchEmpty?: boolean
	/** When true, text matching is case-sensitive. Default: false. */
	caseSensitive?: boolean
}

interface IndexedItem<T> {
	original: T
	searchables: ReturnType<typeof parseExtract>["searchables"]
	boosts: FuzzBoosts
}

/**
 * Result of a fuzz search.
 */
export interface FuzzResult<T> {
	item: T
	score: number
}

/**
 * A fast, asynchronous, and lightweight substring search index.
 */
export class FuzzIndex<T> extends BaseFuzzIndex<IndexedItem<T>, T, FuzzResult<T>> {
	private options: FuzzOptions<T> & { chunkSize: number }

	constructor(options: FuzzOptions<T>) {
		const fullOptions = {
			chunkSize: 500, // default chunk size
			...options,
		}
		super(fullOptions)
		this.options = fullOptions
	}

	/**
	 * Adds one or more items to the indexing queue. They will be processed asynchronously.
	 * When an item id can be resolved, items with an existing id replace the prior entry
	 * (indexed immediately, or queued until the next indexing pass).
	 */
	add(items: T | T[]) {
		const list = Array.isArray(items) ? items : [items]
		for (const item of list) {
			this.upsert(item)
		}
	}

	/**
	 * Removes items by id from the index and indexing queue.
	 * Uses `getId` from options, or `item.id` when it is a string.
	 * Ids not present in the index or queue are ignored.
	 */
	remove(id: FuzzRemoveId) {
		this.removeByIds(normalizeRemoveIds(id))
	}

	/**
	 * Removes items from the index and indexing queue that match the predicate.
	 */
	removeWhere(match: (item: T) => boolean) {
		this.items = this.items.filter((indexed) => !match(indexed.original))
		this.queue = this.queue.filter((item) => !match(item))
	}

	protected toIndexedItem(item: T): IndexedItem<T> {
		const { searchables, boosts } = parseExtract(this.options.extract(item), {
			caseSensitive: this.options.caseSensitive,
		})
		return {
			original: item,
			searchables,
			boosts,
		}
	}

	protected queueItemId(item: T): string | undefined {
		return resolveItemId(item, this.options.getId)
	}

	protected entryId(entry: IndexedItem<T>): string | undefined {
		return resolveItemId(entry.original, this.options.getId)
	}

	protected toResult(entry: IndexedItem<T>, score: number): FuzzResult<T> {
		return { item: entry.original, score }
	}

	protected scoreOptions(): FuzzScoreOptions {
		return {
			numericMax: this.options.numericMax,
			now: this.options.now,
			recencyHalfLifeMs: this.options.recencyHalfLifeMs,
		}
	}
}
