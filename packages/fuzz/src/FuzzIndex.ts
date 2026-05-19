import {
	type FuzzExtractResult,
	resolveItemId,
	scoreSearchables,
	toSearchables,
} from "./internal/fuzzCore.js"
import { promiseWithResolvers, yieldToIdle } from "./util/promise.js"

export type { FuzzExtractResult } from "./internal/fuzzCore.js"

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
}

interface IndexedItem<T> {
	original: T
	/** The normalized, lowercased strings extracted from the item */
	searchables: ReturnType<typeof toSearchables>
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
	async search(query: string): Promise<FuzzResult<T>[]> {
		await this.index() // Ensure queue is empty before searching
		return this.searchSync(query)
	}

	/**
	 * Searches the currently indexed items synchronously.
	 * Does NOT wait for pending items in the queue to be indexed.
	 */
	searchSync(query: string): FuzzResult<T>[] {
		const normalizedQuery = query.toLowerCase().trim()
		if (!normalizedQuery) return []

		const results: FuzzResult<T>[] = []

		for (const indexed of this.items) {
			const bestScore = scoreSearchables(indexed.searchables, normalizedQuery)
			if (bestScore > 0) {
				results.push({ item: indexed.original, score: bestScore })
			}
		}

		return results.sort((a, b) => b.score - a.score)
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
		return {
			original: item,
			searchables: toSearchables(this.options.extract(item)),
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
