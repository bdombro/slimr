/** Text field used for substring matching. */
export type FuzzExtractTextResult = { value: string; weight: number }

/** Recency boost from a timestamp (ms). Applied when the item has a text match. */
export type FuzzExtractRecencyResult = { recency: number; weight: number }

/** Numeric boost from a number (e.g. priority). Applied when the item has a text match. */
export type FuzzExtractNumericResult = { numeric: number; weight: number }

/** One extracted field for indexing and scoring. */
export type FuzzExtractResult =
	| FuzzExtractTextResult
	| FuzzExtractRecencyResult
	| FuzzExtractNumericResult

/** Argument for id-based removal. Missing ids in the index are ignored. */
export type FuzzRemoveId = string | string[] | { id: string | string[] }

/** Normalizes {@link FuzzRemoveId} into a set of id strings. */
export function normalizeRemoveIds(id: FuzzRemoveId): Set<string> {
	const raw = typeof id === "object" && "id" in id ? id.id : id
	return new Set(Array.isArray(raw) ? raw : [raw])
}

/** Normalized searchable text and field weight stored in the index. */
export type Searchable = { text: string; weight: number }

/** Non-text boosts stored on an indexed item. */
export interface FuzzBoosts {
	recency: { at: number; weight: number }[]
	numeric: { value: number; weight: number }[]
}

/** Per-search options passed to `search` / `searchSync`. */
export interface FuzzSearchOptions {
	/** Max results to return. Overrides the index default when set. */
	limit?: number
	/** When true, blank queries return all indexed items (ranked by boost fields). */
	matchEmpty?: boolean
}

/** Options that affect recency and numeric boost calculation. */
export interface FuzzScoreOptions {
	/** Half-life for recency decay (ms). Default: 7 days. */
	recencyHalfLifeMs?: number
	/** When set, numeric values are clamped to `[0, numericMax]` then scaled to 0–1. */
	numericMax?: number
	/** Clock used for recency decay. Default: `Date.now()`. */
	now?: number
}

const DEFAULT_RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000
const BOOST_SCALE = 50

/** Splits extract results into searchable text and boost metadata. */
export function parseExtract(extracted: FuzzExtractResult[]): {
	searchables: Searchable[]
	boosts: FuzzBoosts
} {
	const searchables: Searchable[] = []
	const boosts: FuzzBoosts = { recency: [], numeric: [] }

	for (const entry of extracted) {
		if ("value" in entry) {
			searchables.push({
				text: entry.value.toLowerCase().trim(),
				weight: entry.weight,
			})
		} else if ("recency" in entry) {
			boosts.recency.push({ at: entry.recency, weight: entry.weight })
		} else if ("numeric" in entry) {
			boosts.numeric.push({ value: entry.numeric, weight: entry.weight })
		}
	}

	return { searchables, boosts }
}

/** @deprecated Use {@link parseExtract}. */
export function toSearchables(extracted: FuzzExtractResult[]): Searchable[] {
	return parseExtract(extracted).searchables
}

/**
 * Scores an item's searchables against a normalized (lowercased, trimmed) query.
 * Returns 0 when there is no match.
 */
export function scoreSearchables(searchables: Searchable[], normalizedQuery: string): number {
	if (!normalizedQuery) return 0

	let bestScore = 0

	for (const { text, weight } of searchables) {
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

	return bestScore
}

/**
 * Recency boost for a timestamp. Newer `at` values score higher; decays by half-life.
 */
export function scoreRecencyBoost(
	at: number,
	weight: number,
	options: FuzzScoreOptions = {},
): number {
	const now = options.now ?? Date.now()
	const halfLife = options.recencyHalfLifeMs ?? DEFAULT_RECENCY_HALF_LIFE_MS
	const age = Math.max(0, now - at)
	const decay = 2 ** (-age / halfLife)
	return weight * decay * BOOST_SCALE
}

/**
 * Numeric boost. When `numericMax` is set, `value` is normalized to 0–1 against it.
 */
export function scoreNumericBoost(
	value: number,
	weight: number,
	options: FuzzScoreOptions = {},
): number {
	const max = options.numericMax
	const normalized = max !== undefined ? Math.min(1, Math.max(0, value / max)) : Math.max(0, value)
	return weight * normalized * BOOST_SCALE
}

/** Recency and numeric boosts without a text match. */
export function scoreBoosts(boosts: FuzzBoosts, options: FuzzScoreOptions = {}): number {
	let boost = 0
	for (const { at, weight } of boosts.recency) {
		boost += scoreRecencyBoost(at, weight, options)
	}
	for (const { value, weight } of boosts.numeric) {
		boost += scoreNumericBoost(value, weight, options)
	}
	return boost
}

/** Combined text match score plus recency and numeric boosts (boosts only apply when text matches). */
export function scoreItem(
	searchables: Searchable[],
	boosts: FuzzBoosts,
	normalizedQuery: string,
	options: FuzzScoreOptions = {},
): number {
	const textScore = scoreSearchables(searchables, normalizedQuery)
	if (textScore <= 0) return 0
	return textScore + scoreBoosts(boosts, options)
}

/** Truncates a sorted result list when `limit` is a positive finite number. */
export function limitResults<T>(results: T[], limit?: number): T[] {
	if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
		return results
	}
	return results.slice(0, Math.floor(limit))
}

/** Resolves per-search limit, falling back to the index default. */
export function resolveSearchLimit(
	searchOptions?: FuzzSearchOptions,
	defaultLimit?: number,
): number | undefined {
	return searchOptions?.limit ?? defaultLimit
}

/** Resolves whether an empty query should return results. */
export function resolveMatchEmpty(
	searchOptions?: FuzzSearchOptions,
	defaultMatchEmpty?: boolean,
): boolean {
	return searchOptions?.matchEmpty ?? defaultMatchEmpty ?? false
}

/** Resolves an item id via `getId` or a string `id` property on the item. */
export function resolveItemId<T>(item: T, getId?: (item: T) => string): string | undefined {
	if (getId) {
		return getId(item)
	}
	if (item !== null && typeof item === "object" && "id" in item) {
		const id = (item as { id: unknown }).id
		if (typeof id === "string") {
			return id
		}
	}
	return undefined
}
