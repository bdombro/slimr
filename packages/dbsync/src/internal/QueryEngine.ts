import type { FindOptions } from "../DbRepository.js"
import { promiseWithResolvers } from "../util/promises.js"

type SchemaTable = {
	storeName: string
	indexes?: string[]
}

/**
 * Handles IndexedDB query planning and execution for a live dbsync database.
 */
export class QueryEngine {
	constructor(
		private getDb: () => IDBDatabase,
		private getSchemaTables: () => SchemaTable[],
	) {}

	/** Returns records matching a query from the requested store. */
	public async find<T>(storeName: string, options: FindOptions = {}): Promise<T[]> {
		this.assertValidOptions(options)

		if (options.equalsAny !== undefined) {
			return this.findAny<T>(storeName, options)
		}

		if (options.startsWith !== undefined) {
			return this.findStartsWith<T>(storeName, options)
		}

		if (options.order === "desc" && options.limit !== undefined) {
			const records: T[] = []
			for await (const record of this.stream<T>(storeName, options)) {
				records.push(record)
			}
			return records
		}

		const source = this.getQuerySource(
			this.getDb().transaction(storeName, "readonly"),
			storeName,
			options.index,
		)
		const range = this.buildKeyRange(options)
		const { promise, resolve, reject } = promiseWithResolvers<T[]>()
		const req =
			options.order === "desc" ? source.getAll(range) : source.getAll(range, options.limit)
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		const records = await promise

		if (options.order === "desc") {
			return records.reverse()
		}

		return records
	}

	/** Returns the first record matching an index/value pair, if any. */
	public async getBy<T>(
		storeName: string,
		indexName: string,
		value: string | number,
	): Promise<T | undefined> {
		for await (const record of this.stream<T>(storeName, {
			index: indexName,
			equals: value,
			limit: 1,
		})) {
			return record
		}

		return undefined
	}

	/** Streams records matching a query from the requested store. */
	public async *stream<T>(storeName: string, options: FindOptions = {}): AsyncGenerator<T> {
		this.assertValidOptions(options)

		if (options.equalsAny !== undefined) {
			for (const record of await this.findAny<T>(storeName, options)) {
				yield record
			}
			return
		}

		const tx = this.getDb().transaction(storeName, "readonly")
		const source = this.getQuerySource(tx, storeName, options.index)
		const cursor = await this.openCursor(
			source,
			this.buildKeyRange(options),
			this.getCursorDirection(options),
		)
		if (!cursor) {
			return
		}

		let seen = 0
		let currentCursor: IDBCursorWithValue | null = cursor

		while (currentCursor) {
			yield currentCursor.value as T
			seen += 1
			if (options.limit !== undefined && seen >= options.limit) {
				return
			}

			currentCursor = await this.continueCursor(currentCursor)
		}
	}

	/** Resolves the object store or declared index that should service a query. */
	private getQuerySource(tx: IDBTransaction, storeName: string, indexName?: string) {
		const store = tx.objectStore(storeName)
		if (indexName === undefined) return store

		this.assertDeclaredIndex(storeName, indexName)
		return store.index(indexName)
	}

	/** Throws when a query names an index that the store does not declare. */
	private assertDeclaredIndex(storeName: string, indexName: string) {
		const table = this.getSchemaTables().find((schemaTable) => schemaTable.storeName === storeName)
		if (table?.indexes?.includes(indexName)) {
			return
		}

		throw new Error(`[dbsync]: Index ${indexName} is not declared for ${storeName}`)
	}

	/** Rejects combinations that would otherwise silently override one another. */
	private assertValidOptions(options: FindOptions) {
		if (options.equalsAny !== undefined && options.index === undefined) {
			throw new Error("[dbsync]: equalsAny requires an index")
		}

		if (options.startsWith !== undefined && options.index === undefined) {
			throw new Error("[dbsync]: startsWith requires an index")
		}

		if (options.equalsAny !== undefined && options.startsWith !== undefined) {
			throw new Error("[dbsync]: equalsAny cannot be combined with startsWith")
		}

		if (
			options.equalsAny !== undefined &&
			(options.equals !== undefined ||
				options.lowerBound !== undefined ||
				options.upperBound !== undefined)
		) {
			throw new Error("[dbsync]: equalsAny cannot be combined with equals or range bounds")
		}

		if (
			options.startsWith !== undefined &&
			(options.equals !== undefined ||
				options.lowerBound !== undefined ||
				options.upperBound !== undefined)
		) {
			throw new Error("[dbsync]: startsWith cannot be combined with equals or range bounds")
		}

		if (
			options.equals !== undefined &&
			(options.lowerBound !== undefined || options.upperBound !== undefined)
		) {
			throw new Error("[dbsync]: equals cannot be combined with range bounds")
		}
	}

	/** Executes exact-match lookups for several values and merges the results. */
	private async findAny<T>(storeName: string, options: FindOptions): Promise<T[]> {
		const distinctValues = [...new Set(options.equalsAny ?? [])]
		if (distinctValues.length === 0) {
			return []
		}

		const source = this.getQuerySource(
			this.getDb().transaction(storeName, "readonly"),
			storeName,
			options.index,
		)

		const batches = await Promise.all(
			distinctValues.map(async (value) => {
				return this.readAll<T>(source, IDBKeyRange.only(value))
			}),
		)

		const records = this.dedupeRecords(batches.flat())
		return this.applyOrderingAndLimit(records, options)
	}

	/** Performs batched prefix-range lookups for `startsWith`. */
	private async findStartsWith<T>(storeName: string, options: FindOptions): Promise<T[]> {
		const tx = this.getDb().transaction(storeName, "readonly")
		const source = this.getQuerySource(tx, storeName, options.index)
		const range = IDBKeyRange.bound(options.startsWith, `${options.startsWith}\uffff`)
		const records = await this.readAll<T>(source, range)
		return this.applyOrderingAndLimit(records, options)
	}

	/** Reads all records for a source/range pair. */
	private async readAll<T>(source: IDBObjectStore | IDBIndex, range: IDBKeyRange): Promise<T[]> {
		const { promise, resolve, reject } = promiseWithResolvers<T[]>()
		const req = source.getAll(range)
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Applies descending order and limit semantics without re-sorting merged results. */
	private applyOrderingAndLimit<T>(records: T[], options: FindOptions): T[] {
		const ordered = options.order === "desc" ? [...records].reverse() : records
		return options.limit === undefined ? ordered : ordered.slice(0, options.limit)
	}

	/** Removes duplicate rows by primary key while preserving the first match for each id. */
	private dedupeRecords<T>(records: T[]): T[] {
		const seen = new Set<string>()
		const deduped: T[] = []

		for (const record of records) {
			const key = (record as { id: string }).id
			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			deduped.push(record)
		}

		return deduped
	}

	/** Builds the IndexedDB key range for the supplied query options. */
	private buildKeyRange(options: FindOptions): IDBKeyRange | undefined {
		if (options.equals !== undefined) {
			return IDBKeyRange.only(options.equals)
		}

		if (options.startsWith !== undefined) {
			return IDBKeyRange.bound(options.startsWith, `${options.startsWith}\uffff`)
		}

		if (options.lowerBound !== undefined && options.upperBound !== undefined) {
			return IDBKeyRange.bound(options.lowerBound, options.upperBound)
		}

		if (options.lowerBound !== undefined) {
			return IDBKeyRange.lowerBound(options.lowerBound)
		}

		if (options.upperBound !== undefined) {
			return IDBKeyRange.upperBound(options.upperBound)
		}

		return undefined
	}

	/** Maps the query order to the IndexedDB cursor direction. */
	private getCursorDirection(options: FindOptions): IDBCursorDirection {
		return options.order === "desc" ? "prev" : "next"
	}

	/** Opens a cursor request and resolves with the first cursor result. */
	private openCursor(
		source: IDBObjectStore | IDBIndex,
		range: IDBKeyRange | undefined,
		direction: IDBCursorDirection,
	): Promise<IDBCursorWithValue | null> {
		const { promise, resolve, reject } = promiseWithResolvers<IDBCursorWithValue | null>()
		const req = source.openCursor(range, direction)
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Advances an existing cursor and resolves with the next cursor result. */
	private continueCursor(cursor: IDBCursorWithValue): Promise<IDBCursorWithValue | null> {
		const { promise, resolve, reject } = promiseWithResolvers<IDBCursorWithValue | null>()
		cursor.request.onsuccess = () => resolve(cursor.request.result)
		cursor.request.onerror = () => reject(cursor.request.error)
		cursor.continue()
		return promise
	}
}
