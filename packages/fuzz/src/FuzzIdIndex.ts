import {
	type FuzzExtractResult,
	resolveItemId,
	scoreSearchables,
	toSearchables,
} from "./internal/fuzzCore.js"
import { promiseWithResolvers, yieldToIdle } from "./util/promise.js"

/**
 * Options for configuring a {@link FuzzIdIndex}.
 */
export interface FuzzIdOptions<T> {
	/** Maximum number of items to process in a single synchronous chunk to avoid blocking */
	chunkSize?: number
	/** Function to extract the string(s) to search against from an item */
	extract: (item: T) => FuzzExtractResult[]
	/**
	 * Returns a stable id for an item. Defaults to `item.id` when it is a string.
	 * Required for every item added to the index.
	 */
	getId?: (item: T) => string
}

interface IdIndexedItem {
	id: string
	searchables: ReturnType<typeof toSearchables>
}

/**
 * Result of a fuzz search against a {@link FuzzIdIndex}.
 */
export interface FuzzIdResult {
	id: string
	score: number
}

/**
 * Memory-efficient index that stores only item ids and searchable text — not full items.
 * Use when items are large and search hits will be resolved elsewhere by id.
 */
export class FuzzIdIndex<T> {
	private items: IdIndexedItem[] = []
	private queue: IdIndexedItem[] = []
	private options: FuzzIdOptions<T> & { chunkSize: number }
	private indexPromise: Promise<void> | null = null
	private indexInterval: ReturnType<typeof setInterval> | null = null

	constructor(options: FuzzIdOptions<T>) {
		this.options = {
			chunkSize: 500,
			...options,
		}
		this.indexIntervalStart()
	}

	/**
	 * Adds one or more items. Extracts and normalizes searchable text immediately,
	 * then discards the original item. Replaces existing entries with the same id.
	 */
	add(items: T | T[]) {
		const list = Array.isArray(items) ? items : [items]
		for (const item of list) {
			this.upsert(this.prepareEntry(item))
		}
	}

	/**
	 * Removes items by id from the index and indexing queue.
	 */
	remove(id: string | string[]) {
		const ids = new Set(Array.isArray(id) ? id : [id])
		this.items = this.items.filter((indexed) => !ids.has(indexed.id))
		this.queue = this.queue.filter((queued) => !ids.has(queued.id))
	}

	/**
	 * Searches the index for the given query asynchronously.
	 * Waits for any pending indexing to complete before searching.
	 */
	async search(query: string): Promise<FuzzIdResult[]> {
		await this.index()
		return this.searchSync(query)
	}

	/**
	 * Searches the currently indexed items synchronously.
	 * Does NOT wait for pending items in the queue to be indexed.
	 */
	searchSync(query: string): FuzzIdResult[] {
		const normalizedQuery = query.toLowerCase().trim()
		if (!normalizedQuery) return []

		const results: FuzzIdResult[] = []

		for (const indexed of this.items) {
			const score = scoreSearchables(indexed.searchables, normalizedQuery)
			if (score > 0) {
				results.push({ id: indexed.id, score })
			}
		}

		return results.sort((a, b) => b.score - a.score)
	}

	/**
	 * Cleans up the interval and clears the index.
	 */
	destroy() {
		if (this.indexInterval) {
			clearInterval(this.indexInterval)
			this.indexInterval = null
		}
		this.items = []
		this.queue = []
	}

	/**
	 * Pauses the indexing interval and any in-progress indexing run.
	 */
	async pause() {
		if (this.indexInterval) {
			clearInterval(this.indexInterval)
			this.indexInterval = null
		}
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
	 * Moves queued entries into the searchable index in chunks.
	 */
	async index() {
		if (this.queue.length === 0) return
		if (this.indexPromise) return this.indexPromise

		const { promise, resolve } = promiseWithResolvers<void>()
		this.indexPromise = promise

		while (this.queue.length > 0) {
			const chunk = this.queue.splice(0, this.options.chunkSize)
			this.items.push(...chunk)

			if (this.queue.length > 0) {
				await yieldToIdle()
			}
		}

		resolve()
		this.indexPromise = null
	}

	private prepareEntry(item: T): IdIndexedItem {
		const id = resolveItemId(item, this.options.getId)
		if (id === undefined) {
			throw new Error(
				"[FuzzIdIndex] Items must have a resolvable id (string item.id or getId in options)",
			)
		}
		return {
			id,
			searchables: toSearchables(this.options.extract(item)),
		}
	}

	private upsert(entry: IdIndexedItem) {
		const indexedIdx = this.items.findIndex((indexed) => indexed.id === entry.id)
		if (indexedIdx >= 0) {
			this.items[indexedIdx] = entry
			this.queue = this.queue.filter((queued) => queued.id !== entry.id)
			return
		}

		const queueIdx = this.queue.findIndex((queued) => queued.id === entry.id)
		if (queueIdx >= 0) {
			this.queue[queueIdx] = entry
			return
		}

		this.queue.push(entry)
	}

	private indexIntervalStart() {
		if (this.indexInterval) return
		this.indexInterval = setInterval(() => {
			this.index()
		}, 2000)
	}
}
