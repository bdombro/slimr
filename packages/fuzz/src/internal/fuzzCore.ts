/**
 * Result of the extraction function, pairing the extracted string with a weight.
 */
export interface FuzzExtractResult {
	value: string
	weight: number
}

/** Normalized searchable text and field weight stored in the index. */
export type Searchable = { text: string; weight: number }

/** Builds normalized searchables from extracted field values. */
export function toSearchables(extracted: FuzzExtractResult[]): Searchable[] {
	return extracted.map((e) => ({
		text: e.value.toLowerCase().trim(),
		weight: e.weight,
	}))
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
