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

export type { FuzzSearchOptions } from "./internal/fuzzCore.js"

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
}

interface IdIndexedItem {
	id: string
	searchables: ReturnType<typeof parseExtract>["searchables"]
	boosts: FuzzBoosts
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
export class FuzzIdIndex<T> extends BaseFuzzIndex<IdIndexedItem, IdIndexedItem, FuzzIdResult> {
	private options: FuzzIdOptions<T> & { chunkSize: number }

	constructor(options: FuzzIdOptions<T>) {
		const fullOptions = {
			chunkSize: 500,
			...options,
		}
		super(fullOptions)
		this.options = fullOptions
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
	 * Ids not present in the index or queue are ignored.
	 */
	remove(id: FuzzRemoveId) {
		this.removeByIds(normalizeRemoveIds(id))
	}

	private prepareEntry(item: T): IdIndexedItem {
		const id = resolveItemId(item, this.options.getId)
		if (id === undefined) {
			throw new Error(
				"[FuzzIdIndex] Items must have a resolvable id (string item.id or getId in options)",
			)
		}
		const { searchables, boosts } = parseExtract(this.options.extract(item))
		return {
			id,
			searchables,
			boosts,
		}
	}

	protected toIndexedItem(item: IdIndexedItem): IdIndexedItem {
		return item
	}

	protected queueItemId(item: IdIndexedItem): string | undefined {
		return item.id
	}

	protected entryId(entry: IdIndexedItem): string | undefined {
		return entry.id
	}

	protected toResult(entry: IdIndexedItem, score: number): FuzzIdResult {
		return { id: entry.id, score }
	}

	protected scoreOptions(): FuzzScoreOptions {
		return {
			numericMax: this.options.numericMax,
			now: this.options.now,
			recencyHalfLifeMs: this.options.recencyHalfLifeMs,
		}
	}
}
