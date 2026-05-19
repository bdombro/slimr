import type { DbSync } from "./DbSync.js"
import type { RowChange } from "./internal/EventBus.js"

export interface FindOptions {
	index?: string
	equals?: string | number
	equalsAny?: Array<string | number>
	startsWith?: string
	lowerBound?: string | number
	upperBound?: string | number
	limit?: number
	order?: "asc" | "desc"
}

/** Row-level change for a single table (table name omitted). */
export type TableRowChange =
	| { change: "insert" | "update" | "delete"; id: string }
	| { change: "clear" }

/** Callback invoked when this table's rows change. */
type TableSubscribeCallback = (changes?: TableRowChange[]) => void

/** Options for table-scoped subscriptions. */
export type TableSubscribeOptions = {
	/** When set, only invoke the callback if one of these ids changed (or the table was cleared). */
	ids?: string[]
}

/** Maps global row changes to table-scoped changes. */
const toTableRowChanges = (changes: RowChange[], tableName: string): TableRowChange[] =>
	changes
		.filter((change) => change.table === tableName)
		.map((change) =>
			change.change === "clear"
				? { change: "clear" as const }
				: { change: change.change, id: change.id },
		)

/**
 * A typed repository wrapper for a single `DbSync` table.
 * Provides a localized CRUD interface to minimize boilerplate and
 * enforce consistent data types for a specific table.
 */
export class DbRepository<T> {
	/**
	 * Initializes a new repository tied to a specific table.
	 *
	 * @param db The centralized `DbSync` instance.
	 * @param tableName The name of the table this repository will manage.
	 */
	constructor(
		protected db: DbSync,
		public readonly tableName: string,
	) {}

	/**
	 * Retrieves a single record by its primary key.
	 *
	 * @param id The primary key of the record to retrieve.
	 * @returns A promise resolving to the typed record, or `undefined` if not found.
	 */
	async get(id: string): Promise<T | undefined> {
		return this.db.get<T>(this.tableName, id)
	}

	/**
	 * Retrieves records matching a query from the table.
	 *
	 * - with no options, this returns every record from the table.
	 * - limit+order=desc is not well-supported in IndexedDB and must use the more costly cursor read approach
	 */
	async find(options: FindOptions = {}): Promise<T[]> {
		return this.db.find<T>(this.tableName, options)
	}

	/**
	 * Retrieves the first record matching an index/value pair.
	 */
	async getBy(indexName: string, value: string | number): Promise<T | undefined> {
		return this.db.getBy<T>(this.tableName, indexName, value)
	}

	/**
	 * Streams records matching a query from the table.
	 * If no options are provided, returns every record from the table.
	 */
	stream(options: FindOptions = {}): AsyncGenerator<T> {
		return this.db.stream<T>(this.tableName, options)
	}

	/**
	 * Inserts a new record into the table.
	 *
	 * @param value The object payload to insert.
	 * @param key An optional explicit primary key.
	 * @returns A promise resolving to the newly inserted record.
	 */
	async add(value: Partial<T>, key?: string): Promise<T> {
		return this.db.add<T>(this.tableName, value, key)
	}

	/**
	 * Applies the table's defaultSetter/defaulting logic without persisting the record.
	 *
	 * @param value The partial object payload.
	 * @returns A promise resolving to the normalized record.
	 */
	applyDefaults(value: Partial<T>): T {
		return this.db.applyDefaults(this.tableName, value as Record<string, any>) as T
	}

	/**
	 * Inserts or updates an existing record in the table.
	 *
	 * @param value The complete object to upsert.
	 * @param key An optional explicit primary key.
	 * @returns A promise resolving to the upserted record.
	 */
	async put(value: T, key?: string): Promise<T> {
		return this.db.put<T>(this.tableName, value, key)
	}

	/**
	 * Removes a record from the table by its primary key.
	 *
	 * @param key The primary key of the record to delete.
	 * @returns A promise resolving when the deletion is complete.
	 */
	async delete(key: string): Promise<void> {
		return this.db.delete(this.tableName, key)
	}

	/**
	 * Partially updates an existing record in the table.
	 *
	 * @param value The partial object payload.
	 * @param key An optional explicit primary key.
	 * @returns A promise resolving to the final patched record.
	 */
	async patch(value: Partial<T>, key?: string): Promise<T> {
		return this.db.patch<T>(this.tableName, value, key)
	}

	/**
	 * Discards all records present in the table.
	 *
	 * @returns A promise resolving when the table has been completely cleared.
	 */
	async clear(): Promise<void> {
		return this.db.clear(this.tableName)
	}

	/**
	 * Subscribes to row-level changes for this table only.
	 *
	 * @param callback Invoked with changes for this table. `undefined` means the table changed but row detail is unavailable (e.g. large cross-tab broadcast).
	 * @param options Optional filters such as limiting to specific record ids.
	 * @returns A handle with `close()` to unsubscribe.
	 */
	subscribe(callback: TableSubscribeCallback, options?: TableSubscribeOptions) {
		return this.db.subscribe((tables, changes) => {
			if (!tables.includes(this.tableName)) return

			if (!changes) {
				callback(undefined)
				return
			}

			const relevant = toTableRowChanges(changes, this.tableName)
			if (relevant.length === 0) return

			if (options?.ids) {
				const watchedIds = options.ids
				const hit = relevant.some(
					(change) =>
						change.change === "clear" || ("id" in change && watchedIds.includes(change.id)),
				)
				if (!hit) return
			}

			callback(relevant)
		})
	}
}
