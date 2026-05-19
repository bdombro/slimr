import type { FindOptions } from "../DbRepository.js"
import type { DbSyncConfig } from "../DbSync.js"
import { promiseWithResolvers } from "../util/promises.js"
import { DbTransaction } from "./DbTransaction.js"
import type { EventBus } from "./EventBus.js"

type SchemaTable = {
	storeName: string
	indexes?: string[]
}

type TableDefaults = {
	/** Callback that fills in default fields before a write is persisted. */
	defaultSetter?: (value: any) => any
}

/** Applies a table's defaultSetter logic to a shallow copy without mutating the original input. */
export const applyDefaults = <T>(tableConfig: TableDefaults | undefined, value: T): T => {
	const nextValue = { ...value }
	return (tableConfig?.defaultSetter?.(nextValue) ?? nextValue) as T
}

/**
 * Captures the final payload written for a single store operation after defaults and patches are applied.
 */
type ExecutedWrite = {
	/** The operation that was executed. */
	type: string
	/** The store the operation targeted. */
	storeName: string
	/** The final value written to IndexedDB, if applicable. */
	value?: any
	/** The record key used for the write, if one was present. */
	key?: string | number
}

/**
 * Owns IndexedDB initialization, transactions, and record access.
 */
export class StorageManager {
	/** The active IndexedDB database instance. */
	public db!: IDBDatabase
	/** Whether the storage layer has finished initializing. */
	public initted = false
	/** The IndexedDB database name used by dbsync. */
	private dbName = "dbsync"

	/**
	 * Creates a storage manager for the provided dbsync configuration and event bus.
	 *
	 * @param config The full dbsync configuration object.
	 * @param events The event bus used to broadcast store updates.
	 * @param onSchemaChange Callback fired when the IndexedDB schema changes.
	 */
	constructor(
		private config: DbSyncConfig,
		private events: EventBus,
		private onSchemaChange: () => void,
		private getSchemaTables: () => SchemaTable[],
	) {}

	/** Computes a deterministic schema signature from the configured tables and indexes. */
	private get schemaSignature() {
		const tables = this.getSchemaTables()
			.slice()
			.sort((left, right) => left.storeName.localeCompare(right.storeName))
			.map((table) => {
				return {
					table: table.storeName,
					indexes: table.indexes?.slice().sort() || [],
				}
			})
		return JSON.stringify(tables)
	}

	/** Creates a transaction wrapper used by the sync engine and public facade. */
	public getTransaction() {
		return new DbTransaction(async (operations) => {
			await this.executeTransaction(operations)
		})
	}

	/** Opens IndexedDB and creates the configured stores when needed. */
	public async init() {
		const { promise, resolve, reject } = promiseWithResolvers<void>()

		const upgradeFn = (e: IDBVersionChangeEvent) => {
			const db = (e.target as IDBOpenDBRequest).result
			this.getSchemaTables().forEach((table) => {
				if (!db.objectStoreNames.contains(table.storeName)) {
					const store = db.createObjectStore(table.storeName, { keyPath: "id" })
					if (table.indexes) {
						table.indexes.forEach((idx) => store.createIndex(idx, idx, { unique: false }))
					}
				}
			})
			if (!db.objectStoreNames.contains("dirtyQueue"))
				db.createObjectStore("dirtyQueue", { keyPath: "id" })
			if (!db.objectStoreNames.contains("deletedQueue"))
				db.createObjectStore("deletedQueue", { keyPath: "id" })
		}

		let localDbVersion = this.config.version
		if (localDbVersion === undefined) {
			const storedVersion = Number(localStorage.getItem("dbsync-db-version") || "1")
			const currentSignature = this.schemaSignature
			const storedSignature = localStorage.getItem("dbsync-schema-signature")

			if (storedSignature !== currentSignature) {
				localDbVersion = storedVersion + 1
				localStorage.setItem("dbsync-schema-signature", currentSignature)
				localStorage.setItem("dbsync-db-version", String(localDbVersion))
			} else {
				localDbVersion = storedVersion
			}
		}

		const req = indexedDB.open(this.dbName, localDbVersion)
		req.onupgradeneeded = upgradeFn
		req.onsuccess = (e) => {
			this.db = (e.target as IDBOpenDBRequest).result
			this.db.onversionchange = () => this.onSchemaChange()
			this.initted = true
			resolve()
		}
		req.onerror = () => reject(req.error)
		return promise
	}

	/** Executes a batch of writes inside a single IndexedDB transaction. */
	public async executeTransaction(operations: any[]): Promise<ExecutedWrite[]> {
		const storeNames = Array.from(new Set(operations.map((o) => o.storeName))).concat([
			"dirtyQueue",
			"deletedQueue",
		])
		const executedWrites: ExecutedWrite[] = []

		// Pre-fetch objects for patch operations using a separate read-only transaction.
		// A standard IndexedDB transaction auto-commits if we await inside it, so we must
		// gather everything into memory synchronously before opening the main readwrite transaction.
		const patchOperations = operations.filter((o) => o.type === "patch")
		const patchRecords: Record<string, any> = {}

		if (patchOperations.length > 0) {
			const preTx = this.db.transaction(storeNames, "readonly")
			const fetchPromises = patchOperations.map(async (op) => {
				const recordId = String(op.key || op.value?.id)
				const { promise: p, resolve: r, reject: rej } = promiseWithResolvers<any>()
				const getReq = preTx.objectStore(op.storeName).get(recordId)
				getReq.onsuccess = () => r(getReq.result)
				getReq.onerror = () => rej(getReq.error)
				const existingRecord = await p

				if (!existingRecord) {
					throw new Error(
						`[dbsync]: Cannot patch record ${recordId} in ${op.storeName} because it doesn't exist`,
					)
				}
				patchRecords[`${op.storeName}-${recordId}`] = existingRecord
			})
			await Promise.all(fetchPromises)
		}

		// Now execute the actual write bundle synchronously
		const { promise, resolve, reject } = promiseWithResolvers<ExecutedWrite[]>()
		const tx = this.db.transaction(storeNames, "readwrite")
		tx.oncomplete = () => {
			this.events.notifySubscribers(storeNames)
			resolve(executedWrites)
		}
		tx.onerror = () => reject(tx.error)

		operations.forEach((op) => {
			const store = tx.objectStore(op.storeName)
			let payloadToWrite = op.value
			let recordId = op.key || op.value?.id

			if (op.type === "put" || op.type === "add" || op.type === "patch") {
				if (op.type === "put" || op.type === "add") {
					payloadToWrite = applyDefaults(this.config.tables?.[op.storeName], payloadToWrite)
					recordId = op.key || payloadToWrite?.id
				} else if (op.type === "patch") {
					const existingRecord = patchRecords[`${op.storeName}-${recordId}`]
					payloadToWrite = { ...existingRecord, ...op.value }
					recordId = op.key || payloadToWrite?.id
				}

				store.put(payloadToWrite)
				executedWrites.push({
					type: op.type,
					storeName: op.storeName,
					value: payloadToWrite,
					key: recordId,
				})
				if (op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("dirtyQueue").put({
						id: recordId,
						table: op.storeName,
						payload: payloadToWrite,
						timestamp: Date.now(),
					})
				}
			} else if (op.type === "delete") {
				store.delete(recordId)
				if (op.storeName !== "dirtyQueue" && op.storeName !== "deletedQueue") {
					tx.objectStore("deletedQueue").put({
						id: recordId,
						table: op.storeName,
						timestamp: Date.now(),
					})
					tx.objectStore("dirtyQueue").delete(recordId)
				}
			} else if (op.type === "clear") {
				store.clear()
			}
		})

		return promise
	}

	/** Reads a typed record by primary key from the requested store. */
	public async get<T>(storeName: string, id: string | number): Promise<T | undefined> {
		const { promise, resolve, reject } = promiseWithResolvers<T | undefined>()
		const tx = this.db.transaction(storeName, "readonly")
		const req = tx.objectStore(storeName).get(id)
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
		return promise
	}

	/**
	 * Returns records matching a query from the requested store.
	 * - with no options, this returns every record from the store.
	 * - limit+order=desc is not well-supported in IndexedDB and must use the more costly cursor read approach
	 */
	public async find<T>(storeName: string, options: FindOptions = {}): Promise<T[]> {
		if (options.order === "desc" && options.limit !== undefined) {
			const records: T[] = []
			for await (const record of this.stream<T>(storeName, options)) {
				records.push(record)
			}
			return records
		}

		const source = this.getQuerySource(
			this.db.transaction(storeName, "readonly"),
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

	/**
	 * Streams records matching a query from the requested store.
	 * If no options are provided, returns every record from the store.
	 */
	public async *stream<T>(storeName: string, options: FindOptions = {}): AsyncGenerator<T> {
		const tx = this.db.transaction(storeName, "readonly")
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

	/** Builds the IndexedDB key range for the supplied query options. */
	private buildKeyRange(options: FindOptions): IDBKeyRange | undefined {
		if (options.equals !== undefined) {
			return IDBKeyRange.only(options.equals)
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

	/** Clears every object store managed by the database. */
	public async clearAllStores() {
		const tx = this.db.transaction(Array.from(this.db.objectStoreNames), "readwrite")
		Array.from(this.db.objectStoreNames).forEach((name) => tx.objectStore(name).clear())
		return new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve()
			tx.onerror = () => reject(tx.error)
		})
	}

	/** Closes the underlying IndexedDB connection. */
	public dispose() {
		if (this.db) {
			this.db.close()
		}
	}
}
