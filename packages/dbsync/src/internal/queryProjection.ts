import type { FindOptions, FindQueryResult, StreamQueryResult } from "./queryTypes.js"

/** Whether the query should return a subset of each record's fields. */
const hasProjection = (options: FindOptions) =>
	Boolean(options.select?.length || options.omit?.length)

/** Returns a shallow copy of a record with `select` or `omit` applied. */
const projectRecord = <T>(record: T, options: FindOptions): T => {
	if (!hasProjection(options)) {
		return record
	}

	const source = record as Record<string, unknown>

	if (options.select?.length) {
		const projected: Record<string, unknown> = {}
		for (const key of options.select) {
			if (key in source) {
				projected[key] = source[key]
			}
		}
		return projected as T
	}

	const projected = { ...source }
	for (const key of options.omit ?? []) {
		delete projected[key]
	}
	return projected as T
}

const asFindResult = <T, O extends FindOptions | undefined>(records: T[]) =>
	records as FindQueryResult<T, O>

const asStreamResult = <T, O extends FindOptions | undefined>(stream: AsyncGenerator<T>) =>
	stream as StreamQueryResult<T, O>

export { asFindResult, asStreamResult, hasProjection, projectRecord }
