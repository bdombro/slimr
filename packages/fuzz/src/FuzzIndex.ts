import {
	type FuzzBoosts,
	type FuzzExtractResult,
	type FuzzScoreOptions,
	type FuzzSearchOptions,
	limitResults,
	parseExtract,
	resolveItemId,
	resolveSearchLimit,
	scoreItem,
} from "./internal/fuzzCore.js"
import { promiseWithResolvers, yieldToIdle } from "./util/promise.js"

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
}

export type { FuzzSearchOptions } from "./internal/fuzzCore.js"

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
export class FuzzIndex<T> {
	private items: IndexedItem<T>[] = []
	private queue: T[] = []
	private options: FuzzOptions<T> & { chunkSize: number }
	private indexPromise: Promise<void> | null = null
	private indexInterval: ReturnType<typeof setInterval> | null = null

	constructor(options: FuzzOptions<T>) {
		this.options = {
			chunkSize: 500, // default chunk size
			...options,
		}
		this.indexIntervalStart()
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
	 */
	remove(id: string | string[]) {
		const ids = new Set(Array.isArray(id) ? id : [id])
		this.removeWhere((item) => {
			const itemId = resolveItemId(item, this.options.getId)
			return itemId !== undefined && ids.has(itemId)
		})
	}

	/**
	 * Removes items from the index and indexing queue that match the predicate.
	 */
	removeWhere(match: (item: T) => boolean) {
		this.items = this.items.filter((indexed) => !match(indexed.original))
		this.queue = this.queue.filter((item) => !match(item))
	}

	/**
	 * Searches the index for the given query asynchronously.
	 * Waits for any pending indexing to complete before searching.
	 */
	async search(query: string, options?: FuzzSearchOptions): Promise<FuzzResult<T>[]> {
		await this.index() // Ensure queue is empty before searching
		return this.searchSync(query, options)
	}

	/**
	 * Searches the currently indexed items synchronously.
	 * Does NOT wait for pending items in the queue to be indexed.
	 */
	searchSync(query: string, options?: FuzzSearchOptions): FuzzResult<T>[] {
		const normalizedQuery = query.toLowerCase().trim()
		if (!normalizedQuery) return []

		const results: FuzzResult<T>[] = []

		for (const indexed of this.items) {
			const score = scoreItem(
				indexed.searchables,
				indexed.boosts,
				normalizedQuery,
				this.scoreOptions(),
			)
			if (score > 0) {
				results.push({ item: indexed.original, score })
			}
		}

		const sorted = results.sort((a, b) => b.score - a.score)
		return limitResults(sorted, resolveSearchLimit(options, this.options.limit))
	}

	/**
	 * Empties all indexed and queued items. Does not stop background indexing.
	 */
	clear() {
		this.items = []
		this.queue = []
	}

	/**
	 * Cleans up the interval and clears the index.
	 */
	destroy() {
		if (this.indexInterval) {
			clearInterval(this.indexInterval)
			this.indexInterval = null
		}
		this.clear()
	}

	/**
	 * Pauses the indexing interval and any in-progress indexing run.
	 */
	async pause() {
		if (this.indexInterval) {
			clearInterval(this.indexInterval)
			this.indexInterval = null
		}
		// Starve any ongoing indexing so its while-loop exits after the current chunk
		if (this.indexPromise) {
			const queue = this.queue
			this.queue = []
			await this.indexPromise
			this.queue = queue
		}
	}

	/**
	 * Resumes the indexing interval.
	 */
	async resume() {
		this.indexIntervalStart()
		await this.index()
	}

	/**
	 * Indexes the items in the queue.
	 *
	 * Is ran automatically by the indexing interval, but can also be called manually.
	 */
	async index() {
		if (this.queue.length === 0) return
		if (this.indexPromise) return this.indexPromise

		const { promise, resolve } = promiseWithResolvers<void>()
		this.indexPromise = promise

		// Process the queue in chunks
		while (this.queue.length > 0) {
			const chunk = this.queue.splice(0, this.options.chunkSize)

			for (const item of chunk) {
				this.items.push(this.toIndexedItem(item))
			}

			// Yield to the event loop if there are still items left
			if (this.queue.length > 0) {
				await yieldToIdle()
			}
		}

		resolve()
		this.indexPromise = null
	}

	/**
	 * Inserts or replaces an item. Deduplicates by id when one can be resolved.
	 */
	private upsert(item: T) {
		const id = resolveItemId(item, this.options.getId)
		if (id === undefined) {
			this.queue.push(item)
			return
		}

		const indexedIdx = this.items.findIndex(
			(indexed) => resolveItemId(indexed.original, this.options.getId) === id,
		)
		if (indexedIdx >= 0) {
			this.items[indexedIdx] = this.toIndexedItem(item)
			this.queue = this.queue.filter((queued) => resolveItemId(queued, this.options.getId) !== id)
			return
		}

		const queueIdx = this.queue.findIndex(
			(queued) => resolveItemId(queued, this.options.getId) === id,
		)
		if (queueIdx >= 0) {
			this.queue[queueIdx] = item
			return
		}

		this.queue.push(item)
	}

	private toIndexedItem(item: T): IndexedItem<T> {
		const { searchables, boosts } = parseExtract(this.options.extract(item))
		return {
			original: item,
			searchables,
			boosts,
		}
	}

	private scoreOptions(): FuzzScoreOptions {
		return {
			numericMax: this.options.numericMax,
			now: this.options.now,
			recencyHalfLifeMs: this.options.recencyHalfLifeMs,
		}
	}

	/**
	 * Starts the indexing interval.
	 */
	private indexIntervalStart() {
		if (this.indexInterval) return
		this.indexInterval = setInterval(() => {
			this.index()
		}, 2000)
	}
}
