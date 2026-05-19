import { promiseWithResolvers, yieldToIdle } from "./util/promise.js"

/**
 * Result of the extraction function, pairing the extracted string with a weight.
 */
export interface FuzzExtractResult {
	value: string
	weight: number
}

/**
 * Options for configuring the FuzzIndex.
 */
export interface FuzzOptions<T> {
	/** Maximum number of items to process in a single synchronous chunk to avoid blocking */
	chunkSize?: number
	/** Function to extract the string(s) to search against from an item */
	extract: (item: T) => FuzzExtractResult[]
}

interface IndexedItem<T> {
	original: T
	/** The normalized, lowercased strings extracted from the item */
	searchables: { text: string; weight: number }[]
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
	private options: Required<FuzzOptions<T>>
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
	 */
	add(items: T | T[]) {
		const list = Array.isArray(items) ? items : [items]
		this.queue.push(...list)
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
			let bestScore = 0

			for (const { text, weight } of indexed.searchables) {
				let matchScore = 0

				if (text === normalizedQuery) {
					matchScore = 100
				} else if (text.startsWith(normalizedQuery)) {
					matchScore = 75
				} else if (text.includes(` ${normalizedQuery}`)) {
					matchScore = 50
				} else if (text.includes(normalizedQuery)) {
					matchScore = 25
				}

				const finalScore = matchScore * weight
				bestScore = Math.max(bestScore, finalScore)
			}

			if (bestScore > 0) {
				results.push({ item: indexed.original, score: bestScore })
			}
		}

		// Sort by highest score first
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
				const extracted = this.options.extract(item)
				const searchables = extracted.map((e) => ({
					text: e.value.toLowerCase().trim(),
					weight: e.weight,
				}))

				this.items.push({
					original: item,
					searchables,
				})
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
	 * Starts the indexing interval.
	 */
	private indexIntervalStart() {
		if (this.indexInterval) return
		this.indexInterval = setInterval(() => {
			this.index()
		}, 2000)
	}
}
