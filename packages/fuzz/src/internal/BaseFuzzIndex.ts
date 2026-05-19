import { promiseWithResolvers, yieldToIdle } from "../util/promise.js"
import {
	type FuzzBoosts,
	type FuzzScoreOptions,
	type FuzzSearchOptions,
	limitResults,
	resolveMatchEmpty,
	resolveSearchLimit,
	type Searchable,
	scoreBoosts,
	scoreItem,
} from "./fuzzCore.js"

export abstract class BaseFuzzIndex<
	TEntry extends { searchables: Searchable[]; boosts: FuzzBoosts },
	TQueueItem,
	TResult extends { score: number },
> {
	protected items: TEntry[] = []
	protected queue: TQueueItem[] = []
	protected indexPromise: Promise<void> | null = null
	protected indexInterval: ReturnType<typeof setInterval> | null = null

	constructor(protected baseOptions: { chunkSize: number; limit?: number; matchEmpty?: boolean }) {
		this.indexIntervalStart()
	}

	/** Count of items in the searchable index (excludes the queue). */
	get indexedCount(): number {
		return this.items.length
	}

	/** Count of items waiting to be indexed. */
	get queueCount(): number {
		return this.queue.length
	}

	protected abstract toIndexedItem(item: TQueueItem): TEntry
	protected abstract queueItemId(item: TQueueItem): string | undefined
	protected abstract entryId(entry: TEntry): string | undefined
	protected abstract toResult(entry: TEntry, score: number): TResult
	protected abstract scoreOptions(): FuzzScoreOptions

	protected upsert(item: TQueueItem) {
		const id = this.queueItemId(item)
		if (id === undefined) {
			this.queue.push(item)
			return
		}

		const indexedIdx = this.items.findIndex((indexed) => this.entryId(indexed) === id)
		if (indexedIdx >= 0) {
			this.items[indexedIdx] = this.toIndexedItem(item)
			this.queue = this.queue.filter((queued) => this.queueItemId(queued) !== id)
			return
		}

		const queueIdx = this.queue.findIndex((queued) => this.queueItemId(queued) === id)
		if (queueIdx >= 0) {
			this.queue[queueIdx] = item
			return
		}

		this.queue.push(item)
	}

	protected removeByIds(ids: Set<string>) {
		this.items = this.items.filter((indexed) => {
			const id = this.entryId(indexed)
			return !(id !== undefined && ids.has(id))
		})
		this.queue = this.queue.filter((queued) => {
			const id = this.queueItemId(queued)
			return !(id !== undefined && ids.has(id))
		})
	}

	/**
	 * Searches the index for the given query asynchronously.
	 * Waits for any pending indexing to complete before searching.
	 */
	async search(query: string, options?: FuzzSearchOptions): Promise<TResult[]> {
		await this.index()
		return this.searchSync(query, options)
	}

	/**
	 * Searches the currently indexed items synchronously.
	 * Does NOT wait for pending items in the queue to be indexed.
	 */
	searchSync(query: string, options?: FuzzSearchOptions): TResult[] {
		const normalizedQuery = query.toLowerCase().trim()
		const matchEmpty = resolveMatchEmpty(options, this.baseOptions.matchEmpty)
		if (!normalizedQuery && !matchEmpty) return []

		const scoreOpts = this.scoreOptions()
		const results: TResult[] = []

		if (!normalizedQuery) {
			for (const indexed of this.items) {
				results.push(this.toResult(indexed, scoreBoosts(indexed.boosts, scoreOpts)))
			}
		} else {
			for (const indexed of this.items) {
				const score = scoreItem(indexed.searchables, indexed.boosts, normalizedQuery, scoreOpts)
				if (score > 0) {
					results.push(this.toResult(indexed, score))
				}
			}
		}

		const sorted = results.sort((a, b) => b.score - a.score)
		return limitResults(sorted, resolveSearchLimit(options, this.baseOptions.limit))
	}

	/**
	 * Empties all indexed and queued items. Waits for any in-progress indexing
	 * to finish so a concurrent run cannot repopulate the index afterward.
	 * Does not stop background indexing.
	 */
	async clear() {
		this.items = []
		this.queue = []
		if (this.indexPromise) {
			await this.indexPromise
		}
		this.items = []
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
	 * Indexes the items in the queue.
	 *
	 * Is ran automatically by the indexing interval, but can also be called manually.
	 */
	async index() {
		if (this.queue.length === 0) return
		if (this.indexPromise) return this.indexPromise

		const { promise, resolve } = promiseWithResolvers<void>()
		this.indexPromise = promise

		while (this.queue.length > 0) {
			const chunk = this.queue.splice(0, this.baseOptions.chunkSize)

			for (const item of chunk) {
				this.items.push(this.toIndexedItem(item))
			}

			if (this.queue.length > 0) {
				await yieldToIdle()
			}
		}

		resolve()
		this.indexPromise = null
	}

	protected indexIntervalStart() {
		if (this.indexInterval) return
		this.indexInterval = setInterval(() => {
			this.index()
		}, 2000)
	}
}
