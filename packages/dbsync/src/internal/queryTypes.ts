export interface FindOptions {
	/** Indexed field to query (required for `equalsAny` and `startsWith`). */
	index?: string
	/** The value to query. */
	equals?: string | number
	/** The values to query. */
	equalsAny?: Array<string | number>
	/** The prefix to query. */
	startsWith?: string
	/** The lower bound to query. */
	lowerBound?: string | number
	/** The upper bound to query. */
	upperBound?: string | number
	/** The limit to query. */
	limit?: number
	/** The order to query. */
	order?: "asc" | "desc"
	/** When set, only these fields are included on each returned record. */
	select?: readonly string[]
	/** When set, these fields are omitted from each returned record. */
	omit?: readonly string[]
}

/** Inferred `find` result type from query options. */
export type FindQueryResult<T, O extends FindOptions | undefined> = O extends {
	select: infer K extends ReadonlyArray<keyof T>
}
	? Array<Pick<T, K[number]>>
	: O extends { omit: infer K extends ReadonlyArray<keyof T> }
		? Array<Omit<T, K[number]>>
		: T[]

/** Inferred `stream` result type from query options. */
export type StreamQueryResult<T, O extends FindOptions | undefined> = O extends {
	select: infer K extends ReadonlyArray<keyof T>
}
	? AsyncGenerator<Pick<T, K[number]>>
	: O extends { omit: infer K extends ReadonlyArray<keyof T> }
		? AsyncGenerator<Omit<T, K[number]>>
		: AsyncGenerator<T>
