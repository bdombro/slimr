type SchemaTableLike = {
	indexes?: string[]
	[name: string]: unknown
}

/** Builds a stable signature string for a set of tables and their declared indexes. */
export const getSchemaSignature = <T extends SchemaTableLike>(
	tables: readonly T[],
	tableNameKey: keyof T,
) => {
	const normalized = tables
		.slice()
		.sort((left, right) => String(left[tableNameKey]).localeCompare(String(right[tableNameKey])))
		.map((table) => {
			return {
				table: String(table[tableNameKey]),
				indexes: table.indexes?.slice().sort() || [],
			}
		})
	return JSON.stringify(normalized)
}
